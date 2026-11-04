# PLAN — mcp-server-gsc-fork
Last verified: 2026-11-04 (baseline draft; verify before trusting)

## Why this project exists
Role: Diego's fork (seilaut/mcp-server-gsc) of ahonn/mcp-server-gsc, a Google Search Console MCP server (version 0.3.0 in package.json; remediated 2026-10-14 per REMEDIATION.md). It runs over stdio (dist/index.js) and also has a Cloudflare Worker entry (src/remote.ts, wrangler.toml).
Impact: if it breaks, Search Console queries (25K-row analytics, regex filters, quick-wins detection) fail for the sessions that use it; if compromised, it runs with a Google service-account credential that can read Search Console data. Whether any session currently runs it from this folder: unknown.
Users: unknown beyond Diego. The README documents a public npm install; no evidence found here that anyone else installs from this fork.
Security: the fork exists to pass the SkillSpector scan (89/CRITICAL before, 0 vulnerabilities by npm audit after, per REMEDIATION.md); dependencies were raised (googleapis ^186, google-auth-library ^11, tsx 4.23.15) and a patched buffer-equal-constant-time is vendored under patches/. Credentials come from GOOGLE_APPLICATION_CREDENTIALS (stdio) or the GOOGLE_CREDENTIALS secret (Worker); the Worker's bearer token MCP_API_TOKEN is optional, so /mcp is open when it is unset.
Usability: node dist/index.js starts on stdio when GOOGLE_APPLICATION_CREDENTIALS is set and exits 1 when it is not (src/index.ts). The Worker exposes /health and /mcp. No test files and no test script exist.
Threat model: a compromised dependency or bad upstream merge (supply chain), a leaked service-account file, and an unauthenticated /mcp if the Worker is deployed without MCP_API_TOKEN. No database, no uploads, no end-user accounts. Whether the Worker is deployed: unknown.

## Success criteria
- S1 The server compiles cleanly and refuses to start without credentials — measured by: T1.1.1, T1.1.2 and T1.1.3
- S2 No known high-severity advisory in production dependencies — measured by: T3.1.12

## I1 — Carried work (w 1) — outcome: the fork stays buildable
### E1.1 — Fork health (w 1) — done when: each task's criterion passes
- [ ] T1.1.1 The server builds — label: Server builds — AC: `npm run build` exit 0 [slow] — evidence: —
- [ ] T1.1.2 The sources type-check — label: Sources type-check — AC: `npx tsc --noEmit` exit 0 [slow] — evidence: —
- [ ] T1.1.3 The stdio entry refuses to start without credentials — label: Refuses without credentials — AC: `env -u GOOGLE_APPLICATION_CREDENTIALS node dist/index.js` exit 1 [fast] — evidence: —

## I2 — Test stage (w 1) — outcome: every class of test the stack warrants has a runnable criterion
### E2.1 — Criterion classes (w 1) — done when: each task's criterion passes
- [-] T2.1.1 Error paths of an area — dropped 2026-11-04: not applicable: the project has no test files and no test script; a test stage would need new tests first (add a task then)

## I3 — Security (w 1) — outcome: every launch check has evidence or Diego's dated yes
### E3.1 — Static checks (w 1) — done when: the static gate checks pass under --strict — spec: ~/.claude/skills/secure/references/checks.md
- [-] T3.1.1 Row 1: no key shape in tracked files or the built output — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [ ] T3.1.2 Row 1: guards clean and process.env read only in lib/env — label: Guards clean, env isolated — AC: `bash ~/.claude/skills/secure/scripts/gate.sh . --strict --only guards,env_reads` prints "ok":true [fast] — evidence: —
- [ ] T3.1.3 Row 4: no secret anywhere in git history — label: No secrets in history — AC: `gitleaks detect --no-banner --redact --exit-code 1` exit 0 [slow] — evidence: —
- [-] T3.1.4 Row 9: every route handler and server action parses its input with zod — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [ ] T3.1.5 Row 11: no string-built SQL — label: No string-built SQL — AC: `bash ~/.claude/skills/secure/scripts/gate.sh . --strict --only sql_strings` prints "ok":true [fast] — evidence: —
- [-] T3.1.6 Row 12: no console call outside the allowlist, and no-console is an error — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [ ] T3.1.7 Row 12: no token, password or email in the last day of the Worker's logs — label: No secrets in Worker logs — AC: `bash ~/.claude/skills/secure/scripts/gate.sh . --strict --only cloudflare:worker_logs` prints "ok":true [fast] — evidence: —
- [-] T3.1.8 Row 15: every route handler and server action re-authorizes — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [-] T3.1.9 Row 15: the Next.js scanner reports no Critical and no High — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [-] T3.1.10 Row 16: no bare select outside the allowlist — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [-] T3.1.11 Row 17: CSP enforced in source, innerHTML only in lib/json-ld.ts — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [ ] T3.1.12 Row 18: no high advisory in production dependencies — label: No high advisories — AC: `npm audit --omit=dev --audit-level=high` exit 0 [slow] — evidence: —
- [-] T3.1.13 Row 18: next at or above the 16.4.1 floor — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [ ] T3.1.14 Row 18: vulnerability alerts enabled on the repository — label: Vulnerability alerts on — AC: `gh api -i repos/{owner}/{repo}/vulnerability-alerts | head -1 | grep -q ' 204'` exit 0 [slow] — evidence: —
### E3.2 — Data checks (w 1) — done when: every SQL check has fresh passing evidence — spec: ~/.claude/skills/secure/references/sql.md
- [-] T3.2.1 Row 2: RLS on every public table and zero ERROR advisors — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.2 Row 5: sign-ups disabled — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.3 Row 5: a non-admin reads nothing from the admin table — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.4 Row 6: both SQL proofs pass for every user-data table — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.5 Row 8: no public bucket outside the allowlist, a policy for every private bucket — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.6 Row 13: column privileges equal the allowlist and privileged columns refuse the owner — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.7 Row 14: every bucket has a size limit and a MIME allowlist — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.8 Row 14: Payload media restricts MIME types and size — dropped 2026-11-04: not applicable: payload absent when the initiative was inserted
- [-] T3.2.9 Row 19: user A sees no other user's row in any table or view, definer functions for anon equal the allowlist — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.2.10 Row 20: the Supabase scanner reports no Critical and no High — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
### E3.3 — Dynamic checks (w 1) — done when: the abuse pack and attack.sh pass against staging — spec: ~/.claude/skills/secure/references/abuse-pack.md
- [-] T3.3.1 Row 3: user A cannot reach user B's records — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.2 Row 5: admin paths refuse anonymous and non-admin users — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.3 Row 7: an abusable route answers 429 under a burst, or a firewall rule is recorded — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.4 Row 8: a public object URL of a private bucket is refused — dropped 2026-11-04: not applicable: supabase absent when the initiative was inserted
- [-] T3.3.5 Row 10: every built route refuses a cookie-less request — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.6 Row 10: the require-user unit test is green — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.7 Row 11: injection payloads cause no 5xx, no delay and no extra rows — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [-] T3.3.8 Row 13: posted privileged fields stay unchanged — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.9 Row 14: an HTML file and an oversized file are refused — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.10 Row 16: response keys equal the documented DTO — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.11 Row 17: authenticated responses send Cache-Control private, no-store — dropped 2026-11-04: not applicable: auth absent when the initiative was inserted
- [-] T3.3.12 Row 17: staging sends an enforced CSP and X-Frame-Options DENY — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
- [-] T3.3.13 Row 20: the attack run against staging is clean — dropped 2026-11-04: not applicable: next absent when the initiative was inserted
### E3.4 — Owned by Diego (w 1) — done when: each human step has his dated yes — spec: ~/.claude/skills/secure/references/checks.md
- [ ] T3.4.1 Row 4: every key the history scan found is rotated — label: History keys rotated — AC: Diego approves on <date> — evidence: —
- [-] T3.4.2 Row 7: the rate-limit threshold and the firewall rule are decided — dropped 2026-11-04: not applicable: no staging and no recorded deployment of the Worker, so no rate-limit decision is due
- [-] T3.4.3 Row 11: a deep dynamic pass on staging is authorised and its result read — dropped 2026-11-04: not applicable: no staging exists to run a dynamic pass against
- [-] T3.4.4 Row 14: MIME spoofing and malware scanning are accepted as residual risk, or a scanner is chosen — dropped 2026-11-04: not applicable: no uploads
- [-] T3.4.5 Row 20: the staging target is authorised in docs/security/targets.tsv and the residual risk of a clean scan is accepted — dropped 2026-11-04: not applicable: no staging target

<!-- recent git history, for the baseline reviewer:
ee5f19c security: remediate supply chain CVEs, score 89/CRITICAL → 0/LOW
e428b20 Merge pull request #15 from jmrobinson85/fix/allow-discover-googlenews-search-types
-->
