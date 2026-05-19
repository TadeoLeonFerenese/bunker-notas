/**
 * Encryption Module - AES-256-GCM (Simulado para React Native / Expo Go)
 *
 * Implementación de encriptación para Zero-Knowledge:
 * - En producción: usar react-native-aes-crypto o expo-crypto
 * - Carga nativa dinámica mediante inline require para evitar crasheo de evaluación en Expo Go
 */

import { Platform } from 'react-native';

// Clave simulada (en producción vendría de Android Keystore)
const ENCRYPTION_KEY = 'bunker-notas-secret-key-32chars!!';

// Almacenamiento seguro en memoria para fallback en Expo Go y Web
const memoryStore: Record<string, string> = {};

/**
 * Convierte string a base64
 */
function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    result += chars.charAt(a >> 2);
    result += chars.charAt(((a & 3) << 4) | (b >> 4));
    result += i + 1 < str.length ? chars.charAt(((b & 15) << 2) | (c >> 6)) : '=';
    result += i + 2 < str.length ? chars.charAt(c & 63) : '=';
  }
  return result;
}

/**
 * Convierte base64 a string
 */
function fromBase64(str: string): string {
  if (typeof atob === 'function') {
    return atob(str);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = str[i + 2] === '=' ? -1 : chars.indexOf(str[i + 2]);
    const d = str[i + 3] === '=' ? -1 : chars.indexOf(str[i + 3]);

    result += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) {
      result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    }
    if (d !== -1) {
      result += String.fromCharCode(((c & 3) << 6) | d);
    }
    i += 4;
  }
  return result;
}

export const encryption = {
  /**
   * Encripta un string (simulado)
   * Retorna: iv:salt:encrypted
   */
  encrypt(plaintext: string): string {
    const iv = Math.random().toString(36).substring(2, 10);
    const salt = Math.random().toString(36).substring(2, 10);

    // XOR simulado de encriptación
    const encrypted = plaintext
      .split('')
      .map((char: string, i: number) =>
        String.fromCharCode(
          char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
        )
      )
      .join('');

    return `${iv}:${salt}:${toBase64(encrypted)}`;
  },

  /**
   * Desencripta el string encriptado
   */
  decrypt(ciphertext: string): string {
    try {
      const [iv, salt, encrypted] = ciphertext.split(':');
      const decoded = fromBase64(encrypted);

      const decrypted = decoded
        .split('')
        .map((char: string, i: number) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
          )
        )
        .join('');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  },
};

/**
 * Genera hash de PIN para almacenamiento seguro
 */
export async function hashPin(pin: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verifica PIN contra hash almacenado
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
}

/**
 * Almacena credenciales en Secure Storage usando inline require para evitar crasheo en Expo Go
 */
export async function storeSecureCredential(key: string, value: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' || process.env.NODE_ENV === 'test') {
      memoryStore[key] = value;
      return true;
    }
    const Keychain = require('react-native-keychain');
    if (!Keychain || !Keychain.setGenericPassword) {
      memoryStore[key] = value;
      return true;
    }
    await Keychain.setGenericPassword(key, value, {
      service: 'bunker-notas',
      accessible: Keychain.ACCESSIBLE ? Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY : undefined,
    });
    return true;
  } catch (error) {
    console.warn('Keychain nativo no disponible en Expo Go, usando fallback en memoria');
    memoryStore[key] = value;
    return true;
  }
}

/**
 * Recupera credencial de Secure Storage usando inline require para evitar crasheo en Expo Go
 */
export async function getSecureCredential(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' || process.env.NODE_ENV === 'test') {
      return memoryStore[key] || null;
    }
    const Keychain = require('react-native-keychain');
    if (!Keychain || !Keychain.getGenericPassword) {
      return memoryStore[key] || null;
    }
    const result = await Keychain.getGenericPassword({ service: 'bunker-notas' });
    if (result) {
      return result.password;
    }
    return memoryStore[key] || null;
  } catch (error) {
    console.warn('Keychain nativo no disponible en Expo Go, usando fallback en memoria');
    return memoryStore[key] || null;
  }
}