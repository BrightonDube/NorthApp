/**
 * Analytics Service
 * 
 * Lightweight analytics tracking for North app.
 * Uses Supabase to store analytics events (no 3rd party SDK needed).
 * Events are batched and sent periodically to reduce network calls.
 * 
 * Tracked events:
 * - Screen views
 * - Coach interactions (chat started, message sent)
 * - Paywall interactions (shown, purchased, dismissed)
 * - Check-in completions
 * - Feature usage
 */

import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BATCH_KEY = '@north_analytics_batch';
const BATCH_INTERVAL = 30000; // 30 seconds
const MAX_BATCH_SIZE = 50;

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

let eventBatch: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;

/**
 * Set the current user for analytics
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  currentUserId = userId;
  trackEvent('user_identified', traits);
}

/**
 * Clear user identity (on logout)
 */
export function resetAnalytics(): void {
  currentUserId = null;
  eventBatch = [];
}

/**
 * Track an analytics event
 */
export function trackEvent(event: string, properties?: Record<string, any>): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
    userId: currentUserId || undefined,
  };

  eventBatch.push(analyticsEvent);

  if (__DEV__) {
    console.log('[Analytics]', event, properties);
  }

  // Flush if batch is full
  if (eventBatch.length >= MAX_BATCH_SIZE) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, BATCH_INTERVAL);
  }
}

/**
 * Track a screen view
 */
export function trackScreen(screenName: string, properties?: Record<string, any>): void {
  trackEvent('screen_view', { screen: screenName, ...properties });
}

// Pre-defined event helpers
export const Analytics = {
  // Auth events
  login: (method: string) => trackEvent('login', { method }),
  signup: (method: string) => trackEvent('signup', { method }),
  logout: () => trackEvent('logout'),

  // Coach events  
  coachViewed: (coachId: string, coachName: string) =>
    trackEvent('coach_viewed', { coachId, coachName }),
  chatStarted: (coachId: string, coachName: string) =>
    trackEvent('chat_started', { coachId, coachName }),
  messageSent: (coachId: string, messageLength: number) =>
    trackEvent('message_sent', { coachId, messageLength }),

  // Billing events
  paywallShown: (feature: string) => trackEvent('paywall_shown', { feature }),
  paywallDismissed: (feature: string) => trackEvent('paywall_dismissed', { feature }),
  purchaseStarted: (packageId: string) => trackEvent('purchase_started', { packageId }),
  purchaseCompleted: (packageId: string) => trackEvent('purchase_completed', { packageId }),

  // Check-in events
  checkInCompleted: (mood: number, energy: number) =>
    trackEvent('checkin_completed', { mood, energy }),
  streakUpdated: (streakDays: number) =>
    trackEvent('streak_updated', { streakDays }),

  // Context events
  contextCreated: (category: string) => trackEvent('context_created', { category }),
  contextDeleted: (category: string) => trackEvent('context_deleted', { category }),

  // Feature usage
  voiceInputUsed: () => trackEvent('voice_input_used'),
  fileAttached: (fileType: string) => trackEvent('file_attached', { fileType }),
  reportGenerated: (coachId: string) => trackEvent('report_generated', { coachId }),
  conversationExported: (format: string) => trackEvent('conversation_exported', { format }),
};

/**
 * Flush events to Supabase
 */
async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBatch.length === 0) return;

  const batch = [...eventBatch];
  eventBatch = [];

  try {
    // Store events in Supabase analytics_events table
    // Falls back to local storage if network fails
    const { error } = await (supabase as any)
      .from('analytics_events')
      .insert(batch.map((e: any) => ({
        event_name: e.event,
        properties: e.properties || {},
        user_id: e.userId,
        created_at: e.timestamp,
      })));

    if (error) {
      // If table doesn't exist or other error, cache locally
      if (__DEV__) {
        console.log('[Analytics] Flush skipped (table may not exist):', error.message);
      }
      await cacheEvents(batch);
    }
  } catch (err) {
    // Cache events for later if flush fails
    await cacheEvents(batch);
  }
}

async function cacheEvents(events: AnalyticsEvent[]): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BATCH_KEY);
    const cached = existing ? JSON.parse(existing) : [];
    const merged = [...cached, ...events].slice(-200); // Keep last 200
    await AsyncStorage.setItem(BATCH_KEY, JSON.stringify(merged));
  } catch {
    // Silent fail - analytics should never crash the app
  }
}

/**
 * Retry sending cached events
 */
export async function retryCachedEvents(): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(BATCH_KEY);
    if (!cached) return;

    const events: AnalyticsEvent[] = JSON.parse(cached);
    if (events.length === 0) return;

    eventBatch.push(...events);
    await AsyncStorage.removeItem(BATCH_KEY);
    await flushEvents();
  } catch {
    // Silent fail
  }
}
