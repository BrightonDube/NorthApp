# Library Utilities

This directory contains utility modules and configurations used throughout the North mobile application.

## Files

### `supabase.ts`

The main Supabase client configuration and helper functions.

**Features:**
- Configured Supabase client with automatic session persistence
- Type-safe database operations using generated types
- Helper functions for common authentication operations
- Automatic token refresh

**Usage:**

```typescript
import { supabase, getCurrentUser, getCurrentSession, signOut } from '@/lib/supabase';

// Authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get current user
const user = await getCurrentUser();

// Get current session
const session = await getCurrentSession();

// Sign out
await signOut();

// Database operations
const { data: contexts } = await supabase
  .from('user_context')
  .select('*')
  .eq('user_id', userId);
```

**Configuration:**
- Uses AsyncStorage for session persistence (enables offline access)
- Automatically refreshes expired tokens
- Validates environment variables on initialization

**Environment Variables Required:**
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### `database.types.ts`

TypeScript type definitions for the Supabase database schema.

**Features:**
- Complete type definitions for all database tables
- Row, Insert, and Update types for each table
- Helper types for easier access to table types
- Type-safe enum values for categories and roles

**Usage:**

```typescript
import type { 
  Profile, 
  UserContext, 
  Coach, 
  ChatSession, 
  Message,
  UserContextInsert,
  CoachUpdate 
} from '@/lib/database.types';

// Use types for function parameters and return values
async function createContext(data: UserContextInsert): Promise<UserContext> {
  const { data: context, error } = await supabase
    .from('user_context')
    .insert(data)
    .select()
    .single();
    
  if (error) throw error;
  return context;
}
```

**Available Types:**
- `Profile` - User profile data
- `UserContext` - User context items (values, goals, projects, constraints)
- `Coach` - AI coach definitions
- `ChatSession` - Chat sessions between users and coaches
- `Message` - Individual messages in chat sessions
- `*Insert` - Types for inserting new records
- `*Update` - Types for updating existing records

## Testing

Tests for the Supabase client are located in `__tests__/supabase.test.ts`.

Run tests:
```bash
npm test -- lib/__tests__/supabase.test.ts
```

## Requirements Validation

This module validates:
- **Requirement 1.1**: User Authentication and Session Management
- **Requirement 3.1**: Context Engine - Data Management
- **Requirement 6.1**: Coach System - Data Management
- **Requirement 8.1**: Chat System - Message Management
- **Requirement 8.2**: Chat System - Session Management

## Security

- All database operations respect Row Level Security (RLS) policies
- Session tokens are stored securely in AsyncStorage
- Environment variables are validated on initialization
- No sensitive data is logged or exposed

## Error Handling

The Supabase client and helper functions handle errors gracefully:
- Invalid credentials return descriptive error messages
- Network errors are caught and logged
- Missing environment variables throw clear error messages
- All errors are logged to console for debugging

## Next Steps

With the Supabase client configured, you can now:
1. Create the authentication store (Task 4.1)
2. Create the context store (Task 7.1)
3. Create the coach store (Task 9.1)
4. Create the chat store (Task 11.1)
