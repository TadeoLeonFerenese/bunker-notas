// metro.config.js — Bunker Notas
// Intercepta react-native-keychain y lo reemplaza con mock seguro para Expo Go
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Solo interceptar react-native-keychain y expo-share-intent si NO estamos en una build de EAS
  // Esto permite que la build nativa use los módulos reales y Expo Go use los mocks
  const isEasBuild = process.env.EAS_BUILD === "true";

  if (!isEasBuild) {
    if (moduleName === "react-native-keychain") {
      return {
        filePath: path.resolve(__dirname, "./src/mocks/react-native-keychain.js"),
        type: "sourceFile",
      };
    }
    if (moduleName === "expo-share-intent") {
      return {
        filePath: path.resolve(__dirname, "./src/mocks/expo-share-intent.js"),
        type: "sourceFile",
      };
    }
  }

  // Delegar al resolver por defecto para todo lo demás
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
