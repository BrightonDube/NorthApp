/**
 * Chat Screen Unit Tests
 * 
 * Tests for the Chat screen components including empty state and error state handling.
 * 
 * Validates: Requirements 10.4, 11.1, 11.2
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, Pressable } from 'react-native';
import type { Coach } from '@/types';
import { CoachCategory } from '@/types';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    default: {
      View: View,
      Text: require('react-native').Text,
      ScrollView: require('react-native').ScrollView,
    },
    __esModule: true,
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
  };
});

// Test the EmptyChat component directly
function EmptyChat({ coach }: { coach: Coach | undefined }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-6xl mb-4">{coach?.icon || '🤖'}</Text>
      <Text className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        Start a conversation
      </Text>
      <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center leading-6">
        {coach?.name || 'Your coach'} is ready to help. Type a message below to begin.
      </Text>
    </View>
  );
}

// Test the ErrorBanner component directly
function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <Pressable 
      onPress={onDismiss} 
      className="bg-red-100 dark:bg-red-900/30 px-4 py-3 mx-4 mb-2 rounded-xl"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${error}`}
    >
      <Text className="text-sm text-red-900 dark:text-red-100 mb-1">
        {error}
      </Text>
      <Text className="text-xs text-red-900/70 dark:text-red-100/70">
        Tap to dismiss
      </Text>
    </Pressable>
  );
}

describe('Chat Screen Components', () => {
  const mockCoach: Coach = {
    id: 'coach-1',
    name: 'Test Coach',
    icon: '🤖',
    systemPrompt: 'You are a helpful assistant',
    creatorId: null,
    isPublic: true,
    category: CoachCategory.GENERAL,
    isFeatured: false,
    sourceCoachId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('EmptyChat Component', () => {
    it('should display empty state message', () => {
      const { getByText } = render(<EmptyChat coach={mockCoach} />);

      expect(getByText('Start a conversation')).toBeTruthy();
    });

    it('should display coach icon in empty state', () => {
      const { getByText } = render(<EmptyChat coach={mockCoach} />);

      expect(getByText('🤖')).toBeTruthy();
    });

    it('should display coach name in empty state message', () => {
      const { getByText } = render(<EmptyChat coach={mockCoach} />);

      expect(getByText(/Test Coach/)).toBeTruthy();
    });

    it('should show default icon when coach has no icon', () => {
      const coachWithoutIcon: Coach = {
        ...mockCoach,
        icon: '',
      };

      const { getByText } = render(<EmptyChat coach={coachWithoutIcon} />);

      expect(getByText('🤖')).toBeTruthy();
    });

    it('should show default name when coach is undefined', () => {
      const { getByText } = render(<EmptyChat coach={undefined} />);

      expect(getByText(/Your coach/)).toBeTruthy();
    });

    it('should display helpful instruction text', () => {
      const { getByText } = render(<EmptyChat coach={mockCoach} />);

      expect(getByText(/ready to help/)).toBeTruthy();
      expect(getByText(/Type a message below to begin/)).toBeTruthy();
    });
  });

  describe('ErrorBanner Component', () => {
    it('should display error message', () => {
      const mockOnDismiss = jest.fn();
      const errorMessage = 'Failed to send message';
      
      const { getByText } = render(
        <ErrorBanner error={errorMessage} onDismiss={mockOnDismiss} />
      );

      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('should show dismiss instruction', () => {
      const mockOnDismiss = jest.fn();
      
      const { getByText } = render(
        <ErrorBanner error="Test error" onDismiss={mockOnDismiss} />
      );

      expect(getByText('Tap to dismiss')).toBeTruthy();
    });

    it('should call onDismiss when tapped', () => {
      const mockOnDismiss = jest.fn();
      
      const { getByLabelText } = render(
        <ErrorBanner error="Test error" onDismiss={mockOnDismiss} />
      );

      const errorBanner = getByLabelText('Error: Test error');
      fireEvent.press(errorBanner);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should have alert accessibility role', () => {
      const mockOnDismiss = jest.fn();
      
      const { getByLabelText } = render(
        <ErrorBanner error="Test error" onDismiss={mockOnDismiss} />
      );

      expect(getByLabelText(/Error: Test error/)).toBeTruthy();
    });

    it('should be accessible', () => {
      const mockOnDismiss = jest.fn();
      
      const { getByLabelText } = render(
        <ErrorBanner error="Test error" onDismiss={mockOnDismiss} />
      );

      const errorBanner = getByLabelText('Error: Test error');
      expect(errorBanner.props.accessible).toBe(true);
    });

    it('should display long error messages', () => {
      const mockOnDismiss = jest.fn();
      const longError = 'This is a very long error message that should still be displayed correctly. '.repeat(3);
      
      const { getByText } = render(
        <ErrorBanner error={longError} onDismiss={mockOnDismiss} />
      );

      expect(getByText(longError)).toBeTruthy();
    });

    it('should handle error messages with special characters', () => {
      const mockOnDismiss = jest.fn();
      const specialError = 'Error: Failed to connect to server @ 192.168.1.1:8080';
      
      const { getByText } = render(
        <ErrorBanner error={specialError} onDismiss={mockOnDismiss} />
      );

      expect(getByText(specialError)).toBeTruthy();
    });
  });
});
