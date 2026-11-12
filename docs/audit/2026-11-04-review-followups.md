# Review follow-ups, 2026-11-04

Last verified: 2026-11-04. Source: the night run's SDD ledger (`.superpowers/sdd/PLAN/progress.md`, branch `work/2026-11-04`), copied here before that ledger is deleted. Nothing below was re-run when this file was written; file:line references are the reviewers' own and are unverified against the tree. This file is the spec amendment for initiative I5 in `PLAN.md` (epic E5.1). The audit it extends is `docs/audit/2026-11-04-audit.md`.

Final review (opus, on 0ef3311): READY TO MERGE, no Critical or Important findings. `npm test` 94 tests (92 pass, 0 fail, 2 todo), `tsc` ok, `wrangler --dry-run` bundles, `/mcp` confirmed open when `MCP_API_TOKEN` is unset (audit F5).

## Rulings made on 2026-11-04

Each line is copied verbatim from the ledger and ends with its cost if wrong. Five rulings.

1. Ruling: implementers work in this clone on work/2026-11-04, not a separate git worktree — a worktree needs its own npm ci, a heavy job, while capacity shows 0 heavy slots; no one else uses this clone tonight — cost if wrong: a stray file lands in the clone (visible in git status, revertable).
2. Ruling: implementers may run the single [fast] test file their task's AC names (red, then green) while capacity shows 0 heavy slots; full suites, builds and lint stay in the controller's serial queue — delivery.md defines [fast] as under ten seconds and safe after every turn — cost if wrong: a few seconds of CPU contention with other sessions.
3. Ruling: ticks only via progress.mjs --run-ac --only <id>, run by the controller after a clean review; implementers never edit PLAN.md, NEXT.md, HISTORY.md or docs/ledger — cost if wrong: none (stricter than the rule).
4. Ruling: keep T4.1.1's fourth behaviour change (undefined siteUrl and non-http schemes now get the same clear error in the fallback path instead of a nonsense https://<url>) — it touches only the second call, the first call still sends the user's input unchanged; theoretical loss: 'example.com:8080' used to fall back to https://example.com:8080 — cost if wrong: one rare input now errors instead of falling back.
5. Ruling: raise test/handshake.test.ts TIMEOUT_MS 15000 -> 45000 in T4.1.2's fix round as a separate commit — the reviewer measured 12.68 s and 12.73 s under load 25-32/4 and one npm test run flaked; a flaky AC can falsely reopen T1.2.2 — cost if wrong: a truly hung server test takes 30 s longer to fail.

## Follow-ups that need Diego first

These are not in the approved plan. Each needs a spec amendment, which is this file, and Diego's yes before it becomes a task. Task T5.1.7 in PLAN.md records that decision.

1. **regexFilter (HIGH, fix before a release, per the final triage).** Ledger text: regexFilter is silently dropped unless dimensions include query (`request-body.ts:105`; the googleapis typings say filtering without grouping is allowed). The quick-wins response then claims `regexFilterApplied:true` (`search-console.ts:124`). `search_analytics` ignores regexFilter always. `README.md:97-98,132` promise a `regex:` prefix that no code handles. Check: call enhanced search analytics with a regexFilter and dimensions that omit `query`, then read the request body. Choices for Diego: make the filter work without grouping, or refuse it with a clear error and fix the README and the `regexFilterApplied` claim. Related LOW: the `filterOperator` default never applies (`.default().optional()`, `schemas.ts:37-40`).
2. **www. prefix in the sc-domain fallback (LOW, later).** F8's third point: the `www.` prefix is kept in the `sc-domain:www.example.com` fallback, and no task tracks it. The ledger says leaving it is the safer default until T4.1.2 names the answering property (T4.1.2 is now done, so that condition is met). Check: `fallbackSiteUrls('https://www.example.com/')` and read the sc-domain candidate.
3. **CTR floating-point edge in quick wins (LOW, later).** Pre-existing: `ctr*100 <= maxCtr` misses exact values of 7, 14, 28, 55 and 56 percent, never the default of 2. Pinned as a todo test in the suite. Check: a row whose CTR yields exactly 7 percent after multiplication, with `maxCtr` 7. Needs its own task via a spec amendment.

## Deferred findings

Severity is the reviewers' word (all were "minor (deferred)" unless stated). Triage is the final reviewer's where it gave one; otherwise it reads "later (not in the final triage)". The final review put nothing from this section in "fix before a release" except the items already owned by open tasks (listed under "Findings owned by existing open tasks").

### Errors and fallback labelling (task T5.1.1)

| Where | Check | Severity | Triage |
|---|---|---|---|
| `search-console.ts:58` | Force `fallbackSiteUrls` to throw an Invalid siteUrl error: Google's original error is dropped. Add `{cause}`. | minor | later (named in the final triage) |
| `search-console.ts:51` | Same loss when `fallbackSiteUrls` throws on the first path: the original Google error is lost. | minor | later (same item) |
| `server.ts:280-287` | Make the fallback fail: only the message is sent, so it names `sc-domain:...` and not the property the user asked for. | minor | later (named in the final triage) |
| `search-console.ts:69` | `fallbackCause` is an ad-hoc untyped property (`Error & { fallbackCause?: unknown }`). | minor | later (not in the final triage) |
| `search-console.ts:71-75` | Nested ternary; status and headers are lost in the spread. | minor | later (not in the final triage) |
| `server.ts:137-146`, `search-console.ts` | The "No data available" output after a fallback is not labelled (also seen for T4.1.3). | minor, harmless | later (named in the final triage) |
| `search-console.ts:52-54` | The sc-domain no-fallback rule has no test. Mixed-case or space-prefixed `SC-DOMAIN` now errors. | minor | later (not in the final triage) |
| T4.1.2 review 1 | gaxios always sets `cause`, so a `cause===undefined` guard never fires on real Google errors. Fixed in T4.1.2's fix round; listed so the new test keeps it fixed. | resolved | n/a |

### Input echo (task T5.1.2)

| Where | Check | Severity | Triage |
|---|---|---|---|
| `site-url.ts:24`, `:29` | Pass a 10,000-character siteUrl: the error message echoes it whole. | minor | later (named in the final triage) |
| zod enum errors (validation) | Pass a long invalid enum value: the error echoes the input. The T4.1.4 reviewer called this outside that diff. | minor | later (not in the final triage) |

### Test and config hygiene (tasks T5.1.3, T5.1.4)

| Where | Check | Severity | Triage |
|---|---|---|---|
| `tsconfig.json` include | `src/**/*` only, so tests are never type-checked (seen by T1.2.1 and T2.2.2). | minor | later (not in the final triage) |
| `test/permission-fallback.test.ts:3` | Imports `gaxios`, which is not in `package.json` (`grep -c gaxios package.json` gives 0). | minor | later (named in the final triage) |
| `test/site-url.test.ts:24` | `includes('example.com')` always passes; use `mysite.test`. | minor | later (not in the final triage) |
| `test/validation.test.ts:105-108` | The list_sites test (assert 'Arguments are required') cannot fail. | minor | later |
| `test/schemas.test.ts` lines 12, 14, 19, 27 | `r.data!` non-null assertions give TypeErrors, not assertion messages. | minor | later |
| `test/request-body.test.ts:499-503` | Pins `operator` undefined; delete it together with the regexFilter fix. | minor | with the regexFilter decision |
| `test/permission-fallback.test.ts` :121/:127 | Test title overstates: the constructor never reads the file. | minor | later |
| `test/permission-fallback.test.ts` :161, :160 | `assert.rejects` has no matcher; :160 reads a private field via a double cast. | minor | later |
| `test/handshake.test.ts:58-60` | Refusal test has no red run shown and duplicates the SDK ToolSchema check. | minor | later |
| `package.json` engines | Said node>=18 while `--import tsx` needs 18.19+/20.6+. Resolved by T4.2.4 (engines is now >=22). | resolved | n/a |

### Quick-wins tests (task T5.1.5)

| Where | Check | Severity | Triage |
|---|---|---|---|
| quick-wins maths tests | No test of `Math.round` on a non-integer: impressions 110 should give potentialClicks 6. Rows with a missing position are untested. | minor | later |

### Duplication and types (no task; needs triage)

These are refactors with no observable behaviour to test, so they have no honest acceptance criterion. Copied as the final triage gave them: later.
- Duplicated label names (`search-console.ts:85-87`, `server.ts:19-21`) and the thresholds type (`:116-121`).
- `buildSearchAnalyticsBody` returns `any`.
- `search-console.ts:51` and the T4.1.2 items above overlap with T5.1.1; fold in when that task runs.

### Documentation (task T5.1.6)

REMEDIATION.md (T1.3.2 review): `:12` and `:77` state the 2026-10-14 result as certain (the audit says probably); `:107` should add that F4 found 11 vulnerable production packages (1 critical, proxy-addr) on the pnpm-lock and Dockerfile path; `:103` should name T3.5.4 (the decision) beside T3.5.7 (`grep -c T3.5.4 REMEDIATION.md` gives 0 today). Minor, later.

### Findings owned by existing open tasks (note lines added in PLAN.md)

- README still says Node 18 (final triage: fix before a RELEASE) is T4.2.3.
- Dockerfile still `node:18-alpine` (F11; engines >=22 against a node:18 Dockerfile likely breaks Docker builds; final triage: fix before a RELEASE) is T3.5.5.
- `submit_sitemap` calls `sitemaps.submit`, which needs the full webmasters scope, while the service requests readonly. Exclude `submit_sitemap` from the fallback before granting the write scope. This is T4.2.1.

### Plan-level observations (no task; for Diego or the next planner)

- T1.3.3's AC first clause passes when the lock entry is missing, so it proves less than it reads. The Worker bundle with `nodejs_compat` was unverified at that review; the final review's `wrangler --dry-run` bundle succeeded. `T1.3.3-buildtest.txt` showed `timeout: command not found`, so those tests ran without the wrapper.
- T1.2.2 `handshake.test.ts`: the 15 s child timeout was tight; ruling 5 raised it to 45 s.

## For Diego

1. **Before any release:** decide the regexFilter behaviour (T5.1.7), and fix the README Node claim (T4.2.3) and the Dockerfile (T3.5.5).
2. **Tell Diego, from the final review:** `/mcp` is open while `MCP_API_TOKEN` is unset (T3.5.1); exclude `submit_sitemap` from the fallback before granting the write scope (T4.2.1); engines `>=22` against the `node:18` Dockerfile likely breaks Docker builds (T3.5.5); the Worker cannot run locally on macOS 12.
3. **The five rulings above are in force.** The one with a real behaviour cost is ruling 4 (a rare input such as `example.com:8080` now errors instead of falling back). Say so if you want it reversed.
4. **Deviation:** the controller started `npm run build` while capacity showed 0 heavy slots (about 15 s, exit 0 on 0ef3311).
5. The merge itself is not blocked by anything here.

## Amendment 2026-11-12 — the three plan follow-ups become tasks (T5.1.7)

Diego, 2026-11-12: "the three bugs become tasks, the text-filter bug first". Order: T5.1.8, then T5.1.9 and T5.1.10.

- T5.1.8 (HIGH): `regexFilter` is silently dropped unless `dimensions` includes `query` (src/request-body.ts:86), quick-wins then claims `regexFilterApplied: true` (src/search-console.ts:144), and README.md:97-98 and :132 promise a `regex:` prefix no code handles. Done when the filter is sent whatever dimensions are requested (or the request is refused with a clear error, never silently unfiltered), `regexFilterApplied` is true only when the filter was sent, the README matches the code, and the `todo` tests in test/request-body.test.ts are real tests.
- T5.1.9: the `sc-domain:` fallback builds `sc-domain:www.<domain>` for a `www.` URL (audit F8); a Domain property never carries `www.`. Done when the fallback uses the bare domain and the result names the property actually queried, so a broader Domain property is never presented as the URL-prefix property asked for.
- T5.1.10: quick-wins compares `ctr*100 <= maxCtr` in floating point, so an exact custom threshold such as 7 misses a row whose CTR is 0.07. Done when the comparison is exact at the boundary for whole and decimal percentages.
