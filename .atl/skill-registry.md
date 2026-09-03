# Skill Registry — Bunker Notas

Este registro centraliza las habilidades y agentes disponibles en el proyecto, mapeando sus triggers y rutas relativas para su resolución automática en Antigravity y Agent Teams Lite.

## Agentes del Proyecto

| Agente | Trigger de Stack / Contexto | Ruta del Agente |
| :--- | :--- | :--- |
| `global-strategist` | Arquitectura general, fases del proyecto, configuración raíz o roadmap. | [AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/AGENTS.md) |
| `frontend-dev` | UI/UX, Expo, WatermelonDB, Lógica Mobile, Autenticación Local y Modales. | [frontend/AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/AGENTS.md) |
| `backend-dev` | **ESTADO: STANDBY (Diferido)**. Solo para futuras fases de sync E2EE o proxies OAuth. | [backend/AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/backend/AGENTS.md) |

## Habilidades de Élite (Seguridad, Datos, Optimización & Release)

| Habilidad | Trigger de Contexto | Archivo / Ruta |
| :--- | :--- | :--- |
| `gemini-model-router` | Enrutamiento inteligente de modelos (3.1-3.8 Low/Med/High) para ahorro de tokens. | [.agents/skills/gemini-model-router/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/gemini-model-router/SKILL.md) |
| `zero-knowledge-sentinel` | Archivos en `src/services/`, `src/ai/`, `src/backup/`, o manejo de tokens, keys y logs. | [.agents/skills/zero-knowledge-sentinel/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/zero-knowledge-sentinel/SKILL.md) |
| `watermelon-reactive-expert` | Archivos en `src/database/`, `src/models/`, decoradores o queries de WatermelonDB. | [.agents/skills/watermelon-reactive-expert/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/watermelon-reactive-expert/SKILL.md) |
| `play-store-auditor` | Cambios en `app.json`, `package.json`, `.github/workflows/`, o scripts de build y release. | [.agents/skills/play-store-auditor/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/play-store-auditor/SKILL.md) |
| `byok-llm-wrapper` | Archivos en `src/ai/`, prompts del sistema, sanitización de API keys o parsers JSON. | [.agents/skills/byok-llm-wrapper/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/byok-llm-wrapper/SKILL.md) |

## Habilidades del Frontend (Core Mobile)

| Habilidad | Trigger de Contexto | Archivo / Ruta |
| :--- | :--- | :--- |
| `ts-expert` | Edición o creación de archivos `.ts` o `.tsx`. | [frontend/skills/typescript.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/typescript.md) |
| `expo-master` | Navegación, módulos nativos o configuración de Expo. | [frontend/skills/expo.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/expo.md) |
| `tailwind-pro` | Estilado de componentes o configuración de NativeWind / Tailwind CSS. | [frontend/skills/tailwind.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/tailwind.md) |
| `jest-expert` | Creación y ejecución de tests en la carpeta `__tests__`. | [frontend/skills/jest.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/jest.md) |
| `expo-go-expert` | Depuración y compatibilidad para Expo Go en dispositivos físicos. | [frontend/skills/expo-go-expert.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/expo-go-expert.md) |
| `crypto-security` | Encriptación AES-256 PBKDF2, Hardware Keystore y autenticación biométrica. | [frontend/skills/crypto-security.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/crypto-security.md) |
| `watermelondb` | Esquemas, migraciones y consultas reactivas en SQLite local. | [frontend/skills/watermelondb.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/watermelondb.md) |
| `modal-responsive` | Creación y actualización de modales responsivos con soporte de teclado. | [frontend/AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/AGENTS.md) (Sección 3) |

## Habilidades de Calidad Web & UI

| Habilidad | Trigger de Contexto | Archivo / Ruta |
| :--- | :--- | :--- |
| `frontend-design` | Diseño de interfaces de alta calidad y componentes visuales pulidos. | [.agents/skills/frontend-design/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/frontend-design/SKILL.md) |
| `accessibility` | Auditoría y accesibilidad WCAG 2.2, screen readers y soporte a11y. | [.agents/skills/accessibility/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/accessibility/SKILL.md) |
| `seo` | Optimización de metadatos y visibilidad para web. | [.agents/skills/seo/SKILL.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/.agents/skills/seo/SKILL.md) |

## Backend en Standby (Local-First Zero-Knowledge)
*Nota: El backend (`backend/skills/`) permanece en pausa arquitectónica. No emite triggers activos para optimizar tokens y ventana de contexto.*

---

## Reglas Compactas del Proyecto

### Desarrollo Frontend & Mobile
- **TDD Obligatorio:** Escribir tests en `__tests__` antes de crear/modificar componentes. Mantener 90+ tests en verde (`npm test`).
- **Seguridad Zero-Knowledge:** Criptografía puramente client-side con AES-256 (`crypto-js` + PBKDF2 + salt). Credenciales y Master PIN residen únicamente en el Hardware Keystore (`react-native-keychain`).
- **WatermelonDB State Safety:** Prohibido shallow spread `{ ...note }` en estado de React. Todas las mutaciones van dentro de `database.write(async () => { ... })`. Usar casteo booleano explícito `!!` en JSX.
- **Modales Responsivos:** Todo modal debe estar envuelto en `KeyboardAvoidingView` + `ScrollView` con `keyboardShouldPersistTaps="handled"`. Cero oclusión por teclado.
- **Expo SDK 54:** Funciones clásicas de `expo-file-system` deben importarse desde `expo-file-system/legacy`.
- **Compilaciones & CI/CD:** NUNCA ejecutar `eas build` local. Builds gestionados automáticamente por GitHub Actions al hacer push a `main`.
- **Optimización de Tokens:** Aplicar la matriz de `gemini-model-router` (Low/Med/High) para no gastar tokens de razonamiento profundo en tareas mecánicas.
