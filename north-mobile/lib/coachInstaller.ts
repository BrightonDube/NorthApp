/**
 * Coach Installer Service
 * 
 * This service handles the installation of public coaches into a user's personal collection.
 * It provides methods to install coaches, check for duplicates, and find existing installations.
 * 
 * Validates: Requirements 3.4, 3.6, 10.1, 10.2, 10.3
 */

import { supabase } from './supabase';
import { Coach, InstalledCoach } from '../types';
import { dbCoachToCoach, coachToDbInsert, createInstalledCoach } from './marketplace.types';
import { Tables } from './database.types';

/**
 * Interface for the CoachInstaller service
 * 
 * This interface defines the contract for coach installation operations,
 * ensuring type safety and consistency across the application.
 */
export interface CoachInstaller {
  /**
   * Install a public coach into a user's collection
   * 
   * This method:
   * 1. Fetches the source coach from the database
   * 2. Creates a new coach record for the user with all properties copied
   * 3. Sets source_coach_id to reference the original coach
   * 4. Sets is_public to false (installed coaches are private by default)
   * 5. Sets creator_id to null (the user owns the installed coach)
   * 
   * @param coachId - The ID of the public coach to install
   * @param userId - The ID of the user installing the coach
   * @returns Promise resolving to the newly installed coach
   * @throws Error if the coach doesn't exist or installation fails
   * 
   * Validates: Requirements 3.4, 10.1, 10.2, 10.3
   */
  installCoach(coachId: string, userId: string): Promise<Coach>;

  /**
   * Check if a user has already installed a specific coach
   * 
   * This method queries the database to see if the user has a coach
   * with the given source_coach_id, preventing duplicate installations.
   * 
   * @param coachId - The ID of the public coach to check
   * @param userId - The ID of the user to check for
   * @returns Promise resolving to true if already installed, false otherwise
   * 
   * Validates: Requirements 3.6
   */
  checkIfInstalled(coachId: string, userId: string): Promise<boolean>;

  /**
   * Get the ID of an installed coach by its source coach ID
   * 
   * This method finds the user's installed copy of a public coach,
   * allowing navigation to the existing coach instead of creating a duplicate.
   * 
   * @param sourceCoachId - The ID of the original public coach
   * @param userId - The ID of the user who installed it
   * @returns Promise resolving to the installed coach's ID, or null if not found
   * 
   * Validates: Requirements 3.6
   */
  getInstalledCoachId(sourceCoachId: string, userId: string): Promise<string | null>;
}

/**
 * Supabase-based implementation of the CoachInstaller service
 * 
 * This implementation uses Supabase for all database operations,
 * providing a reliable and type-safe way to manage coach installations.
 */
export class SupabaseCoachInstaller implements CoachInstaller {
  /**
   * Install a public coach into a user's collection
   * 
   * Implementation details:
   * - Fetches the source coach to ensure it exists and is public
   * - Generates a new UUID for the installed coach
   * - Copies all coach properties except creator_id
   * - Sets source_coach_id to reference the original
   * - Sets is_public to false (installed coaches are private)
   * - Sets is_featured to false (only original coaches can be featured)
   * - Inserts the new coach record into the database
   * 
   * @param coachId - The ID of the public coach to install
   * @param userId - The ID of the user installing the coach
   * @returns Promise resolving to the newly installed coach
   * @throws Error if the coach doesn't exist, isn't public, or installation fails
   */
  async installCoach(coachId: string, userId: string): Promise<Coach> {
    // Step 1: Fetch the source coach from the database
    const { data: sourceCoachData, error: fetchError } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch coach: ${fetchError.message}`);
    }

    if (!sourceCoachData) {
      throw new Error(`Coach with ID ${coachId} not found`);
    }

    // Verify the coach is public (only public coaches can be installed)
    if (!sourceCoachData.is_public) {
      throw new Error('Cannot install a private coach');
    }

    // Convert database format to Coach interface
    const sourceCoach = dbCoachToCoach(sourceCoachData);

    // Step 2: Generate a new UUID for the installed coach
    // We use crypto.randomUUID() which is available in React Native
    const newCoachId = crypto.randomUUID();

    // Step 3: Create the installed coach data
    // This copies all properties except creator_id and sets appropriate defaults
    const installedCoachData: Partial<Coach> = {
      id: newCoachId,
      name: sourceCoach.name,
      icon: sourceCoach.icon,
      systemPrompt: sourceCoach.systemPrompt,
      creatorId: null, // Installed coaches don't have a creator_id
      isPublic: false, // Installed coaches are private by default
      category: sourceCoach.category,
      isFeatured: false, // Installed coaches are not featured
      sourceCoachId: coachId, // Reference to the original public coach
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Convert to database insert format
    const dbInsert = coachToDbInsert(installedCoachData);

    // Step 4: Insert the new coach record into the database
    const { data: insertedCoachData, error: insertError } = await supabase
      .from('coaches')
      .insert(dbInsert)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to install coach: ${insertError.message}`);
    }

    if (!insertedCoachData) {
      throw new Error('Failed to install coach: No data returned');
    }

    // Convert the inserted data back to Coach interface and return
    return dbCoachToCoach(insertedCoachData);
  }

  /**
   * Check if a user has already installed a specific coach
   * 
   * Implementation details:
   * - Queries the coaches table for a record with matching source_coach_id
   * - Note: We cannot filter by user_id since installed coaches have creator_id set to null
   * - Instead, we rely on RLS (Row Level Security) policies to ensure users only see their own coaches
   * - Uses .maybeSingle() to handle the case where no record exists
   * - Returns true if a record is found, false otherwise
   * 
   * @param coachId - The ID of the public coach to check
   * @param userId - The ID of the user to check for (used for RLS context)
   * @returns Promise resolving to true if already installed, false otherwise
   */
  async checkIfInstalled(coachId: string, userId: string): Promise<boolean> {
    // Note: We rely on RLS policies to filter coaches by the authenticated user
    // Installed coaches have creator_id = null and source_coach_id = coachId
    const { data, error } = await supabase
      .from('coaches')
      .select('id')
      .is('creator_id', null)
      .eq('source_coach_id', coachId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if coach is installed:', error.message);
      return false;
    }

    return !!data;
  }

  /**
   * Get the ID of an installed coach by its source coach ID
   * 
   * Implementation details:
   * - Queries the coaches table for a record with matching source_coach_id
   * - Note: We cannot filter by user_id since installed coaches have creator_id set to null
   * - Instead, we rely on RLS (Row Level Security) policies to ensure users only see their own coaches
   * - Uses .maybeSingle() to handle the case where no record exists
   * - Returns the coach ID if found, null otherwise
   * 
   * @param sourceCoachId - The ID of the original public coach
   * @param userId - The ID of the user who installed it (used for RLS context)
   * @returns Promise resolving to the installed coach's ID, or null if not found
   */
  async getInstalledCoachId(sourceCoachId: string, userId: string): Promise<string | null> {
    // Note: We rely on RLS policies to filter coaches by the authenticated user
    // Installed coaches have creator_id = null and source_coach_id = sourceCoachId
    const { data, error } = await supabase
      .from('coaches')
      .select('id')
      .is('creator_id', null)
      .eq('source_coach_id', sourceCoachId)
      .maybeSingle();

    if (error) {
      console.error('Error getting installed coach ID:', error.message);
      return null;
    }

    return data?.id || null;
  }
}

/**
 * Default CoachInstaller instance
 * 
 * This is the primary instance used throughout the application.
 * It can be imported and used directly without creating a new instance.
 * 
 * @example
 * ```typescript
 * import { coachInstaller } from '@/lib/coachInstaller';
 * 
 * // Install a coach
 * const installedCoach = await coachInstaller.installCoach(coachId, userId);
 * 
 * // Check if already installed
 * const isInstalled = await coachInstaller.checkIfInstalled(coachId, userId);
 * 
 * // Get installed coach ID
 * const installedId = await coachInstaller.getInstalledCoachId(coachId, userId);
 * ```
 */
export const coachInstaller = new SupabaseCoachInstaller();
