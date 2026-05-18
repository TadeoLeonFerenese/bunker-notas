# Plan de Implementación: Autenticación Híbrida y Fallback de PIN

Este plan de implementación detalla la evolución del control de acceso de **Bunker Notas**.  
Nuestra arquitectura es **Zero-Knowledge, Local-First, y TDD obligatorio**.

---

## 🏛️ Decisiones de Arquitectura

1. **Uso de Bloqueo Local del Celular:**
   - Si el dispositivo tiene una seguridad configurada (PIN, Patrón, Contraseña, o Biometría) en el sistema operativo, **delegamos el acceso por completo al OS**.
   - No forzamos un PIN in-app si el usuario ya asegura su celular con un método nativo.

2. **Detección Dinámica (`expo-local-authentication`):**
   - Usaremos `LocalAuthentication.getEnrolledLevelAsync()` para detectar el nivel de seguridad del dispositivo.
   - Si el nivel es mayor a `NONE` (`SECRET`, `BIOMETRIC_WEAK` o `BIOMETRIC_STRONG`), ejecutamos la autenticación nativa por medio de `LocalAuthentication.authenticateAsync({ disableDeviceFallback: false })`.
   - Si el nivel es `NONE` (sin bloqueo local en el celular), obligamos a registrar/validar un PIN exclusivo para Bunker Notas.

3. **PIN in-app Zero-Knowledge (Caso sin bloqueo de celular):**
   - Si el celular no tiene bloqueo, el usuario definirá un PIN de 4-6 dígitos en el primer arranque.
   - Este PIN se hashea mediante `hashPin()` y se almacena de manera segura mediante `storeSecureCredential('app_pin_hash', hash)`.
   - En inicios subsiguientes, se solicita el PIN in-app y se valida con `verifyPin()`.

---

## 🛠️ Cambios Propuestos

### Componente 1 — Mock de Jest

#### [MODIFY] [jest.setup.js](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/jest.setup.js)
- Agregar mock de `SecurityLevel` enum y el método `getEnrolledLevelAsync` para evitar fallos en el entorno de tests.

---

### Componente 2 — Pantalla de Acceso

#### [MODIFY] [LoginScreen.tsx](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/src/screens/LoginScreen.tsx)
- **Mount check:** Llamar a `LocalAuthentication.getEnrolledLevelAsync()` para determinar la presencia de seguridad nativa.
- **Camino A (Con Seguridad de Celular):**
  - Ocultar las PIN Boxes y el botón secundario biométrico.
  - Mostrar un layout simplificado con el botón premium de desbloqueo nativo del celular.
  - Al presionar o montar, disparar `authenticateAsync` con `disableDeviceFallback: false`.
- **Camino B (Sin Seguridad de Celular):**
  - Mostrar el contenedor visual premium de PIN Boxes individuales.
  - Si no existe un PIN guardado en el llavero local (`getSecureCredential('app_pin_hash')`), entrar en modo **"Registro de PIN"**.
  - Si ya existe un PIN guardado, entrar en modo **"Login por PIN"** y verificar el hash con `verifyPin` al ingresar los dígitos.

---

### Componente 3 — Suite de Tests

#### [MODIFY] [LoginScreen.test.tsx](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/__tests__/screens/LoginScreen.test.tsx)
- Escribir casos de prueba dedicados:
  1. **Camino A:** Si `getEnrolledLevelAsync` es distinto de `NONE`, debe llamar a `authenticateAsync` nativo y no mostrar las PIN Boxes in-app por defecto.
  2. **Camino B (Registro):** Si `getEnrolledLevelAsync` es `NONE` y no hay hash guardado, debe mostrar el flujo para definir un PIN y registrarlo.
  3. **Camino B (Login):** Si `getEnrolledLevelAsync` es `NONE` y hay un hash guardado, debe permitir el login tras ingresar el PIN in-app correcto y fallar si es incorrecto.

---

## 🧪 Plan de Verificación

### Tests Automatizados
```bash
npm run test
```
Todos los 65 tests existentes más los nuevos tests agregados para validar los dos caminos deben pasar con éxito.

### Verificación Manual
1. **Emulador sin bloqueo:** Configurar el emulador sin ningún tipo de PIN de bloqueo de pantalla. Abrir la app, definir un PIN de 6 dígitos, cerrar y volver a abrir para loguearse con ese PIN.
2. **Emulador con bloqueo:** Configurar un PIN o huella en el sistema operativo del emulador. Al abrir la app, debe salir el prompt nativo y loguearse directo tras completarlo.
