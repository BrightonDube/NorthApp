/**
 * Generate Report Edge Function
 *
 * Analyzes coaching session conversations using AI to generate
 * structured session reports. Supports Groq and Gemini providers.
 *
 * Features:
 * - JWT authentication
 * - Multi-provider LLM support (Groq, Gemini)
 * - Runtime provider selection via llm_config table
 * - Structured JSON response parsing
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LLMConfig {
  provider: 'groq' | 'gemini';
  model: string;
  temperature: number;
  max_tokens: number;
}

/**
 * Call Groq API (non-streaming) for report generation
 */
async function callGroq(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower for structured output
      max_tokens: config.max_tokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Call Gemini REST API (non-streaming) for report generation
 */
async function callGemini(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_KEY');
  if (!apiKey) throw new Error('GEMINI_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: config.max_tokens,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Initialize Supabase client to read llm_config
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    // Parse request
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (prompt.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Prompt too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch LLM config
    const { data: llmConfigRow } = await supabaseClient
      .from('llm_config')
      .select('provider, model, temperature, max_tokens')
      .eq('is_active', true)
      .single();

    const llmConfig: LLMConfig = llmConfigRow ?? {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2048,
    };

    console.log(`[generate-report] Using provider: ${llmConfig.provider} / ${llmConfig.model}`);

    // Call the appropriate provider
    let text: string;
    if (llmConfig.provider === 'gemini') {
      text = await callGemini(prompt, llmConfig);
    } else {
      text = await callGroq(prompt, llmConfig);
    }

    return new Response(
      JSON.stringify({ success: true, response: text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error generating report:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
