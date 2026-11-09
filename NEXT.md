# NEXT — mcp-server-gsc-fork status

**Updated:** 2026-11-09 · **Plan:** PLAN.md · **Spec:** — · **Live:** unknown (stdio server; a Cloudflare Worker entry exists, deployment unverified)

## Current position
<!-- progress:begin -->
Progress: 61% · Δ +0 since 2026-11-09 · scope 85 tasks (+0) · hours 3.1 · cost $147.95 · plan @35339374
| Initiative | % | Done/Total | State | Open epics |
|---|---|---|---|---|
| I1 Install, start and prove it | 100 | 7/7 | complete | — |
| I2 Test stage | 100 | 3/3 | complete | — |
| I3 Security | 13 | 2/18 | in progress | E3.1, E3.4, E3.5 |
| I4 End product | 58 | 7/12 | in progress | E4.1, E4.2 |
| I5 Review follow-ups 2026-11-04 | 14 | 1/7 | in progress | E5.1 |
Dropped epics (left out of the mean): E2.1, E3.2, E3.3
<!-- progress:end -->
On 2026-11-04 (seilaut-master) the audit, the plan rewrite and the build ran on branch `work/2026-11-04`. 18 tasks were ticked by `progress.mjs --run-ac` after a task review: the build and startup checks; the test harness with schemas, handshake, quick-wins maths, request bodies, credentials, site URL, permission fallback, quick-wins calls, validation and capabilities tests; the dependency advisories and the dead override; REMEDIATION.md; the scanner checks; the F8 site-URL and fallback-labelling fixes; detect_quick_wins making one call; tighter input validation; tools-only capabilities; and engines >=22. The final whole-branch review (Opus) found it ready to merge. On HEAD 0ef3311: `npm test` 94 tests, 92 pass, 0 fail, 2 todo; `tsc --noEmit` exit 0; `npm run build` exit 0. `wrangler deploy --dry-run` bundles (35.7 MiB raw, 1.19 MiB gzip). `wrangler dev` cannot run on macOS 12 (workerd dyld error). `npm audit --omit=dev` leaves only zod, which waits on T3.5.4. Nothing is deployed and nothing ran against Google.
Checked 2026-11-09 on seilaut-master: at 29bcc8c, `npm test` gave 94 tests, 92 pass, 0 fail, 2 todo. The merge of 874024a that followed changed only NEXT.md, PLAN.md and the ledger, so no code changed and the suite was not re-run. `wrangler whoami` says not authenticated. `gh api repos/seilaut/mcp-server-gsc` gives `dgusti59` push true (no real push tried).
Stage 1 of the 2026-11-09 order (`progress.mjs --run-ac --only`, 16:4x CET): T1.3.3 passed and is ticked. T3.1.2 failed with exit 2: `guards.sh`, called from `~/.claude/skills/bootstrap/assets/`, now refuses to run unless it sits at `<repo>/scripts/ci/guards.sh` (a change in `~/.claude`, not in this repo). Its other two parts pass: gitleaks over `dist/` exits 0, and only `src/index.ts` reads `process.env`. iCloud had also removed 10 files under `node_modules/`; restore requested with `brctl download` on 2026-11-09, still arriving.

## Direction
<!-- direction:begin -->
State: blocked · left: 27 (ready 6, queued 1, waiting 20) · verified this session: — · reopened: none · flat sessions: 0 · ledger @36
Reasons: waiting on Diego (blocker): T3.1.2, T3.5.1, T3.5.5, T3.5.9 (after T3.5.1), T3.5.10 (after T3.5.1) +4 more; waiting on Diego (approval): T3.1.12 (after T3.5.7), T3.1.14 (after T3.5.6), T3.4.1, T3.5.2, T3.5.3 +6 more
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
- 2026-11-09 — Diego said yes to two things. (1) Merging the 2026-11-05 verify from GitHub: the sync rule asks because PLAN.md changed upstream; a throwaway rehearsal had no conflicts and kept all 133 ledger rows, and the real merge gave the same. (2) The order of work on seilaut-master: re-check T1.3.3 and T3.1.2, then build T4.2.5, T5.1.6, T4.2.3, T5.1.3, T5.1.4, T5.1.2, T5.1.5, T5.1.1, T4.1.6. Uploading, merging to `master` and going live each need his separate yes. Plan (git-ignored, this Mac only): `~/.claude/plans/2026-11-09-master-three-projects.md`.

## Blockers / awaiting you
- T3.1.2's criterion no longer runs (domain: decision, awaiting: user). Found 2026-11-09 (Current position). Diego chooses one: put a copy of the guard at `scripts/ci/guards.sh`, the layout bootstrap uses (a code change, then the criterion passes as written); or change the criterion, which needs his line `- <date> — T3.1.2 criterion differs from the template: accepted by Diego: <AC>`.
- T1.3.3 reopened 2026-11-05 by `--run-ac` on seilaut-new's checkout, which is what "this checkout" and "I" mean in this line (domain: build, awaiting: none). Not yet re-run on seilaut-master; it is first in the 2026-11-09 order. The lockfile is fixed, but `node_modules/buffer-equal-constant-time` is still a dangling symlink to `jwa/patches/...` from the 2026-10-14 install, so the node_modules half of the criterion fails. `npm ci` should clear it; I did not run it (no installs in a verify). The earlier note that all 18 ticks held was true only on seilaut-master's node_modules.
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
- Not in the plan yet; Diego decides whether it becomes a task (domain: bug, awaiting: user). `regexFilter` is silently dropped unless `dimensions` includes `query` (src/request-body.ts:86), so the user gets unfiltered numbers. The quick-wins output then claims `regexFilterApplied: true` (src/search-console.ts:144). README.md:97-98 and :132 promise a `regex:` prefix that no code handles. Pinned as `todo` tests in test/request-body.test.ts. T4.1.3 covers only the advertising part.
- Not in the plan (domain: bug, awaiting: user): F8's `www.` prefix in the `sc-domain:www.…` fallback is tracked by no task. Leaving it as is stays the safer default.
- Not in the plan (domain: bug, awaiting: user): an exact custom CTR threshold such as 7% is missed through floating point (`ctr*100 <= maxCtr`). The default of 2% is never affected.
- The Worker's /mcp answers `initialize` and `tools/list` with NO auth while MCP_API_TOKEN is unset. Confirmed on HEAD by the final review (run in Node; workerd was not run). Decide in T3.5.1 whether to delete the Worker or set the token (domain: security, awaiting: user).
- If T4.2.1 grants the write scope, the permission fallback would submit a sitemap to a different property than the one asked for. Exclude submit_sitemap from the fallback first (domain: bug, awaiting: user).
- engines >=22 versus the node:18 Dockerfile: the Docker build will probably refuse to run. This is inferred from pnpm's documented behaviour and was not run. It is part of T3.5.5 (domain: build, awaiting: user).

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
- One spawn-based handshake test flaked once under load (75 of 76 passing): its 15-second child timeout was tight (8–9 s observed). It was raised to 45 s in 4379c1b (test/handshake.test.ts:13).

## History
Older sessions → `HISTORY.md` (not auto-read). Entries are written by the SessionEnd hook; the agent fills Asked, Decided and Shipped.
