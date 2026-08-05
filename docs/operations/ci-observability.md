# Exact-head CI observability

## Purpose

MoneyFlow treats CI evidence as valid only for the pull request's current head SHA. This runbook reduces repeated GitHub API polling while keeping failure diagnosis precise.

## Commands

Prerequisites:

- GitHub CLI (`gh`) installed and authenticated;
- repository checkout, or pass `--repo OWNER/REPO`.

Check once:

```bash
npm run ci:status -- 301 --repo Thunderkill016/moneyflow
```

Watch until completion and stop on the first failed check:

```bash
npm run ci:watch -- 301 --repo Thunderkill016/moneyflow
```

Watch required checks only:

```bash
npm run ci:watch -- 301 --required --repo Thunderkill016/moneyflow
```

Use a slower refresh interval when GitHub is under load:

```bash
npm run ci:watch -- 301 --interval 30 --repo Thunderkill016/moneyflow
```

## Guarantees

The command:

1. reads the PR head SHA before monitoring;
2. delegates check watching to `gh pr checks --watch --fail-fast`;
3. reads the PR head SHA again after monitoring;
4. rejects the result when the head changed during the run;
5. lists only exact-head workflow runs when diagnosis is needed;
6. prints only failed-step logs through `gh run view --log-failed`.

Exit codes:

- `0`: all selected checks passed on the same exact head;
- `1`: a selected check failed or was cancelled;
- `2`: usage, authentication, GitHub CLI, or response error;
- `3`: PR head moved while checks were running, so the result is stale;
- `8`: checks are still pending in `--once` mode.

## Agent monitoring protocol

For connector/API-based monitoring:

1. fetch PR metadata once and record `head_sha`;
2. fetch workflow runs for that commit once and record run IDs;
3. poll workflow-level status rather than repeatedly downloading every job payload;
4. inspect jobs only after a workflow completes with failure, or when one long-running gate must be identified;
5. fetch failed job logs or artifacts only after failure;
6. verify the PR head SHA again before reporting a final verdict.

Do not repeatedly fetch completed job details. Do not download success artifacts merely to prove that a successful job ran; the workflow conclusion and immutable exact-head SHA are the primary evidence.

## CI optimization rules

- Keep workflow-level `concurrency` with `cancel-in-progress: true` so obsolete branch runs do not consume minutes.
- Use dependency caching for package-manager downloads; never place secrets in caches.
- Use artifacts for diagnostics and outputs that must cross job boundaries.
- Do not cache Playwright browser binaries by default. Playwright notes that restoring the browser cache can take approximately as long as downloading it, while Linux system dependencies are not cacheable.
- Keep browser traces/screenshots focused on failures and retain them briefly.
- Prefer stable CI worker counts; use explicit sharding only after measuring wall-clock improvement and preserving deterministic state isolation.

## Next measured optimization

The current UI audit invokes a production build inside Playwright even though `verify_build` already creates a successful Next.js build. A future CI performance change may upload the verified `.next` output as a short-lived artifact and reuse it in browser jobs. Implement this only with before/after timing evidence because artifact transfer overhead can outweigh build savings on small changes.

## Official references

- GitHub CLI: `gh pr checks`, `gh run watch`, `gh run list`, and `gh run view --log-failed`.
- GitHub Actions: workflow concurrency, dependency caching, and workflow artifacts.
- Playwright: CI worker guidance, sharding guidance, and the recommendation not to cache browser binaries by default.
