// Mocks de fuentes antes de importar App.tsx para evitar colisiones nativas de Expo
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true],
  Inter_400Regular: {},
  Inter_600SemiBold: {},
}));
jest.mock('@expo-google-fonts/roboto', () => ({
  Roboto_400Regular: {},
  Roboto_700Bold: {},
}));
jest.mock('@expo-google-fonts/space-mono', () => ({
  SpaceMono_400Regular: {},
}));
jest.mock('expo-font', () => ({
  loadAsync: () => Promise.resolve(),
  isLoaded: () => true,
}));
jest.mock('expo-av', () => ({
  Audio: {
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue({}),
      startAsync: jest.fn().mockResolvedValue({}),
      stopAndUnloadAsync: jest.fn().mockResolvedValue({}),
      getURI: jest.fn().mockReturnValue('mock-audio-uri.m4a'),
    })),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          pauseAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setOnPlaybackStatusUpdate: jest.fn(),
        }
      }),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue({}),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  }
}));
jest.mock('react-native-pell-rich-editor', () => {
  const React = require('react');
  return {
    RichEditor: (props: any) => React.createElement('View', props),
    RichToolbar: (props: any) => React.createElement('View', props),
    actions: {},
  };
});
jest.mock('react-native-render-html', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(Text, null, props.source?.html || ''),
  };
});
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));
jest.mock('expo-linking', () => ({
  parse: jest.fn(() => ({ hostname: '', path: '', queryParams: {} })),
  useURL: jest.fn(() => null),
}));
jest.mock('expo-share-intent', () => ({
  useShareIntent: jest.fn(() => ({
    hasShareIntent: false,
    shareIntent: { value: '' },
    resetShareIntent: jest.fn(),
  })),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppContent } from '../../App';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import NoteModel from '../../src/database/Note';

// Mock de expo-local-authentication para controlarlo localmente
const LocalAuthentication = require('expo-local-authentication');

// Mock del servicio de cifrado para simplificar el test
jest.mock('../../src/notes/encryption', () => ({
  encryption: {
    encrypt: jest.fn((text) => `encrypted_${text}`),
    decrypt: jest.fn((text) => text.replace('encrypted_', '')),
    setSessionKey: jest.fn(),
    clearSessionKey: jest.fn(),
    hasSessionKey: jest.fn(() => true),
  },
  hashPin: jest.fn((pin) => Promise.resolve(`hashed_${pin}`)),
  storeSecureCredential: jest.fn(() => Promise.resolve()),
  getSecureCredential: jest.fn((key) => {
    if (key === 'app_user_pin') return Promise.resolve('123456');
    if (key === 'app_encryption_salt') return Promise.resolve('test-salt');
    return Promise.resolve('hashed_123456');
  }),
  verifyPin: jest.fn((pin, hash) => Promise.resolve(hash === `hashed_${pin}`)),
}));

describe('Auditoría del Flujo Biométrico — Prevención de Borrado Accidental', () => {
  let mockNotes: NoteModel[];
  let secureNote: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    secureNote = {
      id: 'secure-note-1',
      title: 'Mi Nota Segura',
      content: 'encrypted_Contenido ultra secreto',
      isSecure: true,
      isMarked: false,
      audioUri: '',
      color: 'default',
      illustration: 'none',
      destroyPermanently: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
    };

    mockNotes = [secureNote as any];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GIVEN: El usuario interactúa con una nota segura', () => {
    
    it('THEN: Al presionar la nota y autenticarse con éxito, se abre en modo lectura', async () => {
      // 1. Mock de LoginScreen exitoso para entrar al feed
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
      LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true }); // Login

      const { getByText, queryByText } = render(
        <ThemeProvider>
          <AppContent notes={mockNotes} />
        </ThemeProvider>
      );

      // Entrar al dashboard pasando login
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Validar que vemos la nota segura en la lista
      await waitFor(() => {
        expect(getByText('Mi Nota Segura')).toBeTruthy();
      });

      // Configurar biometría exitosa para la apertura de nota
      LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true }); // Apertura

      // 2. Presionar la nota
      fireEvent.press(getByText('Mi Nota Segura'));

      // Avanzar timers para disparar tryBiometricAuth del setTimeout
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Esperar a que se muestre el visor de la nota desencriptada
      await waitFor(() => {
        // En App.tsx, cuando se abre el visor, se renderiza el contenido
        expect(getByText('Contenido ultra secreto')).toBeTruthy();
      });

      // La nota no se debe haber borrado
      expect(secureNote.destroyPermanently).not.toHaveBeenCalled();
    });

    it('THEN: Si se cancela la eliminación y luego se abre, NO debe ocurrir el borrado (Race Condition)', async () => {
      // 1. Mock de LoginScreen exitoso
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
      LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true }); // Login

      const { getByText, queryByText } = render(
        <ThemeProvider>
          <AppContent notes={mockNotes} />
        </ThemeProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Mi Nota Segura')).toBeTruthy();
      });

      // Simular Long Press para abrir diálogo de opciones de eliminación
      // En App.tsx, handleNoteLongPress abre un Alert.alert.
      // Mockear Alert.alert para presionar "Eliminar" e iniciar el flujo de autenticación de borrado
      const { Alert } = require('react-native');
      const alertSpy = jest.spyOn(Alert, 'alert');

      // 2. Hacemos long press en la tarjeta
      fireEvent(getByText('Mi Nota Segura'), 'onLongPress');

      // Verificar que el Alert se disparó
      expect(alertSpy).toHaveBeenCalled();

      // Obtener el botón de "Eliminar" del spy del Alert
      const alertButtons = alertSpy.mock.calls[0][2] as any;
      const deleteButton = alertButtons?.find((b: any) => b.text === 'Eliminar');

      // Simular que la biometría nativa se cancela al intentar borrar
      LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });

      // Ejecutar el callback del botón "Eliminar"
      await act(async () => {
        deleteButton?.onPress();
      });

      // Avanzar timers para tryBiometricAuth del setTimeout
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Verificamos que la nota NO fue destruida todavía
      expect(secureNote.destroyPermanently).not.toHaveBeenCalled();

      // 3. Ahora el usuario presiona la nota normalmente para abrirla
      // Para simular la race condition en el componente sin el fix,
      // al llamar a handleNotePress se setea authAction a 'open', pero
      // el setTimeout de la biometría captura la variable de estado vieja 'delete'.
      
      // Mockear que la biometría es exitosa para la apertura
      LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true });

      // Presionar para abrir
      fireEvent.press(getByText('Mi Nota Segura'));

      // Disparar tryBiometricAuth
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Si el fix NO está aplicado, la nota se borrará. Si ESTÁ aplicado, la nota se abrirá.
      // Verificamos que la nota NO se eliminó
      expect(secureNote.destroyPermanently).not.toHaveBeenCalled();

      // Verificamos que el visor de la nota se abrió mostrando el contenido desencriptado
      await waitFor(() => {
        expect(getByText('Contenido ultra secreto')).toBeTruthy();
      });
    });

  });
});
