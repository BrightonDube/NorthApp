/**
 * Login Screen
 * 
 * Provides authentication interface with email/password and social sign-in.
 * Validates: Requirements 1.1, 1.4
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/Logo';
import { AppleLogo } from '@/components/AppleLogo';
import { GoogleLogo } from '@/components/GoogleLogo';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login Screen Component
 * 
 * Features:
 * - Email/password input with validation
 * - Google Sign In button
 * - Apple Sign In button
 * - Loading states
 * - Error display
 * - Form validation
 * 
 * Validates: Requirements 1.1, 1.4
 */
export default function LoginScreen() {
  const { login, loginWithApple, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  /**
   * Validate email format
   */
  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Validate password
   */
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  /**
   * Handle email/password login
   */
  const handleLogin = async () => {
    // Clear previous errors
    clearError();
    
    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    // Attempt login
    await login(email, password);
    
    // Navigation is handled by the root layout based on auth state
  };

  /**
   * Handle Apple Sign In
   */
  const handleAppleSignIn = async () => {
    clearError();
    await loginWithApple();
  };

  /**
   * Handle Google Sign In
   */
  const handleGoogleSignIn = async () => {
    clearError();
    await loginWithGoogle();
  };

  /**
   * Handle email input change
   */
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  /**
   * Handle password input change
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordError) {
      validatePassword(value);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md mx-auto">
            {/* Logo */}
            <View className="items-center mb-8">
              <Logo size={100} color="#09090B" />
            </View>

            {/* Header */}
            <View className="mb-12">
              <Text className="text-4xl font-bold text-gray-900 mb-2">
                Welcome to North
              </Text>
              <Text className="text-lg text-gray-600">
                Your personal board of directors
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <Text className="text-red-800 text-sm">{error}</Text>
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="email-input"
              />
              {emailError && (
                <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Password
              </Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
                onBlur={() => validatePassword(password)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="password-input"
              />
              {passwordError && (
                <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>
              )}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-lg mb-4 ${
                isLoading ? 'bg-gray-400' : 'bg-blue-600'
              }`}
              onPress={handleLogin}
              disabled={isLoading}
              testID="login-button"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-semibold">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-gray-500 text-sm">or</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-lg border-2 border-gray-300 mb-3 flex-row items-center justify-center ${
                isLoading ? 'opacity-50' : ''
              }`}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              testID="google-signin-button"
            >
              <GoogleLogo size={20} />
              <Text className="text-gray-900 text-center text-base font-semibold ml-3">
                Sign in with Google
              </Text>
            </TouchableOpacity>

            {/* Apple Sign In Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-lg border-2 border-gray-900 flex-row items-center justify-center ${
                isLoading ? 'opacity-50' : ''
              }`}
              onPress={handleAppleSignIn}
              disabled={isLoading}
              testID="apple-signin-button"
            >
              <AppleLogo size={20} color="#000000" />
              <Text className="text-gray-900 text-center text-base font-semibold ml-2">
                Sign in with Apple
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="Sign up for a new account"
                >
                  <Text className="text-blue-600 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Footer */}
            <View className="mt-8">
              <Text className="text-center text-sm text-gray-600">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
