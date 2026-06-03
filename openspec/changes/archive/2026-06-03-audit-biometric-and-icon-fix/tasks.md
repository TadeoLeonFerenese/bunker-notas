# Tasks: Auditoría de Biometría y Corrección de Ícono

## Phase 1: Infrastructure and Preparation
- [x] 1.1 Instalar `jimp` en devDependencies de `frontend/package.json`.
- [x] 1.2 Ejecutar el script `node process-icon.js` en `frontend/` para recrear los iconos con `BunkerNotas.png` del Escritorio.

## Phase 2: Audit and Testing (TDD RED Phase)
- [x] 2.1 Crear el archivo de pruebas `frontend/__tests__/auth/BiometricFlow.test.tsx` con escenarios que verifiquen el no cruzamiento de acciones de abrir y borrar. (RED: los tests deben fallar).

## Phase 3: Core Implementation (TDD GREEN Phase)
- [x] 3.1 Modificar en `frontend/App.tsx` las funciones `showPinInput`, `tryBiometricAuth` y `executeAuthAction` agregando el parámetro explícito `action`.
- [x] 3.2 Remover la variable de estado obsoleta `authAction` en `frontend/App.tsx` para evitar closures asíncronos con estado desactualizado.
- [x] 3.3 Correr los tests en `frontend/__tests__/auth/BiometricFlow.test.tsx` para verificar que pasen en verde (GREEN).

## Phase 4: Verification and Cleanup
- [x] 4.1 Correr el suite completo de tests del proyecto `npm run test`.
- [x] 4.2 Ejecutar chequeo de tipos con `npx tsc --noEmit` en `frontend/` para asegurar que no haya errores de compilación de TypeScript.
