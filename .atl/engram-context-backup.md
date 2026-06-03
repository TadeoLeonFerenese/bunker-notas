# Engram Context Backup — Bunker Notas
**Fecha de Sesión:** 2026-05-19
**Proyecto:** Bunker Notas (TadeoLeonFerense/bunker-notas)

---

## 📌 Observación de Arquitectura y Configuración: Desacople de Biometría y Fix de Red Metro (2026-05-14)
**Topic Key:** `architecture/auth-model`
**Scope:** `project`
**Type:** `architecture`

### **What**
Refactorización del ciclo de vida de autenticación en `BiometricLogin.tsx` y `LoginScreen.tsx` implementando una máquina de estados limpia y escucha de `AppState`, y resolución de empaquetado de decoradores y red en Metro.

### **Why**
Evitar colisiones nativas entre el prompt biométrico del OS y el teclado numérico en Android/iOS, y permitir el correcto testing en dispositivos físicos saltando los adaptadores virtuales de Windows.

### **Where**
*   `frontend/src/auth/BiometricLogin.tsx`
*   `frontend/src/screens/LoginScreen.tsx`
*   `frontend/babel.config.js`
*   `implementation_plan.md`

### **Learned**
1. **Colisiones Nativas:** Forzar un `focus()` numérico con `setTimeout` mientras el OS cierra un prompt biométrico genera race conditions. Atar el foco estrictamente a la transición de `AppState` hacia `active` asegura una experiencia sin parpadeos.
2. **Babel y WatermelonDB:** En modo Web, la transformación de decoradores exige que `transform-class-properties` esté configurado en loose mode y se ejecute en el orden correcto.
3. **Redes Metro en Windows:** Si la PC tiene placas virtuales (VPN, VMware), Expo bindea a IPs inaccesibles (ej. `5.2.192.66`). Forzar `--tunnel` o `EXPO_LOCAL_HOST` es indispensable para probar con Expo Go.

---

## 📌 Observación de Arquitectura y Configuración: Fix de Sistema de Archivos en Expo SDK 54 (expo-file-system/legacy) (2026-05-19)
**Topic Key:** `bugfix/sdk54-file-system`
**Scope:** `project`
**Type:** `bugfix`

### **What**
Corrección de importación de `expo-file-system` a `expo-file-system/legacy` en `ThemeContext.tsx`, `App.tsx`, y `BackupService.ts`, y reestructuración de `ImageBackground` como hermano absoluto de la interfaz principal.

### **Why**
En Expo SDK 54 (`expo-file-system` v19), la importación por defecto migró a una API orientada a objetos (clases `File`/`Directory`), haciendo que `documentDirectory` sea `undefined` en tiempo de ejecución. Además, Android colapsa el layout de `ImageBackground` cuando contiene hijos flexibles, haciendo que las imágenes dinámicas no se rendericen.

### **Where**
*   `frontend/src/theme/ThemeContext.tsx`
*   `frontend/App.tsx`
*   `frontend/src/migration/BackupService.ts`
*   `frontend/__tests__/theme/ThemeContext.test.tsx`
*   `frontend/__tests__/migration/BackupService.test.ts`
*   `frontend/jest.setup.js`

### **Learned**
1. **Expo SDK 54 deprecations:** La API clásica basada en paths de string se encuentra únicamente bajo `expo-file-system/legacy` en SDK 54.
2. **Layouts de ImageBackground en Android:** Usar `ImageBackground` con `StyleSheet.absoluteFillObject` como hermano de la interfaz evita colisiones con el posicionamiento flexible (`flex: 1`) de los componentes hijos.

---

## 📋 Session Summary (Sumario de Sesión - 2026-05-19)

### Goal
Resolver el bug de selección y aplicación de imágenes de fondo para el dashboard en Android y adaptar la persistencia nativa para Expo SDK 54.

### Instructions
*   Usar `.atl/engram-context-backup.md` para persistir el contexto en lugar de la base de datos de Engram global.
*   Mantener el enfoque TDD obligatorio en todo momento.

### Discoveries
*   `FileSystem.documentDirectory` retorna `undefined` en Expo SDK 54 si no se importa desde `expo-file-system/legacy`.
*   Android requiere posicionamiento absoluto para fondos dinámicos en vistas que usan `flex: 1` para no colapsar el tamaño de la imagen.

### Accomplished
*   ✅ Cambiada toda la lógica de sistema de archivos a `expo-file-system/legacy`.
*   ✅ Refactorizado el renderizado de fondo en `App.tsx` usando posicionamiento absoluto e independiente.
*   ✅ Agregado sistema de depuración en consola para monitorear tamaño y existencia de la imagen de fondo.
*   ✅ Actualizado el set de tests unitarios de Jest, logrando 75 tests aprobados de forma exitosa (100% de cobertura requerida).

### Relevant Files
*   `frontend/src/theme/ThemeContext.tsx` — Manejo del estado y carga de fondos guardados.
*   `frontend/App.tsx` — Renderizado e inspección de depuración en tiempo de ejecución.
*   `frontend/src/migration/BackupService.ts` — Lógica de restauración y backups persistentes.
