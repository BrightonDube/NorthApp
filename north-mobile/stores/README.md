# Stores

This directory contains Zustand stores for state management in the North mobile application.

## Overview

North uses [Zustand](https://github.com/pmndrs/zustand) for state management. Zustand provides a simple, lightweight, and performant solution for managing application state with minimal boilerplate.

## Available Stores

### authStore

**Location:** `stores/authStore.ts`

Manages user authentication state and session persistence.

**Features:**
- Email/password login
- Apple Sign In support
- Session persistence using AsyncStorage
- Automatic session restoration on app restart
- Auth state change listener
- Error handling

**Usage:**

```typescript
import { useAuthStore, useIsAuthenticated, useCurrentUser } from '@/stores/authStore';

function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const handleLogin = async () => {
    await login('user@example.com', 'password');
  };
  
  return (
    <View>
      {error && (
        <Alert>
          {error}
          <Button onPress={clearError}>Dismiss</Button>
        </Alert>
      )}
      <Button onPress={handleLogin} disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </View>
  );
}

// Check authentication status
function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <ProtectedContent />;
}

// Get current user
function ProfileScreen() {
  const user = useCurrentUser();
  
  return <Text>Welcome, {user?.name}!</Text>;
}
```

**Setup:**

Initialize the auth listener in your root component:

```typescript
import { setupAuthListener } from '@/stores/authStore';

function App() {
  useEffect(() => {
    setupAuthListener();
  }, []);
  
  return <YourApp />;
}
```

**State:**
- `user: User | null` - Current authenticated user
- `session: Session | null` - Current session with tokens
- `isLoading: boolean` - Loading state for async operations
- `error: string | null` - Error message if operation failed

**Actions:**
- `login(email, password)` - Login with email and password
- `loginWithApple()` - Initiate Apple Sign In flow
- `logout()` - Sign out and clear session
- `restoreSession()` - Restore session from storage on app start
- `clearError()` - Clear error state

**Validates Requirements:**
- 1.1: User Authentication and Session Management
- 1.2: Session creation and persistence
- 1.3: Session restoration across app restarts
- 1.4: Error handling for invalid credentials
- 1.6: Navigation after authentication
- 18.2: Session token persistence

## Store Patterns

### Creating a New Store

Follow this pattern when creating new stores:

```typescript
import { create } from 'zustand';

interface MyStore {
  // State
  data: any[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchData: () => Promise<void>;
  clearError: () => void;
}

export const useMyStore = create<MyStore>((set, get) => ({
  // Initial state
  data: [],
  isLoading: false,
  error: null,
  
  // Actions
  fetchData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.getData();
      set({ data: response, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
    }
  },
  
  clearError: () => set({ error: null }),
}));
```

### Best Practices

1. **Type Safety**: Always define TypeScript interfaces for your stores
2. **Error Handling**: Include error state and clear error actions
3. **Loading States**: Track loading state for async operations
4. **Persistence**: Use AsyncStorage for data that should persist across app restarts
5. **Optimistic Updates**: Update UI immediately, then sync with server
6. **Separation of Concerns**: Keep stores focused on specific domains
7. **Testing**: Write comprehensive tests for all store actions

### Testing Stores

Use React Testing Library's `renderHook` for testing stores:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useMyStore } from '../myStore';

describe('myStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMyStore.setState({
      data: [],
      isLoading: false,
      error: null,
    });
  });
  
  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useMyStore());
    
    await act(async () => {
      await result.current.fetchData();
    });
    
    expect(result.current.data).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

## Upcoming Stores

The following stores will be implemented as part of the North mobile app:

- **contextStore** - User context items (values, goals, projects, constraints)
- **coachStore** - AI coaches (default and user-created)
- **chatStore** - Chat sessions and messages
- **billingStore** - Subscription entitlements and paywall state

## Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Best Practices](https://github.com/pmndrs/zustand/wiki/Best-Practices)
- [Testing Zustand Stores](https://github.com/pmndrs/zustand/wiki/Testing)
