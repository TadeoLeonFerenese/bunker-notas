import * as Keychain from 'react-native-keychain';

// Mock react-native-keychain explicitly for this file
jest.mock('react-native-keychain', () => ({
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve({ username: 'test' })),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
}));

import { PinManager } from '../../src/auth/PinManager';

// Cast functions to jest.Mock for configuring dynamically in tests
const mockSetGenericPassword = Keychain.setGenericPassword as jest.Mock;
const mockGetGenericPassword = Keychain.getGenericPassword as jest.Mock;
const mockResetGenericPassword = Keychain.resetGenericPassword as jest.Mock;

describe('PinManager Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPin', () => {
    it('should return true if credentials exist in Keychain', async () => {
      mockGetGenericPassword.mockResolvedValueOnce({
        username: 'bunker_user',
        password: '123456',
      });
      const result = await PinManager.hasPin();
      expect(result).toBe(true);
      expect(mockGetGenericPassword).toHaveBeenCalledWith({
        service: 'com.tadeoleon.bunkernotas.pin',
      });
    });

    it('should return false if credentials do not exist in Keychain', async () => {
      mockGetGenericPassword.mockResolvedValueOnce(false);
      const result = await PinManager.hasPin();
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetGenericPassword.mockRejectedValueOnce(new Error('Keychain failure'));
      
      const result = await PinManager.hasPin();
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('setPin', () => {
    it('should reject PIN if it is too short (4 digits)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await PinManager.setPin('1234');
      expect(result).toBe(false);
      expect(mockSetGenericPassword).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should save PIN successfully if format is valid (6 digits)', async () => {
      mockSetGenericPassword.mockResolvedValueOnce(true);
      const result = await PinManager.setPin('123456');
      expect(result).toBe(true);
      expect(mockSetGenericPassword).toHaveBeenCalledWith(
        'bunker_user',
        '123456',
        { service: 'com.tadeoleon.bunkernotas.pin' }
      );
    });

    it('should reject PIN if it is too short (5 digits)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await PinManager.setPin('12345');
      expect(result).toBe(false);
      expect(mockSetGenericPassword).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should reject PIN if it is too long (7 digits)', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await PinManager.setPin('1234567');
      expect(result).toBe(false);
      expect(mockSetGenericPassword).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should reject PIN if it contains non-numeric characters', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await PinManager.setPin('12345a');
      expect(result).toBe(false);
      expect(mockSetGenericPassword).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return false if keychain save throws an error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSetGenericPassword.mockRejectedValueOnce(new Error('Write error'));
      const result = await PinManager.setPin('999999');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('verifyPin', () => {
    it('should return true if input matches stored PIN', async () => {
      mockGetGenericPassword.mockResolvedValueOnce({
        username: 'bunker_user',
        password: '432109',
      });
      const result = await PinManager.verifyPin('432109');
      expect(result).toBe(true);
    });

    it('should return false if input does not match stored PIN', async () => {
      mockGetGenericPassword.mockResolvedValueOnce({
        username: 'bunker_user',
        password: '432109',
      });
      const result = await PinManager.verifyPin('111111');
      expect(result).toBe(false);
    });

    it('should return false if there is no PIN stored', async () => {
      mockGetGenericPassword.mockResolvedValueOnce(false);
      const result = await PinManager.verifyPin('123456');
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetGenericPassword.mockRejectedValueOnce(new Error('Read error'));
      const result = await PinManager.verifyPin('123456');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('resetPin', () => {
    it('should return true when keychain resets successfully', async () => {
      mockResetGenericPassword.mockResolvedValueOnce(true);
      const result = await PinManager.resetPin();
      expect(result).toBe(true);
      expect(mockResetGenericPassword).toHaveBeenCalledWith({
        service: 'com.tadeoleon.bunkernotas.pin',
      });
    });

    it('should return false when keychain reset fails', async () => {
      mockResetGenericPassword.mockResolvedValueOnce(false);
      const result = await PinManager.resetPin();
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockResetGenericPassword.mockRejectedValueOnce(new Error('Reset error'));
      const result = await PinManager.resetPin();
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
