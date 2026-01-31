/**
 * Home Screen (The Board)
 * 
 * Displays all available coaches for the user to interact with.
 * This is the main dashboard after login.
 */

import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';

// Default coaches data (will be moved to database later)
const DEFAULT_COACHES = [
  {
    id: '1',
    name: 'Strategy Coach',
    icon: '🎯',
    description: 'Strategic thinking and decision making',
  },
  {
    id: '2',
    name: 'Systems Coach',
    icon: '⚙️',
    description: 'Process design and optimization',
  },
  {
    id: '3',
    name: 'Writing Coach',
    icon: '✍️',
    description: 'Clear communication and writing',
  },
  {
    id: '4',
    name: 'Decision Coach',
    icon: '🤔',
    description: 'Decision frameworks and clarity',
  },
];

/**
 * Coach Card Component
 */
function CoachCard({ 
  coach, 
  onPress 
}: { 
  coach: typeof DEFAULT_COACHES[0]; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${coach.name}`}
    >
      <Text style={{ fontSize: 40, marginRight: 16 }}>{coach.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
          {coach.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          {coach.description}
        </Text>
      </View>
      <Text style={{ fontSize: 20, color: '#9CA3AF' }}>→</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refresh coaches from database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleCoachPress = (coachId: string) => {
    // TODO: Navigate to chat screen
    console.log('Navigate to chat with coach:', coachId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
            Welcome back,
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>
            {user?.name || 'Friend'}
          </Text>
        </View>

        {/* Section Title */}
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
          Your Board of Directors
        </Text>

        {/* Coach Cards */}
        {DEFAULT_COACHES.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            onPress={() => handleCoachPress(coach.id)}
          />
        ))}

        {/* Add Coach Button (Pro feature) */}
        <TouchableOpacity
          style={{
            borderWidth: 2,
            borderColor: '#E5E7EB',
            borderStyle: 'dashed',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            marginTop: 8,
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Create custom coach"
        >
          <Text style={{ fontSize: 24, marginBottom: 8 }}>+</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280' }}>
            Create Custom Coach
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            Pro Feature
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
