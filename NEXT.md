# NEXT — mcp-server-gsc-fork status

**Updated:** 2026-11-04 · **Plan:** PLAN.md · **Spec:** — · **Live:** unknown (stdio server; a Cloudflare Worker entry exists, deployment unverified)

## Current position
<!-- progress:begin -->
Progress: 0% · scope 46 tasks · hours 0.0 · cost $0.00 · plan @383f44bc
| Initiative | % | Done/Total | State | Open epics |
|---|---|---|---|---|
| I1 Carried work | 0 | 0/3 | not started | E1.1 |
| I2 Test stage | 0 | 0/0 | dropped | — |
| I3 Security | 0 | 0/7 | not started | E3.1, E3.4 |
Dropped epics (left out of the mean): E2.1, E3.2, E3.3
<!-- progress:end -->
Baselined on 2026-11-04 during the new-Mac migration (Task 27). Fork of ahonn/mcp-server-gsc (v0.3.0, remediated 2026-10-14, see REMEDIATION.md). No criterion has been run yet; the first `/next verify` ticks or reopens them. The agent that drafted the plan expects T3.1.2 (env isolation) to fail because `src/index.ts` reads `process.env` directly.

## Direction
<!-- direction:begin -->
State: forward · verified this session: — · reopened: none · flat sessions: 0 · ledger @0
<!-- direction:end -->
Rule: when the state is circling, stop building. Write the loop into Decisions (what was tried, why it failed its criterion). Choose one: split the task, change the approach with a named hypothesis, or raise a blocker for Diego. No new attempt until that is written.

## Decisions
- 2026-11-04 — Baselined with `/next baseline` on Diego's yes (migration Task 27). Security tasks that need staging, uploads or a rate-limit decision were dropped (reasons in PLAN.md).

## Blockers / awaiting you
—

## Notes carried forward
- Claude Code's `google-search-console` MCP server (local scope) runs `node dist/index.js` from this folder with `GOOGLE_APPLICATION_CREDENTIALS` pointing at `~/.openclaw/credentials/gsc-service-account.json`. **That file does not exist on this Mac** (checked 2026-11-04: the folder is empty), so a real Search Console query will fail until a service-account file is placed and the path repointed. Blocker for Diego if he wants to use it.
- Both `package-lock.json` and `pnpm-lock.yaml` are tracked; REMEDIATION.md used npm.
- The Worker's `/mcp` has bearer auth only when `MCP_API_TOKEN` is set; without it the endpoint is open.

## Verify with
- `npm run build`
- `npx tsc --noEmit`

## Last session — 2026-11-04
Baselined this project: PLAN.md written from the draft, NEXT.md created, ledger started.

## History
Older sessions → `HISTORY.md` (not auto-read). Entries are written by the SessionEnd hook; the agent fills Asked, Decided and Shipped.
