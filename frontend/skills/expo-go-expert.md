# Skill: Expo Go & Native Compatibility Expert

## Overview

This skill focuses on managing the compatibility between Expo Go and native modules, ensuring that development remains fluid while preparing for successful production builds (EAS).

## Core Principles

1. **Isolation of Native Modules**: Never import native modules that are not part of the Expo Go bundle directly in the main thread without a fallback or mock.
2. **Environment Awareness**: Use `Constants.appOwnership` or `Platform.select` to determine if the app is running in Expo Go or a standalone build.
3. **Graceful Degradation**: If a native feature (like `react-native-keychain`) is missing in Expo Go, provide a secure memory-based mock for development.

## Compatibility Patterns

### Intercepting Native Modules (Metro Config)

To avoid evaluation errors in Expo Go for modules like `react-native-keychain`, use the `resolver.resolveRequest` pattern in `metro.config.js`.

```javascript
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-keychain") {
    return {
      filePath: path.resolve(__dirname, "./src/mocks/react-native-keychain.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

### Dynamic Imports (Inline Requires)

Use inline requires for native modules to prevent them from being loaded during the initial bundle evaluation in environments where they might crash.

```typescript
const getNativeModule = () => {
  if (Constants.appOwnership === "expo") {
    return require("./mocks/my-module.mock");
  }
  return require("my-native-module");
};
```

## Troubleshooting EAS Builds

1. **Check Manifest**: Ensure `app.json` or `app.config.js` has all required permissions and plugins.
2. **Dependency Audit**: Run `npx expo install --check` to ensure all dependencies are compatible with the current Expo SDK version.
3. **Clear Cache**: Sometimes `eas build --clear-cache` is necessary if native dependencies are not being picked up correctly.
4. **Log Analysis**: Inspect the build logs in the EAS dashboard, specifically the "Run gradlew" or "Xcode Build" steps for Android/iOS respectively.

## Common Pitfalls in Bunker Notas

- **Keychain Access**: Expo Go does not support `react-native-keychain`. Always use the mock provided in `src/mocks/` during development.
- **WatermelonDB**: Ensure the SQLite adapter is correctly configured for both Expo and native environments.
- **Local Authentication**: Verify that `expo-local-authentication` is handled gracefully on devices without biometric sensors.
