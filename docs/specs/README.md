# Specs (archive)

Historical feature specs live under `docs/specs/2026-05-19-*/`. They remain valid
references for shipped work and are linked from [`docs/ROADMAP.md`](../ROADMAP.md).

**New work:** use Cursor's built-in **Plan mode** (interactive plan in chat;
optional scratch under `.cursor/plans/`). There is no mandatory
`requirements.md` → `design.md` → `tasks.md` trilogy and no approval gate
before editing `src/`.

Optional ad-hoc notes under `docs/` or `.cursor/plans/` are fine when useful —
not enforced by rules or skills.

Legacy planning notes may also exist under `docs/superpowers/plans/` (archive only).

## Verification (unchanged)

```bash
npm run lint
npm run build
```

## Related docs

- [`AGENTS.md`](../AGENTS.md) — agent guardrails and commands
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — code conventions and review checklist
- [`ROADMAP.md`](../ROADMAP.md) — phased plan and status
