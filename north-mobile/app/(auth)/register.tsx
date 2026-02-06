/**
 * Register Screen
 * 
 * Provides user registration interface with email/password.
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/Logo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError('');
    return true;
  };

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

  const validateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleRegister = async () => {
    clearError();
    
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);
    
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
      return;
    }

    const result = await signup(email, password, name);
    
    if (result?.needsConfirmation) {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
            <View className="items-center mb-6">
              <Logo size={80} color="#09090B" />
            </View>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </Text>
              <Text className="text-base text-gray-600">
                Join North and build your personal board of directors
              </Text>
            </View>

            {/* Error Display */}
            {error && (
              <View 
                className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200"
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text className="text-red-800 text-sm">{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Name</Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  nameError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Your name"
                value={name}
                onChangeText={(v) => { setName(v); if (nameError) validateName(v); }}
                onBlur={() => validateName(name)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
                testID="name-input"
                accessibilityLabel="Name input"
                accessibilityHint="Enter your full name"
              />
              {nameError && <Text className="text-red-500 text-sm mt-1">{nameError}</Text>}
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); if (emailError) validateEmail(v); }}
                onBlur={() => validateEmail(email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="email-input"
                accessibilityLabel="Email address input"
                accessibilityHint="Enter your email address"
              />
              {emailError && <Text className="text-red-500 text-sm mt-1">{emailError}</Text>}
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="At least 6 characters"
                value={password}
                onChangeText={(v) => { setPassword(v); if (passwordError) validatePassword(v); }}
                onBlur={() => validatePassword(password)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="password-input"
                accessibilityLabel="Password input"
                accessibilityHint="Enter a password with at least 6 characters"
              />
              {passwordError && <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>}
            </View>

            {/* Confirm Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">Confirm Password</Text>
              <TextInput
                className={`w-full px-4 py-3 border rounded-lg text-base ${
                  confirmPasswordError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); if (confirmPasswordError) validateConfirmPassword(v); }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                testID="confirm-password-input"
                accessibilityLabel="Confirm password input"
                accessibilityHint="Re-enter your password to confirm"
              />
              {confirmPasswordError && <Text className="text-red-500 text-sm mt-1">{confirmPasswordError}</Text>}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              className={`w-full rounded-lg mb-4 ${
                isLoading ? 'bg-gray-400' : 'bg-blue-600'
              }`}
              style={{ paddingVertical: 16, minHeight: 48 }}
              onPress={handleRegister}
              disabled={isLoading}
              testID="register-button"
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-semibold">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="Sign in to your account"
                >
                  <Text className="text-blue-600 font-semibold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Footer */}
            <View className="mt-6">
              <Text className="text-center text-sm text-gray-600">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
