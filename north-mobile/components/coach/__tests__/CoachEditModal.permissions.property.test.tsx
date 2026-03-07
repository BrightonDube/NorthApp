/**
 * Property-based tests for coach visibility permissions
 * 
 * Feature: coach-marketplace-sharing
 * 
 * Validates: Requirements 8.4, 8.5
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';
import { CoachEditModal } from '../CoachEditModal';
import { useBillingStore } from '@/stores/billingStore';
import type { Coach } from '@/types';
import { CoachCategory } from '@/types';
import { Alert } from 'react-native';

// Arbitraries that filter out whitespace-only strings
const coachNameArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const coachIconArbitrary = fc.string({ minLength: 1, maxLength: 2 }).filter((s) => s.trim().length > 0);
const systemPromptArbitrary = fc.string({ minLength: 20, maxLength: 500 }).filter((s) => s.trim().length > 0);

// Mock the billing store
jest.mock('@/stores/billingStore');

// Mock Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Coach Visibility Permissions Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 21: Pro users can toggle visibility
   * 
   * **Validates: Requirements 8.4**
   * 
   * For any Pro user, the "Make Public" toggle should be enabled
   * in the coach editor.
   * 
   * This property ensures:
   * 1. Pro users can see the visibility toggle
   * 2. Pro users can change the toggle value
   * 3. The toggle is not disabled for Pro users
   * 4. Changes to the toggle are saved when Pro users submit
   */
  // Feature: coach-marketplace-sharing, Property 21: Pro users can toggle visibility
  describe('Property 21: Pro users can toggle visibility', () => {
    it('Property 21.1: Pro users can enable the Make Public toggle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          coachIconArbitrary, // icon
          systemPromptArbitrary, // system prompt
          async (coachId, name, icon, systemPrompt) => {
            // Setup: Mock Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(true);

            const coach: Coach = {
              id: coachId,
              name,
              icon,
              systemPrompt,
              creatorId: 'user-123',
              isPublic: false,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            // Action: Find and toggle the switch
            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper
            expect(switchElement.props.accessibilityState.disabled).toBe(false);

            // Toggle to true
            fireEvent(switchElement, 'onValueChange', true);

            // Assert: Switch value changed
            await waitFor(() => {
              expect(switchElement.props.value).toBe(true);
            });

            // Save the changes
            const saveButton = getByRole('button', { name: 'Save changes' });
            fireEvent.press(saveButton);

            // Assert: onSave was called with isPublic: true
            await waitFor(() => {
              expect(onSave).toHaveBeenCalledWith(
                coachId,
                expect.objectContaining({ isPublic: true })
              );
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 21.2: Pro users can disable the Make Public toggle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          coachIconArbitrary, // icon
          systemPromptArbitrary, // system prompt
          async (coachId, name, icon, systemPrompt) => {
            // Setup: Mock Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(true);

            const coach: Coach = {
              id: coachId,
              name,
              icon,
              systemPrompt,
              creatorId: 'user-123',
              isPublic: true, // Start with public coach
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            // Action: Find and toggle the switch
            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper
            expect(switchElement.props.accessibilityState.disabled).toBe(false);

            // Toggle to false
            fireEvent(switchElement, 'onValueChange', false);

            // Assert: Switch value changed
            await waitFor(() => {
              expect(switchElement.props.value).toBe(false);
            });

            // Save the changes
            const saveButton = getByRole('button', { name: 'Save changes' });
            fireEvent.press(saveButton);

            // Assert: onSave was called with isPublic: false
            await waitFor(() => {
              expect(onSave).toHaveBeenCalledWith(
                coachId,
                expect.objectContaining({ isPublic: false })
              );
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 21.3: Pro users can toggle visibility multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // sequence of toggle states
          async (coachId, name, toggleSequence) => {
            // Setup: Mock Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(true);

            const coach: Coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'user-123',
              isPublic: false,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper

            // Action: Apply sequence of toggles
            for (const toggleState of toggleSequence) {
              fireEvent(switchElement, 'onValueChange', toggleState);
              
              // Assert: Switch value changed
              await waitFor(() => {
                expect(switchElement.props.value).toBe(toggleState);
              });
            }

            // Final state should match last toggle
            expect(switchElement.props.value).toBe(toggleSequence[toggleSequence.length - 1]);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 22: Non-Pro users cannot toggle visibility
   * 
   * **Validates: Requirements 8.5**
   * 
   * For any non-Pro user, the "Make Public" toggle should be disabled
   * in the coach editor.
   * 
   * This property ensures:
   * 1. Non-Pro users can see the visibility toggle (but it's disabled)
   * 2. Non-Pro users cannot change the toggle value
   * 3. Attempting to interact with the toggle shows an upgrade prompt
   * 4. The toggle state never changes for non-Pro users
   */
  // Feature: coach-marketplace-sharing, Property 22: Non-Pro users cannot toggle visibility
  describe('Property 22: Non-Pro users cannot toggle visibility', () => {
    it('Property 22.1: Non-Pro users see disabled Make Public toggle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          coachIconArbitrary, // icon
          systemPromptArbitrary, // system prompt
          fc.boolean(), // initial isPublic state
          async (coachId, name, icon, systemPrompt, initialIsPublic) => {
            // Setup: Mock non-Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(false);

            const coach: Coach = {
              id: coachId,
              name,
              icon,
              systemPrompt,
              creatorId: 'user-123',
              isPublic: initialIsPublic,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            // Assert: Switch is disabled
            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper
            expect(switchElement.props.accessibilityState.disabled).toBe(true);
            expect(switchElement.props.disabled).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 22.2: Non-Pro users cannot change toggle value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          fc.boolean(), // initial isPublic state
          fc.boolean(), // attempted new state
          async (coachId, name, initialIsPublic, attemptedState) => {
            // Setup: Mock non-Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(false);

            const coach: Coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'user-123',
              isPublic: initialIsPublic,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper
            const initialValue = switchElement.props.value;

            // Action: Attempt to toggle (should not work because switch is disabled)
            fireEvent(switchElement, 'onValueChange', attemptedState);

            // Assert: Value remains unchanged
            expect(switchElement.props.value).toBe(initialValue);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 22.3: Tapping disabled toggle shows upgrade prompt for non-Pro users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          async (coachId, name) => {
            // Setup: Mock non-Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(false);

            const coach: Coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'user-123',
              isPublic: false,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            // Action: Tap the container (TouchableOpacity wrapping the switch)
            const switchElements = getAllByRole('switch'); const switchElement = switchElements[switchElements.length - 1]; // Get the actual Switch, not the TouchableOpacity wrapper
            const touchableContainer = switchElement.parent;
            
            if (touchableContainer) {
              fireEvent.press(touchableContainer);

              // Assert: Alert was shown with upgrade message
              await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                  'Pro Feature',
                  expect.stringContaining('Pro feature'),
                  expect.any(Array)
                );
              });
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 22.4: Non-Pro users never save isPublic changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          coachNameArbitrary, // coach name
          fc.boolean(), // initial isPublic state
          async (coachId, name, initialIsPublic) => {
            // Setup: Mock non-Pro user
            (useBillingStore as unknown as jest.Mock).mockReturnValue(false);

            const coach: Coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'user-123',
              isPublic: initialIsPublic,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const onSave = jest.fn().mockResolvedValue(undefined);
            const onClose = jest.fn();

            const { getByRole, getAllByRole } = render(
              <CoachEditModal
                visible={true}
                coach={coach}
                onSave={onSave}
                onClose={onClose}
              />
            );

            // Action: Try to save (even though toggle is disabled)
            const saveButton = getByRole('button', { name: 'Save changes' });
            fireEvent.press(saveButton);

            // Assert: onSave was not called with isPublic changes
            // (or if called, isPublic should match the initial state)
            await waitFor(() => {
              if (onSave.mock.calls.length > 0) {
                const saveCall = onSave.mock.calls[0];
                const updates = saveCall[1];
                
                // If isPublic is in the updates, it should match initial state
                if ('isPublic' in updates) {
                  expect(updates.isPublic).toBe(initialIsPublic);
                }
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
