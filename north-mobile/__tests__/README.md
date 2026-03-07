# Testing Infrastructure

This directory contains the testing infrastructure for the North mobile application.

## Overview

The testing strategy follows a dual approach as specified in the design document:

1. **Unit Tests**: Specific examples demonstrating correct behavior, edge cases, and error conditions
2. **Property-Based Tests**: Universal properties that hold for all inputs (minimum 100 iterations each)

## Test Structure

```
__tests__/
├── utils/
│   ├── test-utils.tsx          # Custom render functions and testing utilities
│   ├── property-helpers.ts     # Property-based testing helpers and arbitraries
│   └── mock-helpers.ts         # Mock factories for common testing scenarios
├── setup.test.ts               # Infrastructure verification tests
└── README.md                   # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only property-based tests
npm run test:pbt

# Run only unit tests
npm run test:unit
```

## Writing Tests

### Unit Tests

Unit tests should be co-located with the code they test using the `.test.ts` or `.test.tsx` suffix:

```typescript
// Example: stores/authStore.test.ts
import { authStore } from './authStore';

describe('authStore', () => {
  it('should login with valid credentials', async () => {
    // Test implementation
  });
});
```

### Property-Based Tests

Property tests should reference their design document property number:

```typescript
import fc from 'fast-check';
import { runPropertyTest, property, contextCategoryArbitrary } from '../utils/property-helpers';

// Feature: north-mobile-app, Property 6: Category Validation
describe('Property 6: Category Validation', () => {
  it('should only accept valid categories', () => {
    runPropertyTest(
      property(
        contextCategoryArbitrary,
        fc.string(),
        async (category, content) => {
          const result = await contextStore.createContext(category, content);
          expect(result.category).toBe(category);
        }
      )
    );
  });
});
```

## Test Utilities

### Custom Render

Use the custom render function for component tests:

```typescript
import { render, screen } from '../utils/test-utils';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeTruthy();
});
```

### Property Helpers

Use the provided arbitraries for domain models:

```typescript
import {
  contextCategoryArbitrary,
  coachNameArbitrary,
  messageRoleArbitrary,
  generateMockUser,
  generateMockContext,
} from '../utils/property-helpers';
```

### Mock Helpers

Use mock factories for common scenarios:

```typescript
import {
  createMockSupabaseClient,
  createMockRevenueCat,
  createMockRouter,
  flushPromises,
} from '../utils/mock-helpers';
```

## Coverage Goals

- Unit test coverage: >80% for business logic
- Property test coverage: 100% of correctness properties (66 properties total)
- Integration test coverage: All critical user flows

## Configuration

### Jest Configuration

See `jest.config.js` for Jest configuration including:
- Transform ignore patterns for React Native modules
- Coverage thresholds (80% for all metrics)
- Test match patterns
- Module name mapping

### Jest Setup

See `jest.setup.js` for global test setup including:
- Mock configurations for AsyncStorage, Expo Router, Supabase, RevenueCat
- Global test timeout (10 seconds)
- Console warning suppression

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Mock Minimally**: Only mock external dependencies, not internal logic
4. **Property Tests**: Run with minimum 100 iterations as per design document
5. **Coverage**: Aim for >80% coverage but focus on meaningful tests, not just coverage numbers
6. **Async Tests**: Always use async/await for asynchronous operations
7. **Cleanup**: Clean up after tests (clear mocks, restore state)

## Troubleshooting

### Tests Timing Out

If tests are timing out, increase the timeout in `jest.setup.js` or for specific tests:

```typescript
jest.setTimeout(30000); // 30 seconds
```

### Module Resolution Issues

If you encounter module resolution issues, check:
1. `transformIgnorePatterns` in `jest.config.js`
2. Module mocks in `jest.setup.js`
3. TypeScript path aliases in `tsconfig.json`

### Property Test Failures

When a property test fails:
1. Check the counterexample provided by fast-check
2. Determine if the test is incorrect or if there's a bug in the code
3. If the specification is unclear, ask the user for clarification
4. Use `fc.sample()` to generate example inputs for debugging

## References

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [fast-check Documentation](https://fast-check.dev/)
- Design Document: `.kiro/specs/north-mobile-app/design.md`
- Requirements Document: `.kiro/specs/north-mobile-app/requirements.md`
