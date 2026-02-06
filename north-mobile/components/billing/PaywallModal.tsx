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

// Pro benefits list - reduced to 4 key benefits for cleaner design
const PRO_BENEFITS = [
  'Create unlimited custom coaches',
  'Unlimited personal context',
  'Unlimited AI conversations',
  'Priority AI responses',
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
              className="items-center justify-center rounded-full bg-surface"
              style={{ width: 44, height: 44 }}
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
          <View className="items-center py-12">
            <View className="w-20 h-20 rounded-full bg-brand-primary items-center justify-center mb-6">
              <Ionicons name="diamond" size={40} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-bold text-text-primary text-center mb-3">
              {featureInfo.title}
            </Text>
            <Text className="text-base text-text-secondary text-center px-8 leading-6">
              {featureInfo.description}
            </Text>
          </View>

          {/* Benefits List */}
          <View className="bg-surface rounded-2xl p-6 mb-8">
            {PRO_BENEFITS.map((benefit, index) => (
              <View
                key={index}
                className="flex-row items-center py-4 border-b border-border-subtle last:border-b-0"
              >
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text className="flex-1 text-base text-text-primary ml-4">
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Packages */}
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#09090B" />
            </View>
          ) : offerings?.availablePackages && offerings.availablePackages.length > 0 ? (
            <View className="gap-3 mb-8">
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
            <View className="bg-surface rounded-2xl p-8 mb-8 items-center">
              <Ionicons name="alert-circle-outline" size={32} color="#71717A" />
              <Text className="text-text-secondary text-center mt-3">
                Subscription plans are not available at the moment.
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
            <Text className="text-base text-text-secondary">
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
