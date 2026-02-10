/**
 * Chat Edge Function
 * 
 * Handles AI chat requests with context-aware prompt composition and streaming responses.
 * 
 * Features:
 * - JWT authentication validation
 * - Prompt composition with user context
 * - Conversation history integration
 * - Google Gemini API streaming
 * - Server-Sent Events (SSE) response
 * - Message persistence to database
 * 
 * Validates: Requirements 5.1-5.5, 9.1-9.7
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';
import { buildPromptContext, filterSessionFiles, type FileAttachment } from './context-injection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  sessionId: string;
  coachId: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { sessionId, coachId, message }: ChatRequest = await req.json();

    // Validate input
    if (!sessionId || !coachId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Message too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch coach
    const { data: coach, error: coachError } = await supabaseClient
      .from('coaches')
      .select('system_prompt, name')
      .eq('id', coachId)
      .single();

    if (coachError || !coach) {
      return new Response(
        JSON.stringify({ error: 'Coach not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user context
    const { data: contexts } = await supabaseClient
      .from('user_context')
      .select('category, content')
      .eq('user_id', user.id)
      .order('category');

    // Fetch user file attachments
    const { data: fileAttachments } = await supabaseClient
      .from('file_attachments')
      .select('id, filename, file_type, upload_date, extracted_content, extraction_success')
      .eq('user_id', user.id)
      .eq('extraction_success', true)
      .order('upload_date', { ascending: false });

    // Fetch session-specific file selections (if any)
    const { data: sessionFileSelections } = await supabaseClient
      .from('session_file_selections')
      .select('file_id')
      .eq('session_id', sessionId);

    // Filter files based on session selections
    const sessionFileIds = sessionFileSelections?.map(s => s.file_id);
    const filteredFiles = filterSessionFiles(
      (fileAttachments as FileAttachment[]) || [],
      sessionFileIds
    );

    // Fetch conversation history (last 10 messages)
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('chat_session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Format context by category
    const contextByCategory = {
      values: contexts?.filter(c => c.category === 'values').map(c => c.content) || [],
      goals: contexts?.filter(c => c.category === 'goals').map(c => c.content) || [],
      projects: contexts?.filter(c => c.category === 'projects').map(c => c.content) || [],
      constraints: contexts?.filter(c => c.category === 'constraints').map(c => c.content) || [],
    };

    // Build system prompt with context and file attachments
    const systemPrompt = buildPromptContext(
      coach.system_prompt,
      contexts || [],
      filteredFiles
    );

    // Format conversation history for Gemini
    const history = messages?.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })) || [];

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') ?? '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096,
      },
    });

    // Start chat with history
    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    });

    // Stream response
    const result = await chat.sendMessageStream(message);

    // Create SSE stream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'token', data: text })}\n\n`)
            );
          }

          // Save message to database
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
            encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              data: { messageId: savedMessage?.id }
            })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              data: { message: 'Failed to generate response' }
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
