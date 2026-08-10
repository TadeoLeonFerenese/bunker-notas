import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { storeSecureCredential, getSecureCredential } from '../notes/encryption';

// Client ID por defecto para la app de Bunker Notas.
// NOTA: Para producción, este Client ID debe coincidir con el registrado en Google Cloud Console.
const DEFAULT_CLIENT_ID = '130503659017-h257g2uohpkugfnn97giiuockt61mgfn.apps.googleusercontent.com';

export interface GoogleDriveStatus {
  isConnected: boolean;
  userEmail: string | null;
  lastBackupAt: string | null;
}

export class GoogleDriveService {
  private static clientId: string = DEFAULT_CLIENT_ID;
  private static clientSecret: string | null = null;
  private static customRedirectUri: string | null = null;
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number = 0; // Timestamp en ms

  /**
   * Configura un Google Client Secret personalizado si es necesario
   */
  static setClientSecret(secret: string) {
    this.clientSecret = secret.trim() || null;
  }

  /**
   * Obtiene el Google Client Secret activo
   */
  static getClientSecret(): string | null {
    return this.clientSecret;
  }

  /**
   * Configura un Google Client ID personalizado si es necesario
   */
  static setClientId(id: string) {
    this.clientId = id.trim() || DEFAULT_CLIENT_ID;
  }

  /**
   * Obtiene el Google Client ID activo
   */
  static getClientId(): string {
    return this.clientId;
  }

  /**
   * Configura una URI de redireccionamiento personalizada (ej: un proxy HTTPS)
   */
  static setRedirectUri(uri: string) {
    this.customRedirectUri = uri.trim() || null;
  }

  /**
   * Obtiene la URI de redireccionamiento personalizada activa
   */
  static getRedirectUri(): string | null {
    return this.customRedirectUri;
  }

  /**
   * Genera un string aleatorio seguro para el Code Verifier (PKCE)
   */
  private static generateCodeVerifier(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    
    // Generar bytes aleatorios usando crypto nativo si está disponible
    const array = new Uint8Array(56);
    if (typeof global !== 'undefined' && global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(array);
    } else {
      // Fallback para Jest / entornos sin crypto global mockeado
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    for (let i = 0; i < array.length; i++) {
      verifier += charset[array[i] % charset.length];
    }
    return verifier;
  }

  /**
   * Genera el Code Challenge SHA-256 codificado en base64url
   */
  private static generateCodeChallenge(verifier: string): string {
    const hashed = CryptoJS.SHA256(verifier);
    const base64 = hashed.toString(CryptoJS.enc.Base64);
    return base64
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Inicia el flujo de autenticación abriendo el navegador del sistema con OAuth2 + PKCE
   */
  static async initiateAuth(): Promise<void> {
    const Linking = require('expo-linking');
    const verifier = this.generateCodeVerifier();
    const challenge = this.generateCodeChallenge(verifier);
    const redirectUri = this.customRedirectUri || Linking.createURL('/oauth');

    // Guardamos el verifier y el redirectUri en AsyncStorage para cuando volvamos
    await AsyncStorage.setItem('@bunker_oauth_verifier', verifier);
    await AsyncStorage.setItem('@bunker_oauth_redirect_uri', redirectUri);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(this.clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email')}&` +
      `code_challenge=${encodeURIComponent(challenge)}&` +
      `code_challenge_method=S256&` +
      `access_type=offline&` +
      `prompt=consent`;

    await Linking.openURL(authUrl);
  }

  /**
   * Intercepta la redirección del deep link y realiza el intercambio del código por tokens
   */
  static async handleAuthRedirect(url: string): Promise<string> {
    const Linking = require('expo-linking');
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code as string;

    
    if (!code) {
      throw new Error('No se recibió el código de autorización de Google.');
    }

    const verifier = await AsyncStorage.getItem('@bunker_oauth_verifier');
    const redirectUri = await AsyncStorage.getItem('@bunker_oauth_redirect_uri');

    if (!verifier || !redirectUri) {
      throw new Error('No se encontró la clave de verificación PKCE en el dispositivo.');
    }

    if (!this.clientSecret) {
      const storedSecret = await getSecureCredential('google_drive_client_secret');
      if (storedSecret) {
        this.clientSecret = storedSecret;
      }
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    let body = `client_id=${encodeURIComponent(this.clientId)}&` +
      `code_verifier=${encodeURIComponent(verifier)}&` +
      `grant_type=authorization_code&` +
      `code=${encodeURIComponent(code)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    if (this.clientSecret) {
      body += `&client_secret=${encodeURIComponent(this.clientSecret)}`;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Error al intercambiar tokens.');
    }

    // Almacenamos el refresh token de forma segura
    if (data.refresh_token) {
      await storeSecureCredential('google_drive_refresh_token', data.refresh_token);
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    // Limpiamos los temporales de OAuth
    await AsyncStorage.removeItem('@bunker_oauth_verifier');
    await AsyncStorage.removeItem('@bunker_oauth_redirect_uri');

    // Recuperamos el email de la cuenta para mostrar en la interfaz
    const email = await this.fetchUserEmail(data.access_token);
    if (email) {
      await AsyncStorage.setItem('@bunker_google_email', email);
    }

    return email || 'Conectado';
  }

  /**
   * Recupera el correo del usuario autenticado
   */
  private static async fetchUserEmail(token: string): Promise<string | null> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return data.email || null;
    } catch (e) {
      console.warn('Error al obtener el correo de Google:', e);
      return null;
    }
  }

  /**
   * Refresca el token de acceso usando el refresh token almacenado en Keychain
   */
  static async refreshAccessToken(): Promise<string> {
    // Si ya tenemos un token cargado en memoria que no expiró (más de 1 minuto restante), lo retornamos
    if (this.accessToken && Date.now() < (this.tokenExpiresAt - 60000)) {
      return this.accessToken;
    }

    const refreshToken = await getSecureCredential('google_drive_refresh_token');
    if (!refreshToken) {
      throw new Error('Usuario no autenticado en Google Drive.');
    }

    if (!this.clientSecret) {
      const storedSecret = await getSecureCredential('google_drive_client_secret');
      if (storedSecret) {
        this.clientSecret = storedSecret;
      }
    }

    let body = `client_id=${encodeURIComponent(this.clientId)}&` +
      `grant_type=refresh_token&` +
      `refresh_token=${encodeURIComponent(refreshToken)}`;

    if (this.clientSecret) {
      body += `&client_secret=${encodeURIComponent(this.clientSecret)}`;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      // Si el refresh token fue revocado o expiró, desvinculamos la cuenta
      if (data.error === 'invalid_grant') {
        await this.logout();
      }
      throw new Error(data.error_description || data.error || 'Error al refrescar credenciales de Google.');
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    // Si viene un nuevo refresh token, lo guardamos
    if (data.refresh_token) {
      await storeSecureCredential('google_drive_refresh_token', data.refresh_token);
    }

    return data.access_token;
  }

  /**
   * Comprueba el estado de la vinculación y devuelve datos del usuario
   */
  static async getStatus(): Promise<GoogleDriveStatus> {
    const refreshToken = await getSecureCredential('google_drive_refresh_token');
    const isConnected = !!refreshToken;
    const userEmail = isConnected ? await AsyncStorage.getItem('@bunker_google_email') : null;
    const lastBackupAt = await AsyncStorage.getItem('@bunker_google_last_backup_at');

    return {
      isConnected,
      userEmail,
      lastBackupAt,
    };
  }

  /**
   * Cierra la sesión borrando los tokens
   */
  static async logout(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    const Keychain = require('react-native-keychain');
    if (Platform.OS !== 'web' && process.env.NODE_ENV !== 'test' && Keychain && Keychain.resetGenericPassword) {
      await Keychain.resetGenericPassword({ service: 'bunker-notas-google_drive_refresh_token' });
    }
    await AsyncStorage.removeItem('@bunker_google_email');
    await AsyncStorage.removeItem('@bunker_google_last_backup_at');
    // Para asegurar limpieza
    await storeSecureCredential('google_drive_refresh_token', '');
  }

  /**
   * Busca si existe un archivo con un nombre dado en la appDataFolder
   */
  static async findFile(token: string, filename: string): Promise<string | null> {
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${encodeURIComponent(filename)}'&fields=files(id)`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al buscar archivo en Google Drive.');
    }
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  }

  /**
   * Sube un archivo (cifrado) a Google Drive appDataFolder
   */
  static async uploadFile(filename: string, encryptedContent: string): Promise<void> {
    const token = await this.refreshAccessToken();
    const existingId = await this.findFile(token, filename);

    if (existingId) {
      // Actualizar archivo existente (PATCH)
      const url = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: encryptedContent,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error al actualizar el respaldo en Google Drive.');
      }
    } else {
      // Crear nuevo archivo (POST multipart)
      const metadata = {
        name: filename,
        parents: ['appDataFolder'],
      };

      const boundary = 'foo_bar_boundary';
      const multipartBody = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/plain\r\n\r\n` +
        `${encryptedContent}\r\n` +
        `--${boundary}--`;

      const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error al crear el respaldo en Google Drive.');
      }
    }

    if (filename === 'bunker_backup.enc') {
      const now = new Date().toISOString();
      await AsyncStorage.setItem('@bunker_google_last_backup_at', now);
    }
  }

  /**
   * Descarga el contenido de un archivo desde Google Drive appDataFolder
   */
  static async downloadFile(filename: string): Promise<string> {
    const token = await this.refreshAccessToken();
    const fileId = await this.findFile(token, filename);

    if (!fileId) {
      throw new Error(`No se encontró el archivo ${filename} en tu Google Drive.`);
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar el respaldo desde Google Drive.');
    }

    return await response.text();
  }
}
