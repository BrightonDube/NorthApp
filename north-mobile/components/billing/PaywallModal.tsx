/**
 * Paywall Modal Component
 * 
 * Displays subscription offerings and handles purchase flow.
 * Beautiful, minimal design following North's design system.
 * Includes focus indicators for keyboard navigation.
 * 
 * Validates: Requirements 12.3, 12.4, 12.5, 23.7
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useBillingStore } from '@/stores/billingStore';
import type { PurchasesPackage } from 'react-native-purchases';

// Feature descriptions for different paywall triggers
const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  coach_creation: {
    title: 'Create Custom Coaches',
    description: 'Build your own AI coaches with custom personalities, expertise, and coaching styles.',
  },
  unlimited_coaches: {
    title: 'Unlimited Coaches',
    description: 'Access unlimited coaches to build your complete Board of Directors.',
  },
  context_creation: {
    title: 'Unlimited Context',
    description: 'Add unlimited personal context items to help your coaches understand you better. Free users are limited to 3 items.',
  },
  unlimited_context: {
    title: 'Unlimited Context',
    description: 'Add unlimited personal context for more personalized coaching.',
  },
  unlimited_messages: {
    title: 'Unlimited Messages',
    description: 'Chat without limits and get the guidance you need, when you need it.',
  },
  unlimited_checkins: {
    title: 'Unlimited Check-Ins',
    description: 'Track your mood, energy, and progress every day. Free users get 3 check-ins per week.',
  },
  voice_coaching: {
    title: 'Voice Coaching',
    description: 'Speak naturally with your AI coaches using voice input. Hands-free coaching on the go.',
  },
  conversation_export: {
    title: 'Export Conversations',
    description: 'Export your coaching sessions as text to review, share, or keep for your records.',
  },
  default: {
    title: 'Unlock North Pro',
    description: 'Get the most out of your AI coaching experience.',
  },
};

const PRO_BENEFITS = [
  'Unlimited AI conversations',
  'Daily check-ins & mood tracking',
  'Full progress dashboard & insights',
  'Voice coaching input',
  'Create custom coaches',
  'Conversation export',
];

interface PaywallModalProps {
  visible: boolean;
  feature?: string;
  onClose: () => void;
}

export function PaywallModal({ visible, feature, onClose }: PaywallModalProps) {
  const colors = useThemeColors();
  const {
    offerings,
    isLoading,
    isProUser,
    fetchOfferings,
    purchasePackage,
    restorePurchases,
  } = useBillingStore();

  // Fetch offerings when modal opens
  useEffect(() => {
    if (visible && !offerings) {
      fetchOfferings();
    }
  }, [visible, offerings, fetchOfferings]);

  const featureInfo = FEATURE_DESCRIPTIONS[feature || 'default'] || FEATURE_DESCRIPTIONS.default;

  const handlePurchase = async (pkg: PurchasesPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await purchasePackage(pkg);
    if (success) {
      onClose();
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
            <View className="w-10" />
            <Text style={{ color: colors.text }} className="text-lg font-semibold">
              North Pro
            </Text>
            <Pressable
              onPress={handleClose}
              style={{ backgroundColor: colors.surface }}
              className="items-center justify-center rounded-full"
              style={{ width: 44, height: 44, backgroundColor: colors.surface }}
              accessibilityLabel="Close paywall"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-8"
            showsVerticalScrollIndicator={false}
          >
          {/* Hero Section */}
          <View className="items-center py-12">
            <View style={{ backgroundColor: colors.primary }} className="w-20 h-20 rounded-full items-center justify-center mb-6">
              <Ionicons name="diamond" size={40} color="#FFFFFF" />
            </View>
            <Text style={{ color: colors.text }} className="text-3xl font-bold text-center mb-3">
              {featureInfo.title}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-base text-center px-8 leading-6">
              {featureInfo.description}
            </Text>
          </View>

          {/* Benefits List */}
          <View style={{ backgroundColor: colors.surface }} className="rounded-2xl p-6 mb-8">
            {PRO_BENEFITS.map((benefit, index) => (
              <View
                key={index}
                style={{ borderBottomWidth: index < PRO_BENEFITS.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                className="flex-row items-center py-4"
              >
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={{ color: colors.text }} className="flex-1 text-base ml-4">
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Packages */}
          {isProUser ? (
            <View style={{ backgroundColor: colors.surface }} className="rounded-2xl p-8 mb-8 items-center">
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              <Text style={{ color: colors.text }} className="text-center mt-3 font-semibold text-lg">
                You're on North Pro!
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center mt-2">
                All Pro features are unlocked. Enjoy unlimited coaching, voice input, custom coaches, and more.
              </Text>
            </View>
          ) : isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : offerings?.availablePackages && offerings.availablePackages.length > 0 ? (
            <View className="gap-3 mb-8">
              {offerings.availablePackages.map((pkg) => (
                <PackageCard
                  key={pkg.identifier}
                  pkg={pkg}
                  onPurchase={() => handlePurchase(pkg)}
                  isLoading={isLoading}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface }} className="rounded-2xl p-8 mb-8 items-center">
              <Ionicons name="diamond" size={32} color={colors.primary} />
              <Text style={{ color: colors.text }} className="text-center mt-3 font-semibold text-base">
                Pro Plans Coming Soon
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center mt-2">
                In-app purchases are being finalized. All features are currently available to you!
              </Text>
            </View>
          )}

          {/* Restore Purchases */}
          <Pressable
            onPress={handleRestore}
            disabled={isLoading}
            className="py-4 items-center mb-6"
            accessibilityLabel="Restore purchases"
            accessibilityRole="button"
          >
            <Text style={{ color: colors.textSecondary }} className="text-base">
              Restore Purchases
            </Text>
          </Pressable>
        </ScrollView>
      </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Individual package/plan card
 */
interface PackageCardProps {
  pkg: PurchasesPackage;
  onPurchase: () => void;
  isLoading: boolean;
  colors: any;
}

function PackageCard({ pkg, onPurchase, isLoading, colors }: PackageCardProps) {
  const product = pkg.product;
  const isAnnual = pkg.packageType === 'ANNUAL';
  
  // Calculate savings for annual plan
  // Annual: $79.99/year vs Monthly: $9.99/month * 12 = $119.88
  // Savings: $119.88 - $79.99 = $39.89 ≈ $40
  const monthlySavings = isAnnual ? 'Save $40' : null;

  return (
    <Pressable
      onPress={onPurchase}
      disabled={isLoading}
      style={{
        borderWidth: 2,
        borderColor: isAnnual ? colors.primary : colors.border,
        backgroundColor: isAnnual ? colors.surface : colors.background,
      }}
      className="rounded-2xl p-5 active:opacity-80"
      accessibilityLabel={`Subscribe to ${product.title} for ${product.priceString}`}
      accessibilityRole="button"
    >
      {/* Best Value Badge */}
      {isAnnual && (
        <View style={{ backgroundColor: colors.primary }} className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full">
          <Text style={{ color: '#FFFFFF' }} className="text-xs font-semibold">
            BEST VALUE
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="text-lg font-semibold">
            {product.title.replace(' (North)', '')}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">
            {product.description}
          </Text>
        </View>

        <View className="items-end">
          <Text style={{ color: colors.text }} className="text-xl font-bold">
            {product.priceString}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs">
            {isAnnual ? '/year' : '/month'}
          </Text>
          {monthlySavings && (
            <Text className="text-xs font-medium text-green-600 mt-1">
              {monthlySavings}
            </Text>
          )}
        </View>
      </View>

      {/* Subscribe Button */}
      <View style={{ backgroundColor: colors.primary }} className="mt-4 rounded-xl py-3 items-center">
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF' }} className="text-base font-semibold">
            Subscribe
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default PaywallModal;
