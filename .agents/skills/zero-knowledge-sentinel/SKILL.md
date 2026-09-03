---
name: zero-knowledge-sentinel
description: >
  Auditor de seguridad Zero-Knowledge y guardián criptográfico para Bunker Notas.
  Trigger: Edición o creación de archivos en src/ai/, src/backup/, src/database/, src/services/, o manejo de tokens, derivación de claves, autenticación, fetch y logs.
license: MIT
metadata:
  author: bunker-notas
  version: "1.0"
---

# Zero-Knowledge Sentinel 🛡️

Esta skill audita de forma estricta que la arquitectura **Zero-Knowledge** y el modelo **Local-First** de Bunker Notas se mantengan 100% inviolables en cualquier cambio de código.

## Triggers de Activación
- Archivos en `frontend/src/services/` (auth, backup, encryption, biometrics).
- Archivos en `frontend/src/ai/` (asistente de IA, BYOK).
- Archivos en `frontend/src/database/` (modelos, migraciones, persistencia).
- Cualquier función que involucre tokens, passwords, PINs, salts, requests HTTP o logging.

---

## Reglas Innegociables de Seguridad

### 1. Prohibición de Exposición de Claves y Material Criptográfico
- **NUNCA** imprimir `sessionKey`, `masterKey`, hashes PBKDF2, sales criptográficas o PINs en `console.log`, `console.error` o telemetría.
- Si se requiere depurar flujos criptográficos, loguear únicamente estados booleanos (ej. `hasValidSession: true`) o longitudes de buffer, nunca el payload ni la llave.

### 2. Aislamiento del Asistente de IA (BYOK)
- **CERO filtración de secretos al LLM:** Ningún PIN, hash de autenticación, sal derivada o clave privada puede incluirse en el prompt o system prompt enviado a los proveedores de IA (OpenAI, Gemini, Groq, OpenRouter).
- Si el usuario solicita procesar una nota segura (`isSecure: true`), el contenido debe desencriptarse localmente en memoria sólo para el prompt y volver a cerrarse; nunca enviar metadatos criptográficos en la solicitud.

### 3. Almacenamiento Seguro Exclusivo en Hardware Keystore
- El **Master PIN**, las credenciales de OAuth (como `client_secret` de Google Drive) y los tokens de sesión sensibles deben almacenarse **exclusivamente** en el almacenamiento seguro del hardware (`react-native-keychain` / `storeSecureCredential`).
- **PROHIBIDO** guardar PINs, contraseñas o tokens en `AsyncStorage`, `localStorage` plano o campos sin encriptar de WatermelonDB.

### 4. Criptografía Simétrica Compatible con Expo Go y Jest
- Utilizar `crypto-js` (AES-256 con derivación PBKDF2 + salt aleatorio y 10.000 iteraciones).
- No introducir módulos nativos C++/Rust no soportados por Expo Go sin fallback puro en TypeScript/JS para mantener la suite de tests de Jest en verde.

### 5. Backups Zero-Knowledge (Google Drive appDataFolder)
- Las copias de seguridad remotas deben residir exclusivamente en la carpeta privada `appDataFolder` de Google Drive del usuario.
- El archivo de backup debe estar completamente cifrado con la clave derivada del usuario antes de salir del dispositivo móvil. Cero servidores proxy que almacenen datos en texto plano.
