# mcp-server-gsc-fork — the decisions only Diego can make (2026-11-09)

This project is the Google Search Console helper that lets Claude read your Search Console numbers. Nothing in it can move until you answer some of these. They are the same items as `NEXT.md` → "Blockers / awaiting you", in plain words, quickest first. A recommendation is given only where the project's own records support one; "my inference" marks a guess.

How to answer: tell Claude in a chat on this Mac, for example "gsc: 1 yes, 2 yes, 3 read-only". Items marked **approval line** also need you to send one exact line yourself, which Claude will give you when you answer.

## Quick yes or no
1. **Upgrade the zod library to version 4** (T3.5.4). It removes a known security advisory (GHSA-mrhx-c7xc-m3w5). About 1.5 hours of Claude's work. Recommendation: yes. **Approval line.**
2. **Delete three unused files: Dockerfile, smithery.yaml, pnpm-lock.yaml** (T3.5.5). Nothing uses them, and the Docker one would probably not even build (my inference, not run). Recommendation: yes. **Approval line.**
3. **The "submit sitemap" tool: remove it and keep the helper read-only, or give it permission to write** (T4.2.1). With write permission, a known bug could submit a sitemap to the wrong website. Recommendation: remove it, read-only. **Approval line.**
4. **Old keys found in the history: nothing to rotate** (T3.4.1). The history scan found none. Recommendation: approve. **Approval line.**
5. **Turn on GitHub's security alerts for the repository** (T3.5.6). Needs an admin of the GitHub repository `seilaut/mcp-server-gsc`. Recommendation: yes. **Approval line.**
6. **The guard check that stopped running** (T3.1.2). Either Claude copies the guard script into the place the check expects (a small code change, no approval line), or you change the check (approval line). Recommendation: the code change.

## Needs a fact only you know
7. **The online version (the "Worker")** (T3.5.1). This project can also run as an online service on Cloudflare. If no access key is set, it answers anyone without asking for a password (found by the 2026-11-09 review). Is one running online today, and do you use it from anywhere but this Mac? Recommendation: delete it unless you use it. **Approval line.**
8. **The Google service-account key** (T3.5.2). Where is it now, should it be replaced now that OpenClaw is retired, and should the helper be switched on in Claude Code on this Mac? **Approval line.**
9. **Which websites (Search Console properties) the helper may read, and how much access** (T3.5.3). "Restricted" access is enough for reading. Name the websites. **Approval line.**
10. **A missing position counts as 0** (open question). When Google gives no ranking position for a row, the helper treats it as position 0, and the default filter then hides that row. Is that what you want, or a bug?

## Bigger, best done in its own session
11. **The 2026-11-09 review's 40 items** (T5.2.1, `docs/audit/2026-11-09-review-residuals.md`): fix, accept or drop each one. Four come first: two live checks of Google's API, the online version without a password (item 7), and item 6.
12. **Three bugs that no task covers yet**: a text filter is silently ignored in some cases, so you get unfiltered numbers; a `www.` prefix in one fallback; an exact click-rate threshold like 7% can be missed. Recommendation: make the first one a task, because it gives wrong numbers without saying so.
13. **Your own live check** (T4.2.6), after items 8 and 9: in Claude Code on this Mac, ask the helper to list your websites, and confirm it shows yours. **Approval line.**

## Correction, 2026-11-10
- An earlier version of this sheet said T1.3.3 (one installed package left as a broken link) still needed a clean reinstall. That was wrong for this Mac: the check passed and was ticked on 2026-11-09 at 16:57 UTC, and it passed again when re-run on 2026-11-10. Nothing is needed here.
