/**
 * Action Items Repository
 * 
 * Database repository for action items with full CRUD operations,
 * status management, and filtering.
 * 
 * Validates: Requirements 5.1, 5.2, 5.5, 5.6, 5.7
 */

import { supabase } from './supabase';
import type {
  ActionItem,
  ActionItemInsert,
  ActionItemUpdate,
  ActionItemStatus,
} from './database.types';

/**
 * Create a new action item
 */
export async function createActionItem(item: ActionItemInsert): Promise<ActionItem> {
  const { data, error } = await supabase
    .from('action_items')
    .insert(item)
    .select()
    .single();

  if (error) throw new Error(`Failed to create action item: ${error.message}`);
  return data;
}

/**
 * Get action items for a user with optional status filter
 */
export async function getActionItemsByUser(
  userId: string,
  status?: ActionItemStatus,
): Promise<ActionItem[]> {
  let query = supabase
    .from('action_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch action items: ${error.message}`);
  return data || [];
}

/**
 * Get pending action items for a user
 */
export async function getPendingActionItems(userId: string): Promise<ActionItem[]> {
  return getActionItemsByUser(userId, 'pending');
}

/**
 * Get action items for a specific report
 */
export async function getActionItemsByReport(reportId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from('action_items')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch action items: ${error.message}`);
  return data || [];
}

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  itemId: string,
  status: ActionItemStatus,
): Promise<ActionItem> {
  const update: ActionItemUpdate = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from('action_items')
    .update(update)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update action item: ${error.message}`);
  return data;
}

/**
 * Delete an action item
 */
export async function deleteActionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('action_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(`Failed to delete action item: ${error.message}`);
}

/**
 * Batch create action items from a report
 */
export async function createActionItemsFromReport(
  reportId: string,
  userId: string,
  texts: string[],
): Promise<ActionItem[]> {
  if (texts.length === 0) return [];

  const items: ActionItemInsert[] = texts.map((text) => ({
    report_id: reportId,
    user_id: userId,
    text,
    status: 'pending' as const,
  }));

  const { data, error } = await supabase
    .from('action_items')
    .insert(items)
    .select();

  if (error) throw new Error(`Failed to create action items: ${error.message}`);
  return data || [];
}
