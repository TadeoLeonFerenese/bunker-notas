---
name: play-store-auditor
description: >
  Auditor de configuración, versiones y requerimientos de Google Play Store para builds de React Native / Expo.
  Trigger: Cambios en app.json, package.json, .github/workflows/, eas.json o archivos relacionados con release, keystore o build.
license: MIT
metadata:
  author: bunker-notas
  version: "1.0"
---

# Play Store Auditor 🎯

Auditor automático de release, empaquetado y compatibilidad con Google Play Store para el proyecto Bunker Notas.

## Triggers de Activación
- Cambios en `frontend/app.json` o `frontend/package.json`.
- Modificaciones en `.github/workflows/` (CI/CD de GitHub Actions).
- Configuraciones de `eas.json` o scripts de empaquetado y release.

---

## Reglas Críticas de Auditoría

### 1. VersionCode Incremental Obligatorio
- En cada cambio orientado a release o actualización de versión (`version` semántica en `app.json`), el valor `android.versionCode` DEBE incrementarse de forma monótona (ej. de `1` a `2`). Google Play rechaza cualquier bundle con `versionCode` duplicado o inferior.

### 2. Google OAuth Client ID en Modo "Web Application"
- Para la autenticación OAuth PKCE client-side hacia Google Drive (`appDataFolder`), el Client ID de Google Cloud Console debe configurarse como tipo **"Web Application"** (o credencial multiplataforma con redirect URI compatible) y **NO** como cliente Android nativo ligado a la huella digital SHA-1 del keystore de debug. Esto evita que la APK de release de Google Play rompa el flujo de autenticación tras la firma en la nube.

### 3. Declaración Justificada de Permisos Sensibles
- **`RECORD_AUDIO`**: Exclusivamente para notas de voz en la app.
- **`USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM`**: Exclusivamente para recordatorios y alarmas de notas programadas por el usuario.
- **`USE_BIOMETRIC` / `USE_FINGERPRINT`**: Para desbloqueo seguro de la bóveda.
- No solicitar permisos de almacenamiento general (`READ_EXTERNAL_STORAGE` / `MANAGE_EXTERNAL_STORAGE`) innecesarios; usar `Storage Access Framework` o `appDataFolder` en Google Drive.

### 4. ❌ PROHIBIDO Ejecutar Builds EAS Locales
- Siguiendo las reglas de oro de Bunker Notas: **NUNCA correr `eas build` localmente**. Las compilaciones de producción y testing de la APK/AAB se disparan automáticamente mediante GitHub Actions CI/CD en push a `main`.

### 5. Integridad de Assets y Splash Screen
- Verificar que `app.json` referencie correctamente `assets/icon.png`, `assets/adaptive-icon.png` y `assets/splash-icon.png` (sincronizados con el branding oficial sin logos genéricos de Expo).
