# CLAUDE.md

Front door for `mcp-server-gsc` (fork of `ahonn/mcp-server-gsc`): an MCP server for Google Search Console. Branch `work/2026-11-04`.

## Read in this order
1. `NEXT.md`: status, direction and blockers. The progress blocks are written by a script; do not edit them.
2. `PLAN.md`: the task list with acceptance criteria. Tick a task only with evidence.
3. `docs/audit/2026-11-04-audit.md`: the audit ("F<n>" means its finding n). Follow-ups are in `docs/audit/2026-11-04-review-followups.md`.
4. `REMEDIATION.md`: the security remediation log. `README.md`: user-facing setup.

## Install and verify
`package-lock.json` is the authoritative lockfile (`pnpm-lock.yaml` is stale; do not use it). Node 22 or later.

```bash
npm ci                 # install from the lockfile
npx tsc --noEmit       # type-check (src only)
npx tsc --noEmit -p tsconfig.test.json   # type-check the tests
npm test               # node --import tsx --test test/*.test.ts
npm run build          # tsc into dist/
node --import tsx --test test/schemas.test.ts   # one focused test file
```

## Rules for this repo
- Nothing in tests or checks may call Google. Mock at the boundary the existing tests use.
- Never write a credential value into a file. The server reads `GOOGLE_APPLICATION_CREDENTIALS` (inline JSON or a key-file path); the Worker reads `GOOGLE_CREDENTIALS`.
- Do not change dependencies without a task that says so.
