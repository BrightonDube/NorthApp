/**
 * Report Store
 * 
 * Zustand store for managing session reports and action items.
 * Provides CRUD operations with optimistic updates and error handling.
 * 
 * Validates: Requirements 4.1-4.7, 5.1-5.7, 7.1-7.6
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
  SessionReport,
  ActionItem,
  ActionItemStatus,
} from '@/lib/database.types';

interface ReportFilters {
  coachId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

interface ReportStore {
  reports: SessionReport[];
  actionItems: ActionItem[];
  selectedReport: SessionReport | null;
  isLoading: boolean;
  error: string | null;
  filters: ReportFilters;
  hasMore: boolean;
  page: number;

  fetchReports: (reset?: boolean) => Promise<void>;
  fetchReportById: (reportId: string) => Promise<SessionReport | null>;
  fetchActionItems: (status?: ActionItemStatus) => Promise<void>;
  updateActionItemStatus: (itemId: string, status: ActionItemStatus) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  setFilters: (filters: ReportFilters) => void;
  setSelectedReport: (report: SessionReport | null) => void;
  clearError: () => void;
  reset: () => void;
}

const PAGE_SIZE = 20;

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  actionItems: [],
  selectedReport: null,
  isLoading: false,
  error: null,
  filters: {},
  hasMore: true,
  page: 0,

  fetchReports: async (reset = false) => {
    const { filters, page: currentPage } = get();
    const page = reset ? 0 : currentPage;

    set({ isLoading: true, error: null, ...(reset ? { page: 0, reports: [] } : {}) });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      let query = supabase
        .from('session_reports')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('session_date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.coachId) {
        query = query.eq('coach_id', filters.coachId);
      }
      if (filters.dateFrom) {
        query = query.gte('session_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('session_date', filters.dateTo);
      }
      if (filters.searchQuery) {
        query = query.or(`summary.ilike.%${filters.searchQuery}%,topics.cs.{${filters.searchQuery}}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newReports = data || [];
      set((state) => ({
        reports: reset ? newReports : [...state.reports, ...newReports],
        hasMore: newReports.length === PAGE_SIZE,
        page: page + 1,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
        isLoading: false,
      });
    }
  },

  fetchReportById: async (reportId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('session_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      set({ selectedReport: data, isLoading: false });
      return data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch report',
        isLoading: false,
      });
      return null;
    }
  },

  fetchActionItems: async (status?: ActionItemStatus) => {
    set({ isLoading: true, error: null });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');

      let query = supabase
        .from('action_items')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ actionItems: data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch action items',
        isLoading: false,
      });
    }
  },

  updateActionItemStatus: async (itemId: string, status: ActionItemStatus) => {
    const previousItems = get().actionItems;

    // Optimistic update
    set((state) => ({
      actionItems: state.actionItems.map((item) =>
        item.id === itemId
          ? { ...item, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
          : item
      ),
    }));

    try {
      const { error } = await supabase
        .from('action_items')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      // Rollback
      set({
        actionItems: previousItems,
        error: error instanceof Error ? error.message : 'Failed to update action item',
      });
    }
  },

  deleteReport: async (reportId: string) => {
    const previousReports = get().reports;

    // Optimistic delete
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== reportId),
    }));

    try {
      const { error } = await supabase
        .from('session_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (error) {
      // Rollback
      set({
        reports: previousReports,
        error: error instanceof Error ? error.message : 'Failed to delete report',
      });
    }
  },

  setFilters: (filters: ReportFilters) => {
    set({ filters });
    get().fetchReports(true);
  },

  setSelectedReport: (report) => set({ selectedReport: report }),

  clearError: () => set({ error: null }),

  reset: () => set({
    reports: [],
    actionItems: [],
    selectedReport: null,
    isLoading: false,
    error: null,
    filters: {},
    hasMore: true,
    page: 0,
  }),
}));
