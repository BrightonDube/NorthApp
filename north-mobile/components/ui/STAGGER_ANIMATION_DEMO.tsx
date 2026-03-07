/**
 * Stagger Animation Demo
 * 
 * Demonstrates the implementation of stagger animations for lists
 * as specified in task 16.3 of the calm-design-refresh spec.
 * 
 * Features:
 * - FadeIn with stagger for list items
 * - 50ms delay between items (as per requirement 3.6)
 * - Slide-up animation combined with fade-in
 * 
 * Requirements: 3.6
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FadeIn, getStaggerDelay } from '../FadeIn';
import { ListItem } from './ListItem';

/**
 * Demo 1: Simple List with Stagger Animation
 * 
 * Shows a basic list of items with 50ms stagger delay between each item.
 */
export function SimpleStaggerDemo() {
  const items = [
    { id: '1', title: 'First Item', subtitle: 'Appears first' },
    { id: '2', title: 'Second Item', subtitle: 'Appears 50ms later' },
    { id: '3', title: 'Third Item', subtitle: 'Appears 100ms later' },
    { id: '4', title: 'Fourth Item', subtitle: 'Appears 150ms later' },
    { id: '5', title: 'Fifth Item', subtitle: 'Appears 200ms later' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Simple Stagger Animation</Text>
      <Text style={styles.description}>
        Each item fades in and slides up with a 50ms delay between items.
      </Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => console.log('Pressed:', item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Demo 2: Custom Stagger Delay
 * 
 * Shows how to use a custom stagger delay (within the 50-100ms range).
 */
export function CustomStaggerDemo() {
  const items = [
    { id: '1', title: 'Item A' },
    { id: '2', title: 'Item B' },
    { id: '3', title: 'Item C' },
    { id: '4', title: 'Item D' },
  ];

  // Using 75ms stagger delay (within the 50-100ms requirement)
  const customStaggerDelay = 75;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Stagger Delay (75ms)</Text>
      <Text style={styles.description}>
        Items appear with a 75ms delay between each, creating a slightly slower cascade effect.
      </Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index, customStaggerDelay)} slideUp>
            <ListItem
              title={item.title}
              onPress={() => console.log('Pressed:', item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Demo 3: Maximum Stagger Delay
 * 
 * Shows the maximum recommended stagger delay (100ms).
 */
export function MaxStaggerDemo() {
  const items = [
    { id: '1', title: 'Slow Item 1' },
    { id: '2', title: 'Slow Item 2' },
    { id: '3', title: 'Slow Item 3' },
  ];

  // Using 100ms stagger delay (maximum recommended)
  const maxStaggerDelay = 100;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Maximum Stagger Delay (100ms)</Text>
      <Text style={styles.description}>
        Items appear with a 100ms delay, creating a more deliberate, meditative entrance.
      </Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index, maxStaggerDelay)} slideUp>
            <ListItem
              title={item.title}
              onPress={() => console.log('Pressed:', item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Demo 4: Fade-In Only (No Slide)
 * 
 * Shows stagger animation with fade-in only, without the slide-up effect.
 */
export function FadeOnlyStaggerDemo() {
  const items = [
    { id: '1', title: 'Fade Item 1' },
    { id: '2', title: 'Fade Item 2' },
    { id: '3', title: 'Fade Item 3' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Fade-In Only (No Slide)</Text>
      <Text style={styles.description}>
        Items fade in without sliding up, creating a gentler entrance effect.
      </Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)}>
            <ListItem
              title={item.title}
              onPress={() => console.log('Pressed:', item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Complete Demo Screen
 * 
 * Shows all stagger animation variations in a single scrollable view.
 */
export function StaggerAnimationDemoScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Stagger Animation Demo</Text>
      <Text style={styles.subtitle}>
        Demonstrating list item animations with 50ms stagger delays
        as specified in the calm design refresh (Requirement 3.6).
      </Text>

      <SimpleStaggerDemo />
      <CustomStaggerDemo />
      <MaxStaggerDemo />
      <FadeOnlyStaggerDemo />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All animations use the ease-gentle curve (cubic-bezier(0.4, 0.0, 0.2, 1))
          with a 400ms duration for a calm, fluid feel.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9', // Calm design: warm white
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    color: '#1C1917', // Calm design: warm black
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: '#78716C', // Calm design: muted stone
    marginBottom: 32,
  },
  section: {
    marginBottom: 48,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#78716C',
    marginBottom: 16,
  },
  list: {
    gap: 8, // Requirement 2.5: 8px spacing between items
  },
  footer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F5F5F4', // Calm design: soft stone
    borderRadius: 12,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#78716C',
    fontStyle: 'italic',
  },
});

export default StaggerAnimationDemoScreen;
