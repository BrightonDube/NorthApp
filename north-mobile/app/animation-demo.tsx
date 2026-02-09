/**
 * Animation Demo Screen
 * 
 * A test screen to verify all Calm Design System animations are working correctly.
 * This screen demonstrates:
 * - BreathingIndicator with different sizes and colors
 * - FadeIn with and without slide-up
 * - FadeIn with stagger delays
 * - SkeletonLoader variants
 * 
 * To access: Navigate to /animation-demo in the app
 * 
 * This is a development/testing screen and should not be included in production builds.
 */

import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { BreathingIndicator } from '@/components/BreathingIndicator';
import { FadeIn } from '@/components/FadeIn';
import {
  Skeleton,
  CoachCardSkeleton,
  ContextCardSkeleton,
  MessageSkeleton,
  CoachGridSkeleton,
  ContextSectionSkeleton,
  ChatLoadingSkeleton,
} from '@/components/SkeletonLoader';

export default function AnimationDemoScreen() {
  const [showFadeIn, setShowFadeIn] = useState(true);
  const [showStaggered, setShowStaggered] = useState(true);

  const toggleFadeIn = () => setShowFadeIn(!showFadeIn);
  const toggleStaggered = () => setShowStaggered(!showStaggered);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Animation Demo</Text>
          <Text style={styles.subtitle}>
            Calm Design System - Animation Verification
          </Text>
        </View>

        {/* BreathingIndicator Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BreathingIndicator</Text>
          <Text style={styles.sectionDescription}>
            2500ms breathing animation with scale (1.0 → 1.08) and opacity (0.6 → 1.0) pulse
          </Text>
          
          <View style={styles.demoRow}>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Default</Text>
              <BreathingIndicator />
            </View>
            
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>With Text</Text>
              <BreathingIndicator text="Loading..." />
            </View>
          </View>

          <View style={styles.demoRow}>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Sky Blue</Text>
              <BreathingIndicator color="#BAE6FD" size={50} />
            </View>
            
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Sage Green</Text>
              <BreathingIndicator color="#D9F0E3" size={50} />
            </View>
            
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Lavender</Text>
              <BreathingIndicator color="#E9D5FF" size={50} />
            </View>
          </View>
        </View>

        {/* FadeIn Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FadeIn Animation</Text>
          <Text style={styles.sectionDescription}>
            400ms fade-in with optional slide-up (8px). Tap to toggle.
          </Text>
          
          <Pressable onPress={toggleFadeIn} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>
              {showFadeIn ? 'Hide' : 'Show'} FadeIn Demo
            </Text>
          </Pressable>

          {showFadeIn && (
            <>
              <FadeIn>
                <View style={styles.demoCard}>
                  <Text style={styles.demoCardText}>Basic Fade-In</Text>
                  <Text style={styles.demoCardSubtext}>No slide animation</Text>
                </View>
              </FadeIn>

              <FadeIn slideUp delay={100}>
                <View style={styles.demoCard}>
                  <Text style={styles.demoCardText}>Fade-In + Slide-Up</Text>
                  <Text style={styles.demoCardSubtext}>With 100ms delay</Text>
                </View>
              </FadeIn>

              <FadeIn slideUp delay={200}>
                <View style={styles.demoCard}>
                  <Text style={styles.demoCardText}>Fade-In + Slide-Up</Text>
                  <Text style={styles.demoCardSubtext}>With 200ms delay</Text>
                </View>
              </FadeIn>
            </>
          )}
        </View>

        {/* Staggered Animation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Staggered List Animation</Text>
          <Text style={styles.sectionDescription}>
            50ms stagger delay between items. Tap to toggle.
          </Text>
          
          <Pressable onPress={toggleStaggered} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>
              {showStaggered ? 'Hide' : 'Show'} Staggered Demo
            </Text>
          </Pressable>

          {showStaggered && (
            <>
              {['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'].map((item, index) => (
                <FadeIn key={item} delay={index * 50} slideUp>
                  <View style={styles.listItem}>
                    <Text style={styles.listItemText}>{item}</Text>
                    <Text style={styles.listItemDelay}>Delay: {index * 50}ms</Text>
                  </View>
                </FadeIn>
              ))}
            </>
          )}
        </View>

        {/* SkeletonLoader Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SkeletonLoader</Text>
          <Text style={styles.sectionDescription}>
            1500ms linear shimmer animation with surface colors
          </Text>

          <View style={styles.skeletonDemo}>
            <Text style={styles.demoLabel}>Basic Shapes</Text>
            <Skeleton width="100%" height={20} variant="text" />
            <Skeleton width="80%" height={20} variant="text" />
            <Skeleton width={60} height={60} variant="circle" />
            <Skeleton width="100%" height={100} variant="rectangle" />
          </View>

          <View style={styles.skeletonDemo}>
            <Text style={styles.demoLabel}>Coach Card Skeleton</Text>
            <CoachCardSkeleton />
          </View>

          <View style={styles.skeletonDemo}>
            <Text style={styles.demoLabel}>Context Card Skeleton</Text>
            <ContextCardSkeleton />
          </View>

          <View style={styles.skeletonDemo}>
            <Text style={styles.demoLabel}>Message Skeletons</Text>
            <MessageSkeleton isUser={false} />
            <MessageSkeleton isUser={true} />
          </View>

          <View style={styles.skeletonDemo}>
            <Text style={styles.demoLabel}>Coach Grid Skeleton</Text>
            <CoachGridSkeleton count={2} />
          </View>
        </View>

        {/* Performance Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Verification</Text>
          <Text style={styles.performanceNote}>
            ✓ All animations should run at 60fps
          </Text>
          <Text style={styles.performanceNote}>
            ✓ No frame drops during scrolling
          </Text>
          <Text style={styles.performanceNote}>
            ✓ Animations feel calm and smooth
          </Text>
          <Text style={styles.performanceNote}>
            ✓ Reduced motion preferences respected
          </Text>
          <Text style={styles.performanceNote}>
            ✓ Dark mode colors work correctly
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Calm Design System v1.0
          </Text>
          <Text style={styles.footerText}>
            Animation Verification Complete
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#1C1917',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: '#78716C',
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: -0.2,
    color: '#1C1917',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#78716C',
    marginBottom: 24,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  demoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  demoLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78716C',
    fontWeight: '500',
  },
  toggleButton: {
    backgroundColor: '#292524',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleButtonText: {
    fontSize: 17,
    lineHeight: 17,
    fontWeight: '600',
    color: '#FAFAF9',
  },
  demoCard: {
    backgroundColor: '#F5F5F4',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  demoCardText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 4,
  },
  demoCardSubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: '#78716C',
  },
  listItem: {
    backgroundColor: '#F5F5F4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
    color: '#1C1917',
  },
  listItemDelay: {
    fontSize: 13,
    lineHeight: 18,
    color: '#78716C',
  },
  skeletonDemo: {
    backgroundColor: '#F5F5F4',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  performanceNote: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1C1917',
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#A8A29E',
  },
});
