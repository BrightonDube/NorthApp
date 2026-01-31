/**
 * Login Screen Unit Tests
 * 
 * Tests form validation, error display, and navigation on success.
 * Validates: Requirements 1.1, 1.4
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';
import { useAuthStore } from '@/stores/authStore';

// Mock the auth store
jest.mock('@/stores/authStore');

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('LoginScreen', () => {
  // Mock functions
  const mockLogin = jest.fn();
  const mockLoginWithApple = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementation
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      loginWithApple: mockLoginWithApple,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  describe('Form Validation', () => {
    it('should display error when email is empty', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const loginButton = getByTestId('login-button');

      // Try to login with empty email
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should display error when email format is invalid', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const loginButton = getByTestId('login-button');

      // Enter invalid email
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should display error when password is empty', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const loginButton = getByTestId('login-button');

      // Enter valid email but no password
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Password is required')).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should display error when password is too short', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      // Enter valid email but short password
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '12345');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Password must be at least 6 characters')).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should call login with valid credentials', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      // Enter valid credentials
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should validate email on blur', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');

      // Enter invalid email and blur
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('should validate password on blur', async () => {
      const { getByTestId, getByText } = render(<LoginScreen />);
      
      const passwordInput = getByTestId('password-input');

      // Enter short password and blur
      fireEvent.changeText(passwordInput, '123');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        expect(getByText('Password must be at least 6 characters')).toBeTruthy();
      });
    });

    it('should clear validation errors when input becomes valid', async () => {
      const { getByTestId, queryByText } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');

      // Enter invalid email
      fireEvent.changeText(emailInput, 'invalid');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(queryByText('Please enter a valid email address')).toBeTruthy();
      });

      // Fix the email
      fireEvent.changeText(emailInput, 'valid@example.com');

      await waitFor(() => {
        expect(queryByText('Please enter a valid email address')).toBeNull();
      });
    });
  });

  describe('Error Display', () => {
    it('should display authentication error from store', () => {
      const errorMessage = 'Invalid email or password';
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithApple: mockLoginWithApple,
        isLoading: false,
        error: errorMessage,
        clearError: mockClearError,
      });

      const { getByText } = render(<LoginScreen />);

      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('should clear error when form is submitted', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      // Enter valid credentials and submit
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });

    it('should clear error when Apple Sign In is pressed', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const appleButton = getByTestId('apple-signin-button');

      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable inputs when loading', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithApple: mockLoginWithApple,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });

    it('should disable login button when loading', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithApple: mockLoginWithApple,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      const { getByTestId } = render(<LoginScreen />);
      
      const loginButton = getByTestId('login-button');

      expect(loginButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should disable Apple Sign In button when loading', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithApple: mockLoginWithApple,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      const { getByTestId } = render(<LoginScreen />);
      
      const appleButton = getByTestId('apple-signin-button');

      expect(appleButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should show loading indicator in login button', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        login: mockLogin,
        loginWithApple: mockLoginWithApple,
        isLoading: true,
        error: null,
        clearError: mockClearError,
      });

      const { getByTestId, UNSAFE_queryByType } = render(<LoginScreen />);
      
      const loginButton = getByTestId('login-button');

      // Check that ActivityIndicator is rendered
      const activityIndicator = UNSAFE_queryByType(require('react-native').ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });
  });

  describe('Apple Sign In', () => {
    it('should call loginWithApple when Apple button is pressed', async () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const appleButton = getByTestId('apple-signin-button');

      fireEvent.press(appleButton);

      await waitFor(() => {
        expect(mockLoginWithApple).toHaveBeenCalled();
      });
    });
  });

  describe('UI Elements', () => {
    it('should render all required UI elements', () => {
      const { getByText, getByTestId, getByPlaceholderText } = render(<LoginScreen />);

      // Header
      expect(getByText('Welcome to North')).toBeTruthy();
      expect(getByText('Your personal board of directors')).toBeTruthy();

      // Form labels
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Password')).toBeTruthy();

      // Inputs
      expect(getByPlaceholderText('you@example.com')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();

      // Buttons
      expect(getByTestId('login-button')).toBeTruthy();
      expect(getByTestId('apple-signin-button')).toBeTruthy();

      // Footer
      expect(getByText(/Terms of Service/)).toBeTruthy();
    });

    it('should have secure text entry for password field', () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const passwordInput = getByTestId('password-input');

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should have correct keyboard type for email', () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');

      expect(emailInput.props.keyboardType).toBe('email-address');
    });

    it('should disable autocapitalize for email', () => {
      const { getByTestId } = render(<LoginScreen />);
      
      const emailInput = getByTestId('email-input');

      expect(emailInput.props.autoCapitalize).toBe('none');
    });
  });
});
