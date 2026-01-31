/**
 * Context Screen
 * 
 * Allows users to manage their personal context items.
 * Context is grouped by category: values, goals, projects, constraints.
 */

import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder data
const CONTEXT_DATA = {
  values: [],
  goals: [],
  projects: [],
  constraints: [],
};

const CATEGORY_INFO = {
  values: { label: 'Values', icon: '💎', color: '#8B5CF6' },
  goals: { label: 'Goals', icon: '🎯', color: '#3B82F6' },
  projects: { label: 'Projects', icon: '📁', color: '#10B981' },
  constraints: { label: 'Constraints', icon: '⚠️', color: '#F59E0B' },
};

/**
 * Context Section Component
 */
function ContextSection({ 
  category, 
  items 
}: { 
  category: keyof typeof CATEGORY_INFO; 
  items: string[];
}) {
  const info = CATEGORY_INFO[category];
  
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 20, marginRight: 8 }}>{info.icon}</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
          {info.label}
        </Text>
      </View>
      
      {items.length === 0 ? (
        <TouchableOpacity
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderStyle: 'dashed',
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${info.label.toLowerCase()}`}
        >
          <Text style={{ color: '#6B7280', textAlign: 'center' }}>
            + Add your first {info.label.toLowerCase().slice(0, -1)}
          </Text>
        </TouchableOpacity>
      ) : (
        items.map((item, index) => (
          <View
            key={index}
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: '#374151' }}>{item}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function ContextScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>
            Your Context
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            Define your personal operating system
          </Text>
        </View>

        {/* Context Sections */}
        <ContextSection category="values" items={CONTEXT_DATA.values} />
        <ContextSection category="goals" items={CONTEXT_DATA.goals} />
        <ContextSection category="projects" items={CONTEXT_DATA.projects} />
        <ContextSection category="constraints" items={CONTEXT_DATA.constraints} />
      </ScrollView>
    </SafeAreaView>
  );
}
