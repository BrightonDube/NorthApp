/**
 * Theme Context and Provider
 * 
 * Centralized theme management with persistent storage.
 * Allows users to override system theme preference.
 * DEFAULT: Light theme
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme, Appearance, View } from 'react-native';
import { useColorScheme } from 'nativewind';
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
  const { setColorScheme } = useColorScheme();

  const activeTheme: ActiveTheme = 
    themeMode === 'system' 
      ? (systemColorScheme || 'light') as ActiveTheme
      : themeMode;

  useEffect(() => {
    loadThemePreference();
  }, []);

  // Apply theme to NativeWind whenever activeTheme changes
  useEffect(() => {
    setColorScheme(activeTheme);
  }, [activeTheme, setColorScheme]);

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
    background: isDark ? '#1A1816' : '#FAFAF9',
    backgroundSecondary: isDark ? '#252220' : '#F5F5F4',
    backgroundTertiary: isDark ? '#332F2B' : '#E7E5E4',
    surface: isDark ? '#252220' : '#F5F5F4',
    surfaceHover: isDark ? '#332F2B' : '#E7E5E4',
    text: isDark ? '#FAFAF9' : '#1C1917',
    textSecondary: isDark ? '#A8A29E' : '#78716C',
    textTertiary: isDark ? '#78716C' : '#A8A29E',
    border: isDark ? '#332F2B' : '#E7E5E4',
    borderSecondary: isDark ? '#44403C' : '#D6D3D1',
    primary: isDark ? '#60A5FA' : '#3B82F6',
    primaryHover: isDark ? '#3B82F6' : '#2563EB',
    success: isDark ? '#10B981' : '#059669',
    error: isDark ? '#EF4444' : '#DC2626',
    warning: isDark ? '#F59E0B' : '#D97706',
    card: isDark ? '#252220' : '#F5F5F4',
    input: isDark ? '#332F2B' : '#E7E5E4',
    inputText: isDark ? '#FAFAF9' : '#1C1917',
    inputPlaceholder: isDark ? '#78716C' : '#A8A29E',
    primaryText: '#FFFFFF',
    messageSent: isDark ? '#332F2B' : '#292524',
    messageReceived: isDark ? '#252220' : '#E7E5E4',
    messageTextSent: isDark ? '#FAFAF9' : '#FAFAF9',
    messageTextReceived: isDark ? '#FAFAF9' : '#1C1917',
  };
}
