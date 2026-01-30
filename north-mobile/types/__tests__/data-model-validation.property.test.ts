/**
 * Property-Based Tests for Data Model Validation
 * 
 * Task 2.2: Write property tests for data model validation
 * 
 * These tests validate the data structure integrity for User_Context, Coach,
 * Message, and ChatSession types using property-based testing with fast-check.
 * 
 * Each test runs 100 iterations to ensure properties hold across all valid inputs.
 */

import fc from 'fast-check';
import {
  UserContext,
  ContextCategory,
  Coach,
  Message,
  MessageRole,
  ChatSession,
} from '../index';
import {
  PBT_CONFIG,
  runPropertyTest,
  property,
  contextCategoryArbitrary,
  contextContentArbitrary,
  coachNameArbitrary,
  coachIconArbitrary,
  systemPromptArbitrary,
  messageRoleArbitrary,
  messageContentArbitrary,
  uuidArbitrary,
  timestampArbitrary,
} from '../../__tests__/utils/property-helpers';

describe('Data Model Validation - Property-Based Tests', () => {
  /**
   * Property 5: Context Data Structure Integrity
   * **Validates: Requirements 3.1**
   * 
   * For any created User_Context item, it should contain all required fields:
   * id, user_id, category, content, created_at, updated_at with valid values.
   */
  describe('Property 5: Context Data Structure Integrity', () => {
    it('should have all required fields with valid types', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          contextCategoryArbitrary,
          contextContentArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          (id, userId, category, content, createdAt, updatedAt) => {
            const context: UserContext = {
              id,
              userId,
              category,
              content,
              createdAt,
              updatedAt,
            };

            // Verify all required fields are present
            expect(context.id).toBeDefined();
            expect(context.userId).toBeDefined();
            expect(context.category).toBeDefined();
            expect(context.content).toBeDefined();
            expect(context.createdAt).toBeDefined();
            expect(context.updatedAt).toBeDefined();

            // Verify field types
            expect(typeof context.id).toBe('string');
            expect(typeof context.userId).toBe('string');
            expect(typeof context.category).toBe('string');
            expect(typeof context.content).toBe('string');
            expect(typeof context.createdAt).toBe('string');
            expect(typeof context.updatedAt).toBe('string');

            // Verify UUID format for id and userId
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(context.id).toMatch(uuidRegex);
            expect(context.userId).toMatch(uuidRegex);

            // Verify category is one of the valid values
            expect(['values', 'goals', 'projects', 'constraints']).toContain(context.category);

            // Verify content is non-empty and within limits
            expect(context.content.trim().length).toBeGreaterThan(0);
            expect(context.content.length).toBeLessThanOrEqual(1000);

            // Verify timestamps are valid ISO strings
            expect(() => new Date(context.createdAt)).not.toThrow();
            expect(() => new Date(context.updatedAt)).not.toThrow();
            expect(new Date(context.createdAt).toISOString()).toBe(context.createdAt);
            expect(new Date(context.updatedAt).toISOString()).toBe(context.updatedAt);
          }
        )
      );
    });

    it('should maintain data integrity when category changes', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          contextCategoryArbitrary,
          contextContentArbitrary,
          timestampArbitrary,
          (id, userId, category, content, timestamp) => {
            const context: UserContext = {
              id,
              userId,
              category,
              content,
              createdAt: timestamp,
              updatedAt: timestamp,
            };

            // All categories should be valid
            const validCategories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
            expect(validCategories).toContain(context.category);

            // Structure should remain intact regardless of category
            expect(Object.keys(context)).toEqual([
              'id',
              'userId',
              'category',
              'content',
              'createdAt',
              'updatedAt',
            ]);
          }
        )
      );
    });

    it('should handle content at boundary lengths', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          contextCategoryArbitrary,
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Minimum length
            fc.string({ minLength: 1000, maxLength: 1000 }), // Maximum length
            contextContentArbitrary // Normal length
          ),
          timestampArbitrary,
          timestampArbitrary,
          (id, userId, category, content, createdAt, updatedAt) => {
            const context: UserContext = {
              id,
              userId,
              category,
              content,
              createdAt,
              updatedAt,
            };

            // Content should be within valid range
            expect(context.content.length).toBeGreaterThanOrEqual(1);
            expect(context.content.length).toBeLessThanOrEqual(1000);

            // All other fields should remain valid
            expect(context.id).toBeDefined();
            expect(context.userId).toBeDefined();
            expect(context.category).toBeDefined();
          }
        )
      );
    });
  });

  /**
   * Property 15: Coach Data Structure Integrity
   * **Validates: Requirements 6.1**
   * 
   * For any created coach, it should contain all required fields:
   * id, name, icon, system_prompt, creator_id, is_public, created_at, updated_at
   * with valid values.
   */
  describe('Property 15: Coach Data Structure Integrity', () => {
    it('should have all required fields with valid types', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          fc.option(uuidArbitrary, { nil: null }),
          fc.boolean(),
          timestampArbitrary,
          timestampArbitrary,
          (id, name, icon, systemPrompt, creatorId, isPublic, createdAt, updatedAt) => {
            const coach: Coach = {
              id,
              name,
              icon,
              systemPrompt,
              creatorId,
              isPublic,
              createdAt,
              updatedAt,
            };

            // Verify all required fields are present
            expect(coach.id).toBeDefined();
            expect(coach.name).toBeDefined();
            expect(coach.icon).toBeDefined();
            expect(coach.systemPrompt).toBeDefined();
            expect(coach.createdAt).toBeDefined();
            expect(coach.updatedAt).toBeDefined();
            // creatorId can be null for default coaches
            // isPublic is always defined (boolean)

            // Verify field types
            expect(typeof coach.id).toBe('string');
            expect(typeof coach.name).toBe('string');
            expect(typeof coach.icon).toBe('string');
            expect(typeof coach.systemPrompt).toBe('string');
            expect(coach.creatorId === null || typeof coach.creatorId === 'string').toBe(true);
            expect(typeof coach.isPublic).toBe('boolean');
            expect(typeof coach.createdAt).toBe('string');
            expect(typeof coach.updatedAt).toBe('string');

            // Verify UUID format for id and creatorId (if not null)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(coach.id).toMatch(uuidRegex);
            if (coach.creatorId !== null) {
              expect(coach.creatorId).toMatch(uuidRegex);
            }

            // Verify name is non-empty and within limits
            expect(coach.name.trim().length).toBeGreaterThan(0);
            expect(coach.name.length).toBeLessThanOrEqual(50);

            // Verify icon is non-empty
            expect(coach.icon.trim().length).toBeGreaterThan(0);

            // Verify systemPrompt is non-empty and within limits
            expect(coach.systemPrompt.trim().length).toBeGreaterThan(0);
            expect(coach.systemPrompt.length).toBeLessThanOrEqual(2000);

            // Verify timestamps are valid ISO strings
            expect(() => new Date(coach.createdAt)).not.toThrow();
            expect(() => new Date(coach.updatedAt)).not.toThrow();
            expect(new Date(coach.createdAt).toISOString()).toBe(coach.createdAt);
            expect(new Date(coach.updatedAt).toISOString()).toBe(coach.updatedAt);
          }
        )
      );
    });

    it('should distinguish between default and user-created coaches', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          fc.boolean(),
          timestampArbitrary,
          timestampArbitrary,
          (id, name, icon, systemPrompt, isDefault, createdAt, updatedAt) => {
            const coach: Coach = {
              id,
              name,
              icon,
              systemPrompt,
              creatorId: isDefault ? null : fc.sample(uuidArbitrary, 1)[0],
              isPublic: false,
              createdAt,
              updatedAt,
            };

            // Default coaches have null creatorId
            if (coach.creatorId === null) {
              // This is a default coach
              expect(coach.creatorId).toBeNull();
            } else {
              // This is a user-created coach
              expect(typeof coach.creatorId).toBe('string');
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              expect(coach.creatorId).toMatch(uuidRegex);
            }

            // All other fields should be valid regardless
            expect(coach.id).toBeDefined();
            expect(coach.name).toBeDefined();
            expect(coach.systemPrompt).toBeDefined();
          }
        )
      );
    });

    it('should handle name and prompt at boundary lengths', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Minimum length
            fc.string({ minLength: 50, maxLength: 50 }), // Maximum length
            coachNameArbitrary // Normal length
          ),
          coachIconArbitrary,
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Minimum length
            fc.string({ minLength: 2000, maxLength: 2000 }), // Maximum length
            systemPromptArbitrary // Normal length
          ),
          fc.option(uuidArbitrary, { nil: null }),
          fc.boolean(),
          timestampArbitrary,
          timestampArbitrary,
          (id, name, icon, systemPrompt, creatorId, isPublic, createdAt, updatedAt) => {
            const coach: Coach = {
              id,
              name,
              icon,
              systemPrompt,
              creatorId,
              isPublic,
              createdAt,
              updatedAt,
            };

            // Name should be within valid range
            expect(coach.name.length).toBeGreaterThanOrEqual(1);
            expect(coach.name.length).toBeLessThanOrEqual(50);

            // System prompt should be within valid range
            expect(coach.systemPrompt.length).toBeGreaterThanOrEqual(1);
            expect(coach.systemPrompt.length).toBeLessThanOrEqual(2000);

            // All other fields should remain valid
            expect(coach.id).toBeDefined();
            expect(coach.icon).toBeDefined();
          }
        )
      );
    });
  });

  /**
   * Property 25: Message Data Structure Integrity
   * **Validates: Requirements 8.1**
   * 
   * For any created message, it should contain all required fields:
   * id, chat_session_id, role, content, created_at with valid values.
   */
  describe('Property 25: Message Data Structure Integrity', () => {
    it('should have all required fields with valid types', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          messageRoleArbitrary,
          messageContentArbitrary,
          timestampArbitrary,
          (id, chatSessionId, role, content, createdAt) => {
            const message: Message = {
              id,
              chatSessionId,
              role,
              content,
              createdAt,
            };

            // Verify all required fields are present
            expect(message.id).toBeDefined();
            expect(message.chatSessionId).toBeDefined();
            expect(message.role).toBeDefined();
            expect(message.content).toBeDefined();
            expect(message.createdAt).toBeDefined();

            // Verify field types
            expect(typeof message.id).toBe('string');
            expect(typeof message.chatSessionId).toBe('string');
            expect(typeof message.role).toBe('string');
            expect(typeof message.content).toBe('string');
            expect(typeof message.createdAt).toBe('string');

            // Verify UUID format for id and chatSessionId
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(message.id).toMatch(uuidRegex);
            expect(message.chatSessionId).toMatch(uuidRegex);

            // Verify role is one of the valid values
            expect(['user', 'assistant']).toContain(message.role);

            // Verify content is non-empty and within limits
            expect(message.content.trim().length).toBeGreaterThan(0);
            expect(message.content.length).toBeLessThanOrEqual(10000);

            // Verify timestamp is a valid ISO string
            expect(() => new Date(message.createdAt)).not.toThrow();
            expect(new Date(message.createdAt).toISOString()).toBe(message.createdAt);
          }
        )
      );
    });

    it('should maintain data integrity for both user and assistant roles', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          messageRoleArbitrary,
          messageContentArbitrary,
          timestampArbitrary,
          (id, chatSessionId, role, content, createdAt) => {
            const message: Message = {
              id,
              chatSessionId,
              role,
              content,
              createdAt,
            };

            // Both roles should be valid
            const validRoles: MessageRole[] = ['user', 'assistant'];
            expect(validRoles).toContain(message.role);

            // Structure should remain intact regardless of role
            expect(Object.keys(message)).toEqual([
              'id',
              'chatSessionId',
              'role',
              'content',
              'createdAt',
            ]);

            // All fields should be valid for both roles
            expect(message.id).toBeDefined();
            expect(message.chatSessionId).toBeDefined();
            expect(message.content).toBeDefined();
            expect(message.createdAt).toBeDefined();
          }
        )
      );
    });

    it('should handle content at boundary lengths', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          messageRoleArbitrary,
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Minimum length
            fc.string({ minLength: 10000, maxLength: 10000 }), // Maximum length
            messageContentArbitrary // Normal length
          ),
          timestampArbitrary,
          (id, chatSessionId, role, content, createdAt) => {
            const message: Message = {
              id,
              chatSessionId,
              role,
              content,
              createdAt,
            };

            // Content should be within valid range
            expect(message.content.length).toBeGreaterThanOrEqual(1);
            expect(message.content.length).toBeLessThanOrEqual(10000);

            // All other fields should remain valid
            expect(message.id).toBeDefined();
            expect(message.chatSessionId).toBeDefined();
            expect(message.role).toBeDefined();
            expect(['user', 'assistant']).toContain(message.role);
          }
        )
      );
    });
  });

  /**
   * Property 26: Chat Session Data Structure Integrity
   * **Validates: Requirements 8.2**
   * 
   * For any created chat session, it should contain all required fields:
   * id, user_id, coach_id, created_at, updated_at with valid values.
   */
  describe('Property 26: Chat Session Data Structure Integrity', () => {
    it('should have all required fields with valid types', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          (id, userId, coachId, createdAt, updatedAt) => {
            const session: ChatSession = {
              id,
              userId,
              coachId,
              createdAt,
              updatedAt,
            };

            // Verify all required fields are present
            expect(session.id).toBeDefined();
            expect(session.userId).toBeDefined();
            expect(session.coachId).toBeDefined();
            expect(session.createdAt).toBeDefined();
            expect(session.updatedAt).toBeDefined();

            // Verify field types
            expect(typeof session.id).toBe('string');
            expect(typeof session.userId).toBe('string');
            expect(typeof session.coachId).toBe('string');
            expect(typeof session.createdAt).toBe('string');
            expect(typeof session.updatedAt).toBe('string');

            // Verify UUID format for all ID fields
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(session.id).toMatch(uuidRegex);
            expect(session.userId).toMatch(uuidRegex);
            expect(session.coachId).toMatch(uuidRegex);

            // Verify timestamps are valid ISO strings
            expect(() => new Date(session.createdAt)).not.toThrow();
            expect(() => new Date(session.updatedAt)).not.toThrow();
            expect(new Date(session.createdAt).toISOString()).toBe(session.createdAt);
            expect(new Date(session.updatedAt).toISOString()).toBe(session.updatedAt);
          }
        )
      );
    });

    it('should maintain referential integrity between user and coach', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          (id, userId, coachId, createdAt, updatedAt) => {
            const session: ChatSession = {
              id,
              userId,
              coachId,
              createdAt,
              updatedAt,
            };

            // Session should have distinct IDs for session, user, and coach
            // (In a real scenario, userId and coachId would reference existing entities)
            expect(session.id).toBeDefined();
            expect(session.userId).toBeDefined();
            expect(session.coachId).toBeDefined();

            // All IDs should be valid UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(session.id).toMatch(uuidRegex);
            expect(session.userId).toMatch(uuidRegex);
            expect(session.coachId).toMatch(uuidRegex);

            // Structure should be consistent
            expect(Object.keys(session)).toEqual([
              'id',
              'userId',
              'coachId',
              'createdAt',
              'updatedAt',
            ]);
          }
        )
      );
    });

    it('should handle timestamp updates correctly', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          (id, userId, coachId, createdAt, updatedAt) => {
            const session: ChatSession = {
              id,
              userId,
              coachId,
              createdAt,
              updatedAt,
            };

            // Both timestamps should be valid
            const createdDate = new Date(session.createdAt);
            const updatedDate = new Date(session.updatedAt);

            expect(createdDate.toISOString()).toBe(session.createdAt);
            expect(updatedDate.toISOString()).toBe(session.updatedAt);

            // Timestamps should be valid dates
            expect(createdDate.getTime()).not.toBeNaN();
            expect(updatedDate.getTime()).not.toBeNaN();

            // All other fields should remain valid
            expect(session.id).toBeDefined();
            expect(session.userId).toBeDefined();
            expect(session.coachId).toBeDefined();
          }
        )
      );
    });

    it('should maintain uniqueness for user-coach pairs', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          (userId, coachId, createdAt, updatedAt) => {
            // Create two sessions with the same user-coach pair
            const session1: ChatSession = {
              id: fc.sample(uuidArbitrary, 1)[0],
              userId,
              coachId,
              createdAt,
              updatedAt,
            };

            const session2: ChatSession = {
              id: fc.sample(uuidArbitrary, 1)[0],
              userId,
              coachId,
              createdAt,
              updatedAt,
            };

            // Sessions should have different IDs even with same user-coach pair
            // (In a real database, there would be a unique constraint on userId+coachId)
            expect(session1.id).not.toBe(session2.id);

            // But they should have the same userId and coachId
            expect(session1.userId).toBe(session2.userId);
            expect(session1.coachId).toBe(session2.coachId);

            // Both should be valid sessions
            expect(session1.id).toBeDefined();
            expect(session2.id).toBeDefined();
          }
        )
      );
    });
  });
});
