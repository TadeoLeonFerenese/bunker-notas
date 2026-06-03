# Design: Auditoría de Biometría y Corrección de Ícono

## Technical Approach
Refactorizaremos el ciclo de vida de la autenticación de notas seguras en `App.tsx` para pasar el parámetro `action` ('open' | 'delete') de forma explícita entre funciones. Esto previene que closures asíncronos programados por `setTimeout` lean valores obsoletos de la variable de estado mutable `authAction` si el usuario canceló una acción previa.

## Architecture Decisions

### Decision: Desacople de authAction mediante Parámetro Explícito
- **Choice**: Pasar `action` en las firmas de `showPinInput`, `tryBiometricAuth` y `executeAuthAction`.
- **Alternatives considered**: Usar una referencia `useRef` para `authAction`.
- **Rationale**: Pasar el parámetro explícitamente en el flujo de la llamada garantiza transparencia y previene colisiones por closures obsoletos en entornos asíncronos (`setTimeout`), haciendo el código puramente funcional y predecible.

### Decision: Mocking en Tests de Integración
- **Choice**: Configurar mocks modulares para `expo-local-authentication` en los archivos de test de integración.
- **Alternatives considered**: Mock global fijo en `jest.setup.js`.
- **Rationale**: Permitir que cada test configure si la biometría es exitosa o falla, y qué errores retorna, para validar todos los caminos lógicos y prevenir regresiones de borrado accidental.

## Data Flow
```
[User Touch (Open)] ──> handleNotePress ──> showPinInput(note, 'open') ──> tryBiometricAuth(note, 'open') ──> executeAuthAction(note, 'open') ──> Visor
[User Long Press (Delete)] ──> handleNoteLongPress ──> showPinInput(note, 'delete') ──> tryBiometricAuth(note, 'delete') ──> executeAuthAction(note, 'delete') ──> DB Delete
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/App.tsx` | Modify | Modificar firmas y flujos de `showPinInput`, `tryBiometricAuth` y `executeAuthAction`. Eliminar la variable de estado `authAction`. |
| `frontend/__tests__/App.test.tsx` | Create | Crear suite de pruebas de integración para verificar que abrir y borrar notas seguras nunca colisione. |
| `frontend/package.json` | Modify | Agregar `jimp` en devDependencies para posibilitar el script de íconos. |
| `frontend/assets/icon.png` | Modify | Actualizar con la imagen oficial procesada desde el Escritorio. |
| `frontend/assets/adaptive-icon.png` | Modify | Actualizar con la imagen oficial procesada desde el Escritorio. |

## Interfaces / Contracts
```typescript
type AuthAction = 'open' | 'delete';

const executeAuthAction = (note: NoteModel, action: AuthAction) => void;
const tryBiometricAuth = (note: NoteModel, action: AuthAction) => Promise<void>;
const showPinInput = (note: NoteModel, action: AuthAction) => Promise<void>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit/Integration | Apertura exitosa de nota segura | Renderizar `AppContent`, simular touch en nota segura, mockear `authenticateAsync` exitoso con 'open' y verificar que se abra el visor de notas. |
| Unit/Integration | Cancelación previa y apertura (Race condition) | Simular intento de borrado (que pondría acción en 'delete' pero es cancelado) y luego abrir la nota normal. Verificar que no se borre de la DB local y abra visor. |
| Unit/Integration | Eliminación exitosa de nota segura | Simular long press, seleccionar eliminar, mockear `authenticateAsync` exitoso con 'delete' y verificar llamada a `destroyPermanently`. |

## Migration / Rollout
No migration required.
