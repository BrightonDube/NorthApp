/**
 * Card Component Examples
 * 
 * Demonstrates various use cases for the Card component
 * following the Calm Design System Refresh.
 * 
 * These examples can be used as reference or copied into your components.
 */

import { View, Text, Image, ScrollView } from 'react-native';
import { Card } from './Card';

/**
 * Example 1: Simple Static Card
 * 
 * Basic card with default styling - perfect for displaying content
 */
export function SimpleCardExample() {
  return (
    <Card>
      <Text className="text-lg font-semibold text-primary">
        Welcome to North
      </Text>
      <Text className="text-sm text-secondary mt-2">
        Your AI coaching companion for intentional living
      </Text>
    </Card>
  );
}

/**
 * Example 2: Interactive Card with Gradient
 * 
 * Card with gradient background and press handler
 */
export function InteractiveGradientCardExample() {
  const handlePress = () => {
    console.log('Card pressed!');
  };

  return (
    <Card
      gradient
      onPress={handlePress}
      accessibilityLabel="Premium feature card"
      accessibilityHint="Double tap to learn more about premium features"
    >
      <Text className="text-2xl mb-2">✨</Text>
      <Text className="text-lg font-semibold text-primary">
        Premium Features
      </Text>
      <Text className="text-sm text-secondary mt-2">
        Unlock advanced coaching capabilities
      </Text>
    </Card>
  );
}

/**
 * Example 3: Card with Large Padding and Shadow
 * 
 * Spacious card with prominent shadow for emphasis
 */
export function SpaciousCardExample() {
  return (
    <Card padding="large" shadow="lg">
      <Text className="text-xl font-bold text-primary mb-4">
        Daily Reflection
      </Text>
      <Text className="text-base text-primary leading-6">
        Take a moment to reflect on your day. What went well? 
        What could be improved? How are you feeling?
      </Text>
    </Card>
  );
}

/**
 * Example 4: Minimal Card without Shadow
 * 
 * Flat card design for subtle UI elements
 */
export function MinimalCardExample() {
  return (
    <Card shadow="none">
      <Text className="text-sm text-tertiary uppercase tracking-wide mb-1">
        Status
      </Text>
      <Text className="text-base text-primary font-medium">
        All systems operational
      </Text>
    </Card>
  );
}

/**
 * Example 5: List of Cards
 * 
 * Multiple cards in a scrollable list with consistent spacing
 */
export function CardListExample() {
  const items = [
    { id: 1, title: 'Morning Routine', description: 'Start your day with intention' },
    { id: 2, title: 'Work Session', description: 'Focus on your most important task' },
    { id: 3, title: 'Evening Reflection', description: 'Review and plan for tomorrow' },
  ];

  return (
    <ScrollView className="p-6">
      {items.map((item, index) => (
        <Card
          key={item.id}
          onPress={() => console.log(`Selected: ${item.title}`)}
          style={{ marginBottom: index < items.length - 1 ? 12 : 0 }}
        >
          <Text className="text-base font-semibold text-primary">
            {item.title}
          </Text>
          <Text className="text-sm text-secondary mt-1">
            {item.description}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

/**
 * Example 6: Card with Image Content
 * 
 * Card displaying an image with text overlay
 */
export function ImageCardExample() {
  return (
    <Card padding="large" shadow="md">
      <View className="rounded-lg overflow-hidden mb-4">
        <Image
          source={{ uri: 'https://via.placeholder.com/300x150' }}
          style={{ width: '100%', height: 150 }}
          accessibilityLabel="Placeholder image"
        />
      </View>
      <Text className="text-lg font-semibold text-primary">
        Mindful Moments
      </Text>
      <Text className="text-sm text-secondary mt-2">
        Discover practices for daily mindfulness
      </Text>
    </Card>
  );
}

/**
 * Example 7: Action Card with Long Press
 * 
 * Card supporting both tap and long press actions
 */
export function ActionCardExample() {
  const handlePress = () => {
    console.log('Quick action');
  };

  const handleLongPress = () => {
    console.log('Edit mode');
  };

  return (
    <Card
      onPress={handlePress}
      onLongPress={handleLongPress}
      gradient
      padding="large"
      accessibilityLabel="Goal card"
      accessibilityHint="Double tap to view, long press to edit"
    >
      <Text className="text-base font-semibold text-primary">
        Complete morning meditation
      </Text>
      <Text className="text-sm text-secondary mt-2">
        Tap to mark complete, long press to edit
      </Text>
    </Card>
  );
}

/**
 * Example 8: Settings Group Card
 * 
 * Card grouping related settings with large padding
 */
export function SettingsCardExample() {
  return (
    <Card padding="large" shadow="sm">
      <Text className="text-lg font-semibold text-primary mb-4">
        Notification Preferences
      </Text>
      
      <View className="mb-3">
        <Text className="text-base text-primary">Push Notifications</Text>
        <Text className="text-sm text-tertiary mt-1">
          Receive alerts on your device
        </Text>
      </View>
      
      <View className="mb-3">
        <Text className="text-base text-primary">Email Updates</Text>
        <Text className="text-sm text-tertiary mt-1">
          Weekly summary of your progress
        </Text>
      </View>
      
      <View>
        <Text className="text-base text-primary">SMS Reminders</Text>
        <Text className="text-sm text-tertiary mt-1">
          Text reminders for scheduled sessions
        </Text>
      </View>
    </Card>
  );
}

/**
 * Example 9: Stat Card with Gradient
 * 
 * Card displaying statistics with gradient background
 */
export function StatCardExample() {
  return (
    <Card gradient padding="large" shadow="md">
      <Text className="text-sm text-tertiary uppercase tracking-wide mb-2">
        This Week
      </Text>
      <Text className="text-4xl font-bold text-primary mb-1">
        12
      </Text>
      <Text className="text-base text-secondary">
        Coaching sessions completed
      </Text>
    </Card>
  );
}

/**
 * Example 10: Grid of Cards
 * 
 * Cards arranged in a grid layout
 */
export function CardGridExample() {
  const features = [
    { icon: '🎯', title: 'Goals', description: 'Track progress' },
    { icon: '💭', title: 'Reflect', description: 'Daily insights' },
    { icon: '📊', title: 'Analytics', description: 'View trends' },
    { icon: '🔔', title: 'Reminders', description: 'Stay on track' },
  ];

  return (
    <View className="flex-row flex-wrap p-6">
      {features.map((feature, index) => (
        <View
          key={index}
          style={{
            width: '48%',
            marginRight: index % 2 === 0 ? '4%' : 0,
            marginBottom: 12,
          }}
        >
          <Card
            onPress={() => console.log(`Selected: ${feature.title}`)}
            shadow="sm"
          >
            <Text className="text-3xl mb-2">{feature.icon}</Text>
            <Text className="text-base font-semibold text-primary">
              {feature.title}
            </Text>
            <Text className="text-sm text-secondary mt-1">
              {feature.description}
            </Text>
          </Card>
        </View>
      ))}
    </View>
  );
}

/**
 * Example 11: Full Demo Screen
 * 
 * Complete screen showcasing various card styles
 */
export function CardDemoScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-6">
      <Text className="text-2xl font-bold text-primary mb-6">
        Card Component Examples
      </Text>

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3">
        Simple Card
      </Text>
      <SimpleCardExample />

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3 mt-8">
        Interactive with Gradient
      </Text>
      <InteractiveGradientCardExample />

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3 mt-8">
        Large Padding & Shadow
      </Text>
      <SpaciousCardExample />

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3 mt-8">
        Minimal (No Shadow)
      </Text>
      <MinimalCardExample />

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3 mt-8">
        With Image
      </Text>
      <ImageCardExample />

      <Text className="text-sm text-tertiary uppercase tracking-wide mb-3 mt-8">
        Statistics
      </Text>
      <StatCardExample />
    </ScrollView>
  );
}
