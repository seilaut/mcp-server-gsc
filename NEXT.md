# NEXT — mcp-server-gsc-fork status

**Updated:** 2026-11-04 · **Plan:** PLAN.md · **Spec:** — · **Live:** unknown (stdio server; a Cloudflare Worker entry exists, deployment unverified)

## Current position
<!-- progress:begin -->
Progress: 56% · Δ +15 since 2026-11-04 · scope 78 tasks (+0) · hours 0.0 · cost $0.00 · plan @29c7c751
| Initiative | % | Done/Total | State | Open epics |
|---|---|---|---|---|
| I1 Install, start and prove it | 100 | 7/7 | complete | — |
| I2 Test stage | 100 | 3/3 | complete | — |
| I3 Security | 13 | 2/18 | in progress | E3.1, E3.4, E3.5 |
| I4 End product | 8 | 1/12 | in progress | E4.1, E4.2 |
Dropped epics (left out of the mean): E2.1, E3.2, E3.3
<!-- progress:end -->
Tonight (2026-11-04, on seilaut-master) the audit, the plan rewrite and the build ran on branch `work/2026-11-04`. Ticked by `progress.mjs --run-ac` after a task review: the build and the credentials refusal (T1.1.1, T1.1.3), the test harness and its tests (T1.2.1, T1.2.2, T2.2.1-T2.2.3), the non-breaking dependency advisories and the dead override (T1.3.1, T1.3.3), REMEDIATION.md (T1.3.2), the scanner checks (T3.1.3, T3.1.5) and the site-URL fix (T4.1.1). `npm test` now runs schemas, handshake, quick-wins maths, request bodies, credentials, site URL and permission fallback. `npm audit --omit=dev` leaves only zod (<4.6.6, high), which waits on T3.5.4. Nothing is deployed and nothing ran against Google.

## Direction
<!-- direction:begin -->
State: forward · verified this session: T1.1.3, T1.1.1, T1.2.1, T3.1.5, T3.1.3, T1.2.2, T1.3.1, T1.3.3, T1.3.2, T2.2.1, T2.2.2, T2.2.3, T4.1.1 · reopened: none · flat sessions: 0 · ledger @22
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
- 2026-11-04 — Diego approved the Phase 2 plan and all of the controller's recommendations (17:28). The autopilot line is not recorded: the approval guard needs it as his own message on a line of its own, and it arrived inside a sentence.
- 2026-11-04 — Ruling (build phase): T4.1.1 keeps a fourth behaviour change. An undefined siteUrl and non-http schemes now get the same clear error in the fallback path, instead of a nonsense `https://<url>`. The first call still sends the user's input unchanged. If wrong, one rare input such as `example.com:8080` errors instead of falling back.

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
- Not in the plan yet; Diego decides whether it becomes a task (domain: bug, awaiting: user). `regexFilter` is silently dropped unless `dimensions` includes `query` (src/request-body.ts:105), so the user gets unfiltered numbers. The quick-wins output then claims `regexFilterApplied: true` (src/search-console.ts:124). README.md:97-98 and :132 promise a `regex:` prefix that no code handles. Pinned as `todo` tests in test/request-body.test.ts. T4.1.3 covers only the advertising part.
- Not in the plan (domain: bug, awaiting: user): F8's `www.` prefix in the `sc-domain:www.…` fallback is tracked by no task. Leaving it as is stays the safer default.
- Not in the plan (domain: bug, awaiting: user): an exact custom CTR threshold such as 7% is missed through floating point (`ctr*100 <= maxCtr`). The default of 2% is never affected.

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
- `npm test` (node --test with tsx over test/)
- `env -u GOOGLE_APPLICATION_CREDENTIALS node dist/index.js 2>&1 | grep -q 'GOOGLE_APPLICATION_CREDENTIALS environment variable is required'` (T1.1.3)
- `npm audit --omit=dev` (only zod expected until T3.5.4)

## Last session — 2026-11-04
On seilaut-master the controller ran from 16:20 to 20:00 CET. The repo was cloned, and `work/2026-11-04` was checked out as seilaut-new handed it over (baseline cb86294).
- Phase 1 audit: docs/audit/2026-11-04-audit.md, commit 58474c9.
- Phase 2 plan: commit b09eaed. Diego approved it at 17:28.
- Build: Sonnet implementers worked one task at a time, an Opus reviewer checked each task, and ticks came only from `progress.mjs --run-ac --only`.
- The Stop hook (bin/on-stop.sh) also ticks a started task whose fast criterion passes at the end of a controller turn, so some ticks landed before their review finished. Every such task was reviewed afterwards.
- The audit's "crash" from the jwa override was checked and is not a crash: jwa loads the module only when crypto.timingSafeEqual is missing.
- One spawn-based handshake test flaked once under load (75 of 76 passing). Its 15-second child timeout is tight (8–9 s observed).

## History
Older sessions → `HISTORY.md` (not auto-read). Entries are written by the SessionEnd hook; the agent fills Asked, Decided and Shipped.
