/**
 * Offline Message Tests
 * 
 * Tests that network actions show appropriate offline messages
 * when the device is offline.
 * 
 * Validates: Requirements 16.2
 */

import { useContextStore } from '../contextStore';
import { useCoachStore } from '../coachStore';
import { useChatStore } from '../chatStore';
import { useNetworkStore } from '../networkStore';

// Mock the networkStore
jest.mock('../networkStore', () => ({
  useNetworkStore: {
    getState: jest.fn(),
  },
}));

describe('Offline Message Handling', () => {
  beforeEach(() => {
    // Reset all stores
    useContextStore.getState().reset();
    useCoachStore.getState().reset();
    useChatStore.getState().reset();
  });

  describe('contextStore offline messages', () => {
    it('should show offline message when fetching contexts while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await useContextStore.getState().fetchContexts();

      const { error } = useContextStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when creating context while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useContextStore.getState().createContext('values', 'Test value')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useContextStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when updating context while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useContextStore.getState().updateContext('test-id', 'Updated content')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useContextStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when deleting context while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useContextStore.getState().deleteContext('test-id')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useContextStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });
  });

  describe('coachStore offline messages', () => {
    it('should show offline message when fetching coaches while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await useCoachStore.getState().fetchCoaches();

      const { error } = useCoachStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when creating coach while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useCoachStore.getState().createCoach('Test Coach', '🚀', 'Test prompt')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useCoachStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when updating coach while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useCoachStore.getState().updateCoach('test-id', { name: 'Updated Name' })
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useCoachStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when deleting coach while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useCoachStore.getState().deleteCoach('test-id')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useCoachStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });
  });

  describe('chatStore offline messages', () => {
    it('should show offline message when fetching or creating session while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useChatStore.getState().fetchOrCreateSession('coach-id')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useChatStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when fetching messages while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await useChatStore.getState().fetchMessages('session-id');

      const { error } = useChatStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });

    it('should show offline message when sending message while offline', async () => {
      // Mock offline state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: false });

      await expect(
        useChatStore.getState().sendMessage('session-id', 'coach-id', 'Test message')
      ).rejects.toThrow("You're offline. Please check your connection.");

      const { error } = useChatStore.getState();
      expect(error).toBe("You're offline. Please check your connection.");
    });
  });

  describe('online state allows operations', () => {
    it('should not show offline message when online', async () => {
      // Mock online state
      (useNetworkStore.getState as jest.Mock).mockReturnValue({ isOnline: true });

      // This will fail for other reasons (no supabase mock), but should not show offline error
      try {
        await useContextStore.getState().fetchContexts();
      } catch (error) {
        // Ignore other errors
      }

      const { error } = useContextStore.getState();
      expect(error).not.toBe("You're offline. Please check your connection.");
    });
  });
});
