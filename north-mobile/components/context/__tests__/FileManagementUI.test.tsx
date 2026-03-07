/**
 * FileManagementUI Unit Tests
 * 
 * Unit tests for FileManagementUI component covering:
 * - File list rendering
 * - File details display
 * - Delete confirmation and execution
 * - Rename functionality
 * - Storage quota display and warning
 * 
 * Feature: file-context-attachments
 * Task: 11.1
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 10.2, 10.4
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FileManagementUI } from '../FileManagementUI';
import { useContextStore } from '@/stores/contextStore';
import { StorageService } from '@/lib/storageService';
import type { FileAttachment } from '@/types';

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

// Mock context store
jest.mock('@/stores/contextStore');

// Mock storage service
jest.mock('@/lib/storageService');

// Mock useReducedMotion hook
jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Helper to create mock file attachments
const createMockFile = (overrides?: Partial<FileAttachment>): FileAttachment => ({
  id: 'file-123',
  userId: 'user-123',
  filename: 'test-document.pdf',
  fileType: 'pdf',
  fileSize: 1024000, // 1MB
  uploadDate: '2024-01-01T00:00:00Z',
  storagePath: 'user-123/file-123.pdf',
  storageUrl: 'https://storage.example.com/file-123.pdf',
  extractedContent: 'This is the extracted text content from the PDF file.',
  extractionSuccess: true,
  extractionError: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('FileManagementUI Component', () => {
  const mockGetFileAttachments = jest.fn();
  const mockDeleteFileAttachment = jest.fn();
  const mockUpdateFileName = jest.fn();
  const mockGetStorageUsage = jest.fn();
  const mockDeleteFile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup context store mock
    (useContextStore as unknown as jest.Mock).mockReturnValue({
      getFileAttachments: mockGetFileAttachments,
      deleteFileAttachment: mockDeleteFileAttachment,
      updateFileName: mockUpdateFileName,
      getStorageUsage: mockGetStorageUsage,
    });

    // Setup storage service mock
    (StorageService as jest.Mock).mockImplementation(() => ({
      deleteFile: mockDeleteFile,
    }));

    // Default mock implementations
    mockGetFileAttachments.mockResolvedValue([]);
    mockGetStorageUsage.mockResolvedValue({
      usedBytes: 10 * 1024 * 1024, // 10MB
      totalBytes: 100 * 1024 * 1024, // 100MB
      percentageUsed: 10,
    });
  });

  describe('File List Rendering', () => {
    it('should display loading state initially', () => {
      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      expect(getByText('Loading files...')).toBeTruthy();
    });

    it('should display empty state when no files exist', async () => {
      mockGetFileAttachments.mockResolvedValue([]);

      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('No files yet')).toBeTruthy();
        expect(getByText('Upload files to make them available to AI coaches')).toBeTruthy();
      });
    });

    it('should display list of files with metadata', async () => {
      const mockFiles = [
        createMockFile({
          id: 'file-1',
          filename: 'document1.pdf',
          fileType: 'pdf',
          fileSize: 1024000,
        }),
        createMockFile({
          id: 'file-2',
          filename: 'notes.txt',
          fileType: 'txt',
          fileSize: 512000,
        }),
      ];

      mockGetFileAttachments.mockResolvedValue(mockFiles);

      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('document1.pdf')).toBeTruthy();
        expect(getByText('notes.txt')).toBeTruthy();
        expect(getByText('pdf')).toBeTruthy();
        expect(getByText('txt')).toBeTruthy();
      });
    });

    it('should display file count in header', async () => {
      const mockFiles = [
        createMockFile({ id: 'file-1' }),
        createMockFile({ id: 'file-2' }),
        createMockFile({ id: 'file-3' }),
      ];

      mockGetFileAttachments.mockResolvedValue(mockFiles);

      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('3 files')).toBeTruthy();
      });
    });
  });

  describe('Storage Quota Display', () => {
    it('should display storage usage with progress bar', async () => {
      mockGetFileAttachments.mockResolvedValue([]);
      mockGetStorageUsage.mockResolvedValue({
        usedBytes: 50 * 1024 * 1024, // 50MB
        totalBytes: 100 * 1024 * 1024, // 100MB
        percentageUsed: 50,
      });

      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('Storage Usage')).toBeTruthy();
        expect(getByText('50.00 MB / 100.00 MB')).toBeTruthy();
        expect(getByText('50% used')).toBeTruthy();
      });
    });

    it('should show warning when storage reaches 80%', async () => {
      mockGetFileAttachments.mockResolvedValue([]);
      mockGetStorageUsage.mockResolvedValue({
        usedBytes: 85 * 1024 * 1024, // 85MB
        totalBytes: 100 * 1024 * 1024, // 100MB
        percentageUsed: 85,
      });

      const { getByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('⚠️ Storage Warning')).toBeTruthy();
        expect(getByText(/You're using 85% of your storage quota/)).toBeTruthy();
      });
    });

    it('should not show warning when storage is below 80%', async () => {
      mockGetFileAttachments.mockResolvedValue([]);
      mockGetStorageUsage.mockResolvedValue({
        usedBytes: 70 * 1024 * 1024, // 70MB
        totalBytes: 100 * 1024 * 1024, // 100MB
        percentageUsed: 70,
      });

      const { queryByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(queryByText('⚠️ Storage Warning')).toBeNull();
      });
    });
  });

  describe('File Details View', () => {
    it('should open details modal when file is tapped', async () => {
      const mockFile = createMockFile({
        filename: 'test.pdf',
        extractedContent: 'Test content',
      });

      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByText, getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('test.pdf')).toBeTruthy();
      });

      // Tap on file to open details
      fireEvent.press(getByLabelText('View details for test.pdf'));

      await waitFor(() => {
        expect(getByText('File Details')).toBeTruthy();
        expect(getByText('Extracted Content')).toBeTruthy();
        expect(getByText('Test content')).toBeTruthy();
      });
    });

    it('should display error message when extraction failed', async () => {
      const mockFile = createMockFile({
        filename: 'corrupted.pdf',
        extractedContent: null,
        extractionSuccess: false,
        extractionError: 'File is corrupted',
      });

      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByText, getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('corrupted.pdf')).toBeTruthy();
      });

      // Open details
      fireEvent.press(getByLabelText('View details for corrupted.pdf'));

      await waitFor(() => {
        expect(getByText('File is corrupted')).toBeTruthy();
      });
    });

    it('should close details modal when close button is pressed', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByText, getByLabelText, queryByText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('test-document.pdf')).toBeTruthy();
      });

      // Open details
      fireEvent.press(getByLabelText('View details for test-document.pdf'));

      await waitFor(() => {
        expect(getByText('File Details')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByLabelText('Close details'));

      await waitFor(() => {
        expect(queryByText('File Details')).toBeNull();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when delete is pressed', async () => {
      const mockFile = createMockFile({ filename: 'delete-me.pdf' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      jest.spyOn(Alert, 'alert');

      const { getByText, getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByText('delete-me.pdf')).toBeTruthy();
      });

      // Press delete button
      fireEvent.press(getByLabelText('Delete file'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete File',
        expect.stringContaining('delete-me.pdf'),
        expect.any(Array)
      );
    });

    it('should delete file from storage and database when confirmed', async () => {
      const mockFile = createMockFile({ id: 'file-to-delete' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);
      mockDeleteFile.mockResolvedValue(undefined);
      mockDeleteFileAttachment.mockResolvedValue(undefined);

      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        // Simulate user confirming deletion
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton && deleteButton.onPress) {
          deleteButton.onPress();
        }
      });

      const { getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Delete file')).toBeTruthy();
      });

      // Press delete button
      await act(async () => {
        fireEvent.press(getByLabelText('Delete file'));
      });

      await waitFor(() => {
        expect(mockDeleteFile).toHaveBeenCalledWith('user-123', 'file-to-delete');
        expect(mockDeleteFileAttachment).toHaveBeenCalledWith('user-123', 'file-to-delete');
      });
    });

    it('should update storage quota after deletion', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);
      mockDeleteFile.mockResolvedValue(undefined);
      mockDeleteFileAttachment.mockResolvedValue(undefined);

      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton && deleteButton.onPress) {
          deleteButton.onPress();
        }
      });

      const { getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Delete file')).toBeTruthy();
      });

      const initialCallCount = mockGetStorageUsage.mock.calls.length;

      await act(async () => {
        fireEvent.press(getByLabelText('Delete file'));
      });

      await waitFor(() => {
        // Should be called again after deletion
        expect(mockGetStorageUsage.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Rename Functionality', () => {
    it('should show inline editor when rename is pressed', async () => {
      const mockFile = createMockFile({ filename: 'old-name.pdf' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByLabelText, getByDisplayValue } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Rename file')).toBeTruthy();
      });

      // Press rename button
      fireEvent.press(getByLabelText('Rename file'));

      await waitFor(() => {
        expect(getByDisplayValue('old-name.pdf')).toBeTruthy();
        expect(getByLabelText('Save filename')).toBeTruthy();
        expect(getByLabelText('Cancel editing')).toBeTruthy();
      });
    });

    it('should save new filename when save is pressed', async () => {
      const mockFile = createMockFile({ id: 'file-123', filename: 'old-name.pdf' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);
      mockUpdateFileName.mockResolvedValue(undefined);

      const { getByLabelText, getByDisplayValue } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Rename file')).toBeTruthy();
      });

      // Start rename
      fireEvent.press(getByLabelText('Rename file'));

      await waitFor(() => {
        expect(getByDisplayValue('old-name.pdf')).toBeTruthy();
      });

      // Change filename
      const input = getByDisplayValue('old-name.pdf');
      fireEvent.changeText(input, 'new-name.pdf');

      // Save
      await act(async () => {
        fireEvent.press(getByLabelText('Save filename'));
      });

      await waitFor(() => {
        expect(mockUpdateFileName).toHaveBeenCalledWith('user-123', 'file-123', 'new-name.pdf');
      });
    });

    it('should cancel rename when cancel is pressed', async () => {
      const mockFile = createMockFile({ filename: 'test.pdf' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByLabelText, getByDisplayValue, queryByDisplayValue } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Rename file')).toBeTruthy();
      });

      // Start rename
      fireEvent.press(getByLabelText('Rename file'));

      await waitFor(() => {
        expect(getByDisplayValue('test.pdf')).toBeTruthy();
      });

      // Cancel
      fireEvent.press(getByLabelText('Cancel editing'));

      await waitFor(() => {
        expect(queryByDisplayValue('test.pdf')).toBeNull();
        expect(mockUpdateFileName).not.toHaveBeenCalled();
      });
    });

    it('should show error when trying to save empty filename', async () => {
      const mockFile = createMockFile({ filename: 'test.pdf' });
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      jest.spyOn(Alert, 'alert');

      const { getByLabelText, getByDisplayValue } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Rename file')).toBeTruthy();
      });

      // Start rename
      fireEvent.press(getByLabelText('Rename file'));

      await waitFor(() => {
        expect(getByDisplayValue('test.pdf')).toBeTruthy();
      });

      // Clear filename
      const input = getByDisplayValue('test.pdf');
      fireEvent.changeText(input, '');

      // Try to save
      fireEvent.press(getByLabelText('Save filename'));

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Filename cannot be empty');
      expect(mockUpdateFileName).not.toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback on file selection', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('View details for test-document.pdf')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('View details for test-document.pdf'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should provide haptic feedback on delete action', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);

      const { getByLabelText } = render(
        <FileManagementUI userId="user-123" />
      );

      await waitFor(() => {
        expect(getByLabelText('Delete file')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Delete file'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('Callback Integration', () => {
    it('should call onFilesUpdated after successful deletion', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);
      mockDeleteFile.mockResolvedValue(undefined);
      mockDeleteFileAttachment.mockResolvedValue(undefined);

      const onFilesUpdated = jest.fn();

      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === 'Delete');
        if (deleteButton && deleteButton.onPress) {
          deleteButton.onPress();
        }
      });

      const { getByLabelText } = render(
        <FileManagementUI userId="user-123" onFilesUpdated={onFilesUpdated} />
      );

      await waitFor(() => {
        expect(getByLabelText('Delete file')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Delete file'));
      });

      await waitFor(() => {
        expect(onFilesUpdated).toHaveBeenCalled();
      });
    });

    it('should call onFilesUpdated after successful rename', async () => {
      const mockFile = createMockFile();
      mockGetFileAttachments.mockResolvedValue([mockFile]);
      mockUpdateFileName.mockResolvedValue(undefined);

      const onFilesUpdated = jest.fn();

      const { getByLabelText, getByDisplayValue } = render(
        <FileManagementUI userId="user-123" onFilesUpdated={onFilesUpdated} />
      );

      await waitFor(() => {
        expect(getByLabelText('Rename file')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Rename file'));

      await waitFor(() => {
        expect(getByDisplayValue('test-document.pdf')).toBeTruthy();
      });

      const input = getByDisplayValue('test-document.pdf');
      fireEvent.changeText(input, 'new-name.pdf');

      await act(async () => {
        fireEvent.press(getByLabelText('Save filename'));
      });

      await waitFor(() => {
        expect(onFilesUpdated).toHaveBeenCalled();
      });
    });
  });
});
