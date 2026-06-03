# Expo Skills

## Overview
Expo skills for building React Native applications with Expo SDK 52+.

## Core Patterns

### Expo Router (File-based Routing)
```
app/
├── _layout.tsx          # Root layout
├── (tabs)/             # Tab navigator group
│   ├── _layout.tsx
│   ├── index.tsx       # Home tab
│   └── notes.tsx       # Notes tab
└── notes/
    └── [id].tsx        # Dynamic route
```

### Expo SDK Features
- `expo-camera`: Camera access
- `expo-location`: GPS/background location
- `expo-notifications`: Push notifications
- `expo-secure-store`: Encrypted key-value storage
- `expo-sqlite`: Local SQLite database

### EAS Build & Update
- Use EAS Build for production builds
- Use EAS Update for OTA updates (JS-only)
- Configure `app.json`/`app.config.js` properly

## Best Practices

1. **Native Modules**: Use `expo prebuild` for custom native code
2. **Assets**: Use `expo-asset` for loading bundled assets
3. **Fonts**: Use `expo-font` for custom fonts
4. **Splash Screen**: Configure in `app.json`/``app.config.js``
5. **Icons**: Use `@expo/vector-icons` built-in

## Navigation

### Stack Navigation
```typescript
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notes/[id]" />
    </Stack>
  );
}
```

### Tab Navigation
```typescript
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
    </Tabs>
  );
}
```

## State Management

- Use React Context for global state
- Use Zustand for complex state (compatible with Expo)
- Use Jotai for atomic state
- Avoid Redux unless necessary

## Performance

- Use `React.memo` and `useMemo` strategically
- Implement infinite scroll with FlashList
- Optimize images with `expo-image`
- Lazy load heavy components