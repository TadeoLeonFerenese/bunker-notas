/**
 * Mock seguro de react-native-keychain para Expo Go
 * Reemplaza el módulo nativo real que no existe en el contenedor de Expo Go
 */

const ACCESSIBLE = {
  WHEN_UNLOCKED: 'when_unlocked',
  AFTER_FIRST_UNLOCK: 'after_first_unlock',
  ALWAYS: 'always',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'when_passcode_set_this_device_only',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after_first_unlock_this_device_only',
  ALWAYS_THIS_DEVICE_ONLY: 'always_this_device_only',
};

const BIOMETRY_TYPE = {
  TOUCH_ID: 'TouchID',
  FACE_ID: 'FaceID',
  FINGERPRINT: 'Fingerprint',
  FACE: 'Face',
  IRIS: 'Iris',
};

const AUTHENTICATION_TYPE = {
  BIOMETRICS: 'AuthenticationWithBiometrics',
  DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
};

const STORAGE_TYPE = {
  KEYCHAIN: 'keychain',
  AES: 'aes',
};

const SECURITY_LEVEL = {
  SECURE_SOFTWARE: 'SOFTWARE',
  SECURE_HARDWARE: 'HARDWARE',
  ANY: 'ANY',
};

const SECURITY_RULES = {
  NONE: 'NONE',
  AUTOMATIC_UPGRADE: 'AUTOMATIC_UPGRADE',
};

// Almacenamiento en memoria como fallback seguro
const memoryStore = {};

module.exports = {
  ACCESSIBLE,
  BIOMETRY_TYPE,
  AUTHENTICATION_TYPE,
  STORAGE_TYPE,
  SECURITY_LEVEL,
  SECURITY_RULES,

  setGenericPassword: async (username, password, options) => {
    const key = (options && options.service) || 'default';
    memoryStore[key] = { username, password };
    return true;
  },

  getGenericPassword: async (options) => {
    const key = (options && options.service) || 'default';
    return memoryStore[key] || false;
  },

  resetGenericPassword: async (options) => {
    const key = (options && options.service) || 'default';
    delete memoryStore[key];
    return true;
  },

  getSupportedBiometryType: async () => null,

  canImplyAuthentication: async () => false,

  getSecurityLevel: async () => null,
};
