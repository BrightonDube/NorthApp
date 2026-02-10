/**
 * FileUploadComponent
 * 
 * React Native component for file upload with file selection, preview,
 * validation, and upload progress tracking.
 * 
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5, 9.1, 9.4, 9.5
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FileValidator, type FileMetadata } from '@/lib/fileValidator';
import { FileProcessor, type FileData } from '@/lib/fileProcessor';
import { StorageService } from '@/lib/storageService';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Props for FileUploadComponent
 */
interface FileUploadComponentProps {
  /** User ID for storage quota checking */
  userId: string;
  /** Callback when file is successfully uploaded */
  onUploadComplete: (fileId: string, filename: string) => void;
  /** Callback when upload is cancelled */
  onCancel?: () => void;
}

/**
 * File selection state
 */
interface SelectedFile {
  name: string;
  size: number;
  type: string;
  data: Uint8Array;
  preview?: string;
}

/**
 * FileUploadComponent
 * 
 * Features:
 * - File selection UI (adapted for React Native)
 * - File preview before confirmation
 * - Upload progress indicator
 * - Validation error display
 * - Cancel and confirm buttons
 * - Integration with FileValidator, FileProcessor, and StorageService
 * 
 * Note: This component is designed for React Native. For web platforms,
 * it uses a file input. For native platforms, you should integrate with
 * expo-document-picker or react-native-document-picker.
 * 
 * @example
 * ```tsx
 * <FileUploadComponent
 *   userId={currentUser.id}
 *   onUploadComplete={(fileId, filename) => {
 *     console.log('File uploaded:', fileId, filename);
 *   }}
 *   onCancel={() => console.log('Upload cancelled')}
 * />
 * ```
 */
export function FileUploadComponent({
  userId,
  onUploadComplete,
  onCancel,
}: FileUploadComponentProps) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  const prefersReducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';
  
  const fileValidator = new FileValidator();
  const fileProcessor = new FileProcessor();
  const storageService = new StorageService();

  /**
   * Handle file selection
   * 
   * This is a placeholder implementation. In a production app, you would:
   * - Use expo-document-picker for native platforms
   * - Use HTML file input for web platform
   * - Handle file reading and conversion to Uint8Array
   */
  const handleFileSelect = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // For web platform, we can use file input
      if (Platform.OS === 'web') {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.txt,.md';
        
        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (!file) return;
          
          // Read file data
          const arrayBuffer = await file.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          
          // Create file metadata
          const fileMetadata: FileMetadata = {
            name: file.name,
            size: file.size,
            type: file.type,
          };
          
          // Validate file
          const typeResult = fileValidator.validateFileType(fileMetadata);
          if (!typeResult.valid) {
            setValidationError(typeResult.error || 'Invalid file type');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          
          const sizeResult = fileValidator.validateFileSize(fileMetadata);
          if (!sizeResult.valid) {
            setValidationError(sizeResult.error || 'File too large');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          
          const quotaResult = await fileValidator.checkStorageQuota(userId, file.size);
          if (!quotaResult.valid) {
            setValidationError(quotaResult.error || 'Storage quota exceeded');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
          
          // Generate preview
          setIsGeneratingPreview(true);
          const preview = await generatePreview({
            name: file.name,
            data,
          });
          setIsGeneratingPreview(false);
          
          // Set selected file
          setSelectedFile({
            name: file.name,
            size: file.size,
            type: file.type,
            data,
            preview,
          });
          
          setValidationError(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        };
        
        input.click();
      } else {
        // For native platforms, show alert to install document picker
        Alert.alert(
          'Document Picker Required',
          'To upload files on mobile, please install expo-document-picker:\n\nnpx expo install expo-document-picker',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      setValidationError('Failed to select file. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  /**
   * Generate a preview of the file content
   * 
   * For text files: shows first 500 characters
   * For PDFs: shows extracted text preview
   * 
   * Validates: Requirements 9.1, 9.2, 9.3
   */
  const generatePreview = async (file: FileData): Promise<string> => {
    try {
      const result = await fileProcessor.extractText(file);
      
      if (!result.extractionSuccess) {
        return `Preview unavailable: ${result.error || 'Unknown error'}`;
      }
      
      // For text files, show first 500 characters
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'txt' || extension === 'md') {
        return result.text.substring(0, 500) + (result.text.length > 500 ? '...' : '');
      }
      
      // For PDFs, show extracted text preview
      if (extension === 'pdf') {
        const preview = result.text.substring(0, 500) + (result.text.length > 500 ? '...' : '');
        return `PDF Preview (${result.pageCount || '?'} pages):\n\n${preview}`;
      }
      
      return result.text.substring(0, 500) + (result.text.length > 500 ? '...' : '');
    } catch (error) {
      console.error('Error generating preview:', error);
      return 'Preview unavailable';
    }
  };

  /**
   * Handle file upload confirmation
   * 
   * Validates file, processes content, uploads to storage, and saves metadata
   * 
   * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.5
   */
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Validate file again before upload
      const fileMetadata: FileMetadata = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      };
      
      const validationResult = await fileValidator.validateFile(fileMetadata, userId);
      if (!validationResult.valid) {
        setValidationError(validationResult.error || 'Validation failed');
        setIsUploading(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      setUploadProgress(25);
      
      // Extract text content
      const extractionResult = await fileProcessor.extractText({
        name: selectedFile.name,
        data: selectedFile.data,
      });
      
      setUploadProgress(50);
      
      // Upload file to storage
      const storageResult = await storageService.uploadFile(userId, {
        name: selectedFile.name,
        data: selectedFile.data,
        type: selectedFile.type,
      });
      
      setUploadProgress(75);
      
      // Note: In a complete implementation, you would also save the file metadata
      // and extracted content to the database using the Context Engine.
      // This is handled in task 6.1 (Context Engine extension).
      
      setUploadProgress(100);
      
      // Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Call completion callback
      onUploadComplete(storageResult.fileId, selectedFile.name);
      
      // Reset state
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      setValidationError(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setValidationError(
        error instanceof Error ? error.message : 'Upload failed. Please try again.'
      );
      setIsUploading(false);
      setUploadProgress(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  /**
   * Handle upload cancellation
   * 
   * Validates: Requirements 9.4
   */
  const handleCancelUpload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFile(null);
    setValidationError(null);
    setIsGeneratingPreview(false);
    onCancel?.();
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      {/* Header */}
      <View className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <Text className="text-xl font-bold text-zinc-900 dark:text-white">
          Upload File
        </Text>
        <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Supported formats: PDF, TXT, MD (max 10MB)
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* File Selection Area */}
        {!selectedFile && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeIn}
            exiting={prefersReducedMotion ? undefined : FadeOut}
          >
            <Pressable
              onPress={handleFileSelect}
              style={({ focused }) => [
                styles.uploadZone,
                focused && { borderWidth: 2, borderColor: focusColor },
              ]}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 items-center justify-center min-h-[200px]"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Select file to upload"
            >
              <Text className="text-4xl mb-4">📄</Text>
              <Text className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Select a file
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                Tap to choose a PDF, TXT, or MD file
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* File Preview */}
        {selectedFile && !isUploading && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeIn}
            exiting={prefersReducedMotion ? undefined : FadeOut}
          >
            <View className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 mb-4">
              <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                Selected File
              </Text>
              
              <View className="flex-row items-center mb-3">
                <Text className="text-2xl mr-3">📄</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                    {selectedFile.name}
                  </Text>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
              </View>

              {isGeneratingPreview && (
                <View className="py-4">
                  <ActivityIndicator size="small" />
                  <Text className="text-sm text-zinc-600 dark:text-zinc-400 text-center mt-2">
                    Generating preview...
                  </Text>
                </View>
              )}

              {!isGeneratingPreview && selectedFile.preview && (
                <>
                  <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Preview
                  </Text>
                  <ScrollView
                    className="bg-white dark:bg-zinc-900 rounded-lg p-3 max-h-[200px]"
                    nestedScrollEnabled
                  >
                    <Text className="text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedFile.preview}
                    </Text>
                  </ScrollView>
                </>
              )}
            </View>
          </Animated.View>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeIn}
            exiting={prefersReducedMotion ? undefined : FadeOut}
          >
            <View className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 items-center">
              <ActivityIndicator size="large" />
              <Text className="text-base font-semibold text-zinc-900 dark:text-white mt-4 mb-2">
                Uploading...
              </Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                {uploadProgress}% complete
              </Text>
              
              {/* Progress Bar */}
              <View className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <View
                  className="bg-blue-500 h-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Validation Error */}
        {validationError && (
          <Animated.View
            entering={prefersReducedMotion ? undefined : FadeIn}
            exiting={prefersReducedMotion ? undefined : FadeOut}
          >
            <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Error
              </Text>
              <Text className="text-sm text-red-700 dark:text-red-300">
                {validationError}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {selectedFile && !isUploading && (
        <View className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleCancelUpload}
              style={({ focused }) => [
                styles.button,
                focused && { borderWidth: 2, borderColor: focusColor },
              ]}
              className="flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl py-4 items-center"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancel upload"
            >
              <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmUpload}
              style={({ focused }) => [
                styles.button,
                focused && { borderWidth: 2, borderColor: focusColor },
              ]}
              className="flex-1 bg-blue-500 rounded-xl py-4 items-center"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Confirm upload"
            >
              <Text className="text-base font-semibold text-white">
                Upload
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uploadZone: {
    borderRadius: 12,
  },
  button: {
    borderRadius: 12,
  },
});
