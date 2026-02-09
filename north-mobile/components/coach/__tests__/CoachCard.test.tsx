/**
 * CoachCard Component Tests
 * 
 * Unit tests for the CoachCard component.
 */

import { render, fireEvent } from '@testing-library/react-native';
import { CoachCard } from '../CoachCard';
import type { Coach } from '@/types';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

describe('CoachCard', () => {
  const mockCoach: Coach = {
    id: '1',
    name: 'Strategy Coach',
    icon: '🎯',
    systemPrompt: 'You are a strategic thinking coach',
    creatorId: null,
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockUserCoach: Coach = {
    ...mockCoach,
    id: '2',
    name: 'My Custom Coach',
    creatorId: 'user-123',
  };

  it('renders coach name and icon', () => {
    const { getByText } = render(
      <CoachCard coach={mockCoach} onPress={() => {}} />
    );

    expect(getByText('Strategy Coach')).toBeTruthy();
    expect(getByText('🎯')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <CoachCard coach={mockCoach} onPress={onPress} />
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when long pressed', () => {
    const onLongPress = jest.fn();
    const { getByRole } = render(
      <CoachCard coach={mockCoach} onPress={() => {}} onLongPress={onLongPress} />
    );

    const button = getByRole('button');
    fireEvent(button, 'longPress');

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('renders user-created coaches', () => {
    const { getByText } = render(
      <CoachCard coach={mockUserCoach} onPress={() => {}} />
    );

    // Just verify the coach name is rendered
    expect(getByText(mockUserCoach.name)).toBeTruthy();
  });

  it('renders default coaches', () => {
    const { getByText } = render(
      <CoachCard coach={mockCoach} onPress={() => {}} />
    );

    // Just verify the coach name is rendered
    expect(getByText(mockCoach.name)).toBeTruthy();
  });
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(
      <CoachCard coach={mockCoach} onPress={() => {}} />
    );

    expect(getByLabelText('Chat with Strategy Coach')).toBeTruthy();
  });
});
