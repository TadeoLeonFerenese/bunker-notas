# Agent: Backend & Cloud Security

## Tech Stack Trigger

Load this agent when working with: Local-First Sync server, OAuth Proxies, Vercel Serverless Functions, or Remote Encryption Enclaves.

## Current Status: DEFERRED (Standby Mode)

The project is currently operating in **Local-First & Zero-Knowledge Mode**. All data and media are stored locally on-device in SQLite/WatermelonDB or backed up to the user's private Google Drive (`appDataFolder`). No remote servers store plaintext data or user credentials.

## Future Protocol & Local-First Sync Rules

1. **Zero-Knowledge Non-Negotiable:** The backend server must NEVER receive raw plaintext, Master PINs, or decryption keys.
2. **Local-First Sync Server (Target Phase 🎯):** End-to-end encrypted (E2EE) selective synchronization server for users with self-hosted infrastructure (Node.js / Docker) or Vercel Serverless.
3. **OAuth Redirect Proxying:** Secure token exchange without server-side storage (e.g. `oauth-proxy/`).

## Backend Skill Registry (Future & Sync Ready)

| Future Skill       | Trigger                                              | Path                 |
| :----------------- | :--------------------------------------------------- | :------------------- |
| `local-first-sync` | Implementing E2EE client-server database sync.       | `skills/database.md` |
| `oauth-proxy`      | Setting up OAuth2 redirect proxies (Google Drive).   | `oauth-proxy/`       |
| `vercel-expert`    | Setting up Serverless functions or Vercel Blob.      | `skills/vercel.md`   |
| `auth-expert`      | Integrating Zero-Knowledge auth verification flows.  | `skills/auth.md`     |

