# Contributing

Rules here apply to **human contributors** and to **coding agents**. Humans own final judgment on product direction; agents follow repo conventions and ask when requirements conflict.

This repository is the **desktop-os** upstream shell only. It has **no** Cloudflare/Wrangler deploy scripts. Hosting belongs in your fork (see [README](../README.md) § Extending).

## Project layout

```
src/
  App.tsx, App.style.ts       # Shell wiring (providers, lifted desktop selection)
  main.tsx, index.css, fonts.css   # Entry + global CSS only

  components/                  # All non-app UI
    shell/                     # OS chrome (desktop, taskbar, start menu, icons, …)
      Desktop/
      Taskbar/
      StartMenu/
      ShellIcon/
      WindowManagerProvider/
      registry.base.ts         # App definitions + lazy imports
      registry.tsx             # Re-exports registry.base
    wm/                        # Window chrome (frame + layer)
      WindowFrame/
      WindowLayer/
    shared/                    # UI shared across apps (not tied to one program)
      MarkdownView/

  apps/                        # Built-in OS demo apps (lazy-loaded)
    <app-name>/
      <Component>/             # One folder per component (see below)

  store/                       # Global client state
    fsStore.ts                 # Zustand (filesystem + shell binding)
    session/
      sessionTypes.ts
      sessionReducer.ts
      windowManagerContext.tsx

  hooks/                       # Shared React hooks
    useOs.ts                   # Unified OS API (fs, win, ui, clipboard, explorer)
    useWindowManager.ts        # Re-export from store/session

  os/                          # OS facade over stores/contexts (createOsApi, useOs)

  utils/                       # Pure helpers (no React, no UI)
    paths.ts
    desktopLayout.ts
    desktopSelection.ts
    shellCatalog.ts
    shellKeyboard.ts
    openExternalLink.ts
    nerdIcons.ts

  fs/                          # Virtual FS domain (IndexedDB, seed, routing)
    fsDb.ts, seedFs.ts, desktop.ts, extensionRouter.ts
    FsProvider.tsx, FsBootstrap.tsx
    types.ts

  content/                     # OS static assets (seed docs, icons)
    seed/
```

**What does not live in `components/`**

| Path | Role |
|------|------|
| `apps/` | Feature windows; same folder-per-component rules as shell |
| `fs/` | Data layer (DB, seed, open-by-extension) — not presentational |
| `content/` | Bundled text/markdown for seeding or `?raw` imports |
| `index.css`, `fonts.css` | Site-wide reset, fonts, CSS variables |

## Folder-per-component

Every React component gets its own directory:

```
components/shell/Desktop/
  Desktop.tsx           # View + hooks: JSX, useState/useEffect, colocated useDesktop
  Desktop.logic.ts      # Pure logic: reducers, types, constants, geometry helpers
  Desktop.style.ts      # styled-components primitives
  index.ts              # export { Desktop } from './Desktop'

apps/computer/FsTree/
  FsTree.tsx
  FsTree.logic.ts
  FsTree.style.ts       # Or import shared styles (see computer.style.ts)
  index.ts
```

**Child components** nest under their parent folder only when used exclusively by that parent. Otherwise place them as siblings (e.g. `components/shell/ShellIcon/`, not under `Desktop/`).

Thin apps (About, Resume) still use the full trio (`*.tsx`, `*.logic.ts`, `*.style.ts`) for a uniform tree—even when logic is minimal.

Optional `index.ts` barrels: add when import ergonomics matter (`@/components/shell/Desktop`); not required everywhere.

## The three-file split

| File | Responsibility | Must not contain |
|------|----------------|------------------|
| `Component.tsx` | JSX, React hooks (`useState`, `useEffect`, `useReducer`, `useCallback`, …), wiring callbacks into styled elements | Reducer implementations, pure algorithms, styled definitions |
| `Component.logic.ts` | Pure functions, reducers, types, constants (`START_MENU_ID`) | JSX, styled-components, `use*` hooks |
| `Component.style.ts` | `styled.*` exports, component-local visual tokens | Business logic, hooks, FS/session calls |

### `Component.tsx` (view + hooks)

- Shell/wm components: **named** export matching the folder (`export function Desktop`).
- App roots: **`export default function`** (`export default function NotepadRoot`); `index.ts` re-exports with `export { default } from './NotepadRoot'`.
- Colocate hooks in the same file: inline in the component body for small cases, or a same-file `function useDesktop(props) { … }` above/below the component for larger ones.
- Destructure hook return values directly—**do not** bundle refs into a single `vm` object if that triggers `react-hooks/refs` (pass `ref` from props or destructure `ref` separately from the hook).
- Small presentational subcomponents (e.g. `DragGhosts`) may live in the same file if they are view-only.

```tsx
// Desktop.tsx
import {
  desktopReducer,
  toDesktopItems,
  type DesktopProps,
  type DesktopShortcut,
} from './Desktop.logic'
import { Workspace, Shortcuts } from './Desktop.style'

function useDesktop(props: DesktopProps) {
  const [state, dispatch] = useReducer(desktopReducer, …)
  // effects, handlers…
  return { state, handleWorkspacePointerDown, marqueeStyle, … }
}

export function Desktop(props: DesktopProps) {
  const { state, handleWorkspacePointerDown, … } = useDesktop(props)
  const { workspaceRef } = props

  return (
    <Workspace ref={workspaceRef} onPointerDown={handleWorkspacePointerDown}>
      …
    </Workspace>
  )
}
```

### `Component.logic.ts` (pure logic)

- Export **types** used by the view (`DesktopProps`, `DesktopShortcut`, `DragState`).
- Export **reducers and action unions** private to the component.
- Keep **pure geometry/selection math** in `utils/` when shared; component-specific pure helpers stay here.
- No React hooks, JSX, or styled-components.

```ts
// Desktop.logic.ts
export type DesktopProps = { workspaceRef: RefObject<HTMLDivElement | null>; … }

export function desktopReducer(state: DesktopState, action: DesktopAction): DesktopState {
  // pure state transitions…
}
```

For components with almost no pure logic, `*.logic.ts` may hold only types (e.g. menu definitions in `AppMenuBar.types.ts`).

### `Component.style.ts` (presentation)

- Use **styled-components**; import `styled` from `'styled-components'`.
- Export named styled elements (`Workspace`, `TitleBar`, `Cell`).
- Use **`$`-prefixed transient props** for style variants (`$active`, `$selected`) to avoid leaking to the DOM.
- No imports from `store/`, `fs/`, or hooks.

```ts
// WindowFrame.style.ts
export const TitleBar = styled.div<{ $active: boolean }>`
  background: ${(p) => (p.$active ? '…' : '…')};
`
```

**Global CSS** stays in `index.css` / `fonts.css` only (reset, font faces, CSS variables). Do not add new `*.module.css` files.

## Where to put logic

| Kind of logic | Location | Example |
|---------------|----------|---------|
| Component state, effects, handlers | `Component.tsx` | Marquee drag, Start menu open/close |
| Pure functions (no React) | `utils/` or `Component.logic.ts` | `snapPosition`, `desktopReducer`, `basename` |
| Global Zustand store | `store/` | `fsStore.ts` |
| Session (windows, focus, z-order) | `store/session/` + context | `sessionReducer`, `useWindowManager` |
| OS API facade | `os/` | `useOs`, `createOsApi` |
| Shared hook re-exports | `hooks/` | `useOs.ts`, `useWindowManager.ts` |
| FS DB, seed, routing | `fs/` | `fsDb.ts`, `extensionRouter.ts` |
| App-only pure algorithms | `apps/<app>/*.logic.ts` | `minesweeper.logic.ts`, `tetris.logic.ts` |
| Shared non-app UI | `components/shared/` | `MarkdownView` |
| App registration + lazy load | `components/shell/registry.base.ts` | `defineApp`, `baseAppDefinitions` |

**Rules of thumb**

1. If it renders and is not an app window → `components/`.
2. If two or more components need the same pure function → `utils/`.
3. If it must survive outside one component tree → `store/` or `hooks/`.
4. If it touches IndexedDB or path routing → `fs/`.
5. If only one app uses it and it is not UI → `apps/<app>/` (`.logic.ts` at app or component level).

## Imports

- Use the **`@/`** alias for all `src/` imports: `@/store/fsStore`, `@/components/shell/Desktop`, `@/utils/paths`.
- Do not use deep relative paths (`../../fs/...`) in new code.
- Colocated imports within a component folder use `./` (`./Desktop.logic`, `./Desktop.style`).
- Configure in `vite.config.ts` (`resolve.alias`) and `tsconfig.app.json` (`paths`).

## Styling

- **styled-components** for component UI (`*.style.ts`).
- **Global** rules only in `index.css` / `fonts.css`.
- Shared design tokens across many components: add `src/theme.ts` when needed; until then duplicate or re-export from one `.style.ts`.
- Win95-style borders and colors: follow existing shell/wm patterns.

## Code rules

1. **TypeScript everywhere** in `src/` — explicit props for exported components; avoid `any`.
2. **Keep session transitions pure** — `sessionReducer` has no side effects; persistence/analytics stay outside unless redesigned.
3. **Lazy-load apps** — `defineApp()` in `registry.base.ts` (wraps `React.lazy`); import paths use `@/apps/<app>/<Component>`.
4. **Hooks & ESLint** — Respect `react-hooks` rules; fix ref/access issues by destructuring, not blanket disables.
5. **Hooks in `.tsx`** — When touching a component, keep new `use*` logic in `Component.tsx`, not in `.logic.ts`.

### Adding an application

1. Create `src/apps/<slug>/<Slug>Root/` with `SlugRoot.tsx`, `SlugRoot.logic.ts`, `SlugRoot.style.ts`, `index.ts`.
2. `SlugRoot` must accept `AppProps` from `@/store/session/sessionTypes`.
3. Register in `components/shell/registry.base.ts` with `defineApp(() => import('@/apps/my-app/MyRoot'), { id, defaultTitle, defaultBounds, icon })`.

4. Add launcher stub in `buildBaseSeedNodes()` inside `src/fs/seedFs.ts`.
5. Optionally pin to wallpaper via `/desktop/<name>.desktop`.

Use `useOs()` for OS actions (filesystem, windows, dialogs, clipboard, explorer integration). Subscribe to reactive state with `useFsStore((s) => …)` or `useWindowManager()` when you need `nodes`, `ready`, or `session` without pulling the full API. Prefer local state in `Component.tsx` for app internals.

```ts
const os = useOs()
const nodes = useFsStore((s) => s.nodes)

await os.fs.read(path)
os.win.openApp('notepad', { launch: { path } })
await os.ui.confirm({ title: 'Delete', message: '…' })
```

### Virtual filesystem (IndexedDB)

- Default tree: `src/fs/seedFs.ts` (`SEED_VERSION`, `buildSeedNodes()`). Bodies in `src/content/seed/` via Vite `?raw`.
- Bump `SEED_VERSION` when the default tree changes (clears and reseeds the DB).
- External URLs: `/www/<name>.www` JSON + optional `/desktop/*.desktop` shortcut.
- Wallpaper shows only `/desktop/*.desktop` entries.

## Git & commits

- Do **not** commit secrets (tokens, `.env` with real keys, personal URLs unless intentional).
- **Commit messages** (recommended convention):

  - Imperative mood, ~72-char subject line, optional body explaining *why*.
  - Examples:

    - `Add Minesweeper stub registered on desktop`
    - `Fix taskbar restore ordering when minimizing focused window`
    - `Document roadmap mobile milestones`

  - Scope prefixes optional but helpful:

    - `components/shell:` desktop, taskbar, start menu
    - `components/wm:` window chrome
    - `apps/<name>:` specific program
    - `store:`, `utils:`, `hooks:` shared modules
    - `docs:` documentation-only

- Prefer **one coherent change per commit** (feature / fix / docs split).

Pull requests should summarize behavior changes and include verification (`npm run build`, `npm run lint`) unless trivial docs-only edits.

## Roadmap ([ROADMAP.md](./ROADMAP.md))

**Always update the roadmap in the same change series** (commit or PR) when you ship or materially advance work — do not leave status for a follow-up.

Treat an update as **significant** when it affects any of:

- Phase or step completion (foundation, shell fidelity, apps, hardening, mobile, deployment).
- New or changed apps registered in the shell.
- Architecture or session/window-manager behavior that shifts what is Done vs still Todo.
- Blockers, deferrals, or reprioritization agreed in discussion.

When updating [ROADMAP.md](./ROADMAP.md):

1. Set **Status** on the relevant phase/step rows (see the legend at the top of that file).
2. Add or refresh **Notes** (e.g. initials + date for **In progress**; a short line for **Done** or **Blocked**).
3. Update the **Plan status (summary)** table when a whole phase moves (e.g. Phase 1 from Todo → In progress).

Small fixes (typos, copy, CSS-only tweaks with no milestone impact) do not require roadmap edits.

## Review checklist

- [ ] Build passes (`npm run build`).
- [ ] Lint passes (`npm run lint`).
- [ ] New components follow `Component.tsx` + `Component.logic.ts` + `Component.style.ts`.
- [ ] New apps registered + reachable from desktop or another sanctioned entry point.
- [ ] Session updates flow through reducer verbs — no parallel sources of truth for geometry/z-order.
- [ ] Imports use `@/` (no new deep `../../` chains).
- [ ] No new `*.module.css` (use `*.style.ts` instead).
- [ ] **[ROADMAP.md](./ROADMAP.md) updated** for every significant change (status, notes, summary table) — same PR/commit as the implementation.
- [ ] Other docs updated when behavior or architecture materially changes (`../agents.md`, this file, [README.md](../README.md)).

## Communication with agents

When assigning agent work, point to:

- Files and folders listed above,
- Acceptance criteria (“opening three Notepad instances still cascades”, etc.),
- Whether UX decisions may evolve ([ROADMAP.md](./ROADMAP.md)) vs must match mock/spec exactly.

For multi-step features, use **Cursor Plan mode** (interactive plan in chat; optional notes under `.cursor/plans/`). Product direction lives in [ROADMAP.md](./ROADMAP.md); archived specs under `docs/specs/2026-05-19-*` are historical only.

Agents: defer purely subjective branding choices (palette, pixel asset packs) to humans unless given freedom to proceed.
