# NEXT — mcp-server-gsc-fork status

**Updated:** 2026-11-10 · **Plan:** PLAN.md · **Spec:** — · **Live:** unknown (stdio server; a Cloudflare Worker entry exists, deployment unverified)

## Current position
<!-- progress:begin -->
Progress: 78% · Δ +11 since 2026-11-09 · scope 89 tasks (+3) · hours 3.1 · cost $147.95 · plan @5e84b31c
| Initiative | % | Done/Total | State | Open epics |
|---|---|---|---|---|
| I1 Install, start and prove it | 100 | 7/7 | complete | — |
| I2 Test stage | 100 | 3/3 | complete | — |
| I3 Security | 52 | 5/18 | in progress | E3.1, E3.5 |
| I4 End product | 83 | 10/12 | in progress | E4.2 |
| I5 Review follow-ups 2026-11-04 | 35 | 7/11 | in progress | E5.1, E5.2 |
Dropped epics (left out of the mean): E2.1, E3.2, E3.3
<!-- progress:end -->
On 2026-11-04 (seilaut-master) the audit, the plan rewrite and the build ran on branch `work/2026-11-04`. 18 tasks were ticked by `progress.mjs --run-ac` after a task review: the build and startup checks; the test harness with schemas, handshake, quick-wins maths, request bodies, credentials, site URL, permission fallback, quick-wins calls, validation and capabilities tests; the dependency advisories and the dead override; REMEDIATION.md; the scanner checks; the F8 site-URL and fallback-labelling fixes; detect_quick_wins making one call; tighter input validation; tools-only capabilities; and engines >=22. The final whole-branch review (Opus) found it ready to merge. On HEAD 0ef3311: `npm test` 94 tests, 92 pass, 0 fail, 2 todo; `tsc --noEmit` exit 0; `npm run build` exit 0. `wrangler deploy --dry-run` bundles (35.7 MiB raw, 1.19 MiB gzip). `wrangler dev` cannot run on macOS 12 (workerd dyld error). `npm audit --omit=dev` leaves only zod, which waits on T3.5.4. Nothing is deployed and nothing ran against Google.
Checked 2026-11-09 on seilaut-master: at 29bcc8c, `npm test` gave 94 tests, 92 pass, 0 fail, 2 todo. The merge of 874024a that followed changed only NEXT.md, PLAN.md and the ledger, so no code changed and the suite was not re-run. `wrangler whoami` says not authenticated. `gh api repos/seilaut/mcp-server-gsc` gives `dgusti59` push true (no real push tried).
Stage 1 of the 2026-11-09 order (`progress.mjs --run-ac --only`, 16:4x CET): T1.3.3 passed and is ticked. T3.1.2 failed with exit 2: `guards.sh`, called from `~/.claude/skills/bootstrap/assets/`, now refuses to run unless it sits at `<repo>/scripts/ci/guards.sh` (a change in `~/.claude`, not in this repo). Its other two parts pass: gitleaks over `dist/` exits 0, and only `src/index.ts` reads `process.env`. iCloud had also removed 10 files under `node_modules/`; restore requested with `brctl download` on 2026-11-09, still arriving.

Stage 2 of the 2026-11-09 order, on seilaut-master, commits `55d6514..076ee3a`:
- **Built, reviewed and ticked through `--run-ac`:** T4.2.5, T5.1.6, T4.2.3, T5.1.3, T5.1.4, T5.1.2, T5.1.5, T5.1.1, T4.1.6. With T1.3.3 from Stage 1, that is 10 tasks.
- **T4.1.6 moves the client from Webmasters v3 to Search Console v1.** Its first version had changed the OAuth scope to a string that is not a Google scope; the review caught it, the scope is back to `webmasters.readonly`, and a test now asserts it.
- **Final whole-run review (opus):** 1 Important, fixed in one wave and re-reviewed. README now warns that `/mcp` answers anyone without `MCP_API_TOKEN`; CLAUDE.md names the test type-check; `truncateForError` no longer allocates in proportion to a huge input.
- **Unfixed findings:** `docs/audit/2026-11-09-review-residuals.md` (1a15b91), tracked as T5.2.1.
- **Incident:** from 18:33 to about 18:40 a stray `node_modules/node_modules` link (pointing at the funnel's packages, created by another agent's temporary worktree) broke every server test here; it was removed and the tests passed again.
- **Tests:** the focused files pass at HEAD (the final reviewer ran fallback-errors 11, input-echo 5, searchconsole-v1 6, site-url 7, repo-config 2, quick-wins-rounding 3 plus 1 todo); both type-checks exit 0.
- **Full suite:** `npm test` at 8a189e6 on 2026-11-09, about 19:50 CET: 123 tests, 120 pass, 0 fail, 3 todo.
- **Pushed to GitHub on Diego's word on 2026-11-09 at 20:00 CET (`origin/work/2026-11-04`), after clean `key-scan.sh --push` and `gitleaks` runs over every unpushed commit.** Not deployed.

## Direction
<!-- direction:begin -->
State: blocked · left: 19 (ready 5, queued 4, waiting 10) · verified this session: — · reopened: none · flat sessions: 0 · ledger @43
Reasons: waiting on Diego (approval): T3.1.14 (after T3.5.6), T3.5.2, T3.5.3, T3.5.6, T4.2.6 (after T3.5.2); waiting on Diego (blocker): T3.5.1, T3.5.9 (after T3.5.1), T3.5.10 (after T3.5.1), T3.5.11 (after T3.5.1), T5.2.1
<!-- direction:end -->
Rule: `delayed` (a loop or a stall): stop building. Write the loop into Decisions (what was tried, why it failed its criterion). Choose one: split the task, change the approach with a named hypothesis, or raise a blocker for Diego. No new attempt until that is written. `blocked`: work on what is ready. `completely blocked`: nothing here can move; tell Diego what each wait in Reasons needs.

## Decisions
- 2026-11-12 — Diego (his message, verbatim): gsc T3.5.4 approved by Diego: upgrade zod to version 4
- 2026-11-12 — Diego (his message, verbatim): gsc T3.5.5 approved by Diego: delete Dockerfile, smithery.yaml, pnpm-lock.yaml
- 2026-11-12 — Diego (his message, verbatim): gsc T4.2.1 approved by Diego: remove submit_sitemap, the helper stays read-only
- 2026-11-12 — Diego (his message, verbatim): gsc T3.4.1 approved by Diego: no old keys to rotate
- 2026-11-12 — Diego (his message, verbatim): gsc T3.1.2: Claude copies the guard script to scripts/ci/guards.sh
- 2026-11-12 — Diego (his message, verbatim): gsc T5.1.7: the three bugs become tasks, the text-filter bug first
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

- 2026-11-09 — **Diego: the build ran in an Opus chat as a one-time exception** ("Start and keep this model just for this exception"). Implementers were Sonnet; reviewers were Sonnet, Haiku or Opus by risk. The controller's rulings, each with what it costs if wrong, are in `docs/audit/2026-11-09-review-residuals.md` under "Recorded rulings".

## Blockers / awaiting you
- ~~T3.1.2's criterion no longer runs~~ Decided 2026-11-12 (Diego): Claude copies the guard script to scripts/ci/guards.sh. Was: Found 2026-11-09 (Current position). Diego chooses one: put a copy of the guard at `scripts/ci/guards.sh`, the layout bootstrap uses (a code change, then the criterion passes as written); or change the criterion, which needs his line `- <date> — T3.1.2 criterion differs from the template: accepted by Diego: <AC>`.
- ~~T1.3.3 reopened 2026-11-05 on seilaut-new's checkout (dangling `node_modules/buffer-equal-constant-time` link).~~ Resolved on seilaut-master: `--run-ac` ticked it at 2026-11-09T16:57:04Z, and the criterion re-ran by hand on 2026-11-10 with exit 0 (`node_modules/buffer-equal-constant-time` is a real folder on this Mac). On seilaut-new the link may still dangle; `npm ci` there would clear it.
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
- ~~Not in the plan yet~~ Now T5.1.8 (Diego, 2026-11-12). `regexFilter` is silently dropped unless `dimensions` includes `query` (src/request-body.ts:86), so the user gets unfiltered numbers. The quick-wins output then claims `regexFilterApplied: true` (src/search-console.ts:144). README.md:97-98 and :132 promise a `regex:` prefix that no code handles. Pinned as `todo` tests in test/request-body.test.ts. T4.1.3 covers only the advertising part.
- ~~Not in the plan~~ Now T5.1.9 (Diego, 2026-11-12): F8's `www.` prefix in the `sc-domain:www.…` fallback is tracked by no task. Leaving it as is stays the safer default.
- ~~Not in the plan~~ Now T5.1.10 (Diego, 2026-11-12): an exact custom CTR threshold such as 7% is missed through floating point (`ctr*100 <= maxCtr`). The default of 2% is never affected.
- The Worker's /mcp answers `initialize` and `tools/list` with NO auth while MCP_API_TOKEN is unset. Confirmed on HEAD by the final review (run in Node; workerd was not run). Decide in T3.5.1 whether to delete the Worker or set the token (domain: security, awaiting: user).
- If T4.2.1 grants the write scope, the permission fallback would submit a sitemap to a different property than the one asked for. Exclude submit_sitemap from the fallback first (domain: bug, awaiting: user).
- engines >=22 versus the node:18 Dockerfile: the Docker build will probably refuse to run. This is inferred from pnpm's documented behaviour and was not run. It is part of T3.5.5 (domain: build, awaiting: user).

- **T5.2.1: rule on the 2026-11-09 review residuals** (domain: decision, awaiting: user). `docs/audit/2026-11-09-review-residuals.md` lists:
  - 4 items to settle before any deploy: two live checks of the Search Console v1 calls, the open `/mcp` without a token, and T3.1.2's criterion;
  - 1 open question, below;
  - 35 follow-ups.
  
  Fix, accept or drop each item.
- **Open question (domain: decision, awaiting: user):** `src/quick-wins.ts:30` and `:41` use `row.position || 0`, so a row without a position counts as position 0, and the default minimum of 4 then filters it out. Intended, or a bug? The test `test/quick-wins-rounding.test.ts:26` is a todo until you answer.

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

## Last session — 464ce5ce (seilaut-master), 2026-11-10
Only a correction: the T1.3.3 blocker line and the decisions sheet said a reinstall was still needed; the criterion passed on 2026-11-09 and again on 2026-11-10 (8ec6d6d). The 13 decisions in `docs/2026-11-09-decisions-for-diego.md` are still Diego's. Pushed to origin/work/2026-11-04 on Diego's word ("Push everything", 2026-11-10) after clean key-scan --push and gitleaks runs; not deployed.

## History
Older sessions → `HISTORY.md` (not auto-read). Entries are written by the SessionEnd hook; the agent fills Asked, Decided and Shipped.
