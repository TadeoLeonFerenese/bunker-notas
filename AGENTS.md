# Bunker Notas — Master Agent Skills & Delegation Index

Load the relevant skill/agent BEFORE writing any code. Follow the progressive disclosure strategy: Phase 1 & 2 only.

## Global Rules & Core Principles

- **Package Manager:** `npm` exclusively. Never use yarn or pnpm.
- **Security:** Zero-Knowledge architecture. Local-First. All encryption is client-side (AES-256 via PBKDF2 + salt).
- **Workflow:** TDD Mandatory (Jest + React Native Testing Library). 90+ tests must remain passing. Clean code refactor after every green test.
- **Builds & Distribution:** Never run local EAS builds. Builds are generated via GitHub Actions CI/CD on push to `main`.

## Master Delegation & Skill Registry

| Agent / Skill       | Trigger                                               | Path                |
| :------------------ | :---------------------------------------------------- | :------------------ |
| `global-strategist` | Overall architecture, project phases, or root config. | `./AGENTS.md`       |
| `frontend-dev`      | UI/UX, Expo, WatermelonDB, Modals, or Mobile Logic.   | `frontend/AGENTS.md`|
| `backend-dev`       | Local-First Sync, OAuth Proxies, or Remote Security.  | `backend/AGENTS.md` |
| `modal-responsive`  | Building/updating Modals, inputs, or soft keyboard.   | `frontend/AGENTS.md`|
| `expo-go-expert`    | Handling Expo Go and native module compatibility.     | `frontend/skills/expo-go-expert.md` |
| `crypto-security`   | Handling local encryption, AES-256 and credentials.   | `frontend/skills/crypto-security.md` |
| `watermelondb`      | Managing database query logic, schemas and migrations.| `frontend/skills/watermelondb.md` |

## Task Routing Logic

1. **If user asks for UI, Modals, Styling, Keyboards, or Mobile App features:** Immediately route to `frontend-dev` (`frontend/AGENTS.md`) and apply mandatory responsive modal rules.
2. **If user asks for Server, E2EE Sync, OAuth Proxy, or Cloud:** Route to `backend-dev` (`backend/AGENTS.md`).
3. **If user asks for Architecture, CI/CD, or Project Roadmap:** Handle at Root Level (`./AGENTS.md` and `ROADMAP.md`).

**Note:** The human (tanke) is the Lead Orchestrator. AI agents must wait for phase approval.

