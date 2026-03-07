/**
 * SessionFileSelector Unit Tests
 * 
 * Tests for the session file selector component including file selection,
 * "use all files" mode, and saving selections.
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SessionFileSelector } from '../SessionFileSelector';
import { useContextStore } from '@/stores/contextStore';
import type { FileAttachment } from '@/lib/database.types';

// Mock the context store
jest.mock('@/stores/contextStore');

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('SessionFileSelector', () => {
  const mockSessionId = 'session-123';
  const mockOnClose = jest.fn();

  const mockFiles: FileAttachment[] = [
    {
      id: 'file-1',
      user_id: 'user-1',
      filename: 'document1.pdf',
      file_type: 'pdf',
      file_size: 1024000,
      upload_date: '2024-01-15T10:00:00Z',
      storage_path: 'user-1/file-1.pdf',
      storage_url: 'https://example.com/file-1.pdf',
      extracted_content: 'Sample content',
      extraction_success: true,
      extraction_error: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'file-2',
      user_id: 'user-1',
      filename: 'notes.txt',
      file_type: 'txt',
      file_size: 512000,
      upload_date: '2024-01-16T10:00:00Z',
      storage_path: 'user-1/file-2.txt',
      storage_url: 'https://example.com/file-2.txt',
      extracted_content: 'More content',
      extraction_success: true,
      extraction_error: null,
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
    },
  ];

  const mockContextStore = {
    fileAttachments: mockFiles,
    fetchFileAttachments: jest.fn(),
    setSessionFiles: jest.fn(),
    getSessionFiles: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContextStore.fileAttachments = mockFiles;
    mockContextStore.getSessionFiles.mockResolvedValue([]);
    (useContextStore as unknown as jest.Mock).mockReturnValue(mockContextStore);
  });

  describe('Initial Render', () => {
    it('should render file selector UI', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('Select Files for Session')).toBeTruthy();
      });
    });

    it('should display "Use All Files" option by default', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('Use All Files (Default)')).toBeTruthy();
      });
    });

    it('should display list of user files', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('document1.pdf')).toBeTruthy();
        expect(getByText('notes.txt')).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      expect(getByText('Loading files...')).toBeTruthy();
    });
  });

  describe('Use All Files Mode', () => {
    it('should have "Use All Files" enabled by default', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        expect(useAllFilesOption.props.accessibilityState.checked).toBe(true);
      });
    });

    it('should disable individual file selection when "Use All Files" is enabled', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const fileCheckbox = getByLabelText(/document1.pdf/);
        expect(fileCheckbox.props.accessibilityState.disabled).toBe(true);
      });
    });

    it('should save empty array when "Use All Files" is selected', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const saveButton = getByLabelText('Save file selections');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockContextStore.setSessionFiles).toHaveBeenCalledWith(mockSessionId, []);
      });
    });
  });

  describe('Specific File Selection', () => {
    it('should allow toggling "Use All Files" off', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        fireEvent.press(useAllFilesOption);
      });

      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        expect(useAllFilesOption.props.accessibilityState.checked).toBe(false);
      });
    });

    it('should enable individual file selection when "Use All Files" is disabled', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      // Disable "Use All Files"
      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        fireEvent.press(useAllFilesOption);
      });

      // Check that files are now selectable
      await waitFor(() => {
        const fileCheckbox = getByLabelText(/document1.pdf/);
        expect(fileCheckbox.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('should allow selecting individual files', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      // Disable "Use All Files"
      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        fireEvent.press(useAllFilesOption);
      });

      // Select a file
      await waitFor(() => {
        const fileCheckbox = getByLabelText(/document1.pdf/);
        fireEvent.press(fileCheckbox);
      });

      // Verify file is selected
      await waitFor(() => {
        const fileCheckbox = getByLabelText(/document1.pdf/);
        expect(fileCheckbox.props.accessibilityState.checked).toBe(true);
      });
    });

    it('should save selected file IDs', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      // Disable "Use All Files"
      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        fireEvent.press(useAllFilesOption);
      });

      // Select files
      await waitFor(() => {
        const file1 = getByLabelText(/document1.pdf/);
        fireEvent.press(file1);
      });

      // Save
      await waitFor(() => {
        const saveButton = getByLabelText('Save file selections');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockContextStore.setSessionFiles).toHaveBeenCalledWith(
          mockSessionId,
          ['file-1']
        );
      });
    });
  });

  describe('Session File Persistence', () => {
    it('should load existing session file selections', async () => {
      mockContextStore.getSessionFiles.mockResolvedValue([mockFiles[0]]);

      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const fileCheckbox = getByLabelText(/document1.pdf/);
        expect(fileCheckbox.props.accessibilityState.checked).toBe(true);
      });
    });

    it('should disable "Use All Files" when session has specific files', async () => {
      mockContextStore.getSessionFiles.mockResolvedValue([mockFiles[0]]);

      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const useAllFilesOption = getByLabelText('Use all files');
        expect(useAllFilesOption.props.accessibilityState.checked).toBe(false);
      });
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when close button is pressed', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const closeButton = getByLabelText('Close file selector');
        fireEvent.press(closeButton);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose after successful save', async () => {
      const { getByLabelText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        const saveButton = getByLabelText('Save file selections');
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no files are uploaded', async () => {
      mockContextStore.fileAttachments = [];

      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('No files uploaded yet')).toBeTruthy();
      });
    });
  });

  describe('File Metadata Display', () => {
    it('should display file type', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('PDF')).toBeTruthy();
        expect(getByText('TXT')).toBeTruthy();
      });
    });

    it('should display file size', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText('1000.0 KB')).toBeTruthy();
        expect(getByText('500.0 KB')).toBeTruthy();
      });
    });

    it('should display upload date', async () => {
      const { getByText } = render(
        <SessionFileSelector sessionId={mockSessionId} onClose={mockOnClose} />
      );

      await waitFor(() => {
        expect(getByText(/Jan 15, 2024/)).toBeTruthy();
        expect(getByText(/Jan 16, 2024/)).toBeTruthy();
      });
    });
  });
});
