/**
 * CoachCard Component Tests
 * 
 * Unit tests for the CoachCard component.
 * Tests both default mode (user's coaches) and marketplace mode (public coaches).
 */

import { render, fireEvent } from '@testing-library/react-native';
import { CoachCard } from '../CoachCard';
import type { Coach, PublicCoach, CoachCategory } from '@/types';

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
    category: 'Productivity' as CoachCategory,
    isFeatured: false,
    sourceCoachId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPublicCoach: PublicCoach = {
    ...mockCoach,
    id: '2',
    name: 'Public Strategy Coach',
    isPublic: true,
    creatorName: 'John Doe',
    model: 'gpt-4',
    temperature: 0.7,
  };

  const mockUserCoach: Coach = {
    ...mockCoach,
    id: '3',
    name: 'My Custom Coach',
    creatorId: 'user-123',
  };

  describe('Default Mode', () => {
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

      expect(getByText(mockUserCoach.name)).toBeTruthy();
    });

    it('has correct accessibility label for default mode', () => {
      const { getByLabelText } = render(
        <CoachCard coach={mockCoach} onPress={() => {}} />
      );

      expect(getByLabelText('Chat with Strategy Coach')).toBeTruthy();
    });

    it('does not show share button in default mode', () => {
      const { queryByTestId } = render(
        <CoachCard coach={mockCoach} onPress={() => {}} testID="coach-card" />
      );

      expect(queryByTestId('coach-card-share-button')).toBeNull();
    });
  });

  describe('Marketplace Mode', () => {
    it('renders all marketplace details', () => {
      const { getByText } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={() => {}} 
        />
      );

      expect(getByText('Public Strategy Coach')).toBeTruthy();
      expect(getByText('🎯')).toBeTruthy();
      expect(getByText('You are a strategic thinking coach')).toBeTruthy();
      expect(getByText('by John Doe')).toBeTruthy();
      expect(getByText('Productivity')).toBeTruthy();
    });

    it('shows share button when showShareButton is true and coach is public', () => {
      const onShare = jest.fn();
      const { getByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      expect(getByTestId('coach-card-share-button')).toBeTruthy();
    });

    it('does not show share button for private coaches', () => {
      const onShare = jest.fn();
      const { queryByTestId } = render(
        <CoachCard 
          coach={mockCoach} 
          variant="marketplace"
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      expect(queryByTestId('coach-card-share-button')).toBeNull();
    });

    it('calls onShare when share button is pressed', () => {
      const onShare = jest.fn();
      const { getByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      const shareButton = getByTestId('coach-card-share-button');
      fireEvent.press(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockPublicCoach.id);
    });

    it('does not call onPress when share button is pressed', () => {
      const onPress = jest.fn();
      const onShare = jest.fn();
      const { getByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={onPress} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      const shareButton = getByTestId('coach-card-share-button');
      fireEvent.press(shareButton);

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('has correct accessibility label for marketplace mode', () => {
      const { getByLabelText } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={() => {}} 
        />
      );

      expect(getByLabelText('Preview Public Strategy Coach')).toBeTruthy();
    });

    it('truncates long descriptions to 2 lines', () => {
      const longDescriptionCoach: PublicCoach = {
        ...mockPublicCoach,
        systemPrompt: 'This is a very long description that should be truncated to two lines. It contains a lot of text that would normally overflow the card layout and make it look messy.',
      };

      const { getByText } = render(
        <CoachCard 
          coach={longDescriptionCoach} 
          variant="marketplace"
          onPress={() => {}} 
        />
      );

      const description = getByText(longDescriptionCoach.systemPrompt);
      expect(description.props.numberOfLines).toBe(2);
    });

    it('displays category badge with correct color', () => {
      const { getByText } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          variant="marketplace"
          onPress={() => {}} 
        />
      );

      const categoryBadge = getByText('Productivity');
      expect(categoryBadge).toBeTruthy();
    });
  });

  describe('Share Button Visibility', () => {
    it('shows share button only when all conditions are met', () => {
      const onShare = jest.fn();
      
      // Should show: public coach + showShareButton + onShare provided
      const { getByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      expect(getByTestId('coach-card-share-button')).toBeTruthy();
    });

    it('hides share button when showShareButton is false', () => {
      const onShare = jest.fn();
      const { queryByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={false}
          testID="coach-card"
        />
      );

      expect(queryByTestId('coach-card-share-button')).toBeNull();
    });

    it('hides share button when onShare is not provided', () => {
      const { queryByTestId } = render(
        <CoachCard 
          coach={mockPublicCoach} 
          onPress={() => {}} 
          showShareButton={true}
          testID="coach-card"
        />
      );

      expect(queryByTestId('coach-card-share-button')).toBeNull();
    });

    it('hides share button when coach is not public', () => {
      const onShare = jest.fn();
      const { queryByTestId } = render(
        <CoachCard 
          coach={mockCoach} 
          onPress={() => {}} 
          onShare={onShare}
          showShareButton={true}
          testID="coach-card"
        />
      );

      expect(queryByTestId('coach-card-share-button')).toBeNull();
    });
  });
});
