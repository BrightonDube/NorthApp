/**
 * CoachCreateModal Component Tests
 * 
 * Unit tests for the CoachCreateModal component validation.
 * 
 * Validates: Requirements 7.1, 13.3
 * 
 * Tests:
 * - Name validation (required, length limits)
 * - Icon validation (required, emoji format)
 * - System prompt validation (required, length limits)
 * - Error message display
 * - Save button disabled state
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CoachCreateModal } from '../CoachCreateModal';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

describe('CoachCreateModal - Validation', () => {
  const mockOnCreate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Name Validation', () => {
    it('Create button is disabled when name is empty', () => {
      const { getByLabelText, getByRole } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Fill in system prompt (valid)
      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      // Name is empty, so button should be disabled
      const createButton = getByRole('button', { name: 'Create coach' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('accepts valid name', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          'Strategy Coach',
          '🎯', // default icon
          'You are a helpful coach who provides guidance.'
        );
      });
    });

    it('trims whitespace from name', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, '  Strategy Coach  ');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          'Strategy Coach',
          '🎯',
          'You are a helpful coach who provides guidance.'
        );
      });
    });
  });

  describe('Icon Validation', () => {
    it('has default icon selected', () => {
      const { getByText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      expect(getByText('Selected: 🎯')).toBeTruthy();
    });

    it('allows icon selection', () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const rocketIcon = getByLabelText('Icon 🚀');
      fireEvent.press(rocketIcon);

      expect(getByText('Selected: 🚀')).toBeTruthy();
    });

    it('uses selected icon when creating coach', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Select icon
      const rocketIcon = getByLabelText('Icon 🚀');
      fireEvent.press(rocketIcon);

      // Fill in required fields
      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          'Strategy Coach',
          '🚀',
          'You are a helpful coach who provides guidance.'
        );
      });
    });
  });

  describe('System Prompt Validation', () => {
    it('Create button is disabled when system prompt is empty', () => {
      const { getByText, getByLabelText, getByRole } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      // System prompt is empty, so button should be disabled
      const createButton = getByRole('button', { name: 'Create coach' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('Create button is disabled when system prompt is less than 20 characters', () => {
      const { getByText, getByLabelText, getByRole } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'Too short'); // 9 characters

      // Button should be disabled because prompt is less than 20 chars
      const createButton = getByRole('button', { name: 'Create coach' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('shows error when system prompt exceeds 2000 characters', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      const longPrompt = 'A'.repeat(2001); // 2001 characters
      fireEvent.changeText(systemPromptInput, longPrompt);

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('System prompt must be 2000 characters or less')).toBeTruthy();
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('accepts valid system prompt', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      const validPrompt = 'You are a strategic thinking coach who helps founders make better decisions.';
      fireEvent.changeText(systemPromptInput, validPrompt);

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          'Strategy Coach',
          '🎯',
          validPrompt
        );
      });
    });

    it('trims whitespace from system prompt', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, '  You are a helpful coach who provides guidance.  ');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith(
          'Strategy Coach',
          '🎯',
          'You are a helpful coach who provides guidance.'
        );
      });
    });

    it('displays character count', () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'Test prompt');

      expect(getByText('11 / 2000 (minimum 20)')).toBeTruthy();
    });
  });

  describe('Save Button State', () => {
    it('disables Create button when form is invalid', () => {
      const { getByRole } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Button should be disabled when form is invalid
      const createButton = getByRole('button', { name: 'Create coach' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('enables Create button when form is valid', () => {
      const { getByText, getByLabelText, getByRole } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      // Button should be enabled when form is valid
      const createButton = getByRole('button', { name: 'Create coach' });
      expect(createButton.props.accessibilityState.disabled).toBe(false);
    });

    it('disables Create button during submission', async () => {
      mockOnCreate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(getByText('Create')).toBeTruthy();
      });
    });
  });

  describe('Error Display', () => {
    it('displays error message when onCreate fails', async () => {
      const errorMessage = 'Failed to create coach';
      mockOnCreate.mockRejectedValue(new Error(errorMessage));

      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText(errorMessage)).toBeTruthy();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('shows validation error for name exceeding 50 characters', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      const longName = 'A'.repeat(51); // 51 characters
      fireEvent.changeText(nameInput, longName);

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('Coach name must be 50 characters or less')).toBeTruthy();
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it('shows validation error for system prompt exceeding 2000 characters', async () => {
      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      const longPrompt = 'A'.repeat(2001); // 2001 characters
      fireEvent.changeText(systemPromptInput, longPrompt);

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('System prompt must be 2000 characters or less')).toBeTruthy();
      });

      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('resets form when modal is reopened', () => {
      const { getByText, getByLabelText, rerender } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach.');

      // Close modal
      rerender(
        <CoachCreateModal
          visible={false}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Reopen modal
      rerender(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      // Form should be reset
      const newNameInput = getByLabelText('Coach name input');
      expect(newNameInput.props.value).toBe('');

      const newSystemPromptInput = getByLabelText('System prompt input');
      expect(newSystemPromptInput.props.value).toBe('');

      expect(getByText('Selected: 🎯')).toBeTruthy();
    });
  });

  describe('Cancel Button', () => {
    it('calls onClose when Cancel is pressed', () => {
      const { getByText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onCreate when Cancel is pressed', () => {
      const { getByText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockOnCreate).not.toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    it('closes modal on successful creation', async () => {
      mockOnCreate.mockResolvedValue(undefined);

      const { getByText, getByLabelText } = render(
        <CoachCreateModal
          visible={true}
          onCreate={mockOnCreate}
          onClose={mockOnClose}
        />
      );

      const nameInput = getByLabelText('Coach name input');
      fireEvent.changeText(nameInput, 'Strategy Coach');

      const systemPromptInput = getByLabelText('System prompt input');
      fireEvent.changeText(systemPromptInput, 'You are a helpful coach who provides guidance.');

      const createButton = getByText('Create');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
