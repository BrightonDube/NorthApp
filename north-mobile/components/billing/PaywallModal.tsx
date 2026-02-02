/**
 * Paywall Modal Component
 * 
 * Displays subscription offerings and handles purchase flow.
 * Beautiful, minimal design following North's design system.
 * 
 * Validates: Requirements 12.3, 12.4, 12.5
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  default: {
    title: 'Unlock North Pro',
    description: 'Get the most out of your AI coaching experience.',
  },
};

// Pro benefits list
const PRO_BENEFITS = [
  { icon: 'create-outline', text: 'Create unlimited custom coaches' },
  { icon: 'people-outline', text: 'Access all marketplace coaches' },
  { icon: 'chatbubbles-outline', text: 'Unlimited AI conversations' },
  { icon: 'document-text-outline', text: 'Unlimited personal context' },
  { icon: 'star-outline', text: 'Priority AI responses' },
  { icon: 'sync-outline', text: 'Cross-device sync' },
];

interface PaywallModalProps {
  visible: boolean;
  feature?: string;
  onClose: () => void;
}

export function PaywallModal({ visible, feature, onClose }: PaywallModalProps) {
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
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
            <View className="w-10" />
            <Text className="text-lg font-semibold text-text-primary">
              North Pro
            </Text>
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-surface"
              accessibilityLabel="Close paywall"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#71717A" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerClassName="px-6 pb-8"
            showsVerticalScrollIndicator={false}
          >
          {/* Hero Section */}
          <View className="items-center py-8">
            {/* Current Tier Badge */}
            {!isProUser && (
              <View className="mb-3 px-3 py-1 bg-surface rounded-full">
                <Text className="text-xs font-semibold text-text-secondary">
                  Currently on Free Plan
                </Text>
              </View>
            )}
            
            <View className="w-20 h-20 rounded-full bg-brand-primary items-center justify-center mb-4">
              <Ionicons name="diamond" size={40} color="#FFFFFF" />
            </View>
            <Text className="text-2xl font-bold text-text-primary text-center mb-2">
              {featureInfo.title}
            </Text>
            <Text className="text-base text-text-secondary text-center px-4">
              {featureInfo.description}
            </Text>
          </View>

          {/* Benefits List */}
          <View className="bg-surface rounded-2xl p-5 mb-6">
            <Text className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              Everything in Pro
            </Text>
            {PRO_BENEFITS.map((benefit, index) => (
              <View
                key={index}
                className="flex-row items-center py-3 border-b border-border-subtle last:border-b-0"
              >
                <View className="w-8 h-8 rounded-full bg-surface-highlight items-center justify-center mr-3">
                  <Ionicons
                    name={benefit.icon as any}
                    size={18}
                    color="#09090B"
                  />
                </View>
                <Text className="flex-1 text-base text-text-primary">
                  {benefit.text}
                </Text>
                <Ionicons name="checkmark" size={20} color="#22C55E" />
              </View>
            ))}
          </View>

          {/* Pricing Packages */}
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#09090B" />
              <Text className="text-text-secondary mt-2">Loading plans...</Text>
            </View>
          ) : offerings?.availablePackages && offerings.availablePackages.length > 0 ? (
            <View className="gap-3 mb-6">
              {offerings.availablePackages.map((pkg) => (
                <PackageCard
                  key={pkg.identifier}
                  pkg={pkg}
                  onPurchase={() => handlePurchase(pkg)}
                  isLoading={isLoading}
                />
              ))}
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 mb-6 items-center">
              <Ionicons name="alert-circle-outline" size={32} color="#71717A" />
              <Text className="text-text-secondary text-center mt-2">
                Subscription plans are not available at the moment.
                Please try again later.
              </Text>
            </View>
          )}

          {/* Restore Purchases */}
          <Pressable
            onPress={handleRestore}
            disabled={isLoading}
            className="py-3 items-center"
            accessibilityLabel="Restore purchases"
            accessibilityRole="button"
          >
            <Text className="text-base text-text-secondary underline">
              Restore Purchases
            </Text>
          </Pressable>

          {/* Legal Text */}
          <Text className="text-xs text-text-tertiary text-center mt-4 px-4">
            Payment will be charged to your App Store or Google Play account.
            Subscription automatically renews unless cancelled at least 24 hours
            before the end of the current period.
          </Text>
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
}

function PackageCard({ pkg, onPurchase, isLoading }: PackageCardProps) {
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
      className={`
        border-2 rounded-2xl p-5
        ${isAnnual ? 'border-brand-primary bg-surface' : 'border-border-subtle bg-background'}
        active:opacity-80
      `}
      accessibilityLabel={`Subscribe to ${product.title} for ${product.priceString}`}
      accessibilityRole="button"
    >
      {/* Best Value Badge */}
      {isAnnual && (
        <View className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-brand-inverse">
            BEST VALUE
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-text-primary">
            {product.title.replace(' (North)', '')}
          </Text>
          <Text className="text-sm text-text-secondary mt-1">
            {product.description}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-xl font-bold text-text-primary">
            {product.priceString}
          </Text>
          <Text className="text-xs text-text-secondary">
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
      <View className="mt-4 bg-brand-primary rounded-xl py-3 items-center">
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-base font-semibold text-brand-inverse">
            Subscribe
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default PaywallModal;
