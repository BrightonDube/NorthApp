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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/contexts/ThemeContext';

type OnboardingStep = 'name' | 'goal';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, restoreSession } = useAuthStore();
  const colors = useThemeColors();
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

      // Upsert profile row with the user's name.
      // IMPORTANT: This uses the user's auth token, so the profiles table
      // MUST have RLS policies allowing INSERT/UPDATE where auth.uid() = id.
      // See migration: 20260303000001_fix_profiles_rls_and_user_xp.sql
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: name.trim(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        // Log the full Supabase/Postgres error for debugging
        console.error('[Onboarding] Profile upsert failed:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId: user.id,
        });
        throw profileError;
      }
      
      // Move to goal step
      setStep('goal');
    } catch (err) {
      console.error('[Onboarding] Profile update error:', err);
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
      <View style={styles.headerContainer}>
        <Text 
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
        >
          What's your name?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          This helps your coaches personalize their guidance.
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View 
          style={[styles.errorContainer, { 
            backgroundColor: colors.error + '10',
            borderColor: colors.error + '40',
          }]}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Name Input */}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.input,
            color: colors.text,
          }
        ]}
        placeholder="Your name"
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(null);
        }}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!isLoading}
        autoFocus
        accessibilityLabel="Name input"
        accessibilityHint="Enter your name to personalize your experience"
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isLoading || !name.trim() ? colors.textTertiary : colors.primary,
          }
        ]}
        onPress={handleNameSubmit}
        disabled={isLoading || !name.trim()}
        accessibilityRole="button"
        accessibilityLabel="Continue to next step"
        accessibilityState={{ disabled: isLoading || !name.trim() }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderGoalStep = () => (
    <>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text 
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
        >
          What's your main goal?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Share what you're working towards. This helps your coaches understand your context.
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View 
          style={[styles.errorContainer, { 
            backgroundColor: colors.error + '10',
            borderColor: colors.error + '40',
          }]}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Goal Input */}
      <TextInput
        style={[
          styles.goalInput,
          {
            borderColor: colors.border,
            backgroundColor: colors.input,
            color: colors.text,
          }
        ]}
        placeholder="e.g., Launch my startup by Q2"
        placeholderTextColor={colors.textTertiary}
        value={goal}
        onChangeText={setGoal}
        autoCapitalize="sentences"
        autoCorrect={true}
        editable={!isLoading}
        multiline
        autoFocus
        accessibilityLabel="Primary goal input"
        accessibilityHint="Optional: Enter your main goal to help coaches understand your context"
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isLoading ? colors.textTertiary : colors.primary,
            marginBottom: 12,
          }
        ]}
        onPress={handleGoalSubmit}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={goal.trim() ? 'Complete setup' : 'Skip goal and complete setup'}
        accessibilityState={{ disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {goal.trim() ? 'Complete Setup' : 'Skip for Now'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Skip Button */}
      {goal.trim() && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
            Skip this step
          </Text>
        </TouchableOpacity>
      )}
    </>
  );

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
          {/* Progress Indicator */}
          <View 
            style={styles.progressContainer}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step === 'name' ? '1' : '2'} of 2`}
            accessibilityValue={{ min: 0, max: 2, now: step === 'name' ? 1 : 2 }}
          >
            <View
              style={[styles.progressBar, { backgroundColor: colors.primary }]}
            />
            <View
              style={[
                styles.progressBar,
                { backgroundColor: step === 'goal' ? colors.primary : colors.border }
              ]}
            />
          </View>

          {/* Step Content */}
          {step === 'name' ? renderNameStep() : renderGoalStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    marginBottom: 24,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
  },
});
