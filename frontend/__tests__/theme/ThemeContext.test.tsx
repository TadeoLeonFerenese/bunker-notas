import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from '../../src/theme/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';

// Mock FileSystem to verify persistence
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-directory/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

const ThemeTestConsumer = () => {
  const { theme, setTheme, COLORS, isDark, customBackground, setCustomBackground } = useTheme();
  return (
    <View>
      <Text testID="theme-text">{theme}</Text>
      <Text testID="dark-text">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="bg-color">{COLORS.bunkerBg}</Text>
      <Text testID="bg-image">{customBackground || 'none'}</Text>
      <TouchableOpacity testID="change-btn" onPress={() => setTheme('emerald')}>
        <Text>Change to Emerald</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="bg-btn" onPress={() => setCustomBackground('file:///temp/my_image.jpg')}>
        <Text>Set Custom BG</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="bg-clear-btn" onPress={() => setCustomBackground(null)}>
        <Text>Clear BG</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('ThemeContext & ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1680000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('provides default theme (classic) and matches palettes', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeTestConsumer />
      </ThemeProvider>
    );

    // Default theme should be classic
    expect(getByTestId('theme-text').props.children).toBe('classic');
  });

  it('allows changing theme and calls FileSystem to persist', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeTestConsumer />
      </ThemeProvider>
    );

    const btn = getByTestId('change-btn');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(getByTestId('theme-text').props.children).toBe('emerald');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///mock-directory/theme_preference.txt',
      'emerald'
    );
  });

  it('allows changing background image and calls FileSystem.copyAsync to persist', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeTestConsumer />
      </ThemeProvider>
    );

    expect(getByTestId('bg-image').props.children).toBe('none');

    const btn = getByTestId('bg-btn');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(getByTestId('bg-image').props.children).toBe('file:///mock-directory/custom_background_1680000000000.jpg');
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///temp/my_image.jpg',
      to: 'file:///mock-directory/custom_background_1680000000000.jpg',
    });
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///mock-directory/background_preference.txt',
      'file:///mock-directory/custom_background_1680000000000.jpg'
    );
  });

  it('allows clearing background image and calls FileSystem.deleteAsync to clean up', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    let savedPref = '';
    (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation((file, content) => {
      if (file.endsWith('background_preference.txt')) {
        savedPref = content;
      }
      return Promise.resolve();
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockImplementation((file) => {
      if (file.endsWith('background_preference.txt')) {
        return Promise.resolve(savedPref);
      }
      return Promise.resolve('');
    });

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeTestConsumer />
      </ThemeProvider>
    );

    // Set it first
    await act(async () => {
      fireEvent.press(getByTestId('bg-btn'));
    });

    // Clear it
    const clearBtn = getByTestId('bg-clear-btn');
    await act(async () => {
      fireEvent.press(clearBtn);
    });

    expect(getByTestId('bg-image').props.children).toBe('none');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///mock-directory/background_preference.txt',
      { idempotent: true }
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///mock-directory/custom_background_1680000000000.jpg',
      { idempotent: true }
    );
  });
});
