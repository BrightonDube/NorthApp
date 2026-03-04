/**
 * FileManagementExample
 * 
 * Example implementation showing how to use the FileManagementUI component
 * in a complete screen with navigation and state management.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FileManagementUI } from './FileManagementUI';
import { FileUploadComponent } from './FileUploadComponent';
import { useThemeColors } from '@/contexts/ThemeContext';

/**
 * Example screen showing file management with upload capability
 */
export function FileManagementScreen() {
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const colors = useThemeColors();
  
  // In a real app, get this from auth context
  const userId = 'current-user-id';

  const handleUploadComplete = (fileId: string, filename: string) => {
    console.log('File uploaded:', fileId, filename);
    setShowUpload(false);
    // Trigger refresh of file list
    setRefreshKey(prev => prev + 1);
  };

  const handleFilesUpdated = () => {
    console.log('Files updated (deleted or renamed)');
    // Optionally trigger other updates
  };

  if (showUpload) {
    return (
      <FileUploadComponent
        userId={userId}
        onUploadComplete={handleUploadComplete}
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header with Upload Button */}
      <View className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
            File Management
          </Text>
          <Pressable
            onPress={() => setShowUpload(true)}
            style={({ focused }: any) => [
              styles.uploadButton,
              focused && { borderWidth: 2, borderColor: colors.focus },
            ]}
            className="bg-blue-500 rounded-xl px-4 py-2"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Upload new file"
          >
            <Text className="text-white font-semibold">+ Upload</Text>
          </Pressable>
        </View>
      </View>

      {/* File Management UI */}
      <FileManagementUI
        key={refreshKey}
        userId={userId}
        onFilesUpdated={handleFilesUpdated}
      />
    </View>
  );
}

/**
 * Example with tab navigation between upload and management
 */
export function FileManagementWithTabs() {
  const [activeTab, setActiveTab] = useState<'manage' | 'upload'>('manage');
  const colors = useThemeColors();
  
  const userId = 'current-user-id';

  const handleUploadComplete = (fileId: string, filename: string) => {
    console.log('File uploaded:', fileId, filename);
    setActiveTab('manage');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Bar */}
      <View className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <View className="flex-row">
          <Pressable
            onPress={() => setActiveTab('manage')}
            style={({ focused }: any) => [
              styles.tab,
              focused && { borderWidth: 2, borderColor: colors.focus },
            ]}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === 'manage'
                ? 'border-blue-500'
                : 'border-transparent'
            }`}
            accessible
            accessibilityRole="tab"
            accessibilityLabel="Manage files tab"
            accessibilityState={{ selected: activeTab === 'manage' }}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'manage'
                  ? 'text-blue-500'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              My Files
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('upload')}
            style={({ focused }: any) => [
              styles.tab,
              focused && { borderWidth: 2, borderColor: colors.focus },
            ]}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === 'upload'
                ? 'border-blue-500'
                : 'border-transparent'
            }`}
            accessible
            accessibilityRole="tab"
            accessibilityLabel="Upload file tab"
            accessibilityState={{ selected: activeTab === 'upload' }}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'upload'
                  ? 'text-blue-500'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Upload
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'manage' ? (
        <FileManagementUI
          userId={userId}
          onFilesUpdated={() => console.log('Files updated')}
        />
      ) : (
        <FileUploadComponent
          userId={userId}
          onUploadComplete={handleUploadComplete}
          onCancel={() => setActiveTab('manage')}
        />
      )}
    </View>
  );
}

/**
 * Minimal example for quick integration
 */
export function MinimalFileManagement() {
  const userId = 'current-user-id';
  
  return (
    <FileManagementUI
      userId={userId}
      onFilesUpdated={() => {
        // Handle file updates
      }}
    />
  );
}

const styles = StyleSheet.create({
  uploadButton: {
    borderRadius: 12,
  },
  tab: {
    borderRadius: 0,
  },
});

export default FileManagementScreen;
