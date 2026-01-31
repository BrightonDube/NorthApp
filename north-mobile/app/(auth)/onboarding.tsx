/**
 * Onboarding Screen
 * 
 * Captures essential user information after registration.
 * Step 1: Name input (required)
 * Step 2: Primary goal (optional, skippable)
 */

import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type OnboardingStep = 'name' | 'goal';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, restoreSession } = useAuthStore();
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;
      
      // Move to goal step
      setStep('goal');
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Save goal as context item if provided
      if (goal.trim() && user?.id) {
        const { error: contextError } = await supabase
          .from('user_context')
          .insert({
            user_id: user.id,
            category: 'goals' as const,
            content: goal.trim(),
          });

        if (contextError) throw contextError;
      }

      // Refresh session to get updated user data
      await restoreSession();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Goal save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    // Refresh session and navigate to main app
    await restoreSession();
    router.replace('/(tabs)');
  };

  const renderNameStep = () => (
    <>
      {/* Header */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          What's your name?
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          This helps your coaches personalize their guidance.
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{ 
          marginBottom: 16, 
          padding: 16, 
          backgroundColor: '#FEF2F2', 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#FECACA',
        }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Name Input */}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: error ? '#EF4444' : '#D1D5DB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 16,
          fontSize: 18,
          backgroundColor: '#F9FAFB',
          marginBottom: 24,
        }}
        placeholder="Your name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!isLoading}
        autoFocus
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={{
          backgroundColor: isLoading || !name.trim() ? '#9CA3AF' : '#3B82F6',
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
        }}
        onPress={handleNameSubmit}
        disabled={isLoading || !name.trim()}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderGoalStep = () => (
    <>
      {/* Header */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          What's your main goal?
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          Share what you're working towards. This helps your coaches understand your context.
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{ 
          marginBottom: 16, 
          padding: 16, 
          backgroundColor: '#FEF2F2', 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#FECACA',
        }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Goal Input */}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 16,
          fontSize: 16,
          backgroundColor: '#F9FAFB',
          marginBottom: 24,
          minHeight: 100,
          textAlignVertical: 'top',
        }}
        placeholder="e.g., Launch my startup by Q2"
        value={goal}
        onChangeText={setGoal}
        autoCapitalize="sentences"
        autoCorrect={true}
        editable={!isLoading}
        multiline
        autoFocus
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={{
          backgroundColor: isLoading ? '#9CA3AF' : '#3B82F6',
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
        onPress={handleGoalSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {goal.trim() ? 'Complete Setup' : 'Skip for Now'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Skip Button */}
      {goal.trim() && (
        <TouchableOpacity
          style={{
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Skip this step
          </Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View style={{ flexDirection: 'row', marginBottom: 32 }}>
            <View
              style={{
                flex: 1,
                height: 4,
                backgroundColor: '#3B82F6',
                borderRadius: 2,
                marginRight: 4,
              }}
            />
            <View
              style={{
                flex: 1,
                height: 4,
                backgroundColor: step === 'goal' ? '#3B82F6' : '#E5E7EB',
                borderRadius: 2,
                marginLeft: 4,
              }}
            />
          </View>

          {/* Step Content */}
          {step === 'name' ? renderNameStep() : renderGoalStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
