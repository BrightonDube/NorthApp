/**
 * Type Definitions for North Mobile Application
 * 
 * This file contains all TypeScript interfaces and types used throughout the application.
 * These types validate Requirements 3.1, 6.1, 8.1, 8.2 and support the data models
 * defined in the design document.
 */

// ============================================================================
// User and Authentication Types
// ============================================================================

/**
 * User profile information
 * Validates: Requirements 1.1, 1.2, 2.2
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Authentication session data
 * Validates: Requirements 1.2, 1.3
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================================================
// Context Engine Types
// ============================================================================

/**
 * Valid categories for user context items
 * Validates: Requirements 3.2, 3.3
 */
export type ContextCategory = 'values' | 'goals' | 'projects' | 'constraints';

/**
 * User context item representing part of the user's personal operating system
 * Validates: Requirements 3.1, 3.4, 3.5
 */
export interface UserContext {
  id: string;
  userId: string;
  category: ContextCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Coach System Types
// ============================================================================

/**
 * AI coach with specialized role and system prompt
 * Validates: Requirements 6.1, 6.2, 6.6
 */
export interface Coach {
  id: string;
  name: string;
  icon: string; // emoji or icon name
  systemPrompt: string;
  creatorId: string | null; // null for default coaches
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Chat System Types
// ============================================================================

/**
 * Chat session between a user and a coach
 * Validates: Requirements 8.2, 8.3
 */
export interface ChatSession {
  id: string;
  userId: string;
  coachId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message role in a conversation
 * Validates: Requirements 8.4, 8.5
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Individual message in a chat session
 * Validates: Requirements 8.1, 8.4, 8.5
 */
export interface Message {
  id: string;
  chatSessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// ============================================================================
// Billing and Subscription Types
// ============================================================================

/**
 * User subscription entitlements
 * Validates: Requirements 12.1, 12.2
 */
export interface Entitlements {
  pro: {
    isActive: boolean;
    expirationDate: string | null;
  };
}

/**
 * Subscription tier information
 * Validates: Requirements 12.3, 12.4
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request payload for chat API
 * Validates: Requirements 9.1, 9.2
 */
export interface ChatRequest {
  sessionId: string;
  coachId: string;
  message: string;
  userId: string;
}

/**
 * Streaming event types from chat API
 * Validates: Requirements 9.4, 9.5, 9.6
 */
export type StreamEvent = 
  | { type: 'token'; data: string }
  | { type: 'done'; data: { messageId: string } }
  | { type: 'error'; data: { message: string } };

/**
 * Context creation request
 * Validates: Requirements 3.3, 3.4
 */
export interface CreateContextRequest {
  category: ContextCategory;
  content: string;
}

/**
 * Context update request
 * Validates: Requirements 3.5
 */
export interface UpdateContextRequest {
  content: string;
}

/**
 * Coach creation request
 * Validates: Requirements 6.5, 7.2
 */
export interface CreateCoachRequest {
  name: string;
  icon: string;
  systemPrompt: string;
}

/**
 * Coach update request
 * Validates: Requirements 7.6
 */
export interface UpdateCoachRequest {
  name?: string;
  icon?: string;
  systemPrompt?: string;
}

/**
 * Login request
 * Validates: Requirements 1.1, 1.4
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Onboarding data
 * Validates: Requirements 2.2, 2.5
 */
export interface OnboardingData {
  name: string;
  primaryGoal?: string;
}

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Authentication store state
 * Validates: Requirements 1.1, 1.2, 1.3, 18.2
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication store actions
 * Validates: Requirements 1.1, 1.2, 1.3, 1.6
 */
export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<{ needsConfirmation: boolean } | undefined>;
  loginWithApple: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

/**
 * Complete authentication store
 */
export interface AuthStore extends AuthState, AuthActions {}

/**
 * Context store state
 * Validates: Requirements 3.1, 3.6, 3.7, 18.3
 */
export interface ContextState {
  items: UserContext[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Context store actions
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6, 4.1, 4.2
 */
export interface ContextActions {
  fetchContexts: () => Promise<void>;
  createContext: (category: ContextCategory, content: string) => Promise<void>;
  updateContext: (id: string, content: string) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
  canAddMore: () => boolean;
}

/**
 * Complete context store
 */
export interface ContextStore extends ContextState, ContextActions {}

/**
 * Coach store state
 * Validates: Requirements 6.1, 6.2, 6.3, 18.4
 */
export interface CoachState {
  coaches: Coach[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Coach store actions
 * Validates: Requirements 6.4, 6.5, 7.1, 7.2, 7.6, 7.7
 */
export interface CoachActions {
  fetchCoaches: () => Promise<void>;
  createCoach: (name: string, icon: string, systemPrompt: string) => Promise<void>;
  updateCoach: (id: string, updates: Partial<Coach>) => Promise<void>;
  deleteCoach: (id: string) => Promise<void>;
  canCreateCoach: () => boolean;
}

/**
 * Complete coach store
 */
export interface CoachStore extends CoachState, CoachActions {}

/**
 * Chat store state
 * Validates: Requirements 8.1, 8.2, 8.3, 9.5, 18.5
 */
export interface ChatState {
  sessions: Record<string, ChatSession>;
  messages: Record<string, Message[]>;
  streamingMessageId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Chat store actions
 * Validates: Requirements 8.3, 8.4, 8.5, 9.1, 9.5, 9.6
 */
export interface ChatActions {
  fetchOrCreateSession: (coachId: string) => Promise<ChatSession>;
  fetchMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  appendStreamingToken: (token: string) => void;
  finalizeStreamingMessage: () => void;
  retryLastMessage: (sessionId: string) => Promise<void>;
}

/**
 * Complete chat store
 */
export interface ChatStore extends ChatState, ChatActions {}

/**
 * Billing store state
 * Validates: Requirements 12.1, 12.2, 12.7
 */
export interface BillingState {
  entitlements: Entitlements | null;
  isProUser: boolean;
  isLoading: boolean;
}

/**
 * Billing store actions
 * Validates: Requirements 12.1, 12.3, 12.6
 */
export interface BillingActions {
  fetchEntitlements: () => Promise<void>;
  showPaywall: (feature: string) => void;
  restorePurchases: () => Promise<void>;
}

/**
 * Complete billing store
 */
export interface BillingStore extends BillingState, BillingActions {}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Coach card component props
 * Validates: Requirements 13.1, 13.2, 13.6
 */
export interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
}

/**
 * Context card component props
 * Validates: Requirements 14.2, 14.6, 14.7
 */
export interface ContextCardProps {
  context: UserContext;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Message bubble component props
 * Validates: Requirements 8.7, 11.1, 11.2
 */
export interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  isStreaming?: boolean;
}

/**
 * Paywall modal component props
 * Validates: Requirements 12.3
 */
export interface PaywallModalProps {
  visible: boolean;
  feature: string;
  onClose: () => void;
  onPurchase: () => void;
}

/**
 * Chat input component props
 * Validates: Requirements 11.3, 11.4
 */
export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Chat header component props
 * Validates: Requirements 11.6
 */
export interface ChatHeaderProps {
  coach: Coach;
  onBack: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Offline queue item
 * Validates: Requirements 16.4
 */
export interface OfflineQueueItem {
  id: string;
  type: 'CREATE_CONTEXT' | 'UPDATE_CONTEXT' | 'DELETE_CONTEXT' | 'CREATE_COACH' | 'UPDATE_COACH' | 'DELETE_COACH';
  payload: any;
  timestamp: number;
}

/**
 * Network status
 * Validates: Requirements 16.1, 16.2
 */
export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Theme preference
 * Validates: Requirements 15.4, 15.5
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * App configuration
 */
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  revenueCatApiKey: string;
  openAiApiKey?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Form field validation
 */
export interface FieldValidation {
  field: string;
  message: string;
}

// ============================================================================
// Default Coach Seed Data Type
// ============================================================================

/**
 * Default coach seed data (without generated fields)
 * Validates: Requirements 6.2
 */
export type DefaultCoachSeed = Omit<Coach, 'id' | 'createdAt' | 'updatedAt'>;
