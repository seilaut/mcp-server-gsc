# Wave-3 residuals — T3.5.12, T4.2.2, T3.5.7, T5.1.8 (seilaut-master, 2026-11-12)

Branch `work/2026-11-12-gsc` (198b7ed..45eece5), merged into work/2026-11-04. Reviews: opus "merge" (JSON Schema of all 7 tools compared before and after; Google's searchanalytics.query docs fetched 2026-11-12) and haiku "merge". Controller on a clean copy of 45eece5: `npm ci` 0, `npm test` 126 tests, 125 pass, 0 fail, 1 todo; `npm run build` 0; `tsc --noEmit` 0; `npm audit --omit=dev` 0 vulnerabilities (was 1 high, zod).

Items for Diego to rule fix, accept or drop (T5.3.1):

1. **Tool schemas changed for MCP clients** (opus). `$schema` moved from draft-07 to 2020-12, and every `additionalProperties: false` is gone (top level and quickWinsThresholds). A client that validates locally now accepts extra keys it used to refuse; the server still strips unknown keys, and README says "Unknown parameters are ignored". Required fields, defaults, enums, min/max and descriptions are unchanged (regexFilter's description changed on purpose).
2. **Stale docs about the removed files** (opus, haiku): REMEDIATION.md:107 and :109 say the Dockerfile installs from pnpm-lock.yaml, in the present tense; PLAN.md:10 and NEXT.md describe the Dockerfile and pnpm-lock.yaml as if they still exist.
3. **zod-to-json-schema is still in package.json:32 but unused** (both); src/schemas.ts:5 keeps a comment about its `$ref` quirk. T3.5.8 removes it; its text still says the handshake lists 8 tools (now 7). T3.5.7 already did T3.5.8's switch in tools/list.
4. **README.md:173 cites the internal task id "(T4.2.2)"** in user-facing text.
5. **regexFilter has no local length or RE2 check** (opus): over 4,096 characters or a lookahead `(?=` reaches Google and returns Google's 400; a whitespace-only regex is sent as written.
6. **Weak proofs** (haiku): T5.1.8's red was a missing export, not the behaviour assertions (opus reasons the old code also failed the behaviour); the "README matches the code" test checks two phrases only; T4.2.2's criterion passes vacuously now that the tool is gone and does not check the scope (the scope is `webmasters.readonly`, src/search-console.ts:22, asserted by searchconsole-v1.test).
7. **T3.1.2 is not done.** Copying the guard into scripts/ci/guards.sh does not make its criterion pass: the criterion runs the guard from `~/.claude/skills/bootstrap/assets/guards.sh`, which exits 2 there ("the guard is not at <top>/scripts/ci/guards.sh"). With `GUARDS_PROJECT_TOP="$PWD"` set in front of it, the whole criterion exits 0 on 2026-11-12. Changing the criterion needs Diego's line.

## Round 2 (T3.5.8, T5.1.10, T5.1.9), added 2026-11-12

Branch `work/2026-11-12-gsc-2` (a8ddc05, 5b3da73, 69fac5c). Reviews: opus "merge" (red check: 6 of 11 new tests fail on the old code; sweep of 201×2000 click/impression pairs: the new comparison differs from the old one only at exact boundaries), haiku "merge".

8. **"A Domain property never carries `www.`" is unverified** (opus): the spec, README:91 and src/site-url.ts:45 assume it, and nobody checked it against Google's docs. If an account holds `sc-domain:www.example.com`, the fallback that reached it now misses it; the fallback also now queries a broader property (all subdomains), which the note labels. Option: try both candidates.
9. **The exact CTR comparison is slower** (opus): about 7-17 µs per row (25,000 rows: 180-420 ms against about 0.2 ms). Fine on stdio; it costs CPU if detect_quick_wins runs in the Worker. Option: compare as floats unless within about 1e-9 of the threshold.
10. **T3.5.8's criterion is weak** (haiku): it checks only the direct dependency and the handshake's `inputSchema.type`; zod-to-json-schema stays installed through @modelcontextprotocol/sdk (package-lock.json:1215, hoisted at :3300), which is correct. The comment explaining why `dateString` is a factory (a shared instance produced `$ref`) was deleted, and nobody checked whether zod 4 still does that. PLAN.md's T3.5.8 text still says "8 tools" (the handshake checks 7). The test "default threshold (2) is exact at 0.02" also passes on the old code.
