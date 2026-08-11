# Agent: Frontend Developer (Mobile & Security)

## Tech Stack Trigger

Load this agent when working with: React Native, Expo Go, TypeScript, WatermelonDB, NativeWind, `crypto-js` (AES-256), `expo-notifications`, or AI Service integration.

## Execution Mandate & Architectural Rules

1. **TDD First:** Create `__tests__` before building or modifying components. Keep the 90+ test suite green.
2. **Local Security (Zero-Knowledge):** All sensitive data must be encrypted client-side using `crypto-js` (AES-256 via PBKDF2 + salt). Master keys and PINs live exclusively in `react-native-keychain` / Hardware Keystore.
3. **Responsive Modals & Keyboard Safety (MANDATORY):**
   - **Pattern:** Every new or updated modal MUST be wrapped in a `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`) containing an internal `ScrollView` with `keyboardShouldPersistTaps="handled"`.
   - **Zero Oclusion:** Static centered modals with fixed padding are STRICTLY PROHIBITED. All modals must collapse and scroll smoothly when soft/numeric keyboards open.
4. **Defensive Coding & Zero-Crash Principles:**
   - **Controlled Inputs:** Do NOT derive `TextInput` `value` props directly from Date objects or computed getters during active typing. Maintain local string states (`hourInputText`, `minuteInputText`) and validate/clamp on `onBlur` or confirmation to allow fluid 2-digit typing.
   - **WatermelonDB State Safety:** Never use shallow object spreads (`{ ...prev }`) on WatermelonDB `NoteModel` instances in React state, as it strips non-enumerable class getters (`title`, `content`). Always explicitly map properties.
   - **React Native Web Text Node Safety:** Always apply explicit boolean casting (`!!`) to optional string short-circuits in JSX (e.g. `!!note.audioUri`) to prevent `Unexpected text node: .` crashes in web containers.
   - **Icon & UI Fallbacks:** Ensure icon names and vector graphics degrade gracefully without empty render crashes.
5. **Visual Standards:** Follow Symmetrical Design Rules. Blurred thumbnails + Padlock badge for secure notes (`isSecure: true`).

## Skill Registry (Local)

| Skill             | Trigger                                               | Path                        |
| ----------------- | ----------------------------------------------------- | --------------------------- |
| `ts-expert`       | Working on .ts or .tsx files.                         | `skills/typescript.md`      |
| `expo-master`     | Modifying navigation, native modules or app config.   | `skills/expo.md`            |
| `tailwind-pro`    | Styling components or config with NativeWind.         | `skills/tailwind.md`        |
| `jest-expert`     | Writing or running tests in `__tests__` folder.       | `skills/jest.md`            |
| `expo-go-expert`  | Handling Expo Go and native module compatibility.     | `skills/expo-go-expert.md`  |
| `crypto-security` | Working with encryption, keychain, or local auth.    | `skills/crypto-security.md` |
| `watermelondb`    | Querying, creating, or migrating SQLite databases.    | `skills/watermelondb.md`    |
| `modal-responsive`| Creating or modifying Modals, inputs or keyboards.    | `AGENTS.md` (section 3 & 4) |
