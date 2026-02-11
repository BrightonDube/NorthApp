/**
 * Report Generator Service
 * 
 * This service generates structured session reports by analyzing conversation
 * messages using AI (Google Gemini).
 * 
 * Key Features:
 * - AI-powered analysis of coaching sessions
 * - Extraction of key insights, action items, and decisions
 * - Structured report generation with confidence scoring
 * - Retry logic with exponential backoff
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
 */

import { supabase } from './supabase';
import type { 
  SessionReport, 
  SessionReportInsert,
  CoachingSession,
  Message 
} from './database.types';

/**
 * Configuration for report generation
 */
export const REPORT_CONFIG = {
  /**
   * Maximum number of retry attempts for failed report generation
   */
  MAX_RETRY_ATTEMPTS: 3,
  
  /**
   * Base delay for exponential backoff (in milliseconds)
   */
  BASE_RETRY_DELAY_MS: 1000,
  
  /**
   * Maximum number of messages to include in a single analysis
   * If a session has more messages, they will be batched
   */
  MAX_MESSAGES_PER_BATCH: 100,
  
  /**
   * Minimum and maximum sentence count for summary
   */
  MIN_SUMMARY_SENTENCES: 2,
  MAX_SUMMARY_SENTENCES: 4,
} as const;

/**
 * Insight extracted from a coaching session
 */
export interface Insight {
  id: string;
  text: string;
  category?: string;
  importance: 'high' | 'medium' | 'low';
}

/**
 * Action item identified in a coaching session
 */
export interface ActionItem {
  id: string;
  text: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  sessionId: string;
  linkedActionItemId?: string;
}

/**
 * Structured response from AI analysis
 */
interface AIReportResponse {
  summary: string;
  keyInsights: Array<{
    text: string;
    category?: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  actionItems: Array<{
    text: string;
  }>;
  decisions: string[];
  topics: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Report Generator Class
 * 
 * Generates structured session reports by analyzing conversation messages
 * using AI. Implements retry logic and handles various error scenarios.
 * 
 * @example
 * ```typescript
 * const generator = new ReportGenerator();
 * const report = await generator.generateReport(sessionId);
 * console.log(`Generated report: ${report.id}`);
 * ```
 */
export class ReportGenerator {
  /**
   * Generate a report for a completed session
   * 
   * This method:
   * 1. Fetches the session and its messages
   * 2. Analyzes the conversation using AI
   * 3. Parses the AI response into a structured report
   * 4. Stores the report in the database
   * 5. Creates action items from the report
   * 
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
   * 
   * @param sessionId - The ID of the session to generate a report for
   * @returns The generated session report
   * @throws Error if session not found or report generation fails
   * 
   * @example
   * ```typescript
   * const report = await generator.generateReport(sessionId);
   * console.log(`Report generated with ${report.key_insights.length} insights`);
   * ```
   */
  async generateReport(sessionId: string): Promise<SessionReport> {
    try {
      // Fetch the session
      const { data: session, error: sessionError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Verify session is ended
      if (session.status !== 'ended') {
        throw new Error(`Session ${sessionId} is not ended yet`);
      }

      // Fetch all messages for this session
      const messages = await this.fetchSessionMessages(session);

      if (messages.length === 0) {
        // Handle empty session - create minimal report
        return this.createEmptySessionReport(session);
      }

      // Fetch coach information
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', session.coach_id)
        .single();

      if (coachError || !coach) {
        throw new Error(`Coach not found: ${session.coach_id}`);
      }

      // Generate report with retry logic
      const aiResponse = await this.generateReportWithRetry(
        session,
        messages,
        coach.name,
        1
      );

      // Create and store the report
      const report = await this.storeReport(session, aiResponse, 1);

      // Create action items
      await this.createActionItems(report, aiResponse.actionItems);

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Retry report generation with exponential backoff
   * 
   * Implements retry logic as specified in Requirement 2.7.
   * Retries up to MAX_RETRY_ATTEMPTS times with exponential backoff.
   * 
   * Validates: Requirement 2.7
   * 
   * @param sessionId - The session ID to retry
   * @param attemptNumber - The current attempt number (1-based)
   * @returns The generated session report
   * @throws Error if all retry attempts fail
   */
  async retryReportGeneration(
    sessionId: string,
    attemptNumber: number
  ): Promise<SessionReport> {
    if (attemptNumber > REPORT_CONFIG.MAX_RETRY_ATTEMPTS) {
      throw new Error(
        `Report generation failed after ${REPORT_CONFIG.MAX_RETRY_ATTEMPTS} attempts`
      );
    }

    try {
      // Fetch the session
      const { data: session, error: sessionError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Fetch messages
      const messages = await this.fetchSessionMessages(session);

      // Fetch coach
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', session.coach_id)
        .single();

      if (coachError || !coach) {
        throw new Error(`Coach not found: ${session.coach_id}`);
      }

      // Calculate delay for exponential backoff
      const delay = REPORT_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Generate report
      const aiResponse = await this.generateReportWithRetry(
        session,
        messages,
        coach.name,
        attemptNumber
      );

      // Store report with attempt number
      const report = await this.storeReport(session, aiResponse, attemptNumber);

      // Create action items
      await this.createActionItems(report, aiResponse.actionItems);

      return report;
    } catch (error) {
      console.error(`Retry attempt ${attemptNumber} failed:`, error);
      
      // If we haven't exhausted retries, try again
      if (attemptNumber < REPORT_CONFIG.MAX_RETRY_ATTEMPTS) {
        return this.retryReportGeneration(sessionId, attemptNumber + 1);
      }
      
      throw error;
    }
  }

  /**
   * Fetch all messages for a session
   * 
   * @param session - The coaching session
   * @returns Array of messages
   * @private
   */
  private async fetchSessionMessages(
    session: CoachingSession
  ): Promise<Message[]> {
    // Get all chat sessions for this user and coach
    const { data: chatSessions, error: chatSessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', session.user_id)
      .eq('coach_id', session.coach_id);

    if (chatSessionError) {
      throw new Error(`Failed to fetch chat sessions: ${chatSessionError.message}`);
    }

    const chatSessionIds = chatSessions?.map(cs => cs.id) || [];

    if (chatSessionIds.length === 0) {
      return [];
    }

    // Fetch messages within the session time range
    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .in('chat_session_id', chatSessionIds)
      .gte('created_at', session.start_time)
      .order('created_at', { ascending: true });

    if (messageError) {
      throw new Error(`Failed to fetch messages: ${messageError.message}`);
    }

    // Filter messages by end time if session has ended
    const filteredMessages = session.end_time
      ? messages?.filter(m => m.created_at <= session.end_time!) || []
      : messages || [];

    return filteredMessages;
  }

  /**
   * Generate report using AI with retry logic
   * 
   * @param session - The coaching session
   * @param messages - The session messages
   * @param coachName - The coach's name
   * @param attemptNumber - Current attempt number
   * @returns AI-generated report response
   * @private
   */
  private async generateReportWithRetry(
    session: CoachingSession,
    messages: Message[],
    coachName: string,
    attemptNumber: number
  ): Promise<AIReportResponse> {
    try {
      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt(session, messages, coachName);

      // Call AI service (this will be implemented to call Gemini API)
      const aiResponse = await this.callAIService(prompt);

      // Parse and validate the response
      const parsedResponse = this.parseAIResponse(aiResponse);

      return parsedResponse;
    } catch (error) {
      console.error(`AI analysis attempt ${attemptNumber} failed:`, error);
      throw error;
    }
  }

  /**
   * Build the analysis prompt for AI
   * 
   * Creates a structured prompt that instructs the AI to analyze
   * the conversation and extract key information.
   * 
   * @param session - The coaching session
   * @param messages - The session messages
   * @param coachName - The coach's name
   * @returns The formatted prompt string
   * @private
   */
  private buildAnalysisPrompt(
    session: CoachingSession,
    messages: Message[],
    coachName: string
  ): string {
    // Calculate session duration in minutes
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Format messages for the prompt
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n\n');

    return `You are analyzing a coaching session to generate a session report.

Session Context:
- Coach: ${coachName}
- Date: ${startTime.toISOString()}
- Duration: ${durationMinutes} minutes
- Message Count: ${messages.length}

Conversation:
${conversationText}

Generate a structured session report with:

1. Summary (${REPORT_CONFIG.MIN_SUMMARY_SENTENCES}-${REPORT_CONFIG.MAX_SUMMARY_SENTENCES} sentences): Brief overview of the session
2. Key Insights (3-5 items): Important realizations, patterns, or learnings with importance level (high/medium/low)
3. Action Items (0-5 items): Specific commitments or tasks mentioned
4. Decisions (0-3 items): Clear decisions made during the session
5. Topics (3-7 tags): Main themes discussed

IMPORTANT RULES:
- Only include information explicitly discussed in the conversation
- Do not infer or assume information not present
- Mark confidence as "high" if the conversation is clear, "medium" if somewhat ambiguous, "low" if very unclear
- For action items, only include clear commitments, not suggestions
- Keep insights concise and specific

Respond with a JSON object in this exact format:
{
  "summary": "2-4 sentence summary here",
  "keyInsights": [
    {"text": "insight text", "category": "optional category", "importance": "high|medium|low"}
  ],
  "actionItems": [
    {"text": "action item text"}
  ],
  "decisions": ["decision 1", "decision 2"],
  "topics": ["topic1", "topic2", "topic3"],
  "confidence": "high|medium|low"
}`;
  }

  /**
   * Call the AI service to analyze the conversation
   * 
   * This method makes an HTTP request to the Supabase Edge Function
   * that uses the Gemini API to analyze the conversation.
   * 
   * @param prompt - The analysis prompt
   * @returns The AI response as a string
   * @private
   */
  private async callAIService(prompt: string): Promise<string> {
    try {
      // Get the current session to access auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Call the generate-report edge function
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { prompt },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(`AI service error: ${error.message}`);
      }

      if (!data || !data.success || !data.response) {
        throw new Error('Invalid response from AI service');
      }

      return data.response;
    } catch (error) {
      console.error('Failed to call AI service:', error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured format
   * 
   * Validates and parses the JSON response from the AI service.
   * 
   * @param response - The raw AI response string
   * @returns Parsed and validated report response
   * @private
   */
  private parseAIResponse(response: string): AIReportResponse {
    try {
      // Extract JSON from response (AI might include markdown code blocks)
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('Invalid summary in AI response');
      }

      if (!Array.isArray(parsed.keyInsights)) {
        throw new Error('Invalid keyInsights in AI response');
      }

      if (!Array.isArray(parsed.actionItems)) {
        throw new Error('Invalid actionItems in AI response');
      }

      if (!Array.isArray(parsed.decisions)) {
        throw new Error('Invalid decisions in AI response');
      }

      if (!Array.isArray(parsed.topics)) {
        throw new Error('Invalid topics in AI response');
      }

      if (!['high', 'medium', 'low'].includes(parsed.confidence)) {
        parsed.confidence = 'medium'; // Default to medium if invalid
      }

      return parsed as AIReportResponse;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Invalid AI response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store the generated report in the database
   * 
   * @param session - The coaching session
   * @param aiResponse - The AI-generated report data
   * @param attemptNumber - The generation attempt number
   * @returns The stored session report
   * @private
   */
  private async storeReport(
    session: CoachingSession,
    aiResponse: AIReportResponse,
    attemptNumber: number
  ): Promise<SessionReport> {
    // Calculate session duration
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Generate UUIDs for insights
    const keyInsights = aiResponse.keyInsights.map(insight => ({
      id: crypto.randomUUID(),
      ...insight,
    }));

    const reportInsert: SessionReportInsert = {
      session_id: session.id,
      user_id: session.user_id,
      coach_id: session.coach_id,
      summary: aiResponse.summary,
      key_insights: keyInsights,
      decisions: aiResponse.decisions,
      topics: aiResponse.topics,
      session_date: session.start_time,
      session_duration: durationMinutes,
      message_count: session.message_count,
      confidence: aiResponse.confidence,
      generation_attempts: attemptNumber,
    };

    const { data: report, error } = await supabase
      .from('session_reports')
      .insert(reportInsert)
      .select()
      .single();

    if (error || !report) {
      throw new Error(`Failed to store report: ${error?.message || 'Unknown error'}`);
    }

    console.log(`Report ${report.id} stored successfully`);
    return report;
  }

  /**
   * Create action items from the report
   * 
   * @param report - The stored session report
   * @param actionItems - The action items from AI response
   * @private
   */
  private async createActionItems(
    report: SessionReport,
    actionItems: Array<{ text: string }>
  ): Promise<void> {
    if (actionItems.length === 0) {
      return;
    }

    const actionItemInserts = actionItems.map(item => ({
      report_id: report.id,
      user_id: report.user_id,
      text: item.text,
      status: 'pending' as const,
    }));

    const { error } = await supabase
      .from('action_items')
      .insert(actionItemInserts);

    if (error) {
      console.error('Failed to create action items:', error);
      // Don't throw - action items are not critical to report generation
    }
  }

  /**
   * Create a minimal report for an empty session
   * 
   * @param session - The coaching session
   * @returns A minimal session report
   * @private
   */
  private async createEmptySessionReport(
    session: CoachingSession
  ): Promise<SessionReport> {
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const reportInsert: SessionReportInsert = {
      session_id: session.id,
      user_id: session.user_id,
      coach_id: session.coach_id,
      summary: 'This session had no messages.',
      key_insights: [],
      decisions: [],
      topics: [],
      session_date: session.start_time,
      session_duration: durationMinutes,
      message_count: 0,
      confidence: 'high',
      generation_attempts: 1,
    };

    const { data: report, error } = await supabase
      .from('session_reports')
      .insert(reportInsert)
      .select()
      .single();

    if (error || !report) {
      throw new Error(`Failed to store empty report: ${error?.message || 'Unknown error'}`);
    }

    return report;
  }
}

/**
 * Singleton instance of ReportGenerator
 * 
 * Use this instance throughout the application for report generation.
 * 
 * @example
 * ```typescript
 * import { reportGenerator } from '@/lib/reportGenerator';
 * 
 * const report = await reportGenerator.generateReport(sessionId);
 * ```
 */
export const reportGenerator = new ReportGenerator();
