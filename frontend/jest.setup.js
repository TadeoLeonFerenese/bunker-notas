// Jest setup file
global.__DEV__ = true;
require('@testing-library/jest-native/extend-expect');

// Mock expo-modules-core
jest.mock('expo-modules-core', () => {
  return {
    Platform: {
      OS: 'ios',
      select: (objs) => objs.ios || objs.default,
    },
  };
});

// Mock expo-file-system and expo-file-system/legacy
const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn(() => Promise.resolve('/mock/backup.bunker')),
  readAsStringAsync: jest.fn(() => Promise.resolve('{"version":"1.0.0","notes":[]}')),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
};

jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('expo-file-system/legacy', () => mockFileSystem);

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(() => Promise.resolve(true)),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  const MockBlurView = (props) => React.createElement('View', props);
  return {
    BlurView: MockBlurView,
  };
});

// Mock react-native-keychain for biometric auth tests
jest.mock('react-native-keychain', () => ({
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve({ username: 'test' })),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() =>
    Promise.resolve({ success: true, type: 'fingerprint' })
  ),
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() =>
    Promise.resolve(['fingerprint', 'facial'])
  ),
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(3)),
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
}));

// Mock @expo/vector-icons — usar createElement nativo, NO importar react-native aquí
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const MockIcon = (props) =>
    React.createElement('Text', { testID: props.testID }, props.name || 'icon');
  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    MaterialCommunityIcons: MockIcon,
    Feather: MockIcon,
    FontAwesome: MockIcon,
    AntDesign: MockIcon,
  };
});

// Mock native animated helper
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///mock-directory/custom_background.jpg' }]
  }),
  MediaTypeOptions: {
    Images: 'Images',
    All: 'All',
  },
}));

// Mock @nozbe/watermelondb/react
jest.mock('@nozbe/watermelondb/react', () => ({
  withObservables: () => (Component) => Component,
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'guest',
  },
  appOwnership: 'guest',
}), { virtual: true });

// Mock react-native-async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock WatermelonDB database to run on pure in-memory LokiJS without IndexedDB (avoids native DB errors and timers leaks in Jest)
jest.mock('./src/database/index.ts', () => {
  const { Database } = require('@nozbe/watermelondb');
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
  const schema = require('./src/database/schema').default;
  const Note = require('./src/database/Note').default;

  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });

  return {
    database: new Database({
      adapter,
      modelClasses: [Note],
    }),
  };
});