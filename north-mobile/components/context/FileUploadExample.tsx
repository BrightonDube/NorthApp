/**
 * FileUploadExample
 * 
 * Example implementation showing how to use FileUploadComponent
 * in a real application screen with navigation and state management.
 * 
 * This is a reference implementation - adapt to your app's navigation
 * and state management patterns.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { FileUploadComponent } from './FileUploadComponent';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/contexts/ThemeContext';

/**
 * Example screen showing file upload integration
 * 
 * This demonstrates:
 * - Navigation integration
 * - Success/error handling
 * - State management
 * - User feedback
 */
export function FileUploadScreen() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  
  // In a real app, get this from your auth context/store
  const userId = 'current-user-id';

  /**
   * Handle successful file upload
   * 
   * In a real app, you would:
   * - Update your local state/store
   * - Refresh the file list
   * - Show a success toast/notification
   * - Navigate back to the previous screen
   */
  const handleUploadComplete = (fileId: string, filename: string) => {
    console.log('File uploaded successfully:', { fileId, filename });
    
    // Show success message
    Alert.alert(
      'Upload Successful',
      `${filename} has been uploaded successfully.`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to file list or context screen
            router.back();
          },
        },
      ]
    );
  };

  /**
   * Handle upload cancellation
   * 
   * Navigate back to the previous screen
   */
  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <FileUploadComponent
        userId={userId}
        onUploadComplete={handleUploadComplete}
        onCancel={handleCancel}
      />
    </View>
  );
}

/**
 * Example of using FileUploadComponent in a modal
 * 
 * This shows how to integrate the component in a modal dialog
 * instead of a full screen.
 */
export function FileUploadModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: (fileId: string, filename: string) => void;
}) {
  const userId = 'current-user-id';

  const handleUploadComplete = (fileId: string, filename: string) => {
    onSuccess(fileId, filename);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <FileUploadComponent
          userId={userId}
          onUploadComplete={handleUploadComplete}
          onCancel={onClose}
        />
      </View>
    </View>
  );
}

/**
 * Example of integrating with a file list screen
 * 
 * This shows how to add an "Upload" button to an existing screen
 * that navigates to the upload component.
 */
export function FileListScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);

  const handleUploadPress = () => {
    // Navigate to upload screen
    router.push('/files/upload');
  };

  const handleFileUploaded = (fileId: string, filename: string) => {
    // Add the new file to the list
    setFiles([...files, { id: fileId, name: filename }]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Files</Text>
        <Pressable
          onPress={handleUploadPress}
          style={styles.uploadButton}
          accessibilityRole="button"
          accessibilityLabel="Upload new file"
        >
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </Pressable>
      </View>

      {/* File list would go here */}
      <View style={styles.fileList}>
        {files.length === 0 ? (
          <Text style={styles.emptyText}>No files yet. Upload your first file!</Text>
        ) : (
          files.map((file) => (
            <View key={file.id} style={styles.fileItem}>
              <Text>{file.name}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fileList: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  fileItem: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
});
