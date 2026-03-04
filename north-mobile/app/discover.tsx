/**
 * Discover Screen
 * 
 * AI-curated resources (books, articles, tools, courses, podcasts)
 * personalized to the user's goals and context.
 * Uses the /agent/curate backend endpoint.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

type Resource = {
  title: string;
  type: string;
  description: string;
  url?: string;
  relevance?: string;
};

type CurateResult = {
  resources: Resource[];
  context_used?: string;
};

const TYPE_ICONS: Record<string, string> = {
  book: '📚',
  article: '📄',
  tool: '🔧',
  course: '🎓',
  podcast: '🎙️',
  video: '🎬',
};

const QUICK_QUERIES = [
  'Books on building better habits',
  'Tools for productivity and focus',
  'Articles about overcoming procrastination',
  'Courses on leadership skills',
  'Podcasts about mental health',
];

export default function DiscoverScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CurateResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(`${api.agentCurate}?query=${encodeURIComponent(q)}`, {
        method: 'POST',
        headers: buildAuthHeaders(session.access_token),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data: CurateResult = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleQuickQuery = (q: string) => {
    setQuery(q);
    handleSearch(q);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Discover</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="What resources are you looking for?"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch()}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => handleSearch()}
            disabled={!query.trim() || isLoading}
            style={[styles.searchBtn, { backgroundColor: colors.primary, opacity: query.trim() ? 1 : 0.4 }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.searchBtnText}> Find Resources</Text>
              </>
            )}
          </Pressable>

          {/* Quick queries (show when no result) */}
          {!result && !isLoading && (
            <View style={styles.quickSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Try these</Text>
              {QUICK_QUERIES.map((q, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleQuickQuery(q)}
                  style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.quickText, { color: colors.text }]}>{q}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={{ color: '#F44336', fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          {/* Results */}
          {result && (
            <View style={styles.results}>
              {result.context_used && (
                <Text style={[styles.contextUsed, { color: colors.textTertiary }]}>
                  {result.context_used}
                </Text>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {result.resources.length} resource{result.resources.length !== 1 ? 's' : ''} found
              </Text>

              {result.resources.map((r, i) => (
                <Pressable
                  key={i}
                  style={[styles.resourceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => r.url && Linking.openURL(r.url)}
                  disabled={!r.url}
                >
                  <View style={styles.resourceHeader}>
                    <Text style={{ fontSize: 24 }}>{TYPE_ICONS[r.type] || '📌'}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.resourceTitle, { color: colors.text }]}>{r.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: colors.backgroundTertiary }]}>
                        <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                          {r.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {r.url && <Ionicons name="open-outline" size={16} color={colors.textTertiary} />}
                  </View>
                  <Text style={[styles.resourceDesc, { color: colors.textSecondary }]}>{r.description}</Text>
                  {r.relevance && (
                    <Text style={[styles.relevance, { color: colors.primary }]}>
                      💡 {r.relevance}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  quickSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickText: {
    fontSize: 14,
    flex: 1,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F4433610',
    marginBottom: 16,
  },
  results: {
    gap: 4,
  },
  contextUsed: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  resourceCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resourceDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  relevance: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
