import { GoogleDriveService } from '../../src/backup/GoogleDriveService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// Mock de expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn().mockReturnValue('exp://mock-redirect/oauth'),
  openURL: jest.fn().mockResolvedValue(true),
  parse: jest.fn().mockImplementation((url) => {
    if (url.includes('code=')) {
      return { queryParams: { code: 'mock-auth-code' } };
    }
    return { queryParams: {} };
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GoogleDriveService', () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    await AsyncStorage.clear();
    // Limpiamos tokens en memoria
    (GoogleDriveService as any).accessToken = null;
    (GoogleDriveService as any).tokenExpiresAt = 0;
  });

  it('should generate PKCE challenge and open OAuth URL in system browser', async () => {
    await GoogleDriveService.initiateAuth();

    expect(Linking.createURL).toHaveBeenCalledWith('/oauth');
    expect(Linking.openURL).toHaveBeenCalled();
    
    // Validar que se hayan persistido el verifier y el redirectUri temporales
    const storedVerifier = await AsyncStorage.getItem('@bunker_oauth_verifier');
    const storedRedirect = await AsyncStorage.getItem('@bunker_oauth_redirect_uri');

    expect(storedVerifier).toBeTruthy();
    expect(storedRedirect).toBe('exp://mock-redirect/oauth');

    // Validar que el link contenga el Client ID y los scopes correctos
    const lastCallUrl = (Linking.openURL as jest.Mock).mock.calls[0][0];
    expect(lastCallUrl).toContain('client_id=');
    expect(lastCallUrl).toContain('scope=');
    expect(lastCallUrl).toContain('code_challenge=');
    expect(lastCallUrl).toContain('code_challenge_method=S256');
  });

  it('should exchange authorization code for tokens and save them', async () => {
    // Simulamos que el verifier y la URI de redirección se guardaron previamente
    await AsyncStorage.setItem('@bunker_oauth_verifier', 'mock-verifier-value');
    await AsyncStorage.setItem('@bunker_oauth_redirect_uri', 'exp://mock-redirect/oauth');

    // Mock para intercambio de tokens de Google (oauth2/token) y luego información de usuario (userinfo)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'tadeo@bunker.com',
        }),
      });

    const email = await GoogleDriveService.handleAuthRedirect('exp://mock-redirect/oauth?code=mock-auth-code');

    expect(email).toBe('tadeo@bunker.com');
    
    // Verificamos que se borraron las claves temporales
    await expect(AsyncStorage.getItem('@bunker_oauth_verifier')).resolves.toBeNull();
    // Verificamos que se guardó el email de usuario en AsyncStorage
    await expect(AsyncStorage.getItem('@bunker_google_email')).resolves.toBe('tadeo@bunker.com');
  });

  it('should refresh access token when expired', async () => {
    // Simulamos un refresh token guardado (usamos el mock implícito en keychain o memoryStore)
    const { storeSecureCredential } = require('../../src/notes/encryption');
    await storeSecureCredential('google_drive_refresh_token', 'stored-refresh-token');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-refreshed-access-token',
        expires_in: 3600,
      }),
    });

    const token = await GoogleDriveService.refreshAccessToken();
    expect(token).toBe('new-refreshed-access-token');
    expect(mockFetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.any(Object));
  });

  it('should search for files and return the id if exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ id: 'google-drive-file-id-123' }],
      }),
    });

    const fileId = await GoogleDriveService.findFile('mock-token', 'bunker_backup.enc');
    expect(fileId).toBe('google-drive-file-id-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('bunker_backup.enc'),
      expect.any(Object)
    );
  });

  it('should perform multipart upload when file does not exist', async () => {
    // Mock refresh token
    (GoogleDriveService as any).accessToken = 'active-token';
    (GoogleDriveService as any).tokenExpiresAt = Date.now() + 600000;

    // First call: findFile (file not found)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [] }),
    });

    // Second call: upload (POST create)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-uploaded-file-id' }),
    });

    await expect(
      GoogleDriveService.uploadFile('bunker_backup.enc', 'encrypted-payload-string')
    ).resolves.not.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verificamos que se guarde la fecha del backup en AsyncStorage
    await expect(AsyncStorage.getItem('@bunker_google_last_backup_at')).resolves.toBeTruthy();
  });

  it('should patch existing file on drive when file already exists', async () => {
    // Mock refresh token
    (GoogleDriveService as any).accessToken = 'active-token';
    (GoogleDriveService as any).tokenExpiresAt = Date.now() + 600000;

    // First call: findFile (file found)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [{ id: 'existing-id-456' }] }),
    });

    // Second call: upload (PATCH update)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'existing-id-456' }),
    });

    await expect(
      GoogleDriveService.uploadFile('bunker_backup.enc', 'new-payload-string')
    ).resolves.not.toThrow();

    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toContain('existing-id-456');
    expect(patchCall[1].method).toBe('PATCH');
  });

  it('should download a file by name', async () => {
    // Mock refresh token
    (GoogleDriveService as any).accessToken = 'active-token';
    (GoogleDriveService as any).tokenExpiresAt = Date.now() + 600000;

    // First call: findFile
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [{ id: 'file-to-download-id' }] }),
    });

    // Second call: download content
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'encrypted-content-from-drive',
    });

    const content = await GoogleDriveService.downloadFile('bunker_backup.enc');
    expect(content).toBe('encrypted-content-from-drive');
  });

  it('should clear stored credentials on logout', async () => {
    await AsyncStorage.setItem('@bunker_google_email', 'tadeo@bunker.com');
    await AsyncStorage.setItem('@bunker_google_last_backup_at', '2026-08-05T00:00:00.000Z');

    await GoogleDriveService.logout();

    await expect(AsyncStorage.getItem('@bunker_google_email')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('@bunker_google_last_backup_at')).resolves.toBeNull();
    expect((GoogleDriveService as any).accessToken).toBeNull();
  });

  it('should include client_secret in token requests when configured', async () => {
    GoogleDriveService.setClientSecret('mock-client-secret');

    await AsyncStorage.setItem('@bunker_oauth_verifier', 'mock-verifier-value');
    await AsyncStorage.setItem('@bunker_oauth_redirect_uri', 'exp://mock-redirect/oauth');

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'mock-access-token',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'tadeo@bunker.com',
        }),
      });

    await GoogleDriveService.handleAuthRedirect('exp://mock-redirect/oauth?code=mock-auth-code');

    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[1].body).toContain('client_secret=mock-client-secret');
  });
});
