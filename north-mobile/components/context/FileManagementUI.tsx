/**
 * FileManagementUI Component
 * 
 * Displays and manages user file attachments with the following features:
 * - List of all user files with filename, type, size, upload date
 * - File details view showing extracted content
 * - Delete button with confirmation dialog
 * - Rename functionality with inline editing
 * - Storage quota display with progress bar
 * - Warning when quota reaches 80%
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 10.2, 10.4
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useContextStore } from '@/stores/contextStore';
import { StorageService } from '@/lib/storageService';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { FileAttachment } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { logError, getUserFriendlyMessage, type ErrorContext } from '@/lib/errorLogger';

interface FileManagementUIProps {
  /** User ID for fetching files */
  userId: string;
  /** Callback when files are updated (optional) */
  onFilesUpdated?: () => void;
}

/**
 * FileManagementUI Component
 * 
 * Main component for managing file attachments. Integrates with ContextEngine
 * for all file operations.
 * 
 * @example
 * ```tsx
 * <FileManagementUI
 *   userId={currentUser.id}
 *   onFilesUpdated={() => console.log('Files updated')}
 * />
 * ```
 */
export function FileManagementUI({ userId, onFilesUpdated }: FileManagementUIProps) {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [storageUsage, setStorageUsage] = useState<{
    usedBytes: number;
    totalBytes: number;
    percentageUsed: number;
  } | null>(null);
  
  const prefersReducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';
  
  const {
    getFileAttachments,
    deleteFileAttachment,
    updateFileName,
    getStorageUsage,
  } = useContextStore();
  
  const storageService = new StorageService();

  /**
   * Load files and storage usage on mount
   */
  useEffect(() => {
    loadFiles();
    loadStorageUsage();
  }, [userId]);

  /**
   * Load all user files
   * Validates: Requirements 5.1, 8.5
   */
  const loadFiles = async () => {
    const errorContext: ErrorContext = {
      operation: 'loadFiles',
      userId,
      component: 'FileManagementUI',
    };
    
    try {
      setIsLoading(true);
      const userFiles = await getFileAttachments(userId);
      setFiles(userFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      logError(error as Error, errorContext, 'error');
      Alert.alert('Error', getUserFriendlyMessage(error as Error, 'load'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load storage usage
   * Validates: Requirements 5.5, 10.4, 8.5
   */
  const loadStorageUsage = async () => {
    const errorContext: ErrorContext = {
      operation: 'loadStorageUsage',
      userId,
      component: 'FileManagementUI',
    };
    
    try {
      const usage = await getStorageUsage(userId);
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading storage usage:', error);
      logError(error as Error, errorContext, 'warning');
      // Don't show alert for storage usage errors, just log them
    }
  };

  /**
   * Handle file selection to view details
   * Validates: Requirements 5.2
   */
  const handleFileSelect = (file: FileAttachment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFile(file);
  };

  /**
   * Handle file deletion with confirmation
   * Validates: Requirements 5.3, 10.5, 8.1, 8.5
   */
  const handleDeleteFile = (file: FileAttachment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.filename}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const errorContext: ErrorContext = {
              operation: 'deleteFile',
              userId,
              fileId: file.id,
              filename: file.filename,
              component: 'FileManagementUI',
            };
            
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Delete from storage
              await storageService.deleteFile(userId, file.id);
              
              // Delete from database
              await deleteFileAttachment(userId, file.id);
              
              // Reload files and storage usage
              await loadFiles();
              await loadStorageUsage();
              
              // Close details modal if this file was selected
              if (selectedFile?.id === file.id) {
                setSelectedFile(null);
              }
              
              onFilesUpdated?.();
              
              Alert.alert('Success', 'File deleted successfully. Your storage quota has been updated.');
            } catch (error) {
              console.error('Error deleting file:', error);
              logError(error as Error, errorContext, 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', getUserFriendlyMessage(error as Error, 'delete'));
            }
          },
        },
      ]
    );
  };

  /**
   * Start editing a file name
   * Validates: Requirements 5.4
   */
  const handleStartRename = (file: FileAttachment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingFileId(file.id);
    setEditingFileName(file.filename);
  };

  /**
   * Save renamed file
   * Validates: Requirements 5.4, 8.1, 8.5
   */
  const handleSaveRename = async (fileId: string) => {
    if (!editingFileName.trim()) {
      Alert.alert('Error', 'Filename cannot be empty');
      return;
    }
    
    const errorContext: ErrorContext = {
      operation: 'renameFile',
      userId,
      fileId,
      filename: editingFileName,
      component: 'FileManagementUI',
    };
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await updateFileName(userId, fileId, editingFileName.trim());
      
      // Reload files
      await loadFiles();
      
      // Update selected file if it was renamed
      if (selectedFile?.id === fileId) {
        setSelectedFile({ ...selectedFile, filename: editingFileName.trim() });
      }
      
      setEditingFileId(null);
      setEditingFileName('');
      
      onFilesUpdated?.();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error renaming file:', error);
      logError(error as Error, errorContext, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', getUserFriendlyMessage(error as Error, 'rename'));
    }
  };

  /**
   * Cancel renaming
   */
  const handleCancelRename = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingFileId(null);
    setEditingFileName('');
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Get file type icon
   */
  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'txt':
        return '📝';
      case 'md':
        return '📋';
      default:
        return '📄';
    }
  };

  /**
   * Check if storage warning should be shown
   * Validates: Requirements 10.2
   */
  const shouldShowStorageWarning = (): boolean => {
    return storageUsage !== null && storageUsage.percentageUsed >= 80;
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900">
        <ActivityIndicator size="large" />
        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
          Loading files...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          My Files
        </Text>
        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Storage Quota Section */}
        {storageUsage && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeIn}
            className="p-4 border-b border-zinc-200 dark:border-zinc-800"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                Storage Usage
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatFileSize(storageUsage.usedBytes)} / {formatFileSize(storageUsage.totalBytes)}
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-3 overflow-hidden mb-2">
              <View
                className={`h-full ${
                  storageUsage.percentageUsed >= 80
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percentageUsed, 100)}%` }}
              />
            </View>

            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {storageUsage.percentageUsed}% used
            </Text>

            {/* Storage Warning */}
            {shouldShowStorageWarning() && (
              <Animated.View
                entering={prefersReducedMotion ? undefined : FadeIn}
                className="mt-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3"
              >
                <Text className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                  ⚠️ Storage Warning
                </Text>
                <Text className="text-xs text-orange-700 dark:text-orange-300">
                  You're using {storageUsage.percentageUsed}% of your storage quota. Consider deleting unused files.
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* File List */}
        <View className="p-4">
          {files.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-4xl mb-4">📁</Text>
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                No files yet
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                Upload files to make them available to AI coaches
              </Text>
            </View>
          ) : (
            files.map((file) => (
              <Animated.View
                key={file.id}
                entering={prefersReducedMotion ? undefined : FadeIn}
                exiting={prefersReducedMotion ? undefined : FadeOut}
                className="mb-3"
              >
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
                  {/* File Info */}
                  <Pressable
                    onPress={() => handleFileSelect(file)}
                    style={({ focused }) => [
                      styles.fileCard,
                      focused && { borderWidth: 2, borderColor: focusColor },
                    ]}
                    className="p-4"
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${file.filename}`}
                  >
                    <View className="flex-row items-start">
                      <Text className="text-3xl mr-3">{getFileIcon(file.fileType)}</Text>
                      
                      <View className="flex-1">
                        {editingFileId === file.id ? (
                          // Inline editing
                          <View className="flex-row items-center gap-2">
                            <TextInput
                              value={editingFileName}
                              onChangeText={setEditingFileName}
                              className="flex-1 bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-base text-zinc-900 dark:text-white"
                              autoFocus
                              selectTextOnFocus
                              accessible
                              accessibilityLabel="Edit filename"
                            />
                            <Pressable
                              onPress={() => handleSaveRename(file.id)}
                              style={({ focused }) => [
                                styles.iconButton,
                                focused && { borderWidth: 2, borderColor: focusColor },
                              ]}
                              className="bg-blue-500 rounded-lg p-2"
                              accessible
                              accessibilityRole="button"
                              accessibilityLabel="Save filename"
                            >
                              <Text className="text-white text-sm font-semibold">✓</Text>
                            </Pressable>
                            <Pressable
                              onPress={handleCancelRename}
                              style={({ focused }) => [
                                styles.iconButton,
                                focused && { borderWidth: 2, borderColor: focusColor },
                              ]}
                              className="bg-zinc-300 dark:bg-zinc-700 rounded-lg p-2"
                              accessible
                              accessibilityRole="button"
                              accessibilityLabel="Cancel editing"
                            >
                              <Text className="text-zinc-900 dark:text-white text-sm font-semibold">✕</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <>
                            <Text className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                              {file.filename}
                            </Text>
                            <View className="flex-row items-center gap-3">
                              <Text className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                                {file.fileType}
                              </Text>
                              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatFileSize(file.fileSize)}
                              </Text>
                              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatDate(file.uploadDate)}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </Pressable>

                  {/* Action Buttons */}
                  {editingFileId !== file.id && (
                    <View className="flex-row border-t border-zinc-200 dark:border-zinc-700">
                      <Pressable
                        onPress={() => handleStartRename(file)}
                        style={({ focused }) => [
                          styles.actionButton,
                          focused && { borderWidth: 2, borderColor: focusColor },
                        ]}
                        className="flex-1 py-3 items-center border-r border-zinc-200 dark:border-zinc-700"
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel="Rename file"
                      >
                        <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          Rename
                        </Text>
                      </Pressable>
                      
                      <Pressable
                        onPress={() => handleDeleteFile(file)}
                        style={({ focused }) => [
                          styles.actionButton,
                          focused && { borderWidth: 2, borderColor: focusColor },
                        ]}
                        className="flex-1 py-3 items-center"
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel="Delete file"
                      >
                        <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* File Details Modal */}
      <Modal
        visible={selectedFile !== null}
        onClose={() => {
          setSelectedFile(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        {selectedFile && (
          <View>
            {/* Modal Header */}
            <View className="mb-4">
              <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                File Details
              </Text>
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">{getFileIcon(selectedFile.fileType)}</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                    {selectedFile.filename}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                      {selectedFile.fileType}
                    </Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(selectedFile.fileSize)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Extracted Content */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                Extracted Content
              </Text>
              
              {selectedFile.extractionSuccess && selectedFile.extractedContent ? (
                <ScrollView
                  className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 max-h-[300px]"
                  nestedScrollEnabled
                >
                  <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedFile.extractedContent}
                  </Text>
                </ScrollView>
              ) : (
                <View className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                    {selectedFile.extractionError || 'Content extraction failed or unavailable'}
                  </Text>
                </View>
              )}
            </View>

            {/* Upload Date */}
            <View className="mb-4">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Uploaded on {formatDate(selectedFile.uploadDate)}
              </Text>
            </View>

            {/* Close Button */}
            <Pressable
              onPress={() => {
                setSelectedFile(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ focused }) => [
                styles.closeButton,
                focused && { borderWidth: 2, borderColor: focusColor },
              ]}
              className="bg-blue-500 rounded-xl py-4 items-center"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close details"
            >
              <Text className="text-base font-semibold text-white">
                Close
              </Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fileCard: {
    borderRadius: 12,
  },
  actionButton: {
    borderRadius: 0,
  },
  iconButton: {
    borderRadius: 8,
  },
  closeButton: {
    borderRadius: 12,
  },
});

export default FileManagementUI;
