/**
 * Panic Mode Screen
 * 
 * Immediate crisis support via streaming AI agent.
 * Provides grounding, calming responses and crisis resources.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

export default function PanicScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [started, setStarted] = useState(false);

  const startPanic = useCallback(async (initialMessage?: string) => {
    setIsStreaming(true);
    setStarted(true);
    setResponse('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(api.agentPanic, {
        method: 'POST',
        headers: buildAuthHeaders(session.access_token),
        body: JSON.stringify({ initial_message: initialMessage || '' }),
      });

      if (!res.ok || !res.body) {
        setResponse('I\'m here for you. Take a deep breath. If you need immediate help, please call 988 (Suicide & Crisis Lifeline) or text HOME to 741741.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'token' && parsed.content) {
              fullText += parsed.content;
              setResponse(fullText);
              scrollRef.current?.scrollToEnd({ animated: false });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[Panic] Stream error:', e);
      if (!response) {
        setResponse('I\'m here with you. Take slow, deep breaths. If you\'re in crisis, please reach out to 988 or text HOME to 741741.');
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const handleSend = () => {
    if (!message.trim()) {
      startPanic();
    } else {
      startPanic(message.trim());
      setMessage('');
    }
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
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Safe Space</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {!started ? (
            <View style={styles.intro}>
              <Text style={{ fontSize: 48, textAlign: 'center' }}>🫂</Text>
              <Text style={[styles.introTitle, { color: colors.text }]}>
                You're not alone
              </Text>
              <Text style={[styles.introDesc, { color: colors.textSecondary }]}>
                This is a safe space. Tell me what you're going through, or just tap "Talk to me" and I'll guide you through some grounding.
              </Text>

              <Pressable
                onPress={() => startPanic()}
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.startBtnText}>Talk to me</Text>
              </Pressable>

              {/* Crisis resources always visible */}
              <View style={[styles.resourceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.resourceTitle, { color: colors.text }]}>
                  Crisis Resources
                </Text>
                <Pressable onPress={() => Linking.openURL('tel:988')} style={styles.resourceRow}>
                  <Ionicons name="call" size={16} color={colors.primary} />
                  <Text style={[styles.resourceText, { color: colors.primary }]}>
                    988 — Suicide & Crisis Lifeline
                  </Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL('sms:741741?body=HOME')} style={styles.resourceRow}>
                  <Ionicons name="chatbubble" size={16} color={colors.primary} />
                  <Text style={[styles.resourceText, { color: colors.primary }]}>
                    Text HOME to 741741
                  </Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL('tel:911')} style={styles.resourceRow}>
                  <Ionicons name="medkit" size={16} color="#F44336" />
                  <Text style={[styles.resourceText, { color: '#F44336' }]}>
                    911 — Emergency Services
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.responseArea}>
              {response ? (
                <Text style={[styles.responseText, { color: colors.text }]}>
                  {response}
                  {isStreaming && <Text style={{ color: colors.primary }}>|</Text>}
                </Text>
              ) : isStreaming ? (
                <Text style={[styles.responseText, { color: colors.textTertiary }]}>
                  Taking a moment to be here with you...
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        {!started && (
          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={message}
              onChangeText={setMessage}
              placeholder="What's on your mind? (optional)"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
            />
            <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  intro: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  startBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resourceCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    width: '100%',
    marginTop: 16,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  resourceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  responseArea: {
    paddingTop: 10,
  },
  responseText: {
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
