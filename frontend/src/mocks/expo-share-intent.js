// src/mocks/expo-share-intent.js
// Mock seguro para Expo Go de expo-share-intent

export const useShareIntent = () => {
  return {
    hasShareIntent: false,
    shareIntent: { type: null, value: null, files: [] },
    resetShareIntent: () => {},
    error: null,
  };
};

export const ShareIntentProvider = ({ children }) => {
  return children;
};
