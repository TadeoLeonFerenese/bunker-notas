# Engram Context Backup — Bunker Notas
**Fecha de Sesión:** 2026-05-14
**Proyecto:** Bunker Notas (TadeoLeonFerense/bunker-notas)

---

## 📌 Observación de Arquitectura y Configuración: Desacople de Biometría y Fix de Red Metro
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

## 📋 Session Summary (Sumario de Sesión)

### Goal
Alineación del plan de implementación, resolución de colisiones entre biometría nativa y teclado numérico en iOS/Android mediante `AppState`, y corrección del empaquetado de decoradores en la Web.

### Instructions
*   TDD obligatorio y diseño premium estilo Galicia.
*   Evitar bloqueos de SQLite respaldando en archivos locales `.atl`.

### Discoveries
*   En modo Web, WatermelonDB requiere que `@babel/plugin-transform-class-properties` esté en modo loose:true después de los decoradores para no fallar.
*   En Windows con adaptadores virtuales (Hamachi, VPN, WSL), Metro bindea a la IP virtual (ej. `5.2.192.66`), impidiendo que el celular acceda por Wi-Fi. La solución es usar `--tunnel`.

### Accomplished
*   ✅ Refactorización de `BiometricLogin.tsx` y `LoginScreen.tsx` usando `AppState`.
*   ✅ Alineación de 16 tests de Jest corriendo exitosamente con Exit code 0.
*   ✅ Alineación de dependencias de Expo SDK 54 con `npx expo install --fix`.

### Relevant Files
*   `frontend/src/auth/BiometricLogin.tsx` — Desacople de biometría y PIN.
*   `frontend/src/screens/LoginScreen.tsx` — Sincronización de UI en cascada.
