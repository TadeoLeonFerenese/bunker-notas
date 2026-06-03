/**
 * LoginScreen - Diseño Premium en Cascada (Estilo Banco Galicia)
 * Bunker Notas - Zero-Knowledge Access
 *
 * Modos de Login:
 *  - SETUP:     Primera vez, el usuario define su PIN Maestro (obligatorio siempre)
 *  - BIOMETRIC: Si hay biometría disponible y el usuario tiene PIN, muestra la huella como primario
 *  - PIN:       El usuario eligió explícitamente usar PIN, o no hay biometría disponible
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bunkerBg: '#F8F9FA',
  bunkerDark: '#1A202C',
  bunkerAccent: '#E94560',
  bunkerGray: '#718096',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  focus: '#E94560',
};

type LoginMode = 'loading' | 'setup' | 'biometric' | 'pin';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<LoginMode>('loading');

  // Estados de PIN
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Estado de feedback al usuario
  const [hint, setHint] = useState<string | null>(null);
  const [hintIsError, setHintIsError] = useState(false);

  const pinInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const biometricTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── INICIALIZACIÓN ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkSecuritySetup = async () => {
      try {
        const LocalAuthentication = require('expo-local-authentication');
        const { getSecureCredential } = require('../notes/encryption');

        // ¿El dispositivo tiene biometría?
        const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
        const hasBiometrics = enrolledLevel !== LocalAuthentication.SecurityLevel.NONE;

        if (hasBiometrics) {
          // Biometría disponible → siempre mostrar huella primero, sin importar si hay PIN
          setMode('biometric');
          biometricTimerRef.current = setTimeout(() => triggerBiometricAuth(), 400);
        } else {
          // Sin biometría → verificar si tiene PIN registrado
          const storedHash = await getSecureCredential('app_pin_hash');
          if (storedHash) {
            setMode('pin');
          } else {
            // Sin PIN ni biometría → obligar a crear PIN Maestro
            setMode('setup');
          }
        }
      } catch {
        setMode('setup');
      }
    };

    checkSecuritySetup();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      if (biometricTimerRef.current) clearTimeout(biometricTimerRef.current);
    };
  }, []);

  // ─── BIOMETRÍA ─────────────────────────────────────────────────────────────
  const triggerBiometricAuth = async () => {
    try {
      const LocalAuthentication = require('expo-local-authentication');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticación requerida para acceder al Bunker',
        fallbackLabel: 'Usar PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onLoginSuccess();
      } else {
        const error = result.error as string | undefined;
        if (error === 'lockout' || error === 'lockout_permanent') {
          setHint('Biometría bloqueada. Usá tu PIN.');
          setHintIsError(true);
        }
        // Si cancela simplemente no hacemos nada — no rompemos el estado
      }
    } catch {
      // Biometría no disponible, silencioso
    }
  };

  // ─── LOGIN CON PIN ─────────────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    if (pin.length < 4 || pin.length > 6) return;

    setIsLoading(true);
    setHint(null);

    try {
      const { hashPin, storeSecureCredential, getSecureCredential, verifyPin } = require('../notes/encryption');

      if (mode === 'setup') {
        if (!isConfirmingPin) {
          // Paso 1: Guardar el PIN y pedir confirmación
          setPinConfirm(pin);
          setPin('');
          setIsConfirmingPin(true);
          setIsLoading(false);
          setHint('Repetí el PIN para confirmar.');
          setHintIsError(false);
        } else {
          // Paso 2: Confirmar
          if (pin === pinConfirm) {
            const hash = await hashPin(pin);
            await storeSecureCredential('app_pin_hash', hash);
            setIsLoading(false);
            onLoginSuccess();
          } else {
            setIsLoading(false);
            setPin('');
            setPinConfirm('');
            setIsConfirmingPin(false);
            setHint('Los PINs no coinciden. Intentá de nuevo.');
            setHintIsError(true);
          }
        }
      } else {
        // Modo PIN: validar contra el llavero
        const storedHash = await getSecureCredential('app_pin_hash');
        if (storedHash) {
          const isValid = await verifyPin(pin, storedHash);
          setIsLoading(false);
          if (isValid) {
            onLoginSuccess();
          } else {
            setPin('');
            setHint('PIN incorrecto. Intentá de nuevo.');
            setHintIsError(true);
          }
        } else {
          setIsLoading(false);
          setMode('setup');
        }
      }
    } catch {
      setIsLoading(false);
      setHint('Error procesando credenciales.');
      setHintIsError(true);
    }
  };

  // ─── DIMENSIONES PIN BOXES ─────────────────────────────────────────────────
  const pinLength = 6;
  const containerWidth = Math.min(width - 48, 380);
  const boxGap = 10;
  const boxSize = Math.min(52, (containerWidth - boxGap * (pinLength - 1)) / pinLength);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const renderBiometricMode = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Bienvenido de vuelta</Text>

      {hint && (
        <Text style={[styles.hint, hintIsError && styles.hintError]}>{hint}</Text>
      )}

      {/* Botón principal: huella */}
      <TouchableOpacity
        testID="biometric-trigger-button"
        style={styles.biometricBtn}
        activeOpacity={0.8}
        onPress={triggerBiometricAuth}
      >
        <Ionicons name="finger-print" size={28} color={COLORS.bunkerAccent} />
        <Text style={styles.biometricBtnText}>Ingresar con Huella</Text>
      </TouchableOpacity>

      {/* Opción discreta de fallback */}
      <TouchableOpacity
        style={styles.switchModeBtn}
        activeOpacity={0.7}
        onPress={() => {
          setMode('pin');
          setHint(null);
          setPin('');
        }}
      >
        <Text style={styles.switchModeBtnText}>Preferís usar tu PIN →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPinMode = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {mode === 'setup'
          ? isConfirmingPin
            ? 'Confirmá tu PIN del Bunker'
            : 'Definí tu PIN del Bunker'
          : 'Ingresá tu PIN del Bunker'}
      </Text>

      {hint && (
        <Text style={[styles.hint, hintIsError && styles.hintError]}>{hint}</Text>
      )}

      {/* PIN Boxes */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => pinInputRef.current?.focus()}
        style={[styles.pinBoxContainer, { width: containerWidth }]}
      >
        {Array.from({ length: pinLength }).map((_, index) => {
          const isDigitEntered = index < pin.length;
          const isCurrentFocus = isFocused && index === pin.length && pin.length < pinLength;
          return (
            <View
              key={index}
              style={[
                styles.pinBox,
                { width: boxSize, height: boxSize },
                hintIsError && styles.pinBoxFailed,
                isDigitEntered && styles.pinBoxFilled,
                isCurrentFocus && styles.pinBoxFocused,
              ]}
            >
              <Text style={[styles.pinText, isDigitEntered && styles.pinTextEntered]}>
                {isDigitEntered ? '•' : ''}
              </Text>
            </View>
          );
        })}

        <TextInput
          ref={pinInputRef}
          value={pin}
          onChangeText={(text) => {
            setHint(null);
            setHintIsError(false);
            setPin(text.replace(/[^0-9]/g, '').slice(0, 6));
          }}
          keyboardType="numeric"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handlePinSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.hiddenInput}
          caretHidden
          autoCorrect={false}
          spellCheck={false}
          testID="pin-input"
        />
      </TouchableOpacity>

      {/* Botón principal */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.button, (pin.length < 4 || isLoading) && styles.buttonDisabled]}
        onPress={handlePinSubmit}
        disabled={pin.length < 4 || isLoading}
        testID="pin-submit-button"
      >
        <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {isLoading
            ? 'Cargando...'
            : mode === 'setup'
            ? isConfirmingPin
              ? 'Confirmar PIN'
              : 'Continuar'
            : 'Validar PIN'}
        </Text>
      </TouchableOpacity>

      {/* Volver a huella si el modo es pin (no setup) */}
      {mode === 'pin' && (
        <TouchableOpacity
          style={styles.switchModeBtn}
          activeOpacity={0.7}
          onPress={async () => {
            setMode('biometric');
            setHint(null);
            setPin('');
            Keyboard.dismiss();
            setTimeout(() => triggerBiometricAuth(), 200);
          }}
        >
          <Text style={styles.switchModeBtnText}>← Usar Huella Digital</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
      >
        <Pressable style={styles.scrollContent} onPress={Keyboard.dismiss}>
          <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoEmoji}>🛡️</Text>
              </View>
              <Text style={styles.title}>Bunker Notas</Text>
              <Text style={styles.subtitle}>Seguridad Zero-Knowledge</Text>
            </View>

            {/* Formulario: según el modo */}
            {mode === 'loading' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Verificando seguridad...</Text>
              </View>
            )}
            {mode === 'biometric' && renderBiometricMode()}
            {(mode === 'pin' || mode === 'setup') && renderPinMode()}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Conexión Segura • Almacenamiento Local</Text>
            </View>

          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bunkerBg,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 540,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 88,
    height: 88,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.bunkerDark,
    marginTop: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.bunkerGray,
    marginTop: 6,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    marginVertical: 32,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.bunkerDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: COLORS.bunkerGray,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  hintError: {
    color: COLORS.bunkerAccent,
    fontWeight: '600',
  },
  pinBoxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pinBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  pinBoxFilled: {
    borderColor: COLORS.bunkerDark,
    backgroundColor: COLORS.surface,
  },
  pinBoxFocused: {
    borderColor: COLORS.focus,
    borderWidth: 2.5,
    transform: [{ scale: 1.05 }],
  },
  pinBoxFailed: {
    borderColor: COLORS.bunkerAccent,
  },
  pinText: {
    fontSize: 28,
    color: COLORS.bunkerGray,
  },
  pinTextEntered: {
    color: COLORS.bunkerDark,
    fontSize: 32,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    fontSize: 1,
  },
  button: {
    backgroundColor: COLORS.bunkerAccent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.bunkerAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  biometricBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.bunkerDark,
  },
  switchModeBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  switchModeBtnText: {
    fontSize: 14,
    color: COLORS.bunkerGray,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    color: COLORS.bunkerGray,
    opacity: 0.6,
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LoginScreen;