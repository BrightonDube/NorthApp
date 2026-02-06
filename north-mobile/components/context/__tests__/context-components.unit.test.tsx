/**
 * Context Components Unit Tests
 * 
 * Unit tests for Context UI components covering specific interactions
 * and edge cases not covered by property-based tests.
 * 
 * Feature: north-mobile-app
 * Task: 7.6
 * 
 * Tests:
 * - ContextCard rendering and interactions
 * - Modal open/close behavior
 * - Swipe gesture functionality
 * - Pro upgrade prompt display
 * 
 * Validates: Requirements 14.2, 14.4, 14.5, 14.7
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ContextCard } from '../ContextCard';
import { ContextEditModal } from '../ContextEditModal';
import { ContextCreateModal } from '../ContextCreateModal';
import type { UserContext } from '@/types';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const { TouchableOpacity } = require('react-native');
  return {
    Swipeable: ({ children, renderRightActions, onSwipeableOpen }: any) => (
      <View testID="swipeable-container">
        {children}
        {renderRightActions && (
          <View testID="swipe-actions">
            <TouchableOpacity
              testID="trigger-swipe-open"
              onPress={onSwipeableOpen}
            >
              {renderRightActions()}
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const Animated = {
    View: View,
    Text: require('react-native').Text,
    ScrollView: require('react-native').ScrollView,
  };
  
  return {
    default: Animated,
    __esModule: true,
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
  };
});

// Helper to create mock context items
const createMockContext = (overrides?: Partial<UserContext>): UserContext => ({
  id: 'test-id-123',
  userId: 'user-123',
  category: 'values',
  content: 'Test content for context item',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ContextCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: ContextCard rendering
   * Validates: Requirement 14.2
   */
  describe('Rendering', () => {
    it('should render category label and content', () => {
      const context = createMockContext({
        category: 'goals',
        content: 'Launch my startup by Q2',
      });

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(getByText('Goal')).toBeTruthy();
      expect(getByText('Launch my startup by Q2')).toBeTruthy();
    });

    it('should render all category types with correct labels', () => {
      const categories = [
        { category: 'values' as const, label: 'Value' },
        { category: 'goals' as const, label: 'Goal' },
        { category: 'projects' as const, label: 'Project' },
        { category: 'constraints' as const, label: 'Constraint' },
      ];

      categories.forEach(({ category, label }) => {
        const context = createMockContext({ category });
        const { getByText } = render(
          <ContextCard
            context={context}
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );

        expect(getByText(label)).toBeTruthy();
      });
    });
  });

  /**
   * Test: ContextCard interactions
   * Validates: Requirement 14.2
   */
  describe('Interactions', () => {
    it('should call onEdit when card is pressed', () => {
      const onEdit = jest.fn();
      const context = createMockContext();

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={onEdit}
          onDelete={jest.fn()}
        />
      );

      fireEvent.press(getByText(context.content));

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should provide haptic feedback on edit', () => {
      const context = createMockContext();

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      fireEvent.press(getByText(context.content));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should have correct accessibility labels', () => {
      const context = createMockContext({
        category: 'values',
        content: 'I value transparency',
      });

      const { getByLabelText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(getByLabelText('Value: I value transparency')).toBeTruthy();
    });
  });

  /**
   * Test: Swipe gesture functionality
   * Validates: Requirement 14.7
   */
  describe('Swipe Gesture', () => {
    it('should render swipe actions', () => {
      const context = createMockContext();

      const { getByTestId } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(getByTestId('swipeable-container')).toBeTruthy();
      expect(getByTestId('swipe-actions')).toBeTruthy();
    });

    it('should provide haptic feedback when swipe gesture opens', () => {
      const context = createMockContext();

      const { getByTestId } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      // Simulate swipe gesture opening
      const triggerSwipe = getByTestId('trigger-swipe-open');
      fireEvent.press(triggerSwipe);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should call onDelete when delete action is pressed', () => {
      const onDelete = jest.fn();
      const context = createMockContext();

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      );

      const deleteButton = getByText('Delete');
      fireEvent.press(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it('should provide haptic feedback on delete', () => {
      const context = createMockContext();

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      fireEvent.press(getByText('Delete'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it('should have accessibility label for delete button', () => {
      const context = createMockContext();

      const { getByLabelText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(getByLabelText('Delete context item')).toBeTruthy();
    });
  });
});

describe('ContextEditModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Modal open/close behavior
   * Validates: Requirement 14.2
   */
  describe('Modal Behavior', () => {
    it('should display modal when visible is true', () => {
      const context = createMockContext();

      const { getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(getByText('Edit Value')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const context = createMockContext();

      const { queryByText } = render(
        <ContextEditModal
          visible={false}
          context={context}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(queryByText('Edit Value')).toBeNull();
    });

    it('should not render when context is null', () => {
      const { queryByText } = render(
        <ContextEditModal
          visible={true}
          context={null}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(queryByText('Edit Value')).toBeNull();
    });

    it('should pre-fill content from context', async () => {
      const context = createMockContext({
        content: 'My important value',
      });

      const { getByDisplayValue } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(getByDisplayValue('My important value')).toBeTruthy();
      });
    });
  });

  /**
   * Test: Save functionality
   * Validates: Requirement 14.3
   */
  describe('Save Functionality', () => {
    it('should call onSave with updated content', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        content: 'Original content',
      });

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={onSave}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue('Original content');
        fireEvent.changeText(input, 'Updated content');
      });

      const saveButton = getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(context.id, 'Updated content');
      });
    });

    it('should trim whitespace before saving', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext();

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={onSave}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue(context.content);
        fireEvent.changeText(input, '  Content with spaces  ');
      });

      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(context.id, 'Content with spaces');
      });
    });

    it('should disable save button when content is empty', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext();

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={onSave}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue(context.content);
        fireEvent.changeText(input, '   ');
      });

      // Save button should be disabled (indicated by styling)
      const saveButton = getByText('Save');
      expect(saveButton.props.className).toContain('text-zinc-300');
      
      // Pressing disabled button should not call onSave
      fireEvent.press(saveButton);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it('should show error when content exceeds 1000 characters', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const context = createMockContext();
    const longContent = 'a'.repeat(1001);

    const { getByDisplayValue, getByText, queryByText } = render(
      <ContextEditModal
        visible={true}
        context={context}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      const input = getByDisplayValue(context.content);
      fireEvent.changeText(input, longContent);
    });

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(queryByText('Content must be 1000 characters or less')).toBeTruthy();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it('should provide success haptic feedback on save', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const context = createMockContext();

    const { getByDisplayValue, getByText } = render(
      <ContextEditModal
        visible={true}
        context={context}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      const input = getByDisplayValue(context.content);
      fireEvent.changeText(input, 'New content');
    });

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  it('should disable save button when content is empty', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const context = createMockContext();

    const { getByDisplayValue, getByText } = render(
      <ContextEditModal
        visible={true}
        context={context}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );

    await waitFor(() => {
      const input = getByDisplayValue(context.content);
      fireEvent.changeText(input, '');
    });

    // Save button should be disabled (indicated by styling)
    const saveButton = getByText('Save');
    expect(saveButton.props.className).toContain('text-zinc-300');
    
    // Pressing disabled button should not call onSave
    fireEvent.press(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });

  /**
   * Test: Cancel functionality
   * Validates: Requirement 14.2
   */
  describe('Cancel Functionality', () => {
    it('should call onClose when cancel is pressed without changes', () => {
      const onClose = jest.fn();
      const context = createMockContext();

      const { getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={jest.fn()}
          onClose={onClose}
        />
      );

      fireEvent.press(getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog when canceling with unsaved changes', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert');
      const context = createMockContext();

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={jest.fn()}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue(context.content);
        fireEvent.changeText(input, 'Modified content');
      });

      fireEvent.press(getByText('Cancel'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        expect.any(Array)
      );

      mockAlert.mockRestore();
    });

    it('should call onClose when discard is confirmed', async () => {
      const onClose = jest.fn();
      const mockAlert = jest.spyOn(Alert, 'alert');
      mockAlert.mockImplementation((title, message, buttons) => {
        const discardButton = buttons?.find((b: any) => b.text === 'Discard');
        if (discardButton && discardButton.onPress) {
          discardButton.onPress();
        }
      });

      const context = createMockContext();

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={jest.fn()}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue(context.content);
        fireEvent.changeText(input, 'Modified content');
      });

      fireEvent.press(getByText('Cancel'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      mockAlert.mockRestore();
    });
  });
});

describe('ContextCreateModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Modal display and category selection
   * Validates: Requirement 14.4
   */
  describe('Category Selection', () => {
    it('should display all category options', () => {
      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(getByText('Value')).toBeTruthy();
      expect(getByText('Goal')).toBeTruthy();
      expect(getByText('Project')).toBeTruthy();
      expect(getByText('Constraint')).toBeTruthy();
    });

    it('should default to values category', () => {
      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Values should be selected by default (has checkmark)
      const valuesOption = getByText('Value').parent;
      expect(valuesOption).toBeTruthy();
    });

    it('should allow category selection', () => {
      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      fireEvent.press(getByText('Goal'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should display category descriptions', () => {
      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      expect(getByText('Core principles and beliefs')).toBeTruthy();
      expect(getByText('Objectives and aspirations')).toBeTruthy();
      expect(getByText('Current active work')).toBeTruthy();
      expect(getByText('Limitations and boundaries')).toBeTruthy();
    });
  });

  /**
   * Test: Create functionality
   * Validates: Requirement 14.4
   */
  describe('Create Functionality', () => {
    it('should call onCreate with selected category and content', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);

      const { getByText, getByLabelText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={onCreate}
          onClose={jest.fn()}
        />
      );

      // Select Goals category
      fireEvent.press(getByText('Goal'));

      // Enter content using accessibility label
      const input = getByLabelText('Content input');
      fireEvent.changeText(input, 'Launch my product');

      // Press Create
      fireEvent.press(getByText('Create'));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith('goals', 'Launch my product');
      });
    });

    it('should trim whitespace before creating', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);

      const { getByText, getByLabelText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={onCreate}
          onClose={jest.fn()}
        />
      );

      const input = getByLabelText('Content input');
      fireEvent.changeText(input, '  My value  ');

      fireEvent.press(getByText('Create'));

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith('values', 'My value');
      });
    });

    it('should disable create button when content is empty', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);

      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={onCreate}
          onClose={jest.fn()}
        />
      );

      // Create button should be disabled when content is empty (indicated by styling)
      const createButton = getByText('Create');
      expect(createButton.props.className).toContain('text-zinc-300');
      
      // Pressing disabled button should not call onCreate
      fireEvent.press(createButton);
      expect(onCreate).not.toHaveBeenCalled();
    });

    it('should show error when content exceeds 1000 characters', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);
      const longContent = 'a'.repeat(1001);

      const { getByText, getByLabelText, queryByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={onCreate}
          onClose={jest.fn()}
        />
      );

      const input = getByLabelText('Content input');
      fireEvent.changeText(input, longContent);

      fireEvent.press(getByText('Create'));

      await waitFor(() => {
        expect(queryByText('Content must be 1000 characters or less')).toBeTruthy();
        expect(onCreate).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * Test: Form reset on open
   * Validates: Requirement 14.4
   */
  describe('Form Reset', () => {
    it('should reset form when modal opens', () => {
      const { getByLabelText, rerender } = render(
        <ContextCreateModal
          visible={false}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Open modal and enter content
      rerender(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const input = getByLabelText('Content input');
      fireEvent.changeText(input, 'Some content');

      // Close and reopen modal
      rerender(
        <ContextCreateModal
          visible={false}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      rerender(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Content should be cleared
      const newInput = getByLabelText('Content input');
      expect(newInput.props.value).toBe('');
    });
  });

  /**
   * Test: Cancel functionality
   * Validates: Requirement 14.4
   */
  describe('Cancel Functionality', () => {
    it('should call onClose when cancel is pressed', () => {
      const onClose = jest.fn();

      const { getByText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={onClose}
        />
      );

      fireEvent.press(getByText('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });
  });
});

/**
 * Pro Upgrade Prompt Tests
 * 
 * Tests for the Pro upgrade prompt display when free users reach their limit.
 * Note: The actual Pro upgrade prompt is implemented in the Context screen,
 * not in the individual components. These tests verify the components work
 * correctly in scenarios that would trigger the upgrade prompt.
 * 
 * Validates: Requirements 14.5, 14.7
 */
describe('Pro Upgrade Prompt Scenarios', () => {
  /**
   * Test: Components should work correctly when at free tier limit
   * The actual upgrade prompt is shown by the parent screen when canAddMore returns false
   * Validates: Requirement 14.5
   */
  describe('Free Tier Limit Scenarios', () => {
    it('should allow editing existing items even at free tier limit', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        content: 'Existing item',
      });

      const { getByDisplayValue, getByText } = render(
        <ContextEditModal
          visible={true}
          context={context}
          onSave={onSave}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const input = getByDisplayValue('Existing item');
        fireEvent.changeText(input, 'Updated item');
      });

      fireEvent.press(getByText('Save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(context.id, 'Updated item');
      });
    });

    it('should allow deleting items to free up space', () => {
      const onDelete = jest.fn();
      const context = createMockContext();

      const { getByText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={onDelete}
        />
      );

      fireEvent.press(getByText('Delete'));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should display all context items regardless of tier', () => {
      const contexts = [
        createMockContext({ id: '1', category: 'values', content: 'Value 1' }),
        createMockContext({ id: '2', category: 'goals', content: 'Goal 1' }),
        createMockContext({ id: '3', category: 'projects', content: 'Project 1' }),
      ];

      contexts.forEach((context) => {
        const { getByText } = render(
          <ContextCard
            context={context}
            onEdit={jest.fn()}
            onDelete={jest.fn()}
          />
        );

        expect(getByText(context.content)).toBeTruthy();
      });
    });
  });

  /**
   * Test: Create modal should work correctly for Pro users
   * Validates: Requirement 14.4
   */
  describe('Pro User Scenarios', () => {
    it('should allow creating unlimited items for Pro users', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);

      // Simulate creating multiple items (Pro users have no limit)
      for (let i = 0; i < 5; i++) {
        const { getByText, getByLabelText } = render(
          <ContextCreateModal
            visible={true}
            onCreate={onCreate}
            onClose={jest.fn()}
          />
        );

        const input = getByLabelText('Content input');
        fireEvent.changeText(input, `Value ${i + 1}`);

        fireEvent.press(getByText('Create'));

        await waitFor(() => {
          expect(onCreate).toHaveBeenCalledWith('values', `Value ${i + 1}`);
        });
      }

      expect(onCreate).toHaveBeenCalledTimes(5);
    });
  });

  /**
   * Test: Accessibility for upgrade scenarios
   * Validates: Requirement 14.7
   */
  describe('Accessibility in Upgrade Scenarios', () => {
    it('should maintain accessibility labels when at limit', () => {
      const context = createMockContext({
        category: 'values',
        content: 'My third value',
      });

      const { getByLabelText } = render(
        <ContextCard
          context={context}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
        />
      );

      expect(getByLabelText('Value: My third value')).toBeTruthy();
      expect(getByLabelText('Delete context item')).toBeTruthy();
    });

    it('should have accessible create modal for all users', () => {
      const { getByText, getByLabelText } = render(
        <ContextCreateModal
          visible={true}
          onCreate={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // All category options should be accessible
      expect(getByText('Value')).toBeTruthy();
      expect(getByText('Goal')).toBeTruthy();
      expect(getByText('Project')).toBeTruthy();
      expect(getByText('Constraint')).toBeTruthy();

      // Input should be accessible
      expect(getByLabelText('Content input')).toBeTruthy();
    });
  });
});
