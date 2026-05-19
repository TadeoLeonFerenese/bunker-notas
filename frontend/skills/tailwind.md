# NativeWind (Tailwind for React Native) Skills

## Overview
NativeWind brings Tailwind CSS utility classes to React Native. Use with Expo and React Native.

## Configuration

### Install
```bash
npm install nativewind tailwindcss
npx tailwindcss init
```

### Configure tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1a1a2e',
        secondary: '#16213e',
        accent: '#e94560',
      },
    },
  },
  plugins: [],
};
```

## Core Patterns

### Basic Usage
```tsx
import { Text, View } from 'react-native';

export function Card({ title, children }) {
  return (
    <View className="bg-white rounded-lg p-4 shadow-md">
      <Text className="text-lg font-bold text-gray-800">{title}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}
```

### Responsive Design
```tsx
<View className="flex-row">
  <View className="w-full md:w-1/2 lg:w-1/3" />
</View>
```

### Dark Mode
```tsx
<View className="dark:bg-gray-900">
  <Text className="dark:text-white">Content</Text>
</View>
```

## Best Practices

1. **Style Objects**: Use Tailwind for layout, style objects for complex transforms
2. **Arbitrary Values**: Use `className="h-[200px]"` for custom values
3. **Group Variants**: Use `group` and `group-hover` for parent-child styling
4. **Screen Variants**: Use `sm:`, `md:`, `lg:` for responsive design

## Common Patterns

### Flexbox
```tsx
<View className="flex flex-row justify-between items-center" />
```

### Spacing
```tsx
<View className="p-4 m-2 gap-2" />
```

### Typography
```tsx
<Text className="text-base font-bold text-center" />
```

### Shadows
```tsx
<View className="shadow-lg shadow-black/20" />
```

### Interactive States
```tsx
<Pressable className="active:scale-95">
  <Text>Button</Text>
</Pressable>
```

## Custom Components

### Button Component
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  const variants = {
    primary: 'bg-accent active:bg-accent/80',
    secondary: 'bg-gray-200 active:bg-gray-300',
  };

  return (
    <Pressable className={`px-4 py-2 rounded ${variants[variant]}`}>
      {children}
    </Pressable>
  );
}
```

## Animation Integration

- Use `native-reanimated` for complex animations
- Use `className="transition-all duration-300"` for simple transitions
- Combine Tailwind with Reanimated for best results