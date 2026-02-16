/**
 * Chat Edge Function
 *
 * Handles AI chat with context-aware prompts and streaming responses.
 * Supports multiple LLM providers (Groq, Gemini) selected at runtime
 * from the llm_config table.
 *
 * Features:
 * - JWT authentication
 * - Multi-provider LLM support (Groq, Gemini)
 * - Runtime provider selection via llm_config table
 * - Context injection (user context + file attachments)
 * - Conversation history
 * - SSE streaming responses
 * - Message persistence
 *
 * Validates: Requirements 5.1-5.5, 9.1-9.7
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { buildPromptContext, filterSessionFiles, type FileAttachment } from './context-injection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InlineAttachment {
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  base64?: string;
}

interface ChatRequest {
  sessionId: string;
  coachId: string;
  message: string;
  attachments?: InlineAttachment[];
}

interface LLMConfig {
  provider: 'groq' | 'gemini' | 'xai';
  model: string;
  temperature: number;
  max_tokens: number;
}

// ─── Provider Implementations ────────────────────────────────────────────────

/**
 * Stream chat completion from Groq (OpenAI-compatible API)
 */
async function streamGroq(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  config: LLMConfig,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: 0.9,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq API error:', res.status, err);
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  return res.body!;
}

/**
 * Stream chat completion from Gemini REST API (no SDK)
 */
async function streamGemini(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  config: LLMConfig,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get('GEMINI_KEY');
  if (!apiKey) throw new Error('GEMINI_KEY not configured');

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: config.temperature,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: config.max_tokens,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini API error:', res.status, err);
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  return res.body!;
}

/**
 * Stream chat completion from X.AI Grok (OpenAI-compatible API)
 */
async function streamXai(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  config: LLMConfig,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('GROK_API_KEY');
  if (!apiKey) throw new Error('XAI_API_KEY not configured. Set XAI_API_KEY or GROK_API_KEY in Supabase secrets.');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('X.AI API error:', res.status, err);
    throw new Error(`X.AI API error ${res.status}: ${err}`);
  }

  return res.body!;
}

// ─── SSE Parsers ─────────────────────────────────────────────────────────────

/**
 * Parse Groq SSE stream (OpenAI format) and yield text tokens
 */
async function* parseGroqStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse Gemini SSE stream and yield text tokens
 */
async function* parseGeminiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          const parts = parsed.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.text) yield part.text;
            }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Pass token explicitly to getUser() - required for edge functions
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse & Validate Request ─────────────────────────────────────────
    const { sessionId, coachId, message, attachments }: ChatRequest = await req.json();

    if (!sessionId || !coachId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (message.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch LLM Config ─────────────────────────────────────────────────
    const { data: llmConfigRow } = await supabaseClient
      .from('llm_config')
      .select('provider, model, temperature, max_tokens')
      .eq('is_active', true)
      .single();

    const llmConfig: LLMConfig = llmConfigRow ?? {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
    };

    console.log(`[chat] Using provider: ${llmConfig.provider} / ${llmConfig.model}`);

    // ── Fetch Coach ──────────────────────────────────────────────────────
    const { data: coach, error: coachError } = await supabaseClient
      .from('coaches')
      .select('system_prompt, name')
      .eq('id', coachId)
      .single();

    if (coachError || !coach) {
      return new Response(
        JSON.stringify({ error: 'Coach not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fetch Context ────────────────────────────────────────────────────
    const { data: contexts } = await supabaseClient
      .from('user_context')
      .select('category, content')
      .eq('user_id', user.id)
      .order('category');

    const { data: fileAttachments } = await supabaseClient
      .from('file_attachments')
      .select('id, filename, file_type, upload_date, extracted_content, extraction_success')
      .eq('user_id', user.id)
      .eq('extraction_success', true)
      .order('upload_date', { ascending: false });

    const { data: sessionFileSelections } = await supabaseClient
      .from('session_file_selections')
      .select('file_id')
      .eq('session_id', sessionId);

    const sessionFileIds = sessionFileSelections?.map((s) => s.file_id);
    const filteredFiles = filterSessionFiles(
      (fileAttachments as FileAttachment[]) || [],
      sessionFileIds,
    );

    // ── Fetch Historical Session Context ─────────────────────────────────
    // Pull recent session reports for this coach to provide continuity
    const { data: recentReports } = await supabaseClient
      .from('session_reports')
      .select('summary, key_insights, action_items, topics, created_at')
      .eq('user_id', user.id)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Pull pending action items across all coaches for accountability
    const { data: pendingActions } = await supabaseClient
      .from('action_items')
      .select('text, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    const systemPrompt = buildPromptContext(
      coach.system_prompt,
      contexts || [],
      filteredFiles,
      recentReports || [],
      pendingActions || [],
    );

    // ── Fetch Conversation History ───────────────────────────────────────
    const { data: dbMessages } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const history = (dbMessages || []).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // ── Build Augmented User Message ────────────────────────────────────
    let augmentedMessage = message;
    if (attachments && attachments.length > 0) {
      const attachmentDescriptions = attachments.map((att) => {
        if (att.type === 'image') {
          return `[Attached image: ${att.name}]`;
        }
        // For documents, include extracted text content if available via base64
        if (att.base64 && att.mimeType?.startsWith('text/')) {
          try {
            const decoded = atob(att.base64);
            const preview = decoded.length > 3000 ? decoded.substring(0, 3000) + '...(truncated)' : decoded;
            return `[Attached document: ${att.name}]\n\`\`\`\n${preview}\n\`\`\``;
          } catch {
            return `[Attached document: ${att.name}]`;
          }
        }
        return `[Attached document: ${att.name}]`;
      }).join('\n\n');

      augmentedMessage = `${message}\n\n--- Attachments ---\n${attachmentDescriptions}`;
    }

    // ── Call LLM Provider ────────────────────────────────────────────────
    let providerStream: ReadableStream<Uint8Array>;
    let parseStream: (body: ReadableStream<Uint8Array>) => AsyncGenerator<string>;

    if (llmConfig.provider === 'gemini') {
      providerStream = await streamGemini(systemPrompt, history, augmentedMessage, llmConfig);
      parseStream = parseGeminiStream;
    } else if (llmConfig.provider === 'xai') {
      providerStream = await streamXai(systemPrompt, history, augmentedMessage, llmConfig);
      parseStream = parseGroqStream; // X.AI uses OpenAI-compatible format
    } else {
      providerStream = await streamGroq(systemPrompt, history, augmentedMessage, llmConfig);
      parseStream = parseGroqStream;
    }

    // ── Build SSE Response Stream ────────────────────────────────────────
    const encoder = new TextEncoder();
    let fullResponse = '';

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of parseStream(providerStream)) {
            fullResponse += token;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'token', data: token })}\n\n`),
            );
          }

          // Save assistant message to database
          const { data: savedMessage, error: saveError } = await supabaseClient
            .from('messages')
            .insert({
              chat_session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
            })
            .select()
            .single();

          if (saveError) {
            console.error('Failed to save message:', saveError);
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', data: { messageId: savedMessage?.id } })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);

          // If we have partial content, try to save it
          if (fullResponse.length > 0) {
            await supabaseClient
              .from('messages')
              .insert({
                chat_session_id: sessionId,
                role: 'assistant',
                content: fullResponse + '\n\n[Response interrupted]',
              })
              .select()
              .single();
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', data: { message: 'Failed to generate response' } })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
