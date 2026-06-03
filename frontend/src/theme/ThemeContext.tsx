import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as NavigationBar from 'expo-navigation-bar';

const THEME_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}theme_preference.txt` : '';
const BACKGROUND_PREF_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}background_preference.txt` : '';
const CUSTOM_BG_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}custom_background.jpg` : '';

export type ThemeType = 'classic' | 'classic_dark' | 'emerald' | 'light' | 'dark';

export interface ThemeColors {
  bunkerBg: string;
  bunkerDark: string;
  bunkerAccent: string;
  bunkerGray: string;
  surface: string;
  border: string;
  textMuted: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  secureBg: string;
  accent: string;
  fontFamily: string;
}

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  COLORS: ThemeColors;
  isDark: boolean;
  customBackground: string | null;
  setCustomBackground: (uri: string | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const THEME_PALETTES: Record<ThemeType, { dark: ThemeColors; light: ThemeColors }> = {
  classic_dark: {
    dark: {
      bunkerBg: '#212529',
      bunkerDark: '#F8F9FA',
      bunkerAccent: '#E94560',
      bunkerGray: '#868E96',
      surface: '#343A40',
      border: '#495057',
      textMuted: '#6C757D',
      cardBg: '#343A40',
      text: '#F8F9FA',
      textSecondary: '#CED4DA',
      secureBg: '#4A1D24',
      accent: '#E94560',
      fontFamily: 'Inter_400Regular',
    },
    light: {
      bunkerBg: '#212529',
      bunkerDark: '#F8F9FA',
      bunkerAccent: '#E94560',
      bunkerGray: '#868E96',
      surface: '#343A40',
      border: '#495057',
      textMuted: '#6C757D',
      cardBg: '#343A40',
      text: '#F8F9FA',
      textSecondary: '#CED4DA',
      secureBg: '#4A1D24',
      accent: '#E94560',
      fontFamily: 'Inter_400Regular',
    },
  },
  classic: {
    dark: {
      bunkerBg: '#1A202C',
      bunkerDark: '#F8F9FA',
      bunkerAccent: '#E94560',
      bunkerGray: '#A0AEC0',
      surface: '#2D3748',
      border: '#4A5568',
      textMuted: '#718096',
      cardBg: '#2D3748',
      text: '#F8F9FA',
      textSecondary: '#A0AEC0',
      secureBg: '#3D2A2A',
      accent: '#E94560',
      fontFamily: 'Inter_400Regular',
    },
    light: {
      bunkerBg: '#F8F9FA',
      bunkerDark: '#1A202C',
      bunkerAccent: '#E94560',
      bunkerGray: '#718096',
      surface: '#ffffff',
      border: '#e9ecef',
      textMuted: '#A0AEC0',
      cardBg: '#ffffff',
      text: '#1A202C',
      textSecondary: '#718096',
      secureBg: '#fff5f5',
      accent: '#E94560',
      fontFamily: 'Inter_400Regular',
    },
  },
  emerald: {
    dark: {
      bunkerBg: '#022C22',
      bunkerDark: '#F0FDF4',
      bunkerAccent: '#10B981',
      bunkerGray: '#9CA3AF',
      surface: '#065F46',
      border: '#047857',
      textMuted: '#6EE7B7',
      cardBg: '#065F46',
      text: '#F0FDF4',
      textSecondary: '#A7F3D0',
      secureBg: '#3B1A1A',
      accent: '#10B981',
      fontFamily: 'Roboto_400Regular',
    },
    light: {
      bunkerBg: '#F0FDF4',
      bunkerDark: '#064E3B',
      bunkerAccent: '#059669',
      bunkerGray: '#6B7280',
      surface: '#ffffff',
      border: '#D1FAE5',
      textMuted: '#047857',
      cardBg: '#ffffff',
      text: '#064E3B',
      textSecondary: '#047857',
      secureBg: '#FEF2F2',
      accent: '#059669',
      fontFamily: 'Roboto_400Regular',
    },
  },
  cyberpunk: {
    dark: {
      bunkerBg: '#0C0A0F',
      bunkerDark: '#00FFFF',
      bunkerAccent: '#FF007F',
      bunkerGray: '#9CA3AF',
      surface: '#1A0F2B',
      border: '#3D0066',
      textMuted: '#C084FC',
      cardBg: '#1A0F2B',
      text: '#00FFFF',
      textSecondary: '#D8B4FE',
      secureBg: '#2D0A1A',
      accent: '#FF007F',
      fontFamily: 'SpaceMono_400Regular',
    },
    light: {
      bunkerBg: '#FAF5FF',
      bunkerDark: '#2E0854',
      bunkerAccent: '#D946EF',
      bunkerGray: '#718096',
      surface: '#ffffff',
      border: '#F3E8FF',
      textMuted: '#8B5CF6',
      cardBg: '#ffffff',
      text: '#2E0854',
      textSecondary: '#8B5CF6',
      secureBg: '#FFF1F2',
      accent: '#D946EF',
      fontFamily: 'SpaceMono_400Regular',
    },
  },
  light: {
    dark: {
      bunkerBg: '#FFFFFF',
      bunkerDark: '#000000',
      bunkerAccent: '#007AFF',
      bunkerGray: '#8E8E93',
      surface: '#F2F2F7',
      border: '#C6C6C8',
      textMuted: '#8E8E93',
      cardBg: '#F2F2F7',
      text: '#000000',
      textSecondary: '#3A3A3C',
      secureBg: '#E5F1FF',
      accent: '#007AFF',
      fontFamily: 'Inter_400Regular',
    },
    light: {
      bunkerBg: '#FFFFFF',
      bunkerDark: '#000000',
      bunkerAccent: '#007AFF',
      bunkerGray: '#8E8E93',
      surface: '#F2F2F7',
      border: '#C6C6C8',
      textMuted: '#8E8E93',
      cardBg: '#F2F2F7',
      text: '#000000',
      textSecondary: '#3A3A3C',
      secureBg: '#E5F1FF',
      accent: '#007AFF',
      fontFamily: 'Inter_400Regular',
    },
  },
  dark: {
    dark: {
      bunkerBg: '#000000',
      bunkerDark: '#FFFFFF',
      bunkerAccent: '#0A84FF',
      bunkerGray: '#8E8E93',
      surface: '#1C1C1E',
      border: '#38383A',
      textMuted: '#8E8E93',
      cardBg: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#EBEBF5',
      secureBg: '#002B5C',
      accent: '#0A84FF',
      fontFamily: 'Inter_400Regular',
    },
    light: {
      bunkerBg: '#000000',
      bunkerDark: '#FFFFFF',
      bunkerAccent: '#0A84FF',
      bunkerGray: '#8E8E93',
      surface: '#1C1C1E',
      border: '#38383A',
      textMuted: '#8E8E93',
      cardBg: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#EBEBF5',
      secureBg: '#002B5C',
      accent: '#0A84FF',
      fontFamily: 'Inter_400Regular',
    },
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('classic');
  const [customBackground, setCustomBackgroundState] = useState<string | null>(null);
  const isDark = systemColorScheme === 'dark' || theme === 'dark' || theme === 'classic_dark'; 

  useEffect(() => {
    const loadTheme = async () => {
      try {
        console.log('[ThemeContext] loadTheme starting...');
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem('theme_preference') as ThemeType;
            if (saved && THEME_PALETTES[saved]) {
              setThemeState(saved);
            }
            const savedBg = window.localStorage.getItem('background_preference');
            setCustomBackgroundState(savedBg);
          }
          return;
        }
        if (THEME_FILE) {
          const info = await FileSystem.getInfoAsync(THEME_FILE);
          if (info.exists) {
            const saved = (await FileSystem.readAsStringAsync(THEME_FILE)) as ThemeType;
            if (saved && THEME_PALETTES[saved]) {
              setThemeState(saved);
            }
          }
        }
        console.log('[ThemeContext] loadTheme: BACKGROUND_PREF_FILE path:', BACKGROUND_PREF_FILE);
        if (BACKGROUND_PREF_FILE) {
          const info = await FileSystem.getInfoAsync(BACKGROUND_PREF_FILE);
          console.log('[ThemeContext] loadTheme: BACKGROUND_PREF_FILE exists:', info.exists);
          if (info.exists) {
            const savedBg = await FileSystem.readAsStringAsync(BACKGROUND_PREF_FILE);
            console.log('[ThemeContext] loadTheme: savedBg path in pref:', savedBg);
            if (savedBg) {
              const imgInfo = await FileSystem.getInfoAsync(savedBg);
              console.log('[ThemeContext] loadTheme: savedBg file exists on disk:', imgInfo.exists);
              if (imgInfo.exists) {
                console.log('[ThemeContext] loadTheme: Setting custom background state to:', savedBg);
                setCustomBackgroundState(savedBg);
              }
            }
          }
        }
      } catch (e) {
        console.error('[ThemeContext] Error loading theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('theme_preference', newTheme);
        }
        return;
      }
      if (THEME_FILE) {
        await FileSystem.writeAsStringAsync(THEME_FILE, newTheme);
      }
    } catch (e) {
      console.error('Error saving theme preference', e);
    }
  };

  const setCustomBackground = async (uri: string | null) => {
    try {
      console.log('[ThemeContext] setCustomBackground called with uri:', uri);
      console.log('[ThemeContext] BACKGROUND_PREF_FILE path:', BACKGROUND_PREF_FILE);
      console.log('[ThemeContext] FileSystem.documentDirectory path:', FileSystem.documentDirectory);

      if (Platform.OS === 'web') {
        if (uri) {
          setCustomBackgroundState(uri);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('background_preference', uri);
          }
        } else {
          setCustomBackgroundState(null);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('background_preference');
          }
        }
        return;
      }

      // Native Platform
      let oldBgFile: string | null = null;
      if (BACKGROUND_PREF_FILE) {
        const prefInfo = await FileSystem.getInfoAsync(BACKGROUND_PREF_FILE);
        console.log('[ThemeContext] BACKGROUND_PREF_FILE exists:', prefInfo.exists);
        if (prefInfo.exists) {
          oldBgFile = await FileSystem.readAsStringAsync(BACKGROUND_PREF_FILE);
          console.log('[ThemeContext] Old background file path:', oldBgFile);
        }
      }

      if (!uri) {
        console.log('[ThemeContext] Clearing custom background...');
        // Clear background
        setCustomBackgroundState(null);
        if (oldBgFile) {
          const oldInfo = await FileSystem.getInfoAsync(oldBgFile);
          console.log('[ThemeContext] Old image file exists:', oldInfo.exists);
          if (oldInfo.exists) {
            await FileSystem.deleteAsync(oldBgFile, { idempotent: true });
            console.log('[ThemeContext] Old image file deleted.');
          }
        }
        if (BACKGROUND_PREF_FILE) {
          await FileSystem.deleteAsync(BACKGROUND_PREF_FILE, { idempotent: true });
          console.log('[ThemeContext] BACKGROUND_PREF_FILE deleted.');
        }
        return;
      }

      // Set new background
      if (BACKGROUND_PREF_FILE && FileSystem.documentDirectory) {
        const newBgFile = `${FileSystem.documentDirectory}custom_background_${Date.now()}.jpg`;
        console.log('[ThemeContext] Copying image from:', uri, 'to:', newBgFile);
        await FileSystem.copyAsync({
          from: uri,
          to: newBgFile,
        });
        console.log('[ThemeContext] Write path in BACKGROUND_PREF_FILE:', newBgFile);
        await FileSystem.writeAsStringAsync(BACKGROUND_PREF_FILE, newBgFile);
        
        // Delete old file if it exists
        if (oldBgFile && oldBgFile !== newBgFile) {
          const oldInfo = await FileSystem.getInfoAsync(oldBgFile);
          console.log('[ThemeContext] Checking old file to delete:', oldBgFile, 'Exists:', oldInfo.exists);
          if (oldInfo.exists) {
            await FileSystem.deleteAsync(oldBgFile, { idempotent: true });
            console.log('[ThemeContext] Old file deleted.');
          }
        }

        console.log('[ThemeContext] Calling setCustomBackgroundState with:', newBgFile);
        setCustomBackgroundState(newBgFile);
      } else {
        console.warn('[ThemeContext] BACKGROUND_PREF_FILE or documentDirectory is empty!');
      }
    } catch (e) {
      console.error('[ThemeContext] Error setting custom background', e);
      throw e;
    }
  };

  const COLORS = THEME_PALETTES[theme][isDark ? 'dark' : 'light'];

  useEffect(() => {
    const updateAndroidNavBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setBackgroundColorAsync(COLORS.bunkerBg);
          await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        } catch (e) {
          console.error('[ThemeContext] Error setting navigation bar color', e);
        }
      }
    };
    updateAndroidNavBar();
  }, [COLORS.bunkerBg, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, COLORS, isDark, customBackground, setCustomBackground }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
