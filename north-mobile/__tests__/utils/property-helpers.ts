import fc from 'fast-check';

/**
 * Property-based testing configuration
 * Minimum 100 iterations per property test as per design document
 */
export const PBT_CONFIG = {
  numRuns: 100,
  verbose: false,
};

/**
 * Custom arbitraries for North domain models
 */

// Context categories
export const contextCategoryArbitrary = fc.oneof(
  fc.constant('values' as const),
  fc.constant('goals' as const),
  fc.constant('projects' as const),
  fc.constant('constraints' as const)
);

// Invalid context categories (for negative testing)
export const invalidContextCategoryArbitrary = fc
  .string()
  .filter((s) => !['values', 'goals', 'projects', 'constraints'].includes(s));

// User context content (non-empty, max 1000 chars)
export const contextContentArbitrary = fc
  .string({ minLength: 1, maxLength: 1000 })
  .filter((s) => s.trim().length > 0);

// Coach name (non-empty, max 50 chars)
export const coachNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// Coach icon (emoji or icon identifier)
export const coachIconArbitrary = fc.oneof(
  fc.constant('🎯'),
  fc.constant('⚙️'),
  fc.constant('✍️'),
  fc.constant('🤔'),
  fc.constant('💡'),
  fc.constant('🚀'),
  fc.constant('📊'),
  fc.constant('🎨')
);

// Coach system prompt (non-empty, max 2000 chars)
export const systemPromptArbitrary = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

// Message role
export const messageRoleArbitrary = fc.oneof(
  fc.constant('user' as const),
  fc.constant('assistant' as const)
);

// Message content (non-empty, max 10000 chars)
export const messageContentArbitrary = fc
  .string({ minLength: 1, maxLength: 10000 })
  .filter((s) => s.trim().length > 0);

// Email address
export const emailArbitrary = fc.emailAddress();

// UUID v4
export const uuidArbitrary = fc.uuid();

// ISO timestamp
export const timestampArbitrary = fc
  .date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime())) // Filter out invalid dates
  .map((d) => d.toISOString());

/**
 * Helper to run property tests with standard configuration
 */
export function runPropertyTest<T>(
  property: fc.IProperty<T> | fc.IAsyncProperty<T>,
  config: Partial<fc.Parameters<T>> = {}
) {
  return fc.assert(property as fc.IProperty<T>, { ...PBT_CONFIG, ...config });
}

/**
 * Helper to create a property test with standard config
 */
export function property<Ts extends [unknown, ...unknown[]]>(
  ...args: [...arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> }, predicate: (...args: Ts) => boolean | void]
) {
  return fc.property(...args);
}

/**
 * Mock data generators for testing
 */

export function generateMockUser(overrides?: Partial<any>) {
  return {
    id: fc.sample(uuidArbitrary, 1)[0],
    email: fc.sample(emailArbitrary, 1)[0],
    name: fc.sample(fc.string({ minLength: 1, maxLength: 50 }), 1)[0],
    createdAt: fc.sample(timestampArbitrary, 1)[0],
    ...overrides,
  };
}

export function generateMockContext(overrides?: Partial<any>) {
  return {
    id: fc.sample(uuidArbitrary, 1)[0],
    userId: fc.sample(uuidArbitrary, 1)[0],
    category: fc.sample(contextCategoryArbitrary, 1)[0],
    content: fc.sample(contextContentArbitrary, 1)[0],
    createdAt: fc.sample(timestampArbitrary, 1)[0],
    updatedAt: fc.sample(timestampArbitrary, 1)[0],
    ...overrides,
  };
}

export function generateMockCoach(overrides?: Partial<any>) {
  return {
    id: fc.sample(uuidArbitrary, 1)[0],
    name: fc.sample(coachNameArbitrary, 1)[0],
    icon: fc.sample(coachIconArbitrary, 1)[0],
    systemPrompt: fc.sample(systemPromptArbitrary, 1)[0],
    creatorId: fc.sample(fc.option(uuidArbitrary, { nil: null }), 1)[0],
    isPublic: false,
    category: 'general' as const,
    isFeatured: false,
    sourceCoachId: null,
    createdAt: fc.sample(timestampArbitrary, 1)[0],
    updatedAt: fc.sample(timestampArbitrary, 1)[0],
    ...overrides,
  };
}

export function generateMockMessage(overrides?: Partial<any>) {
  return {
    id: fc.sample(uuidArbitrary, 1)[0],
    chatSessionId: fc.sample(uuidArbitrary, 1)[0],
    role: fc.sample(messageRoleArbitrary, 1)[0],
    content: fc.sample(messageContentArbitrary, 1)[0],
    createdAt: fc.sample(timestampArbitrary, 1)[0],
    ...overrides,
  };
}

export function generateMockChatSession(overrides?: Partial<any>) {
  return {
    id: fc.sample(uuidArbitrary, 1)[0],
    userId: fc.sample(uuidArbitrary, 1)[0],
    coachId: fc.sample(uuidArbitrary, 1)[0],
    createdAt: fc.sample(timestampArbitrary, 1)[0],
    updatedAt: fc.sample(timestampArbitrary, 1)[0],
    ...overrides,
  };
}
