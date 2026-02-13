/**
 * MessageBubble Component Unit Tests
 * 
 * Tests for the MessageBubble component including rendering for different roles
 * and streaming states.
 * 
 * Validates: Requirements 10.4, 11.1, 11.2
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '../MessageBubble';
import type { Message } from '@/types';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const Animated = {
    View: View,
    Text: require('react-native').Text,
  };
  
  return {
    default: Animated,
    __esModule: true,
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
  };
});

describe('MessageBubble', () => {
  const mockUserMessage: Message = {
    id: '1',
    chatSessionId: 'session-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date().toISOString(),
  };

  const mockAssistantMessage: Message = {
    id: '2',
    chatSessionId: 'session-1',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: new Date().toISOString(),
  };

  describe('User Messages', () => {
    it('should render user message correctly', () => {
      const { getByText } = render(
        <MessageBubble message={mockUserMessage} />
      );

      expect(getByText('Hello, how are you?')).toBeTruthy();
    });

    it('should apply correct styling for user messages', () => {
      const { getByTestId } = render(
        <MessageBubble message={mockUserMessage} />
      );

      const bubble = getByTestId(`message-bubble-${mockUserMessage.id}`);
      
      // User messages should be right-aligned (check style object)
      const style = bubble.props.style;
      const hasFlexEnd = Array.isArray(style) 
        ? style.some(s => s?.alignItems === 'flex-end')
        : style?.alignItems === 'flex-end';
      expect(hasFlexEnd).toBe(true);
    });

    it('should have correct accessibility label for user messages', () => {
      const { getByLabelText } = render(
        <MessageBubble message={mockUserMessage} />
      );

      expect(getByLabelText('You said: Hello, how are you?')).toBeTruthy();
    });

    it('should render long user messages', () => {
      const longMessage: Message = {
        ...mockUserMessage,
        content: 'This is a very long message that should still render correctly. '.repeat(10),
      };

      const { getByText } = render(
        <MessageBubble message={longMessage} />
      );

      expect(getByText(longMessage.content)).toBeTruthy();
    });
  });

  describe('Assistant Messages', () => {
    it('should render assistant message correctly', () => {
      const { getByText } = render(
        <MessageBubble message={mockAssistantMessage} />
      );

      expect(getByText('I am doing well, thank you!')).toBeTruthy();
    });

    it('should apply correct styling for assistant messages', () => {
      const { getByTestId } = render(
        <MessageBubble message={mockAssistantMessage} />
      );

      const bubble = getByTestId(`message-bubble-${mockAssistantMessage.id}`);
      
      // Assistant messages should be left-aligned (check style object)
      const style = bubble.props.style;
      const hasFlexStart = Array.isArray(style)
        ? style.some(s => s?.alignItems === 'flex-start')
        : style?.alignItems === 'flex-start';
      expect(hasFlexStart).toBe(true);
    });

    it('should have correct accessibility label for assistant messages', () => {
      const { getByLabelText } = render(
        <MessageBubble message={mockAssistantMessage} />
      );

      expect(getByLabelText('Assistant said: I am doing well, thank you!')).toBeTruthy();
    });

    it('should render long assistant messages', () => {
      const longMessage: Message = {
        ...mockAssistantMessage,
        content: 'This is a very long response from the assistant. '.repeat(10),
      };

      const { getByText } = render(
        <MessageBubble message={longMessage} />
      );

      expect(getByText(longMessage.content)).toBeTruthy();
    });
  });

  describe('Streaming State', () => {
    it('should show streaming indicator when isStreaming is true', () => {
      const { getByText } = render(
        <MessageBubble message={mockAssistantMessage} isStreaming={true} />
      );

      // Check for the streaming indicator (▊)
      expect(getByText(/▊/)).toBeTruthy();
    });

    it('should not show streaming indicator when isStreaming is false', () => {
      const { queryByText } = render(
        <MessageBubble message={mockAssistantMessage} isStreaming={false} />
      );

      // Streaming indicator should not be present
      expect(queryByText(/▊/)).toBeNull();
    });

    it('should not show streaming indicator by default', () => {
      const { queryByText } = render(
        <MessageBubble message={mockAssistantMessage} />
      );

      // Streaming indicator should not be present when isStreaming is undefined
      expect(queryByText(/▊/)).toBeNull();
    });

    it('should render partial content with streaming indicator', () => {
      const partialMessage: Message = {
        ...mockAssistantMessage,
        content: 'This is a partial',
      };

      const { getByLabelText, getByText } = render(
        <MessageBubble message={partialMessage} isStreaming={true} />
      );

      // Check accessibility label contains the content
      expect(getByLabelText(/This is a partial/)).toBeTruthy();
      // Check streaming indicator is present
      expect(getByText(/▊/)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render empty message content', () => {
      const emptyMessage: Message = {
        ...mockUserMessage,
        content: '',
      };

      const { getByTestId } = render(
        <MessageBubble message={emptyMessage} />
      );

      expect(getByTestId(`message-bubble-${emptyMessage.id}`)).toBeTruthy();
    });

    it('should render message with special characters', () => {
      const specialMessage: Message = {
        ...mockUserMessage,
        content: 'Hello! @#$%^&*() <script>alert("test")</script>',
      };

      const { getByText } = render(
        <MessageBubble message={specialMessage} />
      );

      expect(getByText(specialMessage.content)).toBeTruthy();
    });

    it('should render message with emojis', () => {
      const emojiMessage: Message = {
        ...mockUserMessage,
        content: 'Hello 👋 How are you? 😊',
      };

      const { getByText } = render(
        <MessageBubble message={emojiMessage} />
      );

      expect(getByText('Hello 👋 How are you? 😊')).toBeTruthy();
    });

    it('should render message with line breaks', () => {
      const multilineMessage: Message = {
        ...mockUserMessage,
        content: 'Line 1\nLine 2\nLine 3',
      };

      const { getByText } = render(
        <MessageBubble message={multilineMessage} />
      );

      expect(getByText('Line 1\nLine 2\nLine 3')).toBeTruthy();
    });

    it('should handle very short messages', () => {
      const shortMessage: Message = {
        ...mockUserMessage,
        content: 'Hi',
      };

      const { getByText } = render(
        <MessageBubble message={shortMessage} />
      );

      expect(getByText('Hi')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have text role for accessibility', () => {
      const { getByTestId } = render(
        <MessageBubble message={mockUserMessage} />
      );

      const bubble = getByTestId(`message-bubble-${mockUserMessage.id}`);
      expect(bubble.props.accessibilityRole).toBe('text');
    });

    it('should be accessible', () => {
      const { getByTestId } = render(
        <MessageBubble message={mockUserMessage} />
      );

      const bubble = getByTestId(`message-bubble-${mockUserMessage.id}`);
      expect(bubble.props.accessible).toBe(true);
    });

    it('should have descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <MessageBubble message={mockUserMessage} />
      );

      // Should include role and content in accessibility label
      expect(getByLabelText(/You said:/)).toBeTruthy();
      expect(getByLabelText(/Hello, how are you\?/)).toBeTruthy();
    });
  });
});
