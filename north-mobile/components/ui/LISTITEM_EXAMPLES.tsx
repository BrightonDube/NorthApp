/**
 * ListItem Component Examples
 * 
 * Demonstrates various use cases for the ListItem component
 * following the calm design refresh principles.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ListItem } from './ListItem';
import { FadeIn, getStaggerDelay } from '../FadeIn';
import { Ionicons } from '@expo/vector-icons';

/**
 * Example 1: Simple Text Items
 */
export function SimpleListExample() {
  const items = [
    { id: '1', title: 'Settings' },
    { id: '2', title: 'Profile' },
    { id: '3', title: 'Help' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Simple Text Items</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem title={item.title} onPress={() => console.log(item.title)} />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 2: Items with Subtitles
 */
export function SubtitleListExample() {
  const items = [
    { id: '1', title: 'Notifications', subtitle: 'Manage your notification preferences' },
    { id: '2', title: 'Privacy', subtitle: 'Control your privacy settings' },
    { id: '3', title: 'Security', subtitle: 'Manage security and authentication' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items with Subtitles</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => console.log(item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 3: Items with Icons
 */
export function IconListExample() {
  const items = [
    { id: '1', title: 'Account', icon: 'person' as const },
    { id: '2', title: 'Notifications', icon: 'notifications' as const },
    { id: '3', title: 'Privacy', icon: 'lock-closed' as const },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items with Icons</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              leftAccessory={<Ionicons name={item.icon} size={24} color="#78716C" />}
              rightAccessory={<Ionicons name="chevron-forward" size={20} color="#A8A29E" />}
              onPress={() => console.log(item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 4: Items with Badges
 */
export function BadgeListExample() {
  const items = [
    { id: '1', title: 'Messages', subtitle: '3 unread messages', icon: '💬', count: 3 },
    { id: '2', title: 'Notifications', subtitle: '12 new notifications', icon: '🔔', count: 12 },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items with Badges</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              subtitle={item.subtitle}
              leftAccessory={<Text style={{ fontSize: 32 }}>{item.icon}</Text>}
              rightAccessory={
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              }
              onPress={() => console.log(item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 5: Items with Separators
 */
export function SeparatorListExample() {
  const items = [
    { id: '1', title: 'General', showSeparator: true },
    { id: '2', title: 'Appearance', showSeparator: true },
    { id: '3', title: 'Advanced', showSeparator: false },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items with Separators</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              showSeparator={item.showSeparator}
              onPress={() => console.log(item.title)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 6: Coach List
 */
export function CoachListExample() {
  const coaches = [
    { id: '1', name: 'Strategy Coach', icon: '🎯', description: 'Help with strategic planning' },
    { id: '2', name: 'Wellness Coach', icon: '🧘', description: 'Focus on health and wellness' },
    { id: '3', name: 'Career Coach', icon: '💼', description: 'Career development guidance' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Coach List</Text>
      <View style={styles.list}>
        {coaches.map((coach, index) => (
          <FadeIn key={coach.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={coach.name}
              subtitle={coach.description}
              leftAccessory={<Text style={{ fontSize: 32 }}>{coach.icon}</Text>}
              onPress={() => console.log('Open chat with', coach.name)}
              onLongPress={() => console.log('Edit', coach.name)}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 7: Disabled Items
 */
export function DisabledListExample() {
  const items = [
    { id: '1', title: 'Available Feature', subtitle: 'This feature is available', disabled: false },
    { id: '2', title: 'Premium Feature', subtitle: 'Upgrade to unlock', disabled: true, hasLock: true },
    { id: '3', title: 'Coming Soon', subtitle: 'This feature is coming soon', disabled: true, hasLock: false },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Disabled Items</Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem
              title={item.title}
              subtitle={item.subtitle}
              disabled={item.disabled}
              onPress={item.disabled ? undefined : () => console.log(item.title)}
              rightAccessory={item.hasLock ? <Ionicons name="lock-closed" size={20} color="#A8A29E" /> : undefined}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Example 8: Custom Content
 */
export function CustomContentExample() {
  const users = [
    { id: '1', name: 'John Doe', email: 'john.doe@example.com', status: 'Active', statusColor: '#D9F0E3', textColor: '#14532D' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', status: 'Away', statusColor: '#FEF3C7', textColor: '#92400E' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Custom Content</Text>
      <View style={styles.list}>
        {users.map((user, index) => (
          <FadeIn key={user.id} delay={getStaggerDelay(index)} slideUp>
            <ListItem onPress={() => console.log('Custom', user.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 20 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customTitle}>{user.name}</Text>
                  <Text style={styles.customSubtitle}>{user.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: user.statusColor }]}>
                  <Text style={[styles.statusText, { color: user.textColor }]}>{user.status}</Text>
                </View>
              </View>
            </ListItem>
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

/**
 * Complete Demo Screen
 */
export function ListItemExamplesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ListItem Component Examples</Text>
      <Text style={styles.description}>
        Demonstrating various use cases for the ListItem component
        following calm design principles.
      </Text>

      <SimpleListExample />
      <SubtitleListExample />
      <IconListExample />
      <BadgeListExample />
      <SeparatorListExample />
      <CoachListExample />
      <DisabledListExample />
      <CustomContentExample />
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
  description: {
    fontSize: 17,
    lineHeight: 26,
    color: '#78716C', // Calm design: muted stone
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    color: '#1C1917',
    marginBottom: 16,
  },
  list: {
    gap: 8, // Requirement 2.5: 8px spacing between items
  },
  card: {
    backgroundColor: '#F5F5F4', // Calm design: soft stone
    borderRadius: 16,
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BAE6FD', // Calm design: soft sky
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1917',
  },
  customSubtitle: {
    fontSize: 15,
    color: '#78716C',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#D9F0E3', // Calm design: soft sage
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14532D', // Calm design: deep sage
  },
});

export default ListItemExamplesScreen;
