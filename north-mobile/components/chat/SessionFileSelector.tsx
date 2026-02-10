/**
 * SessionFileSelector Component
 * 
 * UI for selecting which file attachments to include in a specific chat session.
 * Allows users to choose session-specific files or use all files (default).
 * 
 * Features:
 * - Display list of user's file attachments
 * - Multi-select with checkboxes
 * - "Use all files" option (default)
 * - Save selections to session
 * - Visual feedback for selected files
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useContextStore } from '@/stores/contextStore';
import type { FileAttachment } from '@/lib/database.types';

export interface SessionFileSelectorProps {
  sessionId: string;
  onClose: () => void;
}

/**
 * SessionFileSelector Component
 * 
 * Allows users to select which files to include in the current chat session.
 * By default, all files are included. Users can select specific files to narrow context.
 * 
 * @param sessionId - The current chat session ID
 * @param onClose - Callback when selector is closed
 * 
 * @example
 * ```tsx
 * <SessionFileSelector
 *   sessionId={sessionId}
 *   onClose={() => setShowFileSelector(false)}
 * />
 * ```
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
export function SessionFileSelector({ sessionId, onClose }: SessionFileSelectorProps) {
  const { 
    fileAttachments, 
    fetchFileAttachments, 
    setSessionFiles, 
    getSessionFiles,
    isLoading,
  } = useContextStore();

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [useAllFiles, setUseAllFiles] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Load files and current session selections on mount
  useEffect(() => {
    const initialize = async () => {
      setInitializing(true);
      try {
        // Fetch user's file attachments
        await fetchFileAttachments();

        // Fetch current session file selections
        const sessionFiles = await getSessionFiles(sessionId);
        
        if (sessionFiles.length > 0) {
          // Session has specific files selected
          setUseAllFiles(false);
          setSelectedFileIds(sessionFiles.map(f => f.id));
        } else {
          // No specific files selected, using all files (default)
          setUseAllFiles(true);
          setSelectedFileIds([]);
        }
      } catch (error) {
        console.error('Failed to initialize file selector:', error);
      } finally {
        setInitializing(false);
      }
    };

    initialize();
  }, [sessionId]);

  /**
   * Toggle file selection
   * Validates: Requirements 7.1, 7.4
   */
  const toggleFileSelection = (fileId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });

    // If user selects specific files, disable "use all files"
    if (useAllFiles) {
      setUseAllFiles(false);
    }
  };

  /**
   * Toggle "use all files" mode
   * Validates: Requirements 7.3
   */
  const toggleUseAllFiles = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setUseAllFiles(prev => {
      const newValue = !prev;
      if (newValue) {
        // Clear specific selections when enabling "use all files"
        setSelectedFileIds([]);
      }
      return newValue;
    });
  };

  /**
   * Save session file selections
   * Validates: Requirements 7.1, 7.2, 7.4
   */
  const handleSave = async () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSaving(true);
    try {
      if (useAllFiles) {
        // Clear session-specific selections (use all files by default)
        await setSessionFiles(sessionId, []);
      } else {
        // Save specific file selections
        await setSessionFiles(sessionId, selectedFileIds);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save session files:', error);
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format upload date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (initializing) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="text-zinc-500 dark:text-zinc-400 mt-4">
          Loading files...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-zinc-950">
      {/* Header */}
      <View className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-semibold text-zinc-900 dark:text-white">
            Select Files for Session
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="p-2 -mr-2"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close file selector"
          >
            <Ionicons name="close" size={24} className="text-zinc-900 dark:text-white" />
          </TouchableOpacity>
        </View>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Choose which files to include in this conversation. By default, all files are included.
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Use All Files Option */}
        <TouchableOpacity
          onPress={toggleUseAllFiles}
          className={`flex-row items-center p-4 rounded-xl mb-4 mt-4 ${
            useAllFiles 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
              : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
          }`}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: useAllFiles }}
          accessibilityLabel="Use all files"
        >
          <View className="mr-3">
            <Ionicons
              name={useAllFiles ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={useAllFiles ? '#3B82F6' : '#A1A1AA'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              Use All Files (Default)
            </Text>
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              Include all {fileAttachments.length} file{fileAttachments.length !== 1 ? 's' : ''} in this conversation
            </Text>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          <Text className="text-xs text-zinc-400 dark:text-zinc-600 mx-3">OR SELECT SPECIFIC FILES</Text>
          <View className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </View>

        {/* File List */}
        {fileAttachments.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="document-outline" size={48} color="#A1A1AA" />
            <Text className="text-zinc-500 dark:text-zinc-400 mt-4 text-center">
              No files uploaded yet
            </Text>
            <Text className="text-sm text-zinc-400 dark:text-zinc-600 mt-2 text-center px-8">
              Upload files in the Context tab to make them available in conversations
            </Text>
          </View>
        ) : (
          <View className="pb-4">
            {fileAttachments.map((file) => {
              const isSelected = !useAllFiles && selectedFileIds.includes(file.id);
              const isDisabled = useAllFiles;

              return (
                <TouchableOpacity
                  key={file.id}
                  onPress={() => !isDisabled && toggleFileSelection(file.id)}
                  disabled={isDisabled}
                  className={`flex-row items-start p-4 rounded-xl mb-3 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
                  } ${isDisabled ? 'opacity-50' : ''}`}
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityState={{ 
                    checked: isSelected,
                    disabled: isDisabled,
                  }}
                  accessibilityLabel={`${file.filename}, ${formatFileSize(file.file_size)}`}
                >
                  <View className="mr-3 mt-1">
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isSelected ? '#3B82F6' : '#A1A1AA'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text 
                      className="text-base font-medium text-zinc-900 dark:text-white mb-1"
                      numberOfLines={2}
                    >
                      {file.filename}
                    </Text>
                    <View className="flex-row items-center flex-wrap">
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400 mr-3">
                        {file.file_type.toUpperCase()}
                      </Text>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400 mr-3">
                        {formatFileSize(file.file_size)}
                      </Text>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(file.upload_date)}
                      </Text>
                    </View>
                    {!file.extraction_success && (
                      <View className="flex-row items-center mt-2">
                        <Ionicons name="warning-outline" size={14} color="#EF4444" />
                        <Text className="text-xs text-red-500 ml-1">
                          Content not available
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer with Save Button */}
      <View className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || (!useAllFiles && selectedFileIds.length === 0)}
          className={`py-4 rounded-xl items-center ${
            isSaving || (!useAllFiles && selectedFileIds.length === 0)
              ? 'bg-zinc-300 dark:bg-zinc-800'
              : 'bg-blue-500'
          }`}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Save file selections"
          accessibilityState={{ disabled: isSaving || (!useAllFiles && selectedFileIds.length === 0) }}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {useAllFiles 
                ? 'Use All Files' 
                : `Use ${selectedFileIds.length} Selected File${selectedFileIds.length !== 1 ? 's' : ''}`
              }
            </Text>
          )}
        </TouchableOpacity>
        {!useAllFiles && selectedFileIds.length === 0 && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-2">
            Select at least one file or enable "Use All Files"
          </Text>
        )}
      </View>
    </View>
  );
}
