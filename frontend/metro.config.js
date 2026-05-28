// metro.config.js — Bunker Notas
// Intercepta react-native-keychain y lo reemplaza con mock seguro para Expo Go
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Solo interceptar react-native-keychain si NO estamos en una build de EAS (producción/APK)
  // Esto permite que la build nativa use el módulo real y no el mock.
  const isEasBuild = process.env.EAS_BUILD === "true";

  if (moduleName === "react-native-keychain" && !isEasBuild) {
    return {
      filePath: path.resolve(__dirname, "./src/mocks/react-native-keychain.js"),
      type: "sourceFile",
    };
  }
  // Delegar al resolver por defecto para todo lo demás
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
