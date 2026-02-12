/**
 * Theme Context and Provider
 * 
 * Centralized theme management with persistent storage.
 * Allows users to override system theme preference.
 * DEFAULT: Light theme
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@north/theme_preference';

type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  setTheme: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  activeTheme: 'light',
  setTheme: async () => {},
  isLoading: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  const activeTheme: ActiveTheme = 
    themeMode === 'system' 
      ? (systemColorScheme || 'light') as ActiveTheme
      : themeMode;

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setThemeMode('system');
      });
      return () => subscription.remove();
    }
  }, [themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('[Theme] Error loading preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeMode(mode);
      console.log('[Theme] Theme changed to:', mode);
    } catch (error) {
      console.error('[Theme] Error saving preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useIsDark(): boolean {
  const { activeTheme } = useTheme();
  return activeTheme === 'dark';
}

export function useThemeColors() {
  const isDark = useIsDark();
  
  return {
    background: isDark ? '#09090B' : '#FFFFFF',
    backgroundSecondary: isDark ? '#18181B' : '#F9FAFB',
    backgroundTertiary: isDark ? '#27272A' : '#F4F4F5',
    surface: isDark ? '#18181B' : '#FFFFFF',
    surfaceHover: isDark ? '#27272A' : '#F9FAFB',
    text: isDark ? '#FAFAFA' : '#09090B',
    textSecondary: isDark ? '#A1A1AA' : '#71717A',
    textTertiary: isDark ? '#71717A' : '#A1A1AA',
    border: isDark ? '#27272A' : '#E4E4E7',
    borderSecondary: isDark ? '#3F3F46' : '#D4D4D8',
    primary: isDark ? '#3B82F6' : '#2563EB',
    primaryHover: isDark ? '#2563EB' : '#1D4ED8',
    success: isDark ? '#10B981' : '#059669',
    error: isDark ? '#EF4444' : '#DC2626',
    warning: isDark ? '#F59E0B' : '#D97706',
    card: isDark ? '#18181B' : '#FFFFFF',
    input: isDark ? '#27272A' : '#F4F4F5',
    messageSent: isDark ? '#3B82F6' : '#09090B',
    messageReceived: isDark ? '#27272A' : '#F4F4F5',
    messageTextSent: isDark ? '#FFFFFF' : '#FFFFFF',
    messageTextReceived: isDark ? '#FAFAFA' : '#09090B',
  };
}
