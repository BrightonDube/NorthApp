/**
 * ChatInput Component Tests
 * 
 * Tests for the ChatInput component including offline behavior.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatInput } from '../ChatInput';
import { useIsOnline } from '@/stores/networkStore';

// Mock the network store
jest.mock('@/stores/networkStore', () => ({
  useIsOnline: jest.fn(),
}));

describe('ChatInput', () => {
  const mockOnSend = jest.fn();
  const mockUseIsOnline = useIsOnline as jest.MockedFunction<typeof useIsOnline>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to online
    mockUseIsOnline.mockReturnValue(true);
  });

  it('should render correctly', () => {
    const { getByPlaceholderText } = render(
      <ChatInput onSend={mockOnSend} placeholder="Type a message..." />
    );

    expect(getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  it('should disable send button when message is empty', () => {
    const { getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);
  });

  it('should enable send button when message is not empty and online', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState.disabled).toBe(false);
  });

  it('should disable send button when offline', () => {
    // Mock offline state
    mockUseIsOnline.mockReturnValue(false);

    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);
  });

  it('should not call onSend when offline', () => {
    // Mock offline state
    mockUseIsOnline.mockReturnValue(false);

    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');

    const sendButton = getByLabelText('Send message');
    fireEvent.press(sendButton);

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should call onSend when online and message is not empty', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');

    const sendButton = getByLabelText('Send message');
    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });

  it('should disable send button when disabled prop is true', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} disabled={true} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');

    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);
  });

  it('should clear input after sending message', () => {
    const { getByPlaceholderText, getByLabelText } = render(
      <ChatInput onSend={mockOnSend} />
    );

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Hello');
    
    const sendButton = getByLabelText('Send message');
    fireEvent.press(sendButton);

    expect(input.props.value).toBe('');
  });
});
