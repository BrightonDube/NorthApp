/**
 * Unit tests for TypeScript type definitions
 * 
 * These tests validate that the type definitions are correctly structured
 * and can be used as intended throughout the application.
 */

import {
  User,
  Session,
  ContextCategory,
  UserContext,
  Coach,
  CoachCategory,
  ChatSession,
  Message,
  MessageRole,
  Entitlements,
  SubscriptionTier,
  ChatRequest,
  StreamEvent,
  CreateContextRequest,
  UpdateContextRequest,
  CreateCoachRequest,
  UpdateCoachRequest,
  LoginRequest,
  OnboardingData,
  AuthStore,
  ContextStore,
  CoachStore,
  ChatStore,
  BillingStore,
  CoachCardProps,
  ContextCardProps,
  MessageBubbleProps,
  PaywallModalProps,
  ChatInputProps,
  ChatHeaderProps,
  ApiResponse,
  PaginationParams,
  OfflineQueueItem,
  NetworkStatus,
  Theme,
  AppConfig,
  ValidationResult,
  FieldValidation,
  DefaultCoachSeed,
} from '../index';

describe('Type Definitions', () => {
  describe('User and Authentication Types', () => {
    it('should create a valid User object', () => {
      const user: User = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      expect(user.id).toBe('123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('should create a valid Session object', () => {
      const session: Session = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };

      expect(session.accessToken).toBe('access-token');
      expect(session.refreshToken).toBe('refresh-token');
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Context Engine Types', () => {
    it('should accept valid ContextCategory values', () => {
      const categories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
      
      categories.forEach(category => {
        expect(['values', 'goals', 'projects', 'constraints']).toContain(category);
      });
    });

    it('should create a valid UserContext object', () => {
      const context: UserContext = {
        id: 'ctx-1',
        userId: 'user-1',
        category: 'goals',
        content: 'Build a successful startup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(context.category).toBe('goals');
      expect(context.content).toBe('Build a successful startup');
    });
  });

  describe('Coach System Types', () => {
    it('should create a valid Coach object', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Strategy Coach',
        icon: '🎯',
        systemPrompt: 'You are a strategic thinking coach.',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(coach.name).toBe('Strategy Coach');
      expect(coach.creatorId).toBeNull();
      expect(coach.isPublic).toBe(false);
    });

    it('should create a valid user-created Coach object', () => {
      const coach: Coach = {
        id: 'coach-2',
        name: 'Custom Coach',
        icon: '💡',
        systemPrompt: 'Custom prompt',
        creatorId: 'user-1',
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(coach.creatorId).toBe('user-1');
    });
  });

  describe('Chat System Types', () => {
    it('should create a valid ChatSession object', () => {
      const session: ChatSession = {
        id: 'session-1',
        userId: 'user-1',
        coachId: 'coach-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(session.userId).toBe('user-1');
      expect(session.coachId).toBe('coach-1');
    });

    it('should accept valid MessageRole values', () => {
      const roles: MessageRole[] = ['user', 'assistant'];
      
      roles.forEach(role => {
        expect(['user', 'assistant']).toContain(role);
      });
    });

    it('should create a valid Message object', () => {
      const message: Message = {
        id: 'msg-1',
        chatSessionId: 'session-1',
        role: 'user',
        content: 'Hello, coach!',
        createdAt: new Date().toISOString(),
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, coach!');
    });
  });

  describe('Billing and Subscription Types', () => {
    it('should create a valid Entitlements object for free user', () => {
      const entitlements: Entitlements = {
        pro: {
          isActive: false,
          expirationDate: null,
        },
      };

      expect(entitlements.pro.isActive).toBe(false);
      expect(entitlements.pro.expirationDate).toBeNull();
    });

    it('should create a valid Entitlements object for pro user', () => {
      const entitlements: Entitlements = {
        pro: {
          isActive: true,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      expect(entitlements.pro.isActive).toBe(true);
      expect(entitlements.pro.expirationDate).not.toBeNull();
    });

    it('should create a valid SubscriptionTier object', () => {
      const tier: SubscriptionTier = {
        id: 'pro',
        name: 'Pro',
        price: '$9.99/month',
        features: ['Unlimited context items', 'Custom coaches', 'Priority support'],
      };

      expect(tier.id).toBe('pro');
      expect(tier.features).toHaveLength(3);
    });
  });

  describe('API Request/Response Types', () => {
    it('should create a valid ChatRequest object', () => {
      const request: ChatRequest = {
        sessionId: 'session-1',
        coachId: 'coach-1',
        message: 'Help me with strategy',
        userId: 'user-1',
      };

      expect(request.message).toBe('Help me with strategy');
    });

    it('should create valid StreamEvent objects', () => {
      const tokenEvent: StreamEvent = {
        type: 'token',
        data: 'Hello',
      };

      const doneEvent: StreamEvent = {
        type: 'done',
        data: { messageId: 'msg-1' },
      };

      const errorEvent: StreamEvent = {
        type: 'error',
        data: { message: 'API error' },
      };

      expect(tokenEvent.type).toBe('token');
      expect(doneEvent.type).toBe('done');
      expect(errorEvent.type).toBe('error');
    });

    it('should create a valid CreateContextRequest object', () => {
      const request: CreateContextRequest = {
        category: 'values',
        content: 'Integrity and honesty',
      };

      expect(request.category).toBe('values');
    });

    it('should create a valid CreateCoachRequest object', () => {
      const request: CreateCoachRequest = {
        name: 'My Coach',
        icon: '🤖',
        systemPrompt: 'You are my personal coach.',
      };

      expect(request.name).toBe('My Coach');
    });

    it('should create a valid LoginRequest object', () => {
      const request: LoginRequest = {
        email: 'user@example.com',
        password: 'password123',
      };

      expect(request.email).toBe('user@example.com');
    });

    it('should create a valid OnboardingData object', () => {
      const data: OnboardingData = {
        name: 'John Doe',
        primaryGoal: 'Build a successful business',
      };

      expect(data.name).toBe('John Doe');
      expect(data.primaryGoal).toBe('Build a successful business');
    });

    it('should create OnboardingData without optional goal', () => {
      const data: OnboardingData = {
        name: 'Jane Doe',
      };

      expect(data.name).toBe('Jane Doe');
      expect(data.primaryGoal).toBeUndefined();
    });
  });

  describe('Store State Types', () => {
    it('should define AuthStore with correct structure', () => {
      // This is a type check - if it compiles, the structure is correct
      const mockAuthStore: Partial<AuthStore> = {
        user: null,
        session: null,
        isLoading: false,
        error: null,
      };

      expect(mockAuthStore.user).toBeNull();
      expect(mockAuthStore.isLoading).toBe(false);
    });

    it('should define ContextStore with correct structure', () => {
      const mockContextStore: Partial<ContextStore> = {
        items: [],
        isLoading: false,
        error: null,
      };

      expect(mockContextStore.items).toEqual([]);
    });

    it('should define CoachStore with correct structure', () => {
      const mockCoachStore: Partial<CoachStore> = {
        coaches: [],
        isLoading: false,
        error: null,
      };

      expect(mockCoachStore.coaches).toEqual([]);
    });

    it('should define ChatStore with correct structure', () => {
      const mockChatStore: Partial<ChatStore> = {
        sessions: {},
        messages: {},
        streamingMessageId: null,
        isLoading: false,
        error: null,
      };

      expect(mockChatStore.sessions).toEqual({});
      expect(mockChatStore.messages).toEqual({});
    });

    it('should define BillingStore with correct structure', () => {
      const mockBillingStore: Partial<BillingStore> = {
        entitlements: null,
        isProUser: false,
        isLoading: false,
      };

      expect(mockBillingStore.isProUser).toBe(false);
    });
  });

  describe('Component Props Types', () => {
    it('should create valid CoachCardProps', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'Test prompt',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const props: CoachCardProps = {
        coach,
        onPress: () => {},
      };

      expect(props.coach.name).toBe('Test Coach');
    });

    it('should create valid MessageBubbleProps', () => {
      const message: Message = {
        id: 'msg-1',
        chatSessionId: 'session-1',
        role: 'user',
        content: 'Test message',
        createdAt: new Date().toISOString(),
      };

      const props: MessageBubbleProps = {
        message,
        isUser: true,
        isStreaming: false,
      };

      expect(props.isUser).toBe(true);
      expect(props.isStreaming).toBe(false);
    });

    it('should create valid PaywallModalProps', () => {
      const props: PaywallModalProps = {
        visible: true,
        feature: 'Custom Coaches',
        onClose: () => {},
        onPurchase: () => {},
      };

      expect(props.visible).toBe(true);
      expect(props.feature).toBe('Custom Coaches');
    });
  });

  describe('Utility Types', () => {
    it('should create a valid ApiResponse', () => {
      const successResponse: ApiResponse<User> = {
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          createdAt: new Date().toISOString(),
        },
        error: null,
      };

      const errorResponse: ApiResponse<User> = {
        data: null,
        error: 'Something went wrong',
      };

      expect(successResponse.data).not.toBeNull();
      expect(errorResponse.error).toBe('Something went wrong');
    });

    it('should create valid PaginationParams', () => {
      const params: PaginationParams = {
        page: 1,
        limit: 20,
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(20);
    });

    it('should create a valid OfflineQueueItem', () => {
      const item: OfflineQueueItem = {
        id: 'queue-1',
        type: 'CREATE_CONTEXT',
        payload: { category: 'goals', content: 'Test goal' },
        timestamp: Date.now(),
      };

      expect(item.type).toBe('CREATE_CONTEXT');
    });

    it('should create a valid NetworkStatus', () => {
      const status: NetworkStatus = {
        isConnected: true,
        isInternetReachable: true,
      };

      expect(status.isConnected).toBe(true);
    });

    it('should accept valid Theme values', () => {
      const themes: Theme[] = ['light', 'dark', 'system'];
      
      themes.forEach(theme => {
        expect(['light', 'dark', 'system']).toContain(theme);
      });
    });

    it('should create a valid AppConfig', () => {
      const config: AppConfig = {
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'anon-key',
        revenueCatApiKey: 'rc-key',
      };

      expect(config.supabaseUrl).toBe('https://example.supabase.co');
    });

    it('should create a valid ValidationResult', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Email is required', 'Password is too short'],
      };

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Default Coach Seed Data Type', () => {
    it('should create valid DefaultCoachSeed without generated fields', () => {
      const seed: DefaultCoachSeed = {
        name: 'Strategy Coach',
        icon: '🎯',
        systemPrompt: 'You are a strategic thinking coach.',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
      };

      expect(seed.name).toBe('Strategy Coach');
      expect(seed.creatorId).toBeNull();
      // Should not have id, createdAt, updatedAt
      expect('id' in seed).toBe(false);
      expect('createdAt' in seed).toBe(false);
      expect('updatedAt' in seed).toBe(false);
    });
  });
});
