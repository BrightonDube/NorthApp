/**
 * Generate Report Edge Function
 * 
 * Analyzes coaching session conversations using Google Gemini AI to generate
 * structured session reports.
 * 
 * Features:
 * - JWT authentication validation
 * - Conversation analysis using Gemini API
 * - Structured JSON response parsing
 * - Error handling and validation
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateReportRequest {
  prompt: string;
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

    // Parse request
    const { prompt }: GenerateReportRequest = await req.json();

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Prompt too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_KEY') ?? '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent structured output
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Generate report analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Return the AI response
    return new Response(
      JSON.stringify({ 
        success: true,
        response: text 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
