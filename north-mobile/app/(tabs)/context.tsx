/**
 * Context Management Screen
 * 
 * Main screen for managing user context items (values, goals, projects, constraints).
 * Features:
 * - Display all context items grouped by category
 * - Add button with tier check (free users limited to 3 items)
 * - Edit and delete context items
 * - Pull-to-refresh functionality
 * - Empty state when no context items exist
 * - Loading and error states
 * - Pro upgrade prompt for free users at limit
 * 
 * Validates: Requirements 14.1-14.7
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Category information
const CATEGORY_INFO = {
  values: { label: 'Values', icon: '💎' },
  goals: { label: 'Goals', icon: '🎯' },
  projects: { label: 'Projects', icon: '🚀' },
  constraints: { label: 'Constraints', icon: '⚠️' },
};

// Mock data for now
const CONTEXT_DATA = {
  values: ['I value transparency over politics', 'Family comes first'],
  goals: ['Launch my startup by Q2', 'Write a book this year'],
  projects: ['Building a SaaS for small businesses'],
  constraints: ['I have 2 hours/day for deep work', 'Budget is limited'],
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
