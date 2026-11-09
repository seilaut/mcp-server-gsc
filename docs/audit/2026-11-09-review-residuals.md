# Review residuals, 2026-11-09

Last verified: 2026-11-09 at HEAD `076ee3a` (branch `work/2026-11-04`). Source: the run ledger and the review files of today's SDD workspace (`~/.claude/plans/2026-11-09-master-three-projects.sdd/`), copied here before that workspace is deleted. Every location below was checked against the code at HEAD; where the reviewers' line number was wrong, the real one is given. Nothing was run against Google, and the full `npm test` was not re-run for this file.

Covers today's tasks (the ledger names eleven ids: T1.3.3, T3.1.2, T4.1.6, T4.2.3, T4.2.5, T5.1.1, T5.1.2, T5.1.3, T5.1.4, T5.1.5, T5.1.6) and the final whole-run review of 55d6514..076ee3a (opus). The final review found 0 Critical and 1 Important (README did not warn that `/mcp` is open without a token) and 10 Minor. Fixed in the final fix wave and re-reviewed clean: the Important (commit 0b583b7), the missing test type-check line in CLAUDE.md (076ee3a), and the unbounded `Array.from` in `truncateForError` (a4e066b). Those three are not listed again below.

Nothing here blocks a merge. Section 1 must be settled before any deploy. Expected `npm test` after the merge: 122 tests, 119 pass, 0 fail, 3 todo (the final reviewer's count; run it once before merging).

## 1. Decide or check before a deploy

| # | Where | What | Status |
|---|---|---|---|
| 1 | `src/search-console.ts:23` (scope), live Google | Check (a), T4.1.6: Google issues a token for scope `webmasters.readonly`, and `searchconsole.googleapis.com` (the v1 host) answers `list_sites`, `search_analytics` and the sitemap reads. The move from the v3 to the v1 client was compared in the typings only (they list the same scopes), never run against Google, because this Mac has no credentials. How to check: with a real key, call `list_sites` and one `search_analytics`. | Open. T4.2.6 checks only `list_sites`, so it does not cover the rest. |
| 2 | `src/search-console.ts:50` | Check (b), T4.1.6: a property the account cannot read, asked on the v1 host, still returns an error message containing the word "permission". That word is the only trigger for the sc-domain fallback. If v1 words it differently, the fallback silently stops working. How to check: ask for a property that is not shared with the service account and read the error text. | Open. |
| 3 | `src/remote.ts:20-27` and `:15-18` | The Worker's `/mcp` has no authentication when `MCP_API_TOKEN` is unset, and CORS defaults to `*` (audit F5, high). README.md:87 now says so and tells the reader to set the token before deploying. The code is unchanged. Decision for Diego: keep the Worker or delete it (T3.5.1). If kept, T3.5.9 makes it refuse requests without a token; if deleted, T3.5.11. | Documented, not fixed. Do not deploy until T3.5.1 is decided. |
| 4 | T3.1.2's criterion (PLAN.md; NEXT.md blocker) | The criterion no longer runs. `guards.sh` in `~/.claude/skills/bootstrap/assets/` now refuses to run unless it sits at `<repo>/scripts/ci/guards.sh` (exit 2). The other two parts pass: gitleaks over `dist/` exits 0, and only `src/index.ts` reads `process.env`. Diego chooses: add a copy of the guard at `scripts/ci/guards.sh` (code change, then the criterion passes as written), or change the criterion with his line `- <date> — T3.1.2 criterion differs from the template: accepted by Diego: <AC>`. | Open; already a NEXT.md blocker. `scripts/` does not exist in this repo. |

## 2. Open question for Diego

`src/quick-wins.ts:30` and `:41` read `row.position || 0`, so a Search Console row that has no `position` is treated as position 0. With the default range (positions 4 to 10, `positionRangeMin = 4` at `:22`) such a row is dropped by the filter, so today nobody sees it. If someone sets `positionRangeMin` to 0, the row appears as "Move from position 0.0 to improve CTR", which is misleading, and it never reaches the user as "unknown". Is that intended, or should a row without a position be skipped (or shown as unknown)?

- Check: `test/quick-wins-rounding.test.ts:26`, a `todo` test titled "a row without position is treated as position 0: intended or a bug?". Its body records what the code does today. Run `node --import tsx --test test/quick-wins-rounding.test.ts`.
- Not yet in NEXT.md or PLAN.md (the final review noted this; ruling R3 in section 5 said it would go to NEXT.md). If Diego says "bug", the fix is a small change in `quick-wins.ts` and flipping that test from todo to a real test.

## 3. Follow-ups (not urgent)

All minor. Severity is the reviewers' word. "Fix" is the reviewer's suggestion where one was given.

### Errors, fallback labels and input echo (T5.1.1, T5.1.2)

| Where | Finding | How to check | Suggested fix |
|---|---|---|---|
| `src/fallback-labels.ts:37` (ledger said :84) | The cap on echoed input does not hold when Google repeats the host back inside its own message: `error.message` is passed through uncapped. | Make the fallback fail with an error whose message contains a 3,000-character `sc-domain:<host>`; the client received about 3,345 characters in the final reviewer's probe. | Cap or drop the host inside Google's message. Low risk: it only returns the caller's own input to the caller. |
| `src/search-console.ts:72` | `requestedSiteUrl` stores the caller's raw, uncapped input on the thrown error; it is only logged, but a 10,000-character value is printed in full. The `?? undefined` is dead code (siteUrl is always a string there). | Force a failing fallback with a very long `siteUrl` and read stderr. | Cap it when logging; drop `?? undefined`. |
| `src/search-console.ts:56` | The first-path wrap builds a new `Error` from `urlErr.message` and drops the original stack; the second path mutates the thrown error instead, so the two paths use different techniques. | Throw from `fallbackSiteUrls` and compare `.stack`. | Set `urlErr.cause = err` as the second path does, or keep the stack. |
| `src/server.ts:290` with `src/fallback-labels.ts:36-39` | The JSON-RPC error code now depends on the path. A failed fallback reaches the client as -32603; every unwrapped Google error (an `sc-domain:` input, `list_sites`, `index_inspect`, non-permission errors) still carries 403. Before T5.1.1 a failed fallback also carried 403. | Final reviewer's probe P1: a real `GaxiosError` through `createServer` over an in-memory transport. | Harmless (-32603 is the more correct code). Either note it in the README or make the paths agree. |
| `src/site-url.ts:22` and `src/server.ts:287` | The "(N characters)" suffix means different things: for `siteUrl` it is the length of the user's value; for zod errors it is the length of zod's message, not of what the caller sent, so the number can look wrong. | Send a 500-character invalid enum value; read the suffix. | Word the zod case differently ("message truncated") or pass a label. |
| `src/server.ts:287` | The zod echo cap of 150 is tight: an enum list longer than about 130 characters would lose its "received" part. No current enum does (the longest, `filterOperator`, has a prefix of about 130). | Add a long enum and read the error. | Raise the cap if such an enum is added. |
| `src/server.ts:281` | `Unknown tool: ${request.params.name}` echoes an uncapped caller string, the same class as the capped echoes. The zod issue path `e.path.join('.')` (`:287`) is also uncapped, but the schemas strip unknown keys, so caller text could not be put there (not exhaustively proven). | Call a tool named with 10,000 characters. | Cap it with `truncateForError`. |
| `test/input-echo.test.ts:39` | The zod echo test covers only `deviceFilter`, whose prefix is short. The tight case is `filterOperator` or `type` (prefix about 110 to 130 of 150). Thresholds are loose. | Read the test. | Add a `filterOperator` case that checks "received" survives the cap. |
| `test/fallback-errors.test.ts:7-8` | A double blank line (the reviewer's :252-253 no longer exists; the file is 169 lines). The comment explaining that `isError: true` for a protocol error is what the SDK does for a throw was also asked for. | Open the file. | Remove one blank line; add the comment. |
| `src/site-url.ts:13-22` (T5.1.2, closed by G3) | Closed for the record: the unbounded `Array.from` is fixed. The G3 test is a characterisation test, not a red-then-green one. | Final-fix re-review probe: 1,000,000 characters, bounded, exact total kept. | None. |

### Tests and config (T4.1.6, T5.1.3, T5.1.4)

| Where | Finding | How to check | Suggested fix |
|---|---|---|---|
| `test/searchconsole-v1.test.ts:43` and `:68` | The scope test reads the private field `auth` through a cast (`as unknown as { auth: ... }`). It works, but breaks if the field is renamed. | Read the test. | Accept it, or expose the scopes through a small public getter. |
| `test/searchconsole-v1.test.ts:60` | The v1 test checks only the method name, not the arguments sent (the recorder already logs them as JSON at `:17`). A call with misplaced arguments (for example `requestBody` as a top-level parameter) would still pass. | Mutate one call's arguments; the test stays green. | Assert the logged JSON, for example `searchanalytics.query {"siteUrl":"sc-domain:example.com","requestBody":{...}}`. |
| `test/repo-config.test.ts:21` | The import scanner regex `^import[^'"\n]*from\s+['"]...` misses multi-line imports, side-effect imports (`import 'pkg'`), dynamic `import()` and `require`. Today every import is single-line, so it passes. | Add a test with `import {\n a,\n b\n} from 'undeclared'`; the check still passes. | Allow newlines (`[\s\S]*?`) and match `^import\s+['"]`. |
| `package.json:14-21` | No npm script runs `tsc -p tsconfig.test.json`, and `npm test` does not type-check the tests. CLAUDE.md:17 now lists the command (fix G2), but nothing enforces it. | `grep typecheck package.json` finds nothing. | Add a `typecheck` script, or have `repo-config.test.ts` run `tsc`. |
| `test/permission-fallback.test.ts:25` | The "typed" access to `getSearchConsole` is still a double cast (`as unknown as`); lines 85 and 91-103 still use `as any` and `e: any`. | Read the test. | Make the method injectable (constructor argument), or accept and record it as a named cast. |
| `test/schemas.test.ts:22-23`, `:31`, `:48` | Some tests parse the same input twice (`ok()` then `parsed()`). Harmless. | Read the test. | Parse once. |
| T5.1.4 follow-up items (`docs/audit/2026-11-04-review-followups.md`) | Two permission-fallback items in that file are stale: the lines they cite are gone, but the matchers are present. | Compare the cited lines with `test/permission-fallback.test.ts`. | Strike the two items in the 2026-11-04 file. |
| `test/request-body.test.ts:64` | The operator-default item (`filterOperator` default never applies) waits on the regexFilter decision already open in `2026-11-04-review-followups.md` (follow-up 1). The test is a todo. | `node --import tsx --test test/request-body.test.ts`. | Decide with the regexFilter question. |

### Docs (T4.2.3, T5.1.6, final review)

| Where | Finding | How to check | Suggested fix |
|---|---|---|---|
| `src/schemas.ts:53` | The tool description says `filterOperator` "Defaults to "equals"", but no default is applied and no operator is sent. This contradicts the README. | Read the line; compare with `test/request-body.test.ts:64`. | Change the description to say no operator is sent (or make the default work, with the regexFilter decision). |
| `src/search-console.ts:138` | An empty `rows: []` is truthy, so `quickWins` and `enhancedFeatures` would still be added and the "No data" message skipped. The README says "when rows come back". Unverified against the real API, which normally omits `rows` when empty. | Call `enhancedSearchAnalytics` with a stub returning `rows: []`. | Test `rows?.length`. |
| T4.2.3's criterion (PLAN.md) | The criterion cannot catch a fake parameter named like a real function, and checks no defaults. | Read the criterion. | Strengthen it, or accept. |
| `README.md:87` | "same value format as above" is wrong for the Worker: the value goes to `resolveCredentialConfig`, which treats anything not starting with `{` as a key-file path, and a Worker has no such file, so only inline JSON can work. Inferred from the code, not run (`workerd` cannot run on macOS 12). | Read `resolveCredentialConfig`. | Say "inline JSON only". |
| `README.md:91` | "logged on the server's stderr" is true for stdio only; on the Worker, `console.error` goes to Workers logs. The logged error includes `[cause]`, `fallbackCause` and `requestedSiteUrl`. gaxios's default redactor removes `Authorization`, so nothing new leaks. | Final reviewer's probe P2. | Say "logged on the server". |
| `README.md:9` | Says quick wins rank "on page one or two". The defaults (positions 4 to 10) are page one only unless `positionRangeMax` is raised. | Read `src/quick-wins.ts:22-23`. | Reword. |
| `README.md:180` | The "Example - Basic Query" block (a `search_analytics` call) sits under the `### submit_sitemap` heading (`:173`) and does not name its tool; the two examples after it do. | Read `README.md:173-200`. | Name the tool, or move the example under `### search_analytics`. |
| `README.md:178` | "untested under that scope, and Google may refuse it" is weaker than the evidence: Google's v1 discovery document (audit F7) and the installed v1 typings both say `sitemaps.submit` needs the `webmasters` write scope, so it will be refused under `webmasters.readonly`. | Read audit F7 and `v1.d.ts` (`sitemaps.submit`). | Say it will be refused and point to T4.2.1. |
| `CLAUDE.md:3` | Names the branch `work/2026-11-04`, which will be wrong once the branch is merged. | Read the line. | Remove the branch name at merge. |
| `REMEDIATION.md:12` | "probably true on that date (the audit could not confirm it)" could give the audit's actual reason: the advisories were reviewed or published after 2026-10-14 (the wording already used at `:77`). | Read `:12` and `:77`. | Reword `:12` to "(the advisories were reviewed or published after that date)". |
| `REMEDIATION.md:109` | The audit F4 note repeats part of `:107` (reviewers cited :112 and :110; those are now :109 and :107). Not wrong, only duplicated. | Read `:107-109`. | Merge the two paragraphs. |
| T5.1.6's criterion | It checks only the T3.5.4 mention; the other three corrections in `REMEDIATION.md` were checked by reading, not by command. | Read the criterion. | Add checks, or accept. |

### Process

| Where | Finding | How to check | Suggested fix |
|---|---|---|---|
| `NEXT.md`, `PLAN.md` | The missing-position question (section 2) is not recorded in either, and today's deferred minors above were only in the SDD ledger. `~/.claude/rules/orchestration.md` wants them in a committed spec (this file) and as tracked tasks. | `grep -i position NEXT.md PLAN.md` finds only "Current position". | Greenlight the follow-ups Diego wants as tasks; add section 2 to NEXT.md. |
| `package-lock.json`, `test/repo-config.test.ts` | Not a finding, a note: T5.1.3 added `gaxios ^7.3.1` as a devDependency; the lockfile has a single `node_modules/gaxios` at 7.3.1, so `npm ci` stays in sync. | `grep -n '"node_modules/gaxios"' package-lock.json`. | None. |

## 4. Checks and caveats the reviews could not close

- The final review's count (122 / 119 / 0 / 3 todo) is a sum of per-file counts, not one full `npm test` run. The files last run before the final code change were not re-run, and `handshake` and `capabilities` spawn child servers that can flake under load (ruling 5 in the 2026-11-04 file).
- Local `dist/` is stale (built 2026-11-07, no `fallback-labels.js`). It is git-ignored; run `npm run build` before using this clone as an MCP server.
- Two npm-package and Google-behaviour claims in README (the npm package name, the permission level a service account needs) are facts outside the repo; README marks them unverified.

## 5. Recorded rulings

Copied from the ledger (`progress.md`), gsc only, each with what it costs if wrong. The ledger gave a cost for R1, R3 to R6 and R7; R2 and R5's costs are taken from the ledger text where present, and any marked (derived) are mine.

| # | Ruling | Cost if wrong |
|---|---|---|
| R1 | Tasks inside one project run one after another; the three projects run side by side, because they share no file (the gsc and Airlock `README.md` are the shared files inside a project). | None beyond time. |
| R2 | Minors 1 to 4 of the T4.2.3 review are README statements that do not match the code or guess at Google's behaviour; matching the code is the task, so they are confirmed gaps and enter fix round 1. | One small extra round. |
| R3 | The missing-position behaviour becomes a `node:test` todo naming the open question; `src/quick-wins.ts` is unchanged; the question goes to Diego in NEXT.md (not yet done, see section 2). | A real bug stays unfixed until Diego answers. |
| R4 | Keep the T5.1.1 code: the task asks for `{cause}`, not for passing Google's raw message to the client (it could carry detail); correct the README's cause sentence instead. | A client user debugging a permission error sees the property, not Google's reason. |
| R5 | Single-test-file and grep criteria run through `--run-ac` while capacity reads 0 heavy slots (seconds each, no suite). | Brief extra load (derived from the ledger text). |
| R6 | Unlink the stray symlink `node_modules/node_modules` -> `seilaut-funnel/node_modules`, which made every `createServer` test fail from 18:33 to about 18:40 (created by an agent's temporary-worktree setup; which agent is not established). It reverted this run's own accident. | None: no data deleted, one `ln -s` recreates it. |
| R7 | One final fix wave: G1 (README warning), G2 (CLAUDE.md names the test type-check), G3 (bounded prefix before `Array.from`); the two extras are cheap and in files already touched. | None beyond a slightly larger final diff. |
