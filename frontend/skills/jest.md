# Jest Skills

## Overview
Jest skills for testing React Native/Expo applications.

## Configuration

### jest.config.js
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!/**/*.d.ts',
  ],
};
```

### jest.setup.js
```javascript
import '@testing-library/jest-native/extend-expect';

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

## Testing Patterns

### Component Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Click me</Button>);
    
    fireEvent.press(screen.getByText('Click me'));
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Testing
```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());
    
    act(() => result.current.increment());
    
    expect(result.current.count).toBe(1);
  });
});
```

### Async Testing
```tsx
describe('fetchNotes', () => {
  it('returns notes array', async () => {
    const notes = await fetchNotes();
    expect(notes).toHaveLength(3);
  });

  it('throws on error', async () => {
    await expect(fetchNotes('invalid')).rejects.toThrow('Network error');
  });
});
```

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Test File Location**: Co-locate tests next to source files
3. **Descriptive Names**: Use `describe` and `it` with clear descriptions
4. **Isolation**: Each test should be independent
5. **Mock External Dependencies**: Mock API calls, native modules

## Common Matchers

```tsx
// Basic
expect(value).toBe(5);
expect(value).toEqual({ name: 'Test' });
expect(value).toBeTruthy();
expect(value).toBeNull();

// Arrays/Objects
expect(array).toContain(item);
expect(object).toHaveProperty('name');
expect(array).toHaveLength(3);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Custom
expect(element).toBeVisible();
expect(button).toBeDisabled();
```

## Mocking Patterns

### Mock Functions
```tsx
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked');
mockFn.mockResolvedValue('async mocked');
```

### Mock Modules
```tsx
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
```

### Mock Components
```tsx
jest.mock('./ExpensiveComponent', () => ({
  ExpensiveComponent: () => null,
}));
```

## Coverage

- Aim for 80%+ coverage on critical paths
- Focus on user-facing functionality
- Cover edge cases and error states
- Don't test generated code or trivial getters