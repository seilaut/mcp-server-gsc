# NEXT — mcp-server-gsc-fork status

**Updated:** 2026-11-04 · **Plan:** PLAN.md · **Spec:** — · **Live:** unknown (stdio server; a Cloudflare Worker entry exists, deployment unverified)

## Current position
<!-- progress:begin -->
Progress: 0% · Δ +0 since 2026-11-04 · scope 78 tasks (+0) · hours 0.0 · cost $0.00 · plan @43ed301d
| Initiative | % | Done/Total | State | Open epics |
|---|---|---|---|---|
| I1 Install, start and prove it | 0 | 0/7 | not started | E1.1, E1.2, E1.3 |
| I2 Test stage | 0 | 0/3 | not started | E2.2 |
| I3 Security | 0 | 0/18 | not started | E3.1, E3.4, E3.5 |
| I4 End product | 0 | 0/12 | not started | E4.1, E4.2 |
Dropped epics (left out of the mean): E2.1, E3.2, E3.3
<!-- progress:end -->
Baselined on 2026-11-04 during the new-Mac migration (Task 27). Fork of ahonn/mcp-server-gsc (v0.3.0, remediated 2026-10-14, see REMEDIATION.md).

Audited the same day (`docs/audit/2026-11-04-audit.md`), and PLAN.md was rewritten from that audit. Tonight's order is T1.2.1, then T1.2.2, then T1.3.1. A dry run with the criterion runner (no ticks) passes T1.1.3, T3.1.2, T3.1.3 and T3.1.5, and they need their ticks from `progress.mjs --run-ac`. T1.1.1's build already passed inside `npm ci`.

## Direction
<!-- direction:begin -->
State: forward · verified this session: — · reopened: none · flat sessions: 0 · ledger @0
<!-- direction:end -->
Rule: when the state is circling, stop building. Write the loop into Decisions (what was tried, why it failed its criterion). Choose one: split the task, change the approach with a named hypothesis, or raise a blocker for Diego. No new attempt until that is written.

## Decisions
- 2026-11-04 — Baselined with `/next baseline` on Diego's yes (migration Task 27). Security tasks that need staging, uploads or a rate-limit decision were dropped (reasons in PLAN.md).
- 2026-11-04 — PLAN.md rewritten from the audit (Phase 2). Changes:
  - **T1.1.3** now greps the refusal message. Its old criterion passed with no build (audit F2).
  - **T1.1.2** is dropped as a duplicate of T1.1.1.
  - **T3.1.7** (Worker logs) is dropped: no deployment is recorded, and the check needs production access.
  - **T3.1.14** names seilaut/mcp-server-gsc. `{owner}/{repo}` had resolved to the upstream repo.
  - **T3.1.2** checks guards, `dist/` and `process.env` directly. The gate's build scan reads only `.next/`.

  T3.1.2 and T3.1.14 now differ from the security template, and T3.1.7 is a person's drop, so the ship gate needs Diego's own acceptance lines for them. The jwa override (audit F1) is a dangling link but not a crash. It was re-graded to low and is now T1.3.3.

## Blockers / awaiting you
- Decisions only Diego can make. None of them blocks tonight's tasks; the tasks that depend on them carry `after:`.
  - T3.5.1: the Worker (delete or keep; is one deployed?)
  - T3.5.2: the service-account key
  - T3.5.3: which properties, and at what permission level
  - T3.5.4: zod 4
  - T3.5.5: removing Docker, Smithery and pnpm
  - T3.5.6: Dependabot alerts
  - T4.2.1: submit_sitemap
  - T3.4.1: the template row on rotating keys found in history (none were found)
  - T4.2.6: his own live check

## Notes carried forward
- On seilaut-new, Claude Code's `google-search-console` MCP server (local scope) ran `node dist/index.js` from this folder, with `GOOGLE_APPLICATION_CREDENTIALS` pointing at `~/.openclaw/credentials/gsc-service-account.json`. That file was missing there.
- On seilaut-master (checked 2026-11-04, audit), the picture is different:
  - `~/.claude.json` and the settings files register no Search Console server.
  - `~/.openclaw/credentials/` does not exist.

  A live query needs Diego's key and a registration first (T3.5.2).
- `package-lock.json` is the authoritative lockfile. `pnpm-lock.yaml` is pre-remediation and only the Dockerfile uses it (audit F4, T3.5.5).
- The Worker's `/mcp` has bearer auth only when `MCP_API_TOKEN` is set; without it the endpoint is open (audit F5).

## Verify with
- `npm run build`
- `env -u GOOGLE_APPLICATION_CREDENTIALS node dist/index.js 2>&1 | grep -q 'GOOGLE_APPLICATION_CREDENTIALS environment variable is required'` (T1.1.3)
- `npm test` once T1.2.1 has added it

## Last session — 2026-11-04
Baselined this project: PLAN.md written from the draft, NEXT.md created, ledger started.

## History
Older sessions → `HISTORY.md` (not auto-read). Entries are written by the SessionEnd hook; the agent fills Asked, Decided and Shipped.
