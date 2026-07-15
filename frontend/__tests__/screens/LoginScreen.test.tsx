import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

const LocalAuthentication = require('expo-local-authentication');

jest.mock('../../src/notes/encryption', () => ({
  hashPin: jest.fn((pin) => Promise.resolve(`hashed_${pin}`)),
  storeSecureCredential: jest.fn(() => Promise.resolve()),
  getSecureCredential: jest.fn(),
  verifyPin: jest.fn(),
}));

const { getSecureCredential, verifyPin, storeSecureCredential } = require('../../src/notes/encryption');

describe('LoginScreen - Autenticación Híbrida y Fallback de PIN', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── SETUP: Primera vez, sin PIN registrado ────────────────────────────────
  describe('Modo Setup — Sin PIN registrado', () => {
    it('Debe mostrar el modo de registro de PIN si no hay PIN guardado', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
      getSecureCredential.mockResolvedValue(null);

      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(getByText('Definí tu PIN del Bunker')).toBeTruthy();
        expect(getByTestId('pin-input')).toBeTruthy();
      });
    });

    it('Debe guiar al usuario en el flujo de registro con confirmación', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
      getSecureCredential.mockResolvedValue(null);

      const onLoginSuccessMock = jest.fn();
      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      await waitFor(() => expect(getByText('Definí tu PIN del Bunker')).toBeTruthy());

      const input = getByTestId('pin-input');
      const submitButton = getByTestId('pin-submit-button');

      fireEvent.changeText(input, '123456');
      fireEvent.press(submitButton);

      await waitFor(() => expect(getByText('Confirmá tu PIN del Bunker')).toBeTruthy());

      fireEvent.changeText(input, '123456');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(storeSecureCredential).toHaveBeenCalledWith('app_pin_hash', 'hashed_123456');
        expect(onLoginSuccessMock).toHaveBeenCalled();
      });
    });

    it('Debe reiniciar si la confirmación no coincide', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
      getSecureCredential.mockResolvedValue(null);

      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={jest.fn()} />);

      await waitFor(() => expect(getByText('Definí tu PIN del Bunker')).toBeTruthy());

      const input = getByTestId('pin-input');
      const submitButton = getByTestId('pin-submit-button');

      fireEvent.changeText(input, '123456');
      fireEvent.press(submitButton);

      await waitFor(() => expect(getByText('Confirmá tu PIN del Bunker')).toBeTruthy());

      fireEvent.changeText(input, '654321');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Los PINs no coinciden. Intentá de nuevo.')).toBeTruthy();
        expect(getByText('Definí tu PIN del Bunker')).toBeTruthy();
      });
    });
  });

  // ─── MODO BIOMÉTRICO ───────────────────────────────────────────
  describe('Modo Biométrico — Dispositivo con biometría disponible', () => {
    it('Debe requerir configuración de PIN en el primer uso, incluso si la biometría está disponible', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
      
      // Sin PIN en el llavero — NO debe disparar biometría, debe exigir setup de PIN
      getSecureCredential.mockResolvedValue(null);

      const onLoginSuccessMock = jest.fn();
      const { getByText } = render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      await waitFor(() => {
        expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
        expect(getByText('Definí tu PIN del Bunker')).toBeTruthy();
      });
    });

    it('Debe mostrar botón de huella y opción de fallback a PIN', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
      LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
      getSecureCredential.mockResolvedValue('stored_hash_123456');

      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(getByTestId('biometric-trigger-button')).toBeTruthy();
        expect(getByText('Preferís usar tu PIN →')).toBeTruthy();
      });
    });

    it('Debe cambiar a modo PIN al presionar "Preferís usar tu PIN"', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(3);
      LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
      getSecureCredential.mockResolvedValue('stored_hash_123456');

      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={jest.fn()} />);

      await waitFor(() => expect(getByText('Preferís usar tu PIN →')).toBeTruthy());

      fireEvent.press(getByText('Preferís usar tu PIN →'));

      await waitFor(() => {
        expect(getByText('Ingresá tu PIN del Bunker')).toBeTruthy();
        expect(getByTestId('pin-input')).toBeTruthy();
      });
    });
  });

  // ─── MODO PIN ──────────────────────────────────────────────────────────────
  describe('Modo PIN — Sin biometría pero con PIN registrado', () => {
    it('Debe solicitar el PIN e iniciar sesión si es correcto', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
      getSecureCredential.mockResolvedValue('stored_hash_123456');
      verifyPin.mockResolvedValue(true);

      const onLoginSuccessMock = jest.fn();
      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={onLoginSuccessMock} />);

      await waitFor(() => expect(getByText('Ingresá tu PIN del Bunker')).toBeTruthy());

      fireEvent.changeText(getByTestId('pin-input'), '123456');
      fireEvent.press(getByTestId('pin-submit-button'));

      await waitFor(() => {
        expect(verifyPin).toHaveBeenCalledWith('123456', 'stored_hash_123456', 'stored_hash_123456');
        expect(onLoginSuccessMock).toHaveBeenCalled();
      });
    });

    it('Debe mostrar error si el PIN es incorrecto', async () => {
      LocalAuthentication.getEnrolledLevelAsync.mockResolvedValue(0);
      getSecureCredential.mockResolvedValue('stored_hash_123456');
      verifyPin.mockResolvedValue(false);

      const { getByText, getByTestId } = render(<LoginScreen onLoginSuccess={jest.fn()} />);

      await waitFor(() => expect(getByText('Ingresá tu PIN del Bunker')).toBeTruthy());

      fireEvent.changeText(getByTestId('pin-input'), '999999');
      fireEvent.press(getByTestId('pin-submit-button'));

      await waitFor(() => {
        expect(getByText('PIN incorrecto. Intentá de nuevo.')).toBeTruthy();
      });
    });
  });
});
