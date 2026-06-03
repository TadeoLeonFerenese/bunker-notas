# Skill Registry — Bunker Notas

Este archivo registra las habilidades y agentes locales disponibles en el proyecto, mapeando sus triggers y rutas relativas para facilitar la carga automática por parte de los agentes de IA.

## Agentes del Proyecto

| Agente | Trigger de Stack / Contexto | Ruta del Agente |
| :--- | :--- | :--- |
| `global-strategist` | Arquitectura general, fases del proyecto, configuración raíz. | [AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/AGENTS.md) |
| `frontend-dev` | UI/UX, Expo, WatermelonDB, Lógica Mobile, Autenticación Local. | [AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/AGENTS.md) |
| `backend-dev` | Vercel Functions, Supabase Auth, Enclaves en la Nube (Actualmente Diferido). | [AGENTS.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/backend/AGENTS.md) |

## Habilidades del Frontend (Core & Mobile)

| Habilidad | Trigger de Contexto | Archivo / Ruta |
| :--- | :--- | :--- |
| `ts-expert` | Edición o creación de archivos `.ts` o `.tsx`. | [typescript.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/typescript.md) |
| `expo-master` | Modificaciones de navegación, módulos nativos o configuración de Expo. | [expo.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/expo.md) |
| `tailwind-pro` | Estilado de componentes o configuración de Tailwind CSS / NativeWind. | [tailwind.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/tailwind.md) |
| `jest-expert` | Creación y ejecución de tests en la carpeta `__tests__`. | [jest.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/jest.md) |
| `expo-go-expert` | Resolución de compatibilidad y depuración para Expo Go en dispositivos físicos. | [expo-go-expert.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/frontend/skills/expo-go-expert.md) |

## Habilidades del Backend (Futuras / En Pausa)

| Habilidad | Trigger de Contexto | Archivo / Ruta |
| :--- | :--- | :--- |
| `vercel-expert` | Configuración de Serverless Functions o Vercel Blob. | [vercel.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/backend/skills/vercel.md) |
| `auth-expert` | Integraciones de autenticación de nube (Supabase Auth / Clerk). | [auth.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/backend/skills/auth.md) |
| `db-cloud-expert` | Configuración o consultas en bases de datos remotas / Postgres. | [database.md](file:///c:/Users/Tadeo%20Leon%20Ferense/Desktop/Repositorios/bunker-notas/backend/skills/database.md) |

## Reglas Compactas del Proyecto

### Desarrollo Frontend
- **TDD Obligatorio:** Escribir los tests en `__tests__` antes de crear o modificar componentes.
- **Seguridad Zero-Knowledge:** La encriptación es local con AES-256 (`react-native-keychain` y `expo-local-authentication`).
- **WatermelonDB:** Toda consulta y mutación a la base de datos local SQLite debe ser reactiva y optimizada.
- **Expo SDK 54:** Las funciones clásicas de `expo-file-system` deben importarse desde `expo-file-system/legacy` en lugar de `expo-file-system`.
