# TypeScript Skills

## Overview
TypeScript skills for building type-safe React Native/Expo applications.

## Patterns

### Strict TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Inference
- Prefer `const` with inferred types over explicit type annotations
- Use generic constraints instead of `any`
- Leverage `satisfies` for precise types without widening

### Union Types over Enums
```typescript
// Prefer
type Status = 'pending' | 'active' | 'completed';

// Over
enum Status { Pending, Active, Completed }
```

### Utility Types
- Use `Pick<T, K>` and `Omit<T, K>` for manipulating types
- Use `Record<K, T>` for object mappings
- Use `Partial<T>` and `Required<T>` for optional/required transformations

## Best Practices

1. **No `any`**: Use `unknown` when type is truly unknown, then narrow
2. **Discriminated Unions**: Use discriminated unions for state machines
3. **Branded Types**: Use intersection types for type branding
   ```typescript
   type UserId = string & { readonly brand: unique symbol };
   ```
4. **Template Literal Types**: Use for dynamic string patterns
5. **Type Guards**: Create custom type guards for complex checks

## File Organization

- Co-locate types with their usage
- Use `types.ts` for shared interfaces
- Export types that are used across modules
- Keep implementation details private

## Testing Types

- Test type utilities with compile-time assertions
- Use `tsd` for type testing
- Verify generic constraints work correctly