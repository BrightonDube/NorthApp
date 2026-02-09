/**
 * Deep Linking Utilities
 * 
 * Handles deep link parsing and navigation for the North app.
 * Supports the following URL schemes:
 * - north://chat/{coachId} - Open specific coach chat
 * - north://context - Open context management
 * - north://settings - Open settings
 * - northapp://coach/install/{coachId} - Install a shared coach
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { coachDeepLinkHandler } from './coachDeepLinkHandler';

export interface DeepLinkRoute {
  screen: string;
  params?: Record<string, string>;
}

/**
 * Parse a deep link URL into a route object
 * @param url - The deep link URL to parse
 * @returns Parsed route or null if invalid
 */
export function parseDeepLink(url: string): DeepLinkRoute | null {
  try {
    // Handle northapp:// scheme for coach installation
    if (url && url.startsWith('northapp://coach/install/')) {
      const coachId = coachDeepLinkHandler.parseCoachId(url);
      if (coachId) {
        return {
          screen: '/coach/preview/[coachId]',
          params: { coachId },
        };
      }
      return null;
    }

    // Simple URL parsing for north:// scheme
    if (!url || !url.startsWith('north://')) {
      return null;
    }

    // Remove scheme
    const withoutScheme = url.replace('north://', '');
    
    // Split into parts
    const parts = withoutScheme.split('/').filter(p => p.length > 0);
    
    if (parts.length === 0) {
      return null;
    }

    const [screen, ...rest] = parts;

    // Handle north://chat/{coachId}
    if (screen === 'chat' && rest.length > 0) {
      const coachId = rest.join('/'); // Handle coach IDs with slashes
      return {
        screen: 'chat/[coachId]',
        params: { coachId },
      };
    }

    // Handle north://context
    if (screen === 'context') {
      return {
        screen: '(tabs)/context',
        params: {},
      };
    }

    // Handle north://settings
    if (screen === 'settings') {
      return {
        screen: '(tabs)/settings',
        params: {},
      };
    }

    // Invalid deep link
    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
}

/**
 * Navigate to a deep link route
 * @param route - The parsed route to navigate to
 */
export function navigateToDeepLink(route: DeepLinkRoute): void {
  try {
    if (route.params && Object.keys(route.params).length > 0) {
      // Navigate with params
      router.push({
        pathname: route.screen as any,
        params: route.params,
      });
    } else {
      // Navigate without params
      router.push(route.screen as any);
    }
  } catch (error) {
    console.error('Error navigating to deep link:', error);
    // Fallback to home screen
    router.replace('/(tabs)');
  }
}

/**
 * Handle a deep link URL
 * @param url - The deep link URL to handle
 * @returns true if handled successfully, false otherwise
 */
export function handleDeepLink(url: string | null): boolean {
  if (!url) return false;

  const route = parseDeepLink(url);
  if (!route) {
    console.warn('Invalid deep link:', url);
    // Fallback to home screen for invalid links
    router.replace('/(tabs)');
    return false;
  }

  navigateToDeepLink(route);
  return true;
}

/**
 * Get the initial deep link URL when the app is opened
 * @returns The initial URL or null
 */
export async function getInitialDeepLink(): Promise<string | null> {
  try {
    return await Linking.getInitialURL();
  } catch (error) {
    console.error('Error getting initial URL:', error);
    return null;
  }
}

/**
 * Create a deep link URL for a specific route
 * @param screen - The screen to link to
 * @param params - Optional parameters
 * @returns The deep link URL
 */
export function createDeepLink(screen: string, params?: Record<string, string>): string {
  const prefix = 'north://';
  
  switch (screen) {
    case 'chat':
      if (params?.coachId) {
        return `${prefix}chat/${params.coachId}`;
      }
      return `${prefix}chat`;
    case 'context':
      return `${prefix}context`;
    case 'settings':
      return `${prefix}settings`;
    case 'coach/install':
      if (params?.coachId) {
        return `northapp://coach/install/${params.coachId}`;
      }
      return 'northapp://coach/install';
    default:
      return prefix;
  }
}
