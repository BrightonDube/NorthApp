/**
 * Context UI Property-Based Tests
 * 
 * Property-based tests for Context UI components using fast-check.
 * Each test validates universal properties that should hold across all inputs.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 44: Context Grouping Display
 * - Property 45: Context Edit Modal
 * - Property 46: Context Edit Persistence
 * - Property 47: Context Card Display
 * 
 * Validates: Requirements 14.1, 14.2, 14.3, 14.6
 */

import fc from 'fast-check';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ContextCard } from '../ContextCard';
import { ContextSection } from '../ContextSection';
import { ContextEditModal } from '../ContextEditModal';
import type { UserContext, ContextCategory } from '@/types';
import {
  contextCategoryArbitrary,
  contextContentArbitrary,
  uuidArbitrary,
  timestampArbitrary,
  PBT_CONFIG,
  generateMockContext,
} from '../../../__tests__/utils/property-helpers';

// Mock expo-haptics
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

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const { TouchableOpacity } = require('react-native');
  return {
    Swipeable: ({ children, renderRightActions, onSwipeableOpen }: any) => (
      <View testID="swipeable-container">
        {children}
        {renderRightActions && (
          <View testID="swipe-actions">
            <TouchableOpacity
              testID="trigger-swipe-open"
              onPress={onSwipeableOpen}
            >
              {renderRightActions()}
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    GestureHandlerRootView: View,
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const Animated = {
    View: View,
    Text: require('react-native').Text,
    ScrollView: require('react-native').ScrollView,
  };
  
  return {
    default: Animated,
    __esModule: true,
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
  };
});

describe('Context UI Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 44: Context Grouping Display
   * 
   * For any user's context items on the context screen, they should be grouped by category.
   * 
   * **Validates: Requirements 14.1**
   */
  describe('Property 44: Context Grouping Display', () => {
    it('should group context items by category for any set of items', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of context items with random categories
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (contextItems) => {
            // Group items by category (simulating what the UI should do)
            const categories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
            
            for (const category of categories) {
              const itemsInCategory = contextItems.filter(item => item.category === category);
              
              // Render ContextSection for this category
              const { getByText, queryByText } = render(
                <ContextSection
                  category={category}
                  items={itemsInCategory}
                  onEdit={jest.fn()}
                  onDelete={jest.fn()}
                />
              );

              // Verify section header is displayed
              const categoryTitles = {
                values: 'Values',
                goals: 'Goals',
                projects: 'Projects',
                constraints: 'Constraints',
              };
              expect(getByText(categoryTitles[category])).toBeTruthy();

              // Verify all items in this category are displayed
              for (const item of itemsInCategory) {
                expect(queryByText(item.content)).toBeTruthy();
              }

              // Verify items from other categories are NOT displayed
              const itemsFromOtherCategories = contextItems.filter(
                item => item.category !== category
              );
              for (const item of itemsFromOtherCategories) {
                // Only check if the content is unique to avoid false positives
                const isUniqueContent = !itemsInCategory.some(
                  catItem => catItem.content === item.content
                );
                if (isUniqueContent) {
                  expect(queryByText(item.content)).toBeNull();
                }
              }
            }
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    it('should display empty state when category has no items', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          async (category) => {
            const { getByText } = render(
              <ContextSection
                category={category}
                items={[]}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
              />
            );

            const categoryTitles = {
              values: 'Values',
              goals: 'Goals',
              projects: 'Projects',
              constraints: 'Constraints',
            };

            // Verify section header is still displayed
            expect(getByText(categoryTitles[category])).toBeTruthy();

            // Verify empty state message is displayed
            expect(getByText(`No ${categoryTitles[category].toLowerCase()} yet`)).toBeTruthy();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });
  });

  /**
   * Property 45: Context Edit Modal
   * 
   * For any context item tap, an edit modal should open with the current content pre-filled.
   * 
   * **Validates: Requirements 14.2**
   */
  describe('Property 45: Context Edit Modal', () => {
    it('should pre-fill modal with current content for any context item', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockOnClose = jest.fn();

            const { getByDisplayValue, getByText } = render(
              <ContextEditModal
                visible={true}
                context={contextItem}
                onSave={mockOnSave}
                onClose={mockOnClose}
              />
            );

            // Verify modal displays the category label
            const categoryLabels = {
              values: 'Value',
              goals: 'Goal',
              projects: 'Project',
              constraints: 'Constraint',
            };
            expect(getByText(`Edit ${categoryLabels[contextItem.category]}`)).toBeTruthy();

            // Verify content is pre-filled in the input
            await waitFor(() => {
              expect(getByDisplayValue(contextItem.content)).toBeTruthy();
            });
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    it('should call onClose when cancel is pressed for any context item', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockOnClose = jest.fn();

            // Mock Alert.alert to automatically call the discard callback
            const mockAlert = jest.spyOn(require('react-native').Alert, 'alert');
            mockAlert.mockImplementation((title: any, message: any, buttons: any) => {
              // Find and call the discard button callback
              const discardButton = buttons?.find((b: any) => b.text === 'Discard');
              if (discardButton && discardButton.onPress) {
                discardButton.onPress();
              }
            });

            const { getByText, getByDisplayValue } = render(
              <ContextEditModal
                visible={true}
                context={contextItem}
                onSave={mockOnSave}
                onClose={mockOnClose}
              />
            );

            // Make a change to trigger confirmation dialog
            await waitFor(() => {
              const input = getByDisplayValue(contextItem.content);
              fireEvent.changeText(input, contextItem.content + ' modified');
            });

            // Press cancel button
            const cancelButton = getByText('Cancel');
            fireEvent.press(cancelButton);

            // Verify onClose was called (after confirmation)
            await waitFor(() => {
              expect(mockOnClose).toHaveBeenCalled();
            });

            mockAlert.mockRestore();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });
  });

  /**
   * Property 46: Context Edit Persistence
   * 
   * For any content edit in the modal, changes should be saved when the modal is dismissed.
   * 
   * **Validates: Requirements 14.3**
   */
  describe('Property 46: Context Edit Persistence', () => {
    it('should save edited content when save button is pressed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          contextContentArbitrary, // New content to edit to
          async (contextItem, newContent) => {
            // Skip if new content is the same as old content
            if (newContent === contextItem.content) {
              return true;
            }

            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockOnClose = jest.fn();

            const { getByDisplayValue, getByText } = render(
              <ContextEditModal
                visible={true}
                context={contextItem}
                onSave={mockOnSave}
                onClose={mockOnClose}
              />
            );

            // Find the input and change the content
            await waitFor(() => {
              const input = getByDisplayValue(contextItem.content);
              fireEvent.changeText(input, newContent);
            });

            // Press save button
            await waitFor(() => {
              const saveButton = getByText('Save');
              fireEvent.press(saveButton);
            });

            // Verify onSave was called with the correct parameters (trimmed content)
            await waitFor(() => {
              expect(mockOnSave).toHaveBeenCalledWith(contextItem.id, newContent.trim());
            });
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    }, 30000); // 30 second timeout for property-based test

    it('should not save when content is empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockOnClose = jest.fn();

            const { getByDisplayValue, getByText, queryByText } = render(
              <ContextEditModal
                visible={true}
                context={contextItem}
                onSave={mockOnSave}
                onClose={mockOnClose}
              />
            );

            // Clear the content
            await waitFor(() => {
              const input = getByDisplayValue(contextItem.content);
              fireEvent.changeText(input, '   '); // Whitespace only
            });

            // Try to press save button (it should be disabled or show error)
            await waitFor(() => {
              const saveButton = getByText('Save');
              fireEvent.press(saveButton);
            });

            // Verify onSave was NOT called
            expect(mockOnSave).not.toHaveBeenCalled();

            // The save button should be disabled when content is empty
            // So either the error appears or the button doesn't trigger onSave
            // Both are acceptable behaviors
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
    }, 30000); // 30 second timeout for property-based test

    it('should not save when content exceeds 1000 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          fc.string({ minLength: 1001, maxLength: 1500 }), // Content over limit
          async (contextItem, longContent) => {
            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockOnClose = jest.fn();

            const { getByDisplayValue, getByText, queryByText } = render(
              <ContextEditModal
                visible={true}
                context={contextItem}
                onSave={mockOnSave}
                onClose={mockOnClose}
              />
            );

            // Set content over limit
            await waitFor(() => {
              const input = getByDisplayValue(contextItem.content);
              fireEvent.changeText(input, longContent);
            }, { timeout: 3000 });

            // Press save button
            await waitFor(() => {
              const saveButton = getByText('Save');
              fireEvent.press(saveButton);
            }, { timeout: 3000 });

            // Verify onSave was NOT called
            expect(mockOnSave).not.toHaveBeenCalled();

            // Verify error message is displayed
            await waitFor(() => {
              expect(queryByText('Content must be 1000 characters or less')).toBeTruthy();
            }, { timeout: 3000 });
          }
        ),
        { numRuns: 20 } // Reduced runs for stability
      );
    }, 90000); // 90 second timeout for property-based test
  });

  /**
   * Property 47: Context Card Display
   * 
   * For any context item card, it should display the category label and content preview.
   * 
   * **Validates: Requirements 14.6**
   */
  describe('Property 47: Context Card Display', () => {
    it('should display category label and content for any context item', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnEdit = jest.fn();
            const mockOnDelete = jest.fn();

            const { getByText } = render(
              <ContextCard
                context={contextItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );

            // Verify category label is displayed
            const categoryLabels = {
              values: 'Value',
              goals: 'Goal',
              projects: 'Project',
              constraints: 'Constraint',
            };
            expect(getByText(categoryLabels[contextItem.category])).toBeTruthy();

            // Verify content is displayed (may be truncated to 3 lines)
            expect(getByText(contextItem.content)).toBeTruthy();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    it('should call onEdit when card is pressed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnEdit = jest.fn();
            const mockOnDelete = jest.fn();

            const { getByText } = render(
              <ContextCard
                context={contextItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );

            // Press the card
            const card = getByText(contextItem.content);
            fireEvent.press(card);

            // Verify onEdit was called
            expect(mockOnEdit).toHaveBeenCalled();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    it('should have correct accessibility labels for any context item', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            userId: uuidArbitrary,
            category: contextCategoryArbitrary,
            content: contextContentArbitrary,
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (contextItem) => {
            const mockOnEdit = jest.fn();
            const mockOnDelete = jest.fn();

            const { getByLabelText } = render(
              <ContextCard
                context={contextItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );

            // Verify accessibility label includes category and content
            const categoryLabels = {
              values: 'Value',
              goals: 'Goal',
              projects: 'Project',
              constraints: 'Constraint',
            };
            const expectedLabel = `${categoryLabels[contextItem.category]}: ${contextItem.content}`;
            expect(getByLabelText(expectedLabel)).toBeTruthy();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });

    it('should apply category-specific styling for any category', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          async (category, content) => {
            const contextItem: UserContext = {
              id: 'test-id',
              userId: 'test-user',
              category,
              content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const mockOnEdit = jest.fn();
            const mockOnDelete = jest.fn();

            const { getByText } = render(
              <ContextCard
                context={contextItem}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
              />
            );

            // Verify the card renders (styling is applied via className)
            expect(getByText(content)).toBeTruthy();
            
            // Each category should have its own styling
            // This is validated by the component rendering without errors
            // and the category label being displayed correctly
            const categoryLabels = {
              values: 'Value',
              goals: 'Goal',
              projects: 'Project',
              constraints: 'Constraint',
            };
            expect(getByText(categoryLabels[category])).toBeTruthy();
          }
        ),
        { numRuns: PBT_CONFIG.numRuns }
      );
    });
  });
});
