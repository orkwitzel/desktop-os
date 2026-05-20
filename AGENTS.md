# Agent instructions

This file is for **automated coding agents** (and humans acting like them). Read it before making changes.

## Project in one sentence

`desktop-os` is a **React + Vite** single-page app that mimics a **Windows 95–style desktop**: shortcuts open lazily loaded “apps” inside draggable, resizable, minimizable windows, coordinated by a central window manager.

## Read first

- `docs/CONTRIBUTING.md` — commit style, code rules, repo layout, and review expectations.
- `docs/ROADMAP.md` — phased plan with step IDs and **Status** columns.
- `docs/keyboard-shortcuts.md` — shell keyboard chords; update when changing `ShellKeyboard.tsx`.

## Component conventions

- **Hooks in `Component.tsx`** — `useState`, effects, and colocated `use<Component>` helpers live in the view file.
- **Pure logic in `Component.logic.ts`** — reducers, types, constants, and pure functions only (no `use*` hooks).

## Planning

Use **Cursor Plan mode** for multi-step work. Follow `docs/CONTRIBUTING.md` for code conventions; no mandatory `docs/specs/` trilogy before editing `src/`.

## Architectural boundaries (do not break casually)

1. **Session truth lives in the reducer** — `src/store/session/sessionReducer.ts` owns window transitions. UI calls verbs on `WindowManagerApi`; avoid duplicate geometry or z-order logic elsewhere.

2. **Apps stay inside the client area** — Window chrome (`WindowFrame`) renders controls and sizing; app roots (`src/apps/*`) must not escape the window metaphor without an explicit design change.

3. **Registration is explicit** — Apps are listed in `src/components/shell/registry.base.ts` with `React.lazy` for code splitting.

4. **Refs during render** — Follow existing patterns: sync refs with `useLayoutEffect` where ESLint requires it.

## Commands to verify work

```bash
npm run build
npm run lint
```

## Common tasks

| Goal | Where to change |
|------|------------------|
| New desktop program | Add `src/apps/<name>/`, register in `registry.base.ts`. |
| Desktop shortcuts | `seedFs.ts` + desktop FS entries |
| Taskbar / Start menu | `components/shell/Taskbar/`, `StartMenu/` |
| Session semantics | `sessionTypes.ts`, `sessionReducer.ts`, `WindowManagerProvider` |
| Shell keyboard shortcuts | `ShellKeyboard.tsx`, `docs/keyboard-shortcuts.md` |

## Defaults unless the user overrides

- **Desktop-first** — Mobile adaptations are roadmap scope unless requested.
- **Multiple instances per app id** — `openApp` opens a new window with a fresh id.
- **Small diffs** — Match surrounding style; avoid unrelated refactors.

When unsure, ask the user or record ambiguity in `docs/ROADMAP.md`.
