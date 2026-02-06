/**
 * Reduced Motion Component Tests
 * 
 * Tests that components properly respect reduced motion preferences.
 * Validates: Requirements 15.2, 23.1-23.10
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ContextCard } from '@/components/context/ContextCard';
import { StreamingIndicator } from '@/components/chat/StreamingIndicator';
import { Skeleton } from '@/components/SkeletonLoader';
import type { Message, UserContext } from '@/types';

// Mock only what we need
jest.mock('@/stores/networkStore', () => ({
  useIsOnline: jest.fn(() => false),
}));

jest.mock('react-native-gesture-handler', () => ({
  Swipeable: ({ children }: any) => children,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

// Mock AccessibilityInfo
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
  remove: jest.fn(),
});

describe('Reduced Motion Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MessageBubble', () => {
    const mockMessage: Message = {
      id: '1',
      chat_session_id: 'session-1',
      role: 'user',
      content: 'Test message',
      created_at: new Date().toISOString(),
    };

    it('should render successfully when reduced motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { getByText } = render(<MessageBubble message={mockMessage} />);

      await waitFor(() => {
        expect(getByText('Test message')).toBeTruthy();
      });
    });

    it('should render successfully when reduced motion is disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { getByText } = render(<MessageBubble message={mockMessage} />);

      await waitFor(() => {
        expect(getByText('Test message')).toBeTruthy();
      });
    });
  });

  describe('OfflineIndicator', () => {
    it('should render successfully when reduced motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { getByText } = render(<OfflineIndicator />);

      await waitFor(() => {
        expect(getByText("You're offline")).toBeTruthy();
      });
    });

    it('should render successfully when reduced motion is disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { getByText } = render(<OfflineIndicator />);

      await waitFor(() => {
        expect(getByText("You're offline")).toBeTruthy();
      });
    });
  });

  describe('ContextCard', () => {
    const mockContext: UserContext = {
      id: '1',
      user_id: 'user-1',
      category: 'values',
      content: 'Test value',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should render successfully when reduced motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText('Test value')).toBeTruthy();
      });
    });

    it('should render successfully when reduced motion is disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { getByText } = render(
        <ContextCard
          context={mockContext}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByText('Test value')).toBeTruthy();
      });
    });
  });

  describe('StreamingIndicator', () => {
    it('should render successfully when reduced motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { getByLabelText } = render(<StreamingIndicator />);

      await waitFor(() => {
        expect(getByLabelText('Assistant is typing')).toBeTruthy();
      });
    });

    it('should render successfully when reduced motion is disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { getByLabelText } = render(<StreamingIndicator />);

      await waitFor(() => {
        expect(getByLabelText('Assistant is typing')).toBeTruthy();
      });
    });
  });

  describe('Skeleton', () => {
    it('should render successfully when reduced motion is enabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { root } = render(<Skeleton width={100} height={20} />);

      await waitFor(() => {
        expect(root).toBeTruthy();
      });
    });

    it('should render successfully when reduced motion is disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { root } = render(<Skeleton width={100} height={20} />);

      await waitFor(() => {
        expect(root).toBeTruthy();
      });
    });
  });

  describe('Accessibility compliance', () => {
    it('should check reduced motion preference on component mount', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const mockMessage: Message = {
        id: '1',
        chat_session_id: 'session-1',
        role: 'user',
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      render(<MessageBubble message={mockMessage} />);

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });
    });

    it('should register for reduced motion changes', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const mockMessage: Message = {
        id: '1',
        chat_session_id: 'session-1',
        role: 'user',
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      render(<MessageBubble message={mockMessage} />);

      await waitFor(() => {
        expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
          'reduceMotionChanged',
          expect.any(Function)
        );
      });
    });
  });
});
