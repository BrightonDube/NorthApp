# Session Reports Property Tests

This directory contains property-based tests for the Session Reports & Conversation Memory feature.

## Tests

### `session-metadata.property.test.ts`

**Property 5: Session Metadata Persistence**

Tests that session metadata (start time, end time, message count) is correctly persisted and retrievable from the database.

**Validates**: Requirements 1.5

**Test Coverage**:
- Session start time, end time, and message count persistence
- Active sessions without end time
- Ended sessions with end time
- Message count updates
- Status constraint enforcement

## Running the Tests

### Prerequisites

1. **Database Setup**: Ensure the `add_session_reports_memory.sql` migration has been applied to your Supabase database.

2. **Environment Variables**: Set up your `.env` file with Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Run Property Tests

```bash
# Run all property tests
npm run test:pbt

# Run only session reports property tests
npm test -- --testPathPattern=session-reports

# Run with verbose output
npm test -- --testPathPattern=session-reports --verbose

# Run specific test
npm test -- --testPathPattern=session-metadata.property
```

### Test Configuration

- **Iterations**: 100 runs per property (as per design requirements)
- **Test Environment**: Node (requires real database access)
- **Timeout**: 30 seconds (for database operations)

## Test Structure

Each property test follows this structure:

1. **Setup**: Create test user and test coach
2. **Property Test**: Run 100 iterations with randomized inputs
3. **Assertions**: Verify the property holds for all inputs
4. **Cleanup**: Delete test data after each iteration
5. **Teardown**: Remove test user and coach

## Troubleshooting

### Test Timeout

If tests timeout, increase the Jest timeout:
```typescript
jest.setTimeout(60000); // 60 seconds
```

### Database Connection Issues

Ensure:
- Supabase project is running
- Environment variables are correctly set
- Database migration has been applied
- RLS policies allow test user access

### Authentication Errors

The tests create a temporary test user. If you see authentication errors:
- Check that email signup is enabled in Supabase Auth settings
- Verify that RLS policies allow authenticated users to access their own data

## Property Test Principles

Property tests verify universal properties that should hold for all valid inputs:

- **Property 5**: For ANY session created, the start time, end time (when ended), and message count should be stored and retrievable

This is different from unit tests which test specific examples. Property tests use randomized inputs to find edge cases and verify correctness across the entire input space.

## Adding New Property Tests

When adding new property tests for session reports:

1. Reference the property number and description from the design document
2. Use the `runPropertyTest` helper with 100 iterations
3. Use appropriate arbitraries from `property-helpers.ts`
4. Clean up test data after each iteration
5. Add documentation to this README

## Related Files

- Design Document: `.kiro/specs/session-reports-memory/design.md`
- Requirements: `.kiro/specs/session-reports-memory/requirements.md`
- Tasks: `.kiro/specs/session-reports-memory/tasks.md`
- Migration: `supabase/migrations/add_session_reports_memory.sql`
- Property Helpers: `north-mobile/__tests__/utils/property-helpers.ts`
