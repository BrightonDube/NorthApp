/**
 * Marketplace Type Utilities
 * 
 * This file contains utility functions and type guards for working with
 * marketplace-related types and data transformations.
 * 
 * Validates: Requirements 5.1, 5.4, 6.3, 10.3
 */

import { Coach, PublicCoach, InstalledCoach, CoachCategory } from '../types';
import { Tables } from './database.types';

/**
 * Type guard to check if a coach is a PublicCoach
 */
export function isPublicCoach(coach: Coach | PublicCoach): coach is PublicCoach {
  return 'creatorName' in coach;
}

/**
 * Type guard to check if a coach is an InstalledCoach
 */
export function isInstalledCoach(coach: Coach | InstalledCoach): coach is InstalledCoach {
  return 'userId' in coach && 'installedAt' in coach && coach.sourceCoachId !== null;
}

/**
 * Convert database coach row to Coach interface
 * Maps snake_case database fields to camelCase TypeScript fields
 */
export function dbCoachToCoach(dbCoach: Tables<'coaches'>): Coach {
  return {
    id: dbCoach.id,
    name: dbCoach.name,
    icon: dbCoach.icon,
    systemPrompt: dbCoach.system_prompt,
    creatorId: dbCoach.creator_id,
    isPublic: dbCoach.is_public,
    category: dbCoach.category as CoachCategory,
    isFeatured: dbCoach.is_featured ?? false,
    sourceCoachId: dbCoach.source_coach_id,
    createdAt: dbCoach.created_at,
    updatedAt: dbCoach.updated_at,
  };
}

/**
 * Convert Coach interface to database insert format
 * Maps camelCase TypeScript fields to snake_case database fields
 */
export function coachToDbInsert(coach: Partial<Coach>): Partial<Tables<'coaches'>> {
  const dbCoach: Partial<Tables<'coaches'>> = {};
  
  if (coach.id !== undefined) dbCoach.id = coach.id;
  if (coach.name !== undefined) dbCoach.name = coach.name;
  if (coach.icon !== undefined) dbCoach.icon = coach.icon;
  if (coach.systemPrompt !== undefined) dbCoach.system_prompt = coach.systemPrompt;
  if (coach.creatorId !== undefined) dbCoach.creator_id = coach.creatorId;
  if (coach.isPublic !== undefined) dbCoach.is_public = coach.isPublic;
  if (coach.category !== undefined) dbCoach.category = coach.category;
  if (coach.isFeatured !== undefined) dbCoach.is_featured = coach.isFeatured;
  if (coach.sourceCoachId !== undefined) dbCoach.source_coach_id = coach.sourceCoachId;
  if (coach.createdAt !== undefined) dbCoach.created_at = coach.createdAt;
  if (coach.updatedAt !== undefined) dbCoach.updated_at = coach.updatedAt;
  
  return dbCoach;
}

/**
 * Get all valid coach categories
 */
export function getAllCategories(): CoachCategory[] {
  return Object.values(CoachCategory);
}

/**
 * Validate if a string is a valid CoachCategory
 */
export function isValidCategory(category: string): category is CoachCategory {
  return Object.values(CoachCategory).includes(category as CoachCategory);
}

/**
 * Get the default category
 */
export function getDefaultCategory(): CoachCategory {
  return CoachCategory.GENERAL;
}

/**
 * Normalize coach category to ensure it defaults to General if null or undefined
 * 
 * Validates: Requirements 5.5
 */
export function normalizeCategory(category: CoachCategory | null | undefined): CoachCategory {
  return category ?? CoachCategory.GENERAL;
}

/**
 * Create an InstalledCoach from a PublicCoach
 * Used when a user installs a coach from the marketplace
 * 
 * Validates: Requirements 3.4, 10.1, 10.2, 10.3
 */
export function createInstalledCoach(
  publicCoach: PublicCoach,
  userId: string,
  newCoachId: string
): Omit<InstalledCoach, 'createdAt' | 'updatedAt'> {
  return {
    id: newCoachId,
    name: publicCoach.name,
    icon: publicCoach.icon,
    systemPrompt: publicCoach.systemPrompt,
    creatorId: null, // Installed coaches don't have a creator_id (they belong to the user)
    isPublic: false, // Installed coaches are private by default
    category: publicCoach.category,
    isFeatured: false, // Installed coaches are not featured
    sourceCoachId: publicCoach.id, // Reference to the original public coach
    userId,
    installedAt: new Date().toISOString(),
  };
}

/**
 * Filter coaches by category
 */
export function filterByCategory<T extends Coach>(coaches: T[], category: CoachCategory | null): T[] {
  if (!category) {
    return coaches;
  }
  return coaches.filter(coach => coach.category === category);
}

/**
 * Filter coaches to only public ones
 */
export function filterPublicCoaches(coaches: Coach[]): Coach[] {
  return coaches.filter(coach => coach.isPublic);
}

/**
 * Filter coaches to only featured ones
 */
export function filterFeaturedCoaches(coaches: Coach[]): Coach[] {
  return coaches.filter(coach => coach.isFeatured && coach.isPublic);
}

/**
 * Sort coaches by creation date (newest first)
 */
export function sortByNewest(coaches: Coach[]): Coach[] {
  return [...coaches].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Sort coaches by name (alphabetically)
 */
export function sortByName(coaches: Coach[]): Coach[] {
  return [...coaches].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if a coach is installed (has a source_coach_id)
 */
export function isInstalled(coach: Coach): boolean {
  return coach.sourceCoachId !== null;
}

/**
 * Get category display name with emoji
 */
export function getCategoryDisplay(category: CoachCategory): string {
  const categoryEmojis: Record<CoachCategory, string> = {
    [CoachCategory.PRODUCTIVITY]: '⚡ Productivity',
    [CoachCategory.LEARNING]: '📚 Learning',
    [CoachCategory.HEALTH]: '💪 Health',
    [CoachCategory.ENTERTAINMENT]: '🎮 Entertainment',
    [CoachCategory.BUSINESS]: '💼 Business',
    [CoachCategory.CREATIVE]: '🎨 Creative',
    [CoachCategory.GENERAL]: '🌟 General',
  };
  
  return categoryEmojis[category];
}

/**
 * Get category color for UI styling
 */
export function getCategoryColor(category: CoachCategory): string {
  const categoryColors: Record<CoachCategory, string> = {
    [CoachCategory.PRODUCTIVITY]: '#3B82F6', // blue
    [CoachCategory.LEARNING]: '#8B5CF6', // purple
    [CoachCategory.HEALTH]: '#10B981', // green
    [CoachCategory.ENTERTAINMENT]: '#F59E0B', // amber
    [CoachCategory.BUSINESS]: '#6366F1', // indigo
    [CoachCategory.CREATIVE]: '#EC4899', // pink
    [CoachCategory.GENERAL]: '#6B7280', // gray
  };
  
  return categoryColors[category];
}
