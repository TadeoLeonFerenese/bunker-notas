# Plan de Implementación: Autenticación en Cascada, Audio y Backup

Este plan establece la evolución de **Bunker Notas** con las decisiones aprobadas por el Lead Orchestrator.  
Arquitectura: **Zero-Knowledge, Local-First, TDD obligatorio.**

---

## 🏛️ Decisiones Aprobadas

| # | Decisión | Estado |
|---|----------|--------|
| 1 | Dashboard: **grilla de filas y columnas actual** (sin cambios en tablet) | ✅ Aprobado |
| 2 | Auth: **PIN Boxes individuales en cascada vertical** en `LoginScreen` y `PinModal` | ✅ Aprobado |
| 3 | Auth: eliminar `setTimeout` frágiles — usar **máquina de estados + `AppState`** | ✅ Aprobado |
| 4 | Audio: `expo-av` ya instalada (`~16.0.8`), pasar a integración | ✅ Aprobado |

---

## 🛠️ Cambios Propuestos

### Componente 1 — `src/auth/BiometricLogin.tsx`
> Componente dedicado a la autenticación. Es importado tanto por `LoginScreen` como por `App.tsx`.

#### [MODIFY] `frontend/src/auth/BiometricLogin.tsx`
- Reemplazar `setTimeout(() => focus(), 250)` por escucha de `AppState` para sincronizar el foco del PIN con la restauración completa de la vista nativa.
- Implementar máquina de estados explícita:
  ```
  'idle' → 'biometric_prompt' → 'biometric_success' | 'pin_input'
  ```
- **Nada de `keychain` para el flujo de estados** — el role de `react-native-keychain` es solo almacenar/recuperar credenciales, no coordinar UI.

---

### Componente 2 — `src/screens/LoginScreen.tsx`
> Pantalla principal de acceso. Ya tiene las PIN Boxes implementadas (✅ completo de sesión anterior).

#### [NO CHANGES NEEDED — verificar] `frontend/src/screens/LoginScreen.tsx`
- El layout en cascada con PIN Boxes individuales ya fue aplicado.
- **Solo requiere verificación** de que use el nuevo `BiometricLogin` refactorizado correctamente.

---

### Componente 3 — `App.tsx` (PinModal + Audio)

#### [MODIFY] `frontend/App.tsx`
- **PinModal:** Replicar las PIN Boxes individuales en el modal de desbloqueo de notas seguras.
- **Audio MVP:** Integrar `expo-av` (ya instalada) — botón 🎤 en modal de creación y reproductor en modal de lectura.

---

### Componente 4 — Tests (TDD Mandatory)

#### [MODIFY] `frontend/__tests__/auth/BiometricLogin.test.tsx`
- Tests del componente `BiometricLogin` aislado — ya escritos (12 tests).
- Actualizar mocks y aserciones para validar la nueva máquina de estados.

#### [VERIFY] `frontend/__tests__/screens/LoginScreen.test.tsx`
- Test de la pantalla completa — verificar que los `testID` coincidan con el layout refactorizado.

---

## 🧪 Plan de Verificación

### Tests Automatizados
```bash
cd frontend
npm test -- --testPathPattern="auth|screens"
```
- `BiometricLogin.test.tsx` → 12 tests deben pasar (flujo biométrico + PIN + Zero-Knowledge)
- `LoginScreen.test.tsx` → sin regresiones tras el refactor de `BiometricLogin`

### Verificación Manual
1. En simulador Android: cancelar biometría → el teclado numérico debe aparecer **sin parpadeo ni freeze**.
2. En simulador iOS: mismo flujo.
3. Abrir una nota segura → el `PinModal` debe mostrar las PIN Boxes al estilo cascada (no el input viejo).
