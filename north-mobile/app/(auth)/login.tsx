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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/Logo';
import { AppleLogo } from '@/components/AppleLogo';
import { GoogleLogo } from '@/components/GoogleLogo';
import { useThemeColors } from '@/contexts/ThemeContext';

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
  const colors = useThemeColors();
  
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Logo size={100} />
            </View>

            {/* Header */}
            <View style={styles.headerContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                Welcome to North
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your personal board of directors
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View 
                style={[styles.errorContainer, { 
                  backgroundColor: colors.error + '10', 
                  borderColor: colors.error + '40' 
                }]}
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.input,
                    color: colors.text,
                    borderColor: emailError ? colors.error : colors.border,
                  }
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={handleEmailChange}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="email-input"
                accessibilityLabel="Email address input"
                accessibilityHint="Enter your email address"
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
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              {passwordError && (
                <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>
              )}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`w-full rounded-lg mb-6 ${
                isLoading ? 'bg-gray-400' : 'bg-zinc-900'
              }`}
              style={{ paddingVertical: 16, minHeight: 48 }}
              onPress={handleLogin}
              disabled={isLoading}
              testID="login-button"
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-semibold">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Social Sign In Buttons */}
            <View className="space-y-3 mb-6">
              {/* Google Sign In Button */}
              <TouchableOpacity
                className={`w-full rounded-lg bg-zinc-50 flex-row items-center justify-center ${
                  isLoading ? 'opacity-50' : ''
                }`}
                style={{ paddingVertical: 16, minHeight: 48 }}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                testID="google-signin-button"
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                accessibilityState={{ disabled: isLoading }}
              >
                <GoogleLogo size={20} />
                <Text className="text-zinc-900 text-center text-base font-semibold ml-3">
                  Sign in with Google
                </Text>
              </TouchableOpacity>

              {/* Apple Sign In Button */}
              <TouchableOpacity
                className={`w-full rounded-lg bg-zinc-900 flex-row items-center justify-center ${
                  isLoading ? 'opacity-50' : ''
                }`}
                style={{ paddingVertical: 16, minHeight: 48 }}
                onPress={handleAppleSignIn}
                disabled={isLoading}
                testID="apple-signin-button"
                accessibilityRole="button"
                accessibilityLabel="Sign in with Apple"
                accessibilityState={{ disabled: isLoading }}
              >
                <AppleLogo size={20} color="#FFFFFF" />
                <Text className="text-white text-center text-base font-semibold ml-2">
                  Sign in with Apple
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-gray-600">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="Sign up for a new account"
                >
                  <Text className="text-zinc-900 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
