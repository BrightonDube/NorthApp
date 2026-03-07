# TypeScript Type Definitions

This directory contains all TypeScript interfaces and types used throughout the North Mobile Application.

## Overview

The `index.ts` file defines comprehensive type definitions that validate Requirements 3.1, 6.1, 8.1, and 8.2 from the specification. These types ensure type safety across the entire application and serve as the single source of truth for data structures.

## Type Categories

### 1. User and Authentication Types
- `User` - User profile information
- `Session` - Authentication session data

### 2. Context Engine Types
- `ContextCategory` - Valid categories: 'values', 'goals', 'projects', 'constraints'
- `UserContext` - User context items representing the personal operating system

### 3. Coach System Types
- `Coach` - AI coach with specialized role and system prompt
- Default coaches have `creatorId: null`
- User-created coaches have `creatorId: string`

### 4. Chat System Types
- `ChatSession` - Conversation thread between user and coach
- `Message` - Individual message in a chat
- `MessageRole` - Either 'user' or 'assistant'

### 5. Billing and Subscription Types
- `Entitlements` - User subscription entitlements
- `SubscriptionTier` - Subscription tier information

### 6. API Request/Response Types
- `ChatRequest` - Request payload for chat API
- `StreamEvent` - Streaming event types from chat API
- `CreateContextRequest`, `UpdateContextRequest` - Context CRUD operations
- `CreateCoachRequest`, `UpdateCoachRequest` - Coach CRUD operations
- `LoginRequest` - Authentication request
- `OnboardingData` - Onboarding flow data

### 7. Store State Types
Complete type definitions for all Zustand stores:
- `AuthStore` - Authentication state and actions
- `ContextStore` - Context management state and actions
- `CoachStore` - Coach management state and actions
- `ChatStore` - Chat management state and actions
- `BillingStore` - Subscription management state and actions

### 8. Component Props Types
Type-safe props for all reusable components:
- `CoachCardProps`
- `ContextCardProps`
- `MessageBubbleProps`
- `PaywallModalProps`
- `ChatInputProps`
- `ChatHeaderProps`

### 9. Utility Types
- `ApiResponse<T>` - Generic API response wrapper
- `PaginationParams` - Pagination parameters
- `OfflineQueueItem` - Offline queue item for sync
- `NetworkStatus` - Network connectivity status
- `Theme` - Theme preference ('light', 'dark', 'system')
- `AppConfig` - Application configuration
- `ValidationResult` - Form validation result
- `FieldValidation` - Field-level validation

### 10. Special Types
- `DefaultCoachSeed` - Default coach seed data without generated fields

## Usage

Import types as needed throughout the application:

```typescript
import { User, Coach, Message, ContextCategory } from '@/types';
```

## Testing

All type definitions are validated with comprehensive unit tests in `__tests__/index.test.ts`. The tests verify:
- Type structure correctness
- Required vs optional fields
- Valid enum values
- Type composition and inheritance

Run tests with:
```bash
npm test types/__tests__/index.test.ts
```

## Requirements Validation

This implementation validates the following requirements:
- **Requirement 3.1**: Context Engine data structure with all required fields
- **Requirement 6.1**: Coach system data structure with all required fields
- **Requirement 8.1**: Message data structure with all required fields
- **Requirement 8.2**: Chat session data structure with all required fields

## Design Compliance

All types are implemented according to the specifications in:
- `.kiro/specs/north-mobile-app/design.md` - Data Models section
- `.kiro/specs/north-mobile-app/requirements.md` - All requirements

## Next Steps

These types will be used by:
1. Zustand stores for state management (Task 4.1, 7.1, 9.1, 11.1, 14.2)
2. Supabase client for database operations (Task 3.3)
3. React components for props validation (Tasks 7.3, 9.3, 11.3)
4. API integration for request/response typing (Task 12.1)
