# desktop-os

A **Win95-style desktop shell** for the browser: draggable, resizable, minimizable windows; virtual filesystem; lazy-loaded React apps.

Built with **React 19**, **TypeScript**, and **Vite**.

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build   # production bundle
npm run lint    # ESLint
npm run preview # local preview of dist/
```

## Built-in apps

- **My Computer** — virtual FS explorer
- **Notepad** — text editor with IDB persistence
- **Settings** — theme and shell preferences
- **Minesweeper**, **Tetris** — demo games

Register more apps in [`src/components/shell/registry.base.ts`](src/components/shell/registry.base.ts).

## Extending

Fork or copy this repo and add your own apps under `src/apps/` (or a separate `src/site/` tree in your fork). Wire them in `registry.base.ts` and `seedFs.ts`.

This repo has **no hosting or deploy config** — add Vite `preview`, static hosting, or Workers in your own project.

## Documentation

| File | Purpose |
|------|---------|
| [AGENTS.md](./AGENTS.md) | Agent/human architecture boundaries |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Layout and code conventions |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Implementation plan |

## License

MIT — see [LICENSE](./LICENSE).
