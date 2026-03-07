/**
 * Context Management Screen (Personal Operating System)
 * 
 * Implements Simon's brief: "A dedicated section where users input their 
 * personal Operating System (values, goals, current projects)."
 * 
 * Features:
 * - Display all context items grouped by category
 * - Add button with tier check (free users limited to 3 items)
 * - Edit and delete context items
 * - Pull-to-refresh functionality
 * - Empty state when no context items exist
 * - Loading and error states
 * - Pro upgrade prompt for free users at limit
 * 
 * Validates: Requirements 14.1-14.7
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useContextStore } from '@/stores/contextStore';
import { useBillingStore } from '@/stores/billingStore';
import { PaywallModal } from '@/components/billing/PaywallModal';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ContextSectionSkeleton } from '@/components/SkeletonLoader';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { UserContext, ContextCategory } from '@/types';

// Category information with icons and colors
const CATEGORY_INFO: Record<ContextCategory, { 
  label: string; 
  icon: string; 
  color: string;
}> = {
  values: { 
    label: 'Values', 
    icon: '💎', 
    color: '#F5F3FF',
  },
  goals: { 
    label: 'Goals', 
    icon: '🎯', 
    color: '#EFF6FF',
  },
  projects: { 
    label: 'Projects', 
    icon: '🚀', 
    color: '#F0FDF4',
  },
  constraints: { 
    label: 'Constraints', 
    icon: '⚠️', 
    color: '#FFF7ED',
  },
};

const CATEGORIES: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];

/**
 * Context Item Card
 * Simplified: removed interaction hint for cleaner look
 */
function ContextItemCard({ 
  item, 
  onEdit, 
  onDelete 
}: { 
  item: UserContext; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = useThemeColors();
  const info = CATEGORY_INFO[item.category];
  
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEdit();
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      }}
      style={({ pressed }) => [
        styles.itemCard,
        { backgroundColor: info.color },
        pressed && styles.itemCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${info.label}: ${item.content}`}
      accessibilityHint="Tap to edit, long press to delete"
    >
      <Text style={[styles.itemContent, { color: colors.text }]} numberOfLines={3}>
        {item.content}
      </Text>
    </Pressable>
  );
}

/**
 * Context Section Component
 * Simplified: removed category descriptions for cleaner look
 */
function ContextSection({ 
  category, 
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: { 
  category: ContextCategory; 
  items: UserContext[];
  onAddItem: () => void;
  onEditItem: (item: UserContext) => void;
  onDeleteItem: (item: UserContext) => void;
}) {
  const colors = useThemeColors();
  const info = CATEGORY_INFO[category];
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{info.icon}</Text>
        <Text 
          style={[styles.sectionTitle, { color: colors.text }]}
          accessibilityRole="header"
        >
          {info.label}
        </Text>
      </View>
      
      {items.length === 0 ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddItem();
          }}
          style={({ pressed }) => [
            styles.emptyCard,
            { backgroundColor: colors.backgroundTertiary },
            pressed && { backgroundColor: colors.backgroundSecondary },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Add ${info.label.toLowerCase()}`}
        >
          <Text style={[styles.emptyCardText, { color: colors.textTertiary }]}>
            + Add {info.label.toLowerCase().slice(0, -1)}
          </Text>
        </Pressable>
      ) : (
        <>
          {items.map((item) => (
            <ContextItemCard
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item)}
            />
          ))}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddItem();
            }}
            style={({ pressed }) => [
              styles.addMoreButton,
              pressed && styles.addMoreButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Add another ${info.label.toLowerCase().slice(0, -1)}`}
          >
            <Text style={[styles.addMoreText, { color: colors.textTertiary }]}>+ Add more</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/**
 * Create/Edit Modal Component
 */
function ContextModal({
  visible,
  mode,
  initialCategory,
  initialContent,
  onSave,
  onClose,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  initialCategory: ContextCategory;
  initialContent: string;
  onSave: (category: ContextCategory, content: string) => Promise<void>;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ContextCategory>(initialCategory);
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory(initialCategory);
      setContent(initialContent);
      setError(null);
    }
  }, [visible, initialCategory, initialContent]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Content cannot be empty');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(category, trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable 
              onPress={onClose} 
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text 
              style={styles.modalTitle}
              accessibilityRole="header"
            >
              {mode === 'create' ? 'Add Context' : 'Edit Context'}
            </Text>
            <Pressable 
              onPress={handleSave} 
              disabled={isLoading || !content.trim()}
              accessibilityRole="button"
              accessibilityLabel={mode === 'create' ? 'Create context item' : 'Save changes'}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#09090B" />
              ) : (
                <Text style={[
                  styles.modalSave,
                  !content.trim() && styles.modalSaveDisabled,
                ]}>
                  {mode === 'create' ? 'Create' : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Category Picker (only for create mode) */}
          {mode === 'create' && (
            <View style={styles.categoryPicker}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const isSelected = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        setCategory(cat);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.categoryChip,
                        isSelected && { backgroundColor: info.color },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${info.label} category`}
                    >
                      <Text style={styles.categoryChipIcon}>{info.icon}</Text>
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}>
                        {info.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={`Describe your ${CATEGORY_INFO[category].label.toLowerCase().slice(0, -1)}...`}
              placeholderTextColor="#A1A1AA"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.textInput}
              maxLength={1000}
              editable={!isLoading}
              accessibilityLabel="Context content input"
              accessibilityHint="Enter the content for your context item"
            />
            <Text style={styles.charCount}>{content.length} / 1000</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Delete Confirmation Modal
 */
function DeleteModal({
  visible,
  item,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  item: UserContext | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.deleteOverlay}>
        <View style={styles.deleteModal}>
          <Text 
            style={styles.deleteTitle}
            accessibilityRole="header"
          >
            Delete this item?
          </Text>
          <Text style={styles.deleteMessage} numberOfLines={2}>
            "{item.content}"
          </Text>
          <View style={styles.deleteButtons}>
            <Pressable 
              onPress={onClose} 
              style={styles.deleteCancelButton}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel deletion"
            >
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </Pressable>
            <Pressable 
              onPress={handleDelete} 
              style={styles.deleteConfirmButton}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Confirm deletion"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteConfirmText}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ContextScreen() {
  const colors = useThemeColors();
  const {
    items,
    isLoading,
    error,
    fetchContexts,
    createContext,
    updateContext,
    deleteContext,
    getByCategory,
    canAddMore,
    clearError,
    lastSynced,
  } = useContextStore();

  const { isProUser, showPaywall, isPaywallVisible, paywallFeature, hidePaywall } = useBillingStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<UserContext | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ContextCategory>('values');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UserContext | null>(null);

  // Fetch contexts on mount (skip if already loaded from parallel initialization)
  useEffect(() => {
    // Only fetch if we don't have contexts yet or if data is stale
    if (items.length === 0 || !lastSynced) {
      fetchContexts();
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    await fetchContexts();
    setRefreshing(false);
  }, [fetchContexts, clearError]);

  const handleAddItem = (category: ContextCategory) => {
    // Check tier limit - free users limited to 3 items
    // Validates: Requirements 4.1, 14.5
    if (!canAddMore(isProUser)) {
      // Show paywall for free users at limit
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showPaywall('context_creation');
      return;
    }
    setSelectedCategory(category);
    setSelectedItem(null);
    setModalMode('create');
    setModalVisible(true);
  };

  const handleEditItem = (item: UserContext) => {
    setSelectedItem(item);
    setSelectedCategory(item.category);
    setModalMode('edit');
    setModalVisible(true);
  };

  const handleDeleteItem = (item: UserContext) => {
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const handleSave = async (category: ContextCategory, content: string) => {
    if (modalMode === 'create') {
      await createContext(category, content);
    } else if (selectedItem) {
      await updateContext(selectedItem.id, content);
    }
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteContext(itemToDelete.id);
    }
  };

  // Loading state
  if (isLoading && items.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Your Operating System</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Define your context once. Your coaches will use it automatically.
          </Text>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((category) => (
            <ContextSectionSkeleton key={category} count={1} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineIndicator />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text 
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
          >
            Your Operating System
          </Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Define your context once. Your coaches will use it automatically.
          </Text>
        </View>

        {/* Error Banner */}
        {error && (
          <Pressable
            onPress={clearError} 
            style={styles.errorBanner}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error message"
          >
            <Text style={styles.errorText}>{error}</Text>
          </Pressable>
        )}

        {/* Context Sections */}
        {CATEGORIES.map((category) => (
          <ContextSection
            key={category}
            category={category}
            items={getByCategory(category)}
            onAddItem={() => handleAddItem(category)}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        ))}

        {/* Total Count */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            {items.length} context item{items.length !== 1 ? 's' : ''} defined
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <ContextModal
        visible={modalVisible}
        mode={modalMode}
        initialCategory={selectedCategory}
        initialContent={selectedItem?.content || ''}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      <DeleteModal
        visible={deleteModalVisible}
        item={itemToDelete}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalVisible(false)}
      />

      <PaywallModal
        visible={isPaywallVisible}
        feature={paywallFeature || 'unlimited_context'}
        onClose={hidePaywall}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24, // Updated to screen-margin-x (24px)
    paddingBottom: 32, // screen-margin-y
  },
  header: {
    marginTop: 24,
    marginBottom: 48, // Updated to 2xl spacing for generous breathing room
    paddingHorizontal: 24, // Updated to screen-margin-x (24px)
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
    marginBottom: 48, // Updated to 2xl spacing (48px) for section spacing
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  itemCardPressed: {
    opacity: 0.8,
  },
  itemContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyCardPressed: {
    opacity: 0.8,
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: '500',
  },
  addMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  addMoreButtonPressed: {
    opacity: 0.7,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  modalCancel: {
    fontSize: 16,
    color: '#71717A',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#09090B',
  },
  modalSaveDisabled: {
    color: '#D4D4D8',
  },
  categoryPicker: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryScroll: {
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
  },
  categoryChipTextSelected: {
    color: '#09090B',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#09090B',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  charCount: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'right',
    marginTop: 8,
  },

  // Delete modal styles
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  deleteModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#09090B',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    paddingVertical: 16,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#71717A',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
