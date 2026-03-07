/**
 * ContextBuilder Service
 * 
 * Aggregates historical session data to build enriched context for AI coaching.
 * Provides methods to fetch and format prior session insights, pending action items,
 * and cross-session patterns for continuity-aware coaching.
 * 
 * Note: The primary context injection happens server-side in the chat edge function.
 * This client-side service is used for UI features like displaying session history
 * summaries, coaching insights dashboards, and context previews.
 * 
 * Validates: Requirements 5.3, 5.4 (Session Reports spec)
 */

import { supabase } from './supabase';

export interface SessionContext {
  summary: string;
  keyInsights: string[];
  topics: string[];
  date: string;
  coachName?: string;
}

export interface ActionItemContext {
  text: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  sessionId: string;
}

export interface AggregatedContext {
  recentSessions: SessionContext[];
  pendingActionItems: ActionItemContext[];
  frequentTopics: string[];
  totalSessions: number;
  lastSessionDate: string | null;
}

/**
 * ContextBuilder builds aggregated coaching context from historical sessions.
 */
export class ContextBuilder {
  private cache: Map<string, { data: AggregatedContext; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Build aggregated context for a user, optionally filtered by coach.
   * Results are cached for 5 minutes to avoid redundant queries.
   */
  async buildContext(userId: string, coachId?: string): Promise<AggregatedContext> {
    const cacheKey = `${userId}:${coachId || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    const [sessions, actionItems] = await Promise.all([
      this.fetchRecentSessions(userId, coachId),
      this.fetchPendingActionItems(userId),
    ]);

    const frequentTopics = this.extractFrequentTopics(sessions);
    const lastSessionDate = sessions.length > 0 ? sessions[0].date : null;

    const context: AggregatedContext = {
      recentSessions: sessions,
      pendingActionItems: actionItems,
      frequentTopics,
      totalSessions: sessions.length,
      lastSessionDate,
    };

    this.cache.set(cacheKey, { data: context, timestamp: Date.now() });
    return context;
  }

  /**
   * Fetch recent session reports for context enrichment.
   */
  private async fetchRecentSessions(
    userId: string,
    coachId?: string,
    limit: number = 5,
  ): Promise<SessionContext[]> {
    let query = supabase
      .from('session_reports')
      .select('summary, key_insights, topics, created_at, coaches(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('[ContextBuilder] Failed to fetch sessions:', error?.message);
      return [];
    }

    return data.map((report: any) => ({
      summary: report.summary || '',
      keyInsights: this.parseJsonArray(report.key_insights),
      topics: this.parseJsonArray(report.topics),
      date: report.created_at,
      coachName: report.coaches?.name,
    }));
  }

  /**
   * Fetch pending action items for accountability tracking.
   */
  private async fetchPendingActionItems(userId: string): Promise<ActionItemContext[]> {
    const { data, error } = await supabase
      .from('action_items')
      .select('text, status, created_at, session_report_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error || !data) {
      console.warn('[ContextBuilder] Failed to fetch action items:', error?.message);
      return [];
    }

    return data.map((item: any) => ({
      text: item.text,
      status: item.status,
      createdAt: item.created_at,
      sessionId: item.session_report_id,
    }));
  }

  /**
   * Extract the most frequently discussed topics across sessions.
   */
  private extractFrequentTopics(sessions: SessionContext[]): string[] {
    const topicCounts = new Map<string, number>();

    for (const session of sessions) {
      for (const topic of session.topics) {
        const normalized = topic.toLowerCase().trim();
        topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
      }
    }

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  /**
   * Parse a JSON string or array safely.
   */
  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Invalidate cached context for a user.
   */
  invalidateCache(userId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const contextBuilder = new ContextBuilder();
