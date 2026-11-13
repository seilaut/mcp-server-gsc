# Security Remediation Log

Fork: `seilaut/mcp-server-gsc` (upstream: `ahonn/mcp-server-gsc`)  
Remediated: 2026-10-14  
Remediator: seilaut / Claude Code

---

## Summary

SkillSpector pre-remediation score: **89/CRITICAL** (34 issues: 32 supply-chain CVEs, 2 privilege-escalation findings)  
Post-remediation score: **0 vulnerabilities** (`npm audit` clean) as of 2026-10-14. This was probably true on that date (the audit could not confirm it) and is not true now; see the 2026-11-04 update below for the current state.

---

## Supply Chain CVEs Fixed

### Approach

1. `npm audit fix` — resolved 18 of 23 vulnerabilities (23 original, after first pass).
2. `npm install tsx@4.23.15` — upgraded tsx from 4.21.0 to 4.23.15 to pull in `esbuild@~0.28.0`, fixing GHSA-g7r4-m6w7-qqqr.
3. `npm audit fix --force` — upgraded `googleapis` from `^146.0.0` to `186.0.0` (breaking change) to resolve the `uuid`-chain vulnerabilities.
4. `npm install google-auth-library@^11.3.0` — upgraded `google-auth-library` from 9.x to 11.x to pull in `gaxios@7.x` (safe).
5. `npm uninstall @google-cloud/local-auth` — removed unused dependency (never imported in source) that was the last carrier of `uuid@9.0.1` → `gaxios@6.7.1`.

### TypeScript compatibility

The `hono` upgrade (4.12 → 4.13) introduced a stricter type for `bearerAuth()` middleware.  
Applied a `c as any` cast in `src/remote.ts:23` — runtime behavior unchanged, cast is scoped to the single middleware invocation.

### Packages changed

| Package | Before | After | Reason |
|---------|--------|-------|--------|
| `tsx` | 4.21.0 | 4.23.15 | esbuild GHSA-g7r4-m6w7-qqqr |
| `googleapis` | ^146.0.0 | ^186.0.0 | uuid chain: GHSA-w5hq-g745-h8pq |
| `google-auth-library` | ^9.15.0 | ^11.3.0 | uuid chain via gaxios@6.x |
| `@google-cloud/local-auth` | ^3.0.1 | removed | unused; last carrier of uuid@9.x |

---

## False Positives (Do Not Patch)

### FP-1: `Dockerfile:36` — Privilege Escalation (DISMISSED)

**Finding:** SkillSpector flagged `ENV GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json` as a potential privilege escalation vector.

**Assessment:** This is a standard Google Cloud service account credential path used by all Google Cloud client libraries. The environment variable tells the GCP SDK where to find the service account JSON file mounted at runtime. There is no privilege escalation here — the service account's IAM permissions are defined in GCP, not granted by this path assignment. The path `/app/credentials.json` is the conventional location for this pattern. The key file must be supplied at run time only, as a mounted secret or an environment variable. It must never be baked into an image layer (no `COPY` of the key in the Dockerfile), because anyone who can pull the image could then read the private key.

**Action:** No change. This is correct, secure configuration.

---

### FP-2: `README.md:68` — Privilege Escalation (DISMISSED)

**Finding:** SkillSpector flagged `/path/to/credentials.json` in the README as a potential privilege escalation vector.

**Assessment:** This is documentation — a placeholder in a user configuration example showing where to put a service account credential file. It is not executable code and cannot grant any privileges. The comment instructs users how to configure the MCP server with their own credentials, which is the expected setup flow.

**Action:** No change. Documentation placeholder, not an actionable security issue.

---

## Final State (as of 2026-10-14)

```
npm audit
found 0 vulnerabilities
```

Build: `npm run build` → exit 0 (TypeScript compilation clean)

---

## Update 2026-11-04: advisories published after the remediation

The "0 vulnerabilities" result above was probably true on 2026-10-14 (the audit found the advisories were reviewed or published after that date) and is no longer true. GitHub published or reviewed new advisories afterwards (audit `docs/audit/2026-11-04-audit.md`, finding F3).

### Open on 2026-11-04 (`npm audit --omit=dev`, before the fixes below): 4 vulnerabilities (2 high, 2 moderate)

| Package | Affected range | Advisory | Severity |
|---------|----------------|----------|----------|
| body-parser | 2.0.0 to 2.3.0 | GHSA-27r3-jxmh-p828 | high |
| zod | <4.6.6 | GHSA-mrhx-c7xc-m3w5 | high |
| fast-uri | 3.0.0 to 3.1.8 | 4 advisories | moderate |
| qs | 6.7.0 to 6.16.0 | GHSA-6pq8-jhm2-2vcw | moderate |

### Fixed on 2026-11-04

- Commit `b123bc8` refreshed the lockfile only (`npm audit fix --omit=dev`, no `--force`): body-parser 2.3.0 to 2.4.0, fast-uri 3.1.8 to 3.1.9, qs 6.16.0 to 6.17.1, and iconv-lite 0.7.2 to 0.7.3 (transitive).
- Commit `c7080c9` removed the dead `buffer-equal-constant-time` override and `patches/` (audit F1). It was a cleanup, not an advisory fix. The lockfile now uses the registry `buffer-equal-constant-time` 1.0.1.

### Still open

`npm audit --omit=dev` on the current tree reports one vulnerability:

```
zod  <4.6.6
Severity: high
Zod can exhaust memory while validating oversized constrained collections - https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
```

The fix is a major upgrade (zod 3.25.76 to 4.6.7). The decision is T3.5.4 (awaiting Diego) and the upgrade is T3.5.7. Until then `npm audit --omit=dev` exits non-zero.

### Not covered by this log

`pnpm-lock.yaml` was never remediated, and the Dockerfile installs from it (audit F4, F11). The Dockerfile path is not covered by the results above.

Note 2026-11-12 (T3.5.12): the Dockerfile, `smithery.yaml` and `pnpm-lock.yaml` were removed, so this path no longer exists. The text above is kept as written on its date.

The audit (F4) also found 11 vulnerable production packages in `pnpm-lock.yaml`, 1 of them critical (`proxy-addr@2.0.7`, GHSA-jqcg-44mw-7w3h). The Dockerfile installs from that lockfile, so the results above do not cover the Docker path. (Removed 2026-11-12, T3.5.12: see the note above.)
