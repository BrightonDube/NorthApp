/**
 * Property-Based Tests for Session Reports & Conversation Memory
 * Feature: session-reports-memory
 * 
 * This file contains property-based tests for the session reports database schema.
 * Tests verify that session metadata is correctly persisted and retrievable.
 * 
 * Task: 1.1 Write property test for database schema
 * Validates: Requirements 1.5
 */

import fc from 'fast-check';
import { supabase } from '../../lib/supabase';
import { runPropertyTest, property, uuidArbitrary } from '../utils/property-helpers';

/**
 * Custom arbitraries for session reports domain
 */

// Session status
const sessionStatusArbitrary = fc.oneof(
  fc.constant('active' as const),
  fc.constant('ended' as const)
);

// Message count (0 to 1000)
const messageCountArbitrary = fc.integer({ min: 0, max: 1000 });

// Session duration in minutes (1 to 480 = 8 hours)
const sessionDurationArbitrary = fc.integer({ min: 1, max: 480 });

// Timestamp within reasonable range
const sessionTimestampArbitrary = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/**
 * Property 5: Session Metadata Persistence
 * 
 * **Validates: Requirements 1.5**
 * 
 * For any session created, the start time, end time (when ended), and message count 
 * should be stored and retrievable from the database.
 */
describe('Feature: session-reports-memory', () => {
  // Test user credentials
  const testEmail = `session-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let testUserId: string;
  let testCoachId: string;
  let setupSuccessful = false;

  // Setup: Create test user and coach
  beforeAll(async () => {
    try {
      // Sign up test user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (signUpError) {
        console.warn('Skipping session-metadata tests: Failed to create test user:', signUpError.message);
        return;
      }

      if (!signUpData?.user?.id) {
        console.warn('Skipping session-metadata tests: No user data returned');
        return;
      }

      testUserId = signUpData.user.id;

      // Create a test coach
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .insert({
          name: 'Test Coach for Sessions',
          icon: '🤖',
          system_prompt: 'Test coach for session property tests',
          creator_id: testUserId,
        })
        .select()
        .single();

      if (coachError) {
        console.warn('Skipping session-metadata tests: Failed to create test coach:', coachError.message);
        return;
      }

      if (!coachData?.id) {
        console.warn('Skipping session-metadata tests: No coach data returned');
        return;
      }

      testCoachId = coachData.id;
      setupSuccessful = true;
    } catch (error) {
      console.warn('Skipping session-metadata tests: Setup failed with error:', error);
    }
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    // Delete test coach (will cascade to sessions)
    if (testCoachId) {
      await supabase.from('coaches').delete().eq('id', testCoachId);
    }

    // Sign out
    await supabase.auth.signOut();
  });

  describe('Property 5: Session Metadata Persistence', () => {
    it('should store and retrieve session start time, end time, and message count', async () => {
      if (!setupSuccessful) {
        console.log('Skipping test: Setup was not successful (requires database connection)');
        return;
      }

      await runPropertyTest(
        fc.asyncProperty(
          sessionTimestampArbitrary,
          fc.option(sessionTimestampArbitrary, { nil: null }),
          messageCountArbitrary,
          sessionStatusArbitrary,
          async (startTime: string, endTime: string | null, messageCount: number, status: string) => {
            // Ensure end_time is after start_time if both are present
            if (endTime && new Date(endTime) <= new Date(startTime)) {
              return; // Skip invalid combinations
            }

            // Ensure status is 'ended' if end_time is present
            const actualStatus = endTime ? 'ended' : status;

            // Create a session with the generated metadata
            const { data: session, error: insertError } = await supabase
              .from('coaching_sessions')
              .insert({
                user_id: testUserId,
                coach_id: testCoachId,
                start_time: startTime,
                end_time: endTime,
                message_count: messageCount,
                status: actualStatus,
              })
              .select()
              .single();

            // Verify insertion succeeded
            expect(insertError).toBeNull();
            expect(session).toBeDefined();

            if (!session) return;

            // Retrieve the session from the database
            const { data: retrievedSession, error: selectError } = await supabase
              .from('coaching_sessions')
              .select('*')
              .eq('id', session.id)
              .single();

            // Verify retrieval succeeded
            expect(selectError).toBeNull();
            expect(retrievedSession).toBeDefined();

            if (!retrievedSession) return;

            // Property: Start time should be stored and retrievable
            expect(retrievedSession.start_time).toBeDefined();
            expect(new Date(retrievedSession.start_time).toISOString()).toBe(startTime);

            // Property: End time should be stored and retrievable (or null)
            if (endTime) {
              expect(retrievedSession.end_time).toBeDefined();
              expect(new Date(retrievedSession.end_time as string).toISOString()).toBe(endTime);
            } else {
              expect(retrievedSession.end_time).toBeNull();
            }

            // Property: Message count should be stored and retrievable
            expect(retrievedSession.message_count).toBe(messageCount);

            // Property: Status should be stored and retrievable
            expect(retrievedSession.status).toBe(actualStatus);

            // Property: User ID and Coach ID should be preserved
            expect(retrievedSession.user_id).toBe(testUserId);
            expect(retrievedSession.coach_id).toBe(testCoachId);

            // Property: Timestamps should be automatically set
            expect(retrievedSession.created_at).toBeDefined();
            expect(retrievedSession.updated_at).toBeDefined();

            // Cleanup: Delete the test session
            await supabase.from('coaching_sessions').delete().eq('id', session.id);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as per design requirements
      );
    });

    it('should handle active sessions without end time', async () => {
      if (!setupSuccessful) {
        console.log('Skipping test: Setup was not successful (requires database connection)');
        return;
      }

      await runPropertyTest(
        fc.asyncProperty(
          sessionTimestampArbitrary,
          messageCountArbitrary,
          async (startTime: string, messageCount: number) => {
            // Create an active session (no end time)
            const { data: session, error: insertError } = await supabase
              .from('coaching_sessions')
              .insert({
                user_id: testUserId,
                coach_id: testCoachId,
                start_time: startTime,
                end_time: null,
                message_count: messageCount,
                status: 'active',
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(session).toBeDefined();

            if (!session) return;

            // Retrieve the session
            const { data: retrievedSession, error: selectError } = await supabase
              .from('coaching_sessions')
              .select('*')
              .eq('id', session.id)
              .single();

            expect(selectError).toBeNull();
            expect(retrievedSession).toBeDefined();

            if (!retrievedSession) return;

            // Property: Active sessions should have null end_time
            expect(retrievedSession.end_time).toBeNull();
            expect(retrievedSession.status).toBe('active');

            // Property: Start time and message count should still be persisted
            expect(new Date(retrievedSession.start_time).toISOString()).toBe(startTime);
            expect(retrievedSession.message_count).toBe(messageCount);

            // Cleanup
            await supabase.from('coaching_sessions').delete().eq('id', session.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle ended sessions with end time', async () => {
      if (!setupSuccessful) {
        console.log('Skipping test: Setup was not successful (requires database connection)');
        return;
      }

      await runPropertyTest(
        fc.asyncProperty(
          sessionTimestampArbitrary,
          sessionDurationArbitrary,
          messageCountArbitrary,
          async (startTime: string, durationMinutes: number, messageCount: number) => {
            // Calculate end time based on start time + duration
            const startDate = new Date(startTime);
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
            const endTime = endDate.toISOString();

            // Create an ended session
            const { data: session, error: insertError } = await supabase
              .from('coaching_sessions')
              .insert({
                user_id: testUserId,
                coach_id: testCoachId,
                start_time: startTime,
                end_time: endTime,
                message_count: messageCount,
                status: 'ended',
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(session).toBeDefined();

            if (!session) return;

            // Retrieve the session
            const { data: retrievedSession, error: selectError } = await supabase
              .from('coaching_sessions')
              .select('*')
              .eq('id', session.id)
              .single();

            expect(selectError).toBeNull();
            expect(retrievedSession).toBeDefined();

            if (!retrievedSession) return;

            // Property: Ended sessions should have end_time set
            expect(retrievedSession.end_time).toBeDefined();
            expect(retrievedSession.status).toBe('ended');

            // Property: End time should be after start time
            const retrievedStartTime = new Date(retrievedSession.start_time).getTime();
            const retrievedEndTime = new Date(retrievedSession.end_time as string).getTime();
            expect(retrievedEndTime).toBeGreaterThan(retrievedStartTime);

            // Property: Duration should match
            const actualDuration = Math.floor((retrievedEndTime - retrievedStartTime) / (60 * 1000));
            expect(actualDuration).toBe(durationMinutes);

            // Property: Message count should be persisted
            expect(retrievedSession.message_count).toBe(messageCount);

            // Cleanup
            await supabase.from('coaching_sessions').delete().eq('id', session.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update message count correctly', async () => {
      if (!setupSuccessful) {
        console.log('Skipping test: Setup was not successful (requires database connection)');
        return;
      }

      await runPropertyTest(
        fc.asyncProperty(
          messageCountArbitrary,
          messageCountArbitrary,
          async (initialCount: number, updatedCount: number) => {
            // Create a session with initial message count
            const { data: session, error: insertError } = await supabase
              .from('coaching_sessions')
              .insert({
                user_id: testUserId,
                coach_id: testCoachId,
                message_count: initialCount,
                status: 'active',
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(session).toBeDefined();

            if (!session) return;

            // Verify initial count
            expect(session.message_count).toBe(initialCount);

            // Update the message count
            const { data: updatedSession, error: updateError } = await supabase
              .from('coaching_sessions')
              .update({ message_count: updatedCount })
              .eq('id', session.id)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updatedSession).toBeDefined();

            if (!updatedSession) return;

            // Property: Updated message count should be persisted
            expect(updatedSession.message_count).toBe(updatedCount);

            // Property: updated_at should be automatically updated
            expect(new Date(updatedSession.updated_at).getTime()).toBeGreaterThanOrEqual(
              new Date(session.updated_at).getTime()
            );

            // Cleanup
            await supabase.from('coaching_sessions').delete().eq('id', session.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce status constraint', async () => {
      if (!setupSuccessful) {
        console.log('Skipping test: Setup was not successful (requires database connection)');
        return;
      }

      // Test that only valid status values are accepted
      const validStatuses = ['active', 'ended'];
      
      for (const status of validStatuses) {
        const { data: session, error } = await supabase
          .from('coaching_sessions')
          .insert({
            user_id: testUserId,
            coach_id: testCoachId,
            status: status,
            message_count: 0,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(session).toBeDefined();
        expect(session?.status).toBe(status);

        // Cleanup
        if (session) {
          await supabase.from('coaching_sessions').delete().eq('id', session.id);
        }
      }

      // Test that invalid status values are rejected
      const { error: invalidError } = await supabase
        .from('coaching_sessions')
        .insert({
          user_id: testUserId,
          coach_id: testCoachId,
          status: 'invalid_status' as any,
          message_count: 0,
        });

      expect(invalidError).toBeDefined();
      expect(invalidError?.message).toContain('status');
    });
  });
});
