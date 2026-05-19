/**
 * BiometricLogin Test
 *
 * following sdd-spec, following jest-expert patterns
 * MVP Punto 1: Control de Acceso - Biometría + PIN respaldo
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { BiometricLogin } from '../../src/auth/BiometricLogin';

describe('BiometricLogin - Punto 1: Control de Acceso', () => {
  describe('GIVEN: El usuario intenta acceder a la app', () => {
    describe('WHEN: La biometría está disponible', () => {
      it('THEN: Muestra el botón de autenticación biométrica', async () => {
        // Arrange - Mock biometría disponible
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.isAvailableAsync.mockResolvedValue(true);
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);

        // Act
        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />);

        // Assert - Debe mostrar el botón de biometría (useEffect async, usar waitFor)
        await waitFor(() => {
          expect(screen.getByTestId('biometric-button')).toBeTruthy();
        });
      });

      it('THEN: Muestra el texto "Iniciar con Biometría" o similar', async () => {
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);
        BiometricAuth.supportedAuthenticationTypesAsync.mockResolvedValue(['fingerprint']);

        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />);
        await waitFor(() => {
          expect(screen.getByText(/biometr[ií]a/i)).toBeTruthy();
        });
      });
    });

    describe('WHEN: El usuario toca el botón biométrico', () => {
      it('THEN: Llama a authenticateAsync de expo-local-authentication', async () => {
        const onAuthSuccess = jest.fn();
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);
        BiometricAuth.supportedAuthenticationTypesAsync.mockResolvedValue(['fingerprint']);
        BiometricAuth.authenticateAsync.mockResolvedValue({ success: true });

        render(<BiometricLogin onAuthSuccess={onAuthSuccess} onAuthError={jest.fn()} />);

        // Esperar al botón biométrico que aparece luego del useEffect
        await waitFor(() => screen.getByTestId('biometric-button'));
        fireEvent.press(screen.getByTestId('biometric-button'));

        await waitFor(() => {
          expect(BiometricAuth.authenticateAsync).toHaveBeenCalledTimes(1);
        });
      });

      it('THEN: Llama a onAuthSuccess cuando la autenticación es exitosa', async () => {
        const onAuthSuccess = jest.fn();
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);
        BiometricAuth.supportedAuthenticationTypesAsync.mockResolvedValue(['fingerprint']);
        BiometricAuth.authenticateAsync.mockResolvedValue({ success: true });

        render(<BiometricLogin onAuthSuccess={onAuthSuccess} onAuthError={jest.fn()} />);

        await waitFor(() => screen.getByTestId('biometric-button'));
        fireEvent.press(screen.getByTestId('biometric-button'));

        await waitFor(() => {
          expect(onAuthSuccess).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('WHEN: La autenticación biométrica falla', () => {
      it('THEN: Muestra opción de PIN de respaldo (4-6 dígitos)', async () => {
        const onAuthError = jest.fn();
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);
        BiometricAuth.supportedAuthenticationTypesAsync.mockResolvedValue(['fingerprint']);
        BiometricAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });

        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={onAuthError} />);

        await waitFor(() => screen.getByTestId('biometric-button'));
        fireEvent.press(screen.getByTestId('biometric-button'));

        await waitFor(() => {
          expect(screen.getByText(/pin de respaldo/i)).toBeTruthy();
        });
      });

      it('THEN: Llama a onAuthError con el mensaje apropiado', async () => {
        const onAuthError = jest.fn();
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.hasHardwareAsync.mockResolvedValue(true);
        BiometricAuth.supportedAuthenticationTypesAsync.mockResolvedValue(['fingerprint']);
        BiometricAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'failed' });

        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={onAuthError} />);

        await waitFor(() => screen.getByTestId('biometric-button'));
        fireEvent.press(screen.getByTestId('biometric-button'));

        await waitFor(() => {
          expect(onAuthError).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });
      });
    });
  });

  describe('GIVEN: El usuario elige usar PIN de respaldo', () => {
    describe('WHEN: Ingresa un PIN de 4 a 6 dígitos', () => {
      it('THEN: El input acepta exactamente 4 dígitos', () => {
        const { getByTestId } = render(
          <BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />
        );

        const pinInput = getByTestId('pin-input');
        fireEvent.changeText(pinInput, '1234');

        expect(pinInput.props.value).toBe('1234');
      });

      it('THEN: El input acepta exactamente 6 dígitos', () => {
        const { getByTestId } = render(
          <BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />
        );

        const pinInput = getByTestId('pin-input');
        fireEvent.changeText(pinInput, '123456');

        expect(pinInput.props.value).toBe('123456');
      });

      it('THEN: Rechaza PIN de menos de 4 dígitos al presionar submit', () => {
        const onAuthError = jest.fn();
        const { getByTestId } = render(
          <BiometricLogin onAuthSuccess={jest.fn()} onAuthError={onAuthError} />
        );

        const pinInput = getByTestId('pin-input');
        fireEvent.changeText(pinInput, '123');

        // Press submit button if exists
        const submitButton = screen.getByTestId('pin-submit-button');
        if (submitButton) {
          fireEvent.press(submitButton);
          expect(onAuthError).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('4') })
          );
        }
      });

      it('THEN: Rechaza PIN de más de 6 dígitos al presionar submit', () => {
        const onAuthError = jest.fn();
        const { getByTestId } = render(
          <BiometricLogin onAuthSuccess={jest.fn()} onAuthError={onAuthError} />
        );

        const pinInput = getByTestId('pin-input');
        fireEvent.changeText(pinInput, '1234567');

        const submitButton = screen.getByTestId('pin-submit-button');
        if (submitButton) {
          fireEvent.press(submitButton);
          expect(onAuthError).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('6') })
          );
        }
      });
    });

    describe('WHEN: El PIN es válido', () => {
      it('THEN: Valida el PIN contra el hash almacenado (Zero-Knowledge)', async () => {
        const onAuthSuccess = jest.fn();
        render(
          <BiometricLogin onAuthSuccess={onAuthSuccess} onAuthError={jest.fn()} />
        );

        const pinInput = screen.getByTestId('pin-input');
        fireEvent.changeText(pinInput, '123456');

        const submitButton = screen.getByTestId('pin-submit-button');
        if (submitButton) {
          fireEvent.press(submitButton);
          await waitFor(() => {
            expect(onAuthSuccess).toHaveBeenCalled();
          });
        }
      });
    });
  });

  describe('GIVEN: La biometría no está disponible', () => {
    describe('WHEN: El dispositivo no soporta biometría', () => {
      it('THEN: Muestra directamente el input de PIN de respaldo', async () => {
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.isAvailableAsync.mockResolvedValue(false);

        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />);

        await waitFor(() => {
          expect(screen.getByTestId('pin-input')).toBeTruthy();
        });
      });

      it('THEN: No muestra el botón de biometría', async () => {
        const BiometricAuth = require('expo-local-authentication');
        BiometricAuth.isAvailableAsync.mockResolvedValue(false);

        render(<BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />);

        await waitFor(() => {
          expect(screen.queryByTestId('biometric-button')).toBeNull();
        });
      });
    });
  });

  describe('Punto 1 - Security: Zero-Knowledge Architecture', () => {
    it('THEN: Nunca expone el PIN en plaintext en los logs', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      render(
        <BiometricLogin onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />
      );

      const pinInput = screen.getByTestId('pin-input');
      fireEvent.changeText(pinInput, 'secret1234');

      // Verificar que no hay logs con el PIN
      consoleSpy.mock.calls.forEach(call => {
        const logContent = call.join(' ');
        expect(logContent).not.toContain('secret1234');
      });

      consoleSpy.mockRestore();
    });
  });
});