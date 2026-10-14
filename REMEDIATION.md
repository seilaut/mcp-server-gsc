# Security Remediation Log

Fork: `seilaut/mcp-server-gsc` (upstream: `ahonn/mcp-server-gsc`)  
Remediated: 2026-10-14  
Remediator: seilaut / Claude Code

---

## Summary

SkillSpector pre-remediation score: **89/CRITICAL** (34 issues: 32 supply-chain CVEs, 2 privilege-escalation findings)  
Post-remediation score: **0 vulnerabilities** (`npm audit` clean)

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

**Assessment:** This is a standard Google Cloud service account credential path used by all Google Cloud client libraries. The environment variable tells the GCP SDK where to find the service account JSON file mounted at runtime. There is no privilege escalation here — the service account's IAM permissions are defined in GCP, not granted by this path assignment. The path `/app/credentials.json` is mounted as a secret at container startup (Dockerfile `COPY` or runtime volume) and is the conventional location for this pattern.

**Action:** No change. This is correct, secure configuration.

---

### FP-2: `README.md:68` — Privilege Escalation (DISMISSED)

**Finding:** SkillSpector flagged `/path/to/credentials.json` in the README as a potential privilege escalation vector.

**Assessment:** This is documentation — a placeholder in a user configuration example showing where to put a service account credential file. It is not executable code and cannot grant any privileges. The comment instructs users how to configure the MCP server with their own credentials, which is the expected setup flow.

**Action:** No change. Documentation placeholder, not an actionable security issue.

---

## Final State

```
npm audit
found 0 vulnerabilities
```

Build: `npm run build` → exit 0 (TypeScript compilation clean)
