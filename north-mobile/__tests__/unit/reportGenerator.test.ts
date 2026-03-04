/**
 * Unit Tests for ReportGenerator
 * 
 * Tests the ReportGenerator class implementation including:
 * - Gemini AI via Supabase Edge Functions
 * - generateReport() method with structured prompt
 * - AI response parsing into SessionReport structure
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { ReportGenerator, REPORT_CONFIG } from '../../lib/reportGenerator';
import { supabase } from '../../lib/supabase';

// Mock dependencies
jest.mock('../../lib/supabase');

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  const mockSessionId = 'test-session-id';
  const mockUserId = 'test-user-id';
  const mockCoachId = 'test-coach-id';

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new ReportGenerator();
  });

  describe('Configuration', () => {
    it('should have correct configuration values', () => {
      expect(REPORT_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(REPORT_CONFIG.BASE_RETRY_DELAY_MS).toBe(1000);
      expect(REPORT_CONFIG.MAX_MESSAGES_PER_BATCH).toBe(100);
      expect(REPORT_CONFIG.MIN_SUMMARY_SENTENCES).toBe(2);
      expect(REPORT_CONFIG.MAX_SUMMARY_SENTENCES).toBe(4);
    });
  });

  describe('generateReport()', () => {
    const mockSession = {
      id: mockSessionId,
      user_id: mockUserId,
      coach_id: mockCoachId,
      start_time: new Date('2024-01-01T10:00:00Z').toISOString(),
      end_time: new Date('2024-01-01T11:00:00Z').toISOString(),
      message_count: 10,
      status: 'ended' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockMessages = [
      {
        id: 'msg-1',
        chat_session_id: 'chat-1',
        role: 'user' as const,
        content: 'I want to improve my productivity',
        created_at: new Date('2024-01-01T10:05:00Z').toISOString(),
      },
      {
        id: 'msg-2',
        chat_session_id: 'chat-1',
        role: 'assistant' as const,
        content: 'Let\'s work on that together. What specific areas would you like to focus on?',
        created_at: new Date('2024-01-01T10:06:00Z').toISOString(),
      },
    ];

    const mockCoach = {
      id: mockCoachId,
      name: 'Test Coach',
      icon: 'test-icon',
      system_prompt: 'test prompt',
      creator_id: null,
      is_public: true,
      category: 'productivity',
      is_featured: false,
      source_coach_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockAIResponse = {
      summary: 'User discussed productivity improvements. Coach provided guidance on focus areas.',
      keyInsights: [
        { text: 'User wants to improve productivity', importance: 'high' as const },
      ],
      actionItems: [
        { text: 'Identify specific productivity focus areas' },
      ],
      decisions: ['Focus on productivity improvement'],
      topics: ['productivity', 'goal-setting'],
      confidence: 'high' as const,
    };

    const mockStoredReport = {
      id: 'report-1',
      session_id: mockSessionId,
      user_id: mockUserId,
      coach_id: mockCoachId,
      summary: mockAIResponse.summary,
      key_insights: mockAIResponse.keyInsights.map(i => ({ id: 'insight-1', ...i })),
      decisions: mockAIResponse.decisions,
      topics: mockAIResponse.topics,
      session_date: mockSession.start_time,
      session_duration: 60,
      message_count: 10,
      generated_at: new Date().toISOString(),
      confidence: mockAIResponse.confidence,
      generation_attempts: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
      // Mock Supabase queries
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'coaches') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCoach, error: null }),
          };
        }
        if (table === 'chat_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ 
                data: [{ id: 'chat-1' }], 
                error: null 
              }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
          };
        }
        if (table === 'session_reports') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockStoredReport, error: null }),
          };
        }
        if (table === 'action_items') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      // Mock auth session
      (supabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      // Mock Supabase functions
      if (!supabase.functions) {
        (supabase as any).functions = {};
      }
      (supabase.functions.invoke as jest.Mock) = jest.fn().mockResolvedValue({
        data: { 
          success: true, 
          response: JSON.stringify(mockAIResponse) 
        },
        error: null,
      });
    });

    it('should successfully generate a report for a valid session', async () => {
      const report = await generator.generateReport(mockSessionId);

      expect(report).toBeDefined();
      expect(report.id).toBe('report-1');
      expect(report.session_id).toBe(mockSessionId);
      expect(report.summary).toBe(mockAIResponse.summary);
      expect(report.confidence).toBe('high');
    });

    it('should throw error if session not found', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(generator.generateReport(mockSessionId)).rejects.toThrow('Session not found');
    });

    it('should throw error if session is not ended', async () => {
      const activeSession = { ...mockSession, status: 'active' as const };
      
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: activeSession, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await expect(generator.generateReport(mockSessionId)).rejects.toThrow('is not ended yet');
    });

    it('should handle empty sessions gracefully', async () => {
      // Mock empty messages
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'chat_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'session_reports') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ 
              data: { ...mockStoredReport, summary: 'This session had no messages.' }, 
              error: null 
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const report = await generator.generateReport(mockSessionId);

      expect(report).toBeDefined();
      expect(report.summary).toBe('This session had no messages.');
    });
  });

  describe('AI Response Parsing', () => {
    it('should parse valid JSON response correctly', () => {
      const validResponse = JSON.stringify({
        summary: 'Test summary with two sentences. This is the second sentence.',
        keyInsights: [
          { text: 'Insight 1', importance: 'high' },
          { text: 'Insight 2', importance: 'medium' },
        ],
        actionItems: [
          { text: 'Action 1' },
        ],
        decisions: ['Decision 1'],
        topics: ['topic1', 'topic2'],
        confidence: 'high',
      });

      // Access private method through any type casting for testing
      const parsed = (generator as any).parseAIResponse(validResponse);

      expect(parsed.summary).toBe('Test summary with two sentences. This is the second sentence.');
      expect(parsed.keyInsights).toHaveLength(2);
      expect(parsed.actionItems).toHaveLength(1);
      expect(parsed.confidence).toBe('high');
    });

    it('should handle markdown code blocks in response', () => {
      const responseWithMarkdown = '```json\n' + JSON.stringify({
        summary: 'Test summary.',
        keyInsights: [],
        actionItems: [],
        decisions: [],
        topics: ['test'],
        confidence: 'medium',
      }) + '\n```';

      const parsed = (generator as any).parseAIResponse(responseWithMarkdown);

      expect(parsed.summary).toBe('Test summary.');
      expect(parsed.confidence).toBe('medium');
    });

    it('should throw error for invalid JSON', () => {
      const invalidResponse = 'This is not JSON';

      expect(() => {
        (generator as any).parseAIResponse(invalidResponse);
      }).toThrow('Invalid AI response format');
    });

    it('should throw error for missing required fields', () => {
      const incompleteResponse = JSON.stringify({
        summary: 'Test',
        // Missing other required fields
      });

      expect(() => {
        (generator as any).parseAIResponse(incompleteResponse);
      }).toThrow('Invalid');
    });

    it('should default to medium confidence if invalid', () => {
      const responseWithInvalidConfidence = JSON.stringify({
        summary: 'Test summary.',
        keyInsights: [],
        actionItems: [],
        decisions: [],
        topics: ['test'],
        confidence: 'invalid',
      });

      const parsed = (generator as any).parseAIResponse(responseWithInvalidConfidence);

      expect(parsed.confidence).toBe('medium');
    });
  });

  describe('Prompt Building', () => {
    it('should build a structured prompt with all required sections', () => {
      const mockSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: new Date('2024-01-01T10:00:00Z').toISOString(),
        end_time: new Date('2024-01-01T11:00:00Z').toISOString(),
        message_count: 1, // Changed to match actual message count
        status: 'ended' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockMessages = [
        {
          id: 'msg-1',
          chat_session_id: 'chat-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString(),
        },
      ];

      const prompt = (generator as any).buildAnalysisPrompt(
        mockSession,
        mockMessages,
        'Test Coach'
      );

      expect(prompt).toContain('Test Coach');
      expect(prompt).toContain('Duration: 60 minutes');
      expect(prompt).toContain('Message Count: 1'); // Changed to match actual count
      expect(prompt).toContain('User: Hello');
      expect(prompt).toContain('Summary');
      expect(prompt).toContain('Key Insights');
      expect(prompt).toContain('Action Items');
      expect(prompt).toContain('Decisions');
      expect(prompt).toContain('Topics');
      expect(prompt).toContain('JSON');
    });
  });

  describe('Retry Logic', () => {
    const mockSession = {
      id: mockSessionId,
      user_id: mockUserId,
      coach_id: mockCoachId,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      message_count: 1,
      status: 'ended' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockMessages = [
      {
        id: 'msg-1',
        chat_session_id: 'chat-1',
        role: 'user' as const,
        content: 'Test message',
        created_at: new Date().toISOString(),
      },
    ];

    const mockCoach = {
      id: mockCoachId,
      name: 'Test Coach',
    };

    const mockAIResponse = {
      summary: 'Test summary with two sentences. This is the second sentence.',
      keyInsights: [{ text: 'Test insight', importance: 'high' as const }],
      actionItems: [{ text: 'Test action' }],
      decisions: ['Test decision'],
      topics: ['test'],
      confidence: 'high' as const,
    };

    const mockStoredReport = {
      id: 'report-1',
      session_id: mockSessionId,
      user_id: mockUserId,
      coach_id: mockCoachId,
      summary: mockAIResponse.summary,
      key_insights: mockAIResponse.keyInsights.map(i => ({ id: 'insight-1', ...i })),
      decisions: mockAIResponse.decisions,
      topics: mockAIResponse.topics,
      session_date: mockSession.start_time,
      session_duration: 0,
      message_count: 1,
      generated_at: new Date().toISOString(),
      confidence: mockAIResponse.confidence,
      generation_attempts: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    beforeEach(() => {
      // Mock Supabase queries
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'coaches') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCoach, error: null }),
          };
        }
        if (table === 'chat_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ id: 'chat-1' }], error: null }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
          };
        }
        if (table === 'session_reports') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockStoredReport, error: null }),
          };
        }
        if (table === 'action_items') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      // Mock auth session
      (supabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      });

      // Mock Supabase functions
      if (!supabase.functions) {
        (supabase as any).functions = {};
      }
      (supabase.functions.invoke as jest.Mock) = jest.fn().mockResolvedValue({
        data: { 
          success: true, 
          response: JSON.stringify(mockAIResponse) 
        },
        error: null,
      });
    });

    it('should implement exponential backoff for retries', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      try {
        // Call with attempt 2 to trigger the delay
        await generator.retryReportGeneration(mockSessionId, 2);
      } catch (error) {
        // Expected to potentially fail
      }

      global.setTimeout = originalSetTimeout;

      // Verify exponential backoff: 2000ms for attempt 2 (1000 * 2^(2-1))
      expect(delays[0]).toBe(2000);
    });

    it('should retry up to 3 times on failure', async () => {
      let attemptCount = 0;
      let storedAttemptNumber = 1;

      // Mock AI service to fail first 2 times, succeed on 3rd
      (supabase.functions.invoke as jest.Mock) = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({
            data: null,
            error: { message: 'AI service error' },
          });
        }
        return Promise.resolve({
          data: { 
            success: true, 
            response: JSON.stringify(mockAIResponse) 
          },
          error: null,
        });
      });

      // Mock report storage to capture attempt number
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'session_reports') {
          return {
            insert: jest.fn().mockImplementation((data) => {
              storedAttemptNumber = data.generation_attempts;
              return {
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ 
                  data: { ...mockStoredReport, generation_attempts: data.generation_attempts }, 
                  error: null 
                }),
              };
            }),
          };
        }
        // Return other mocks as before
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'coaches') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCoach, error: null }),
          };
        }
        if (table === 'chat_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ id: 'chat-1' }], error: null }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
          };
        }
        if (table === 'action_items') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      // Speed up delays for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback: any) => {
        return originalSetTimeout(callback, 0);
      }) as any;

      const report = await generator.generateReport(mockSessionId);

      global.setTimeout = originalSetTimeout;

      expect(report).toBeDefined();
      expect(attemptCount).toBe(3);
      expect(storedAttemptNumber).toBe(3);
    });

    it('should fail after 3 attempts if all retries fail', async () => {
      // Mock AI service to always fail
      (supabase.functions.invoke as jest.Mock) = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'AI service error' },
      });

      // Speed up delays for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback: any) => {
        return originalSetTimeout(callback, 0);
      }) as any;

      await expect(generator.generateReport(mockSessionId)).rejects.toThrow(
        'Report generation failed after 3 attempts'
      );

      global.setTimeout = originalSetTimeout;
    });

    it('should track generation attempts in database', async () => {
      let insertedReport: any = null;

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'session_reports') {
          return {
            insert: jest.fn().mockImplementation((data) => {
              insertedReport = data;
              return {
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ 
                  data: { ...mockStoredReport, generation_attempts: data.generation_attempts }, 
                  error: null 
                }),
              };
            }),
          };
        }
        // Return other mocks as before
        if (table === 'coaching_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'coaches') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockCoach, error: null }),
          };
        }
        if (table === 'chat_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ id: 'chat-1' }], error: null }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
          };
        }
        if (table === 'action_items') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      await generator.generateReport(mockSessionId);

      expect(insertedReport).toBeDefined();
      expect(insertedReport.generation_attempts).toBe(1);
    });

    it('should log failures for monitoring', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock AI service to fail
      (supabase.functions.invoke as jest.Mock) = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'AI service error' },
      });

      // Speed up delays for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback: any) => {
        return originalSetTimeout(callback, 0);
      }) as any;

      try {
        await generator.generateReport(mockSessionId);
      } catch (error) {
        // Expected to fail
      }

      global.setTimeout = originalSetTimeout;

      // Verify logging occurred
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();

      // Check for specific log messages
      const errorCalls = consoleErrorSpy.mock.calls.map(call => call.join(' '));
      const logCalls = consoleLogSpy.mock.calls.map(call => call.join(' '));

      expect(errorCalls.some(call => call.includes('FAILED'))).toBe(true);
      expect(logCalls.some(call => call.includes('Generating report'))).toBe(true);

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});
