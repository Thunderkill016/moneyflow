# Exact-head CI observability

## Purpose

MoneyFlow treats CI evidence as valid only for the pull request's current head SHA. This runbook reduces repeated GitHub API polling while keeping failure diagnosis precise, and provides a bounded recovery path when an exact-head workflow run becomes stale or unresponsive.

## Monitoring commands

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

## Recovery command

Use recovery only when the selected exact-head CI run is failed, cancelled, stale or demonstrably unresponsive. Do not create no-op commits to retrigger CI.

Preview the plan without Actions writes:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow --dry-run
```

Recover an `in_progress` run that has been idle for at least the default 15-minute threshold:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow
```

Queued and other waiting states (`queued`, `requested`, `waiting`, `pending`) are intentionally **not** auto-cancelled from elapsed time alone. They may represent runner capacity, concurrency, approval or provider scheduling rather than a zombie run. After independently confirming the run is genuinely unresponsive, use the explicit override:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow --force
```

Cancel an eligible run without dispatching a replacement:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow --cancel-only
```

Dispatch and return after the replacement run is discovered instead of watching it to completion:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow --no-watch
```

Use a different workflow only when it already supports `workflow_dispatch`:

```bash
npm run ci:recover -- 309 --repo Thunderkill016/moneyflow --workflow ci.yml
```

### Recovery behavior

The command:

1. resolves the pull request, branch and exact head SHA;
2. lists only workflow runs attached to that exact SHA;
3. selects the newest exact-head run;
4. exits with pending status for queued/waiting/requested/pending states unless `--force` is supplied;
5. permits stale-threshold automatic cancellation only for an `in_progress` run with established idle time;
6. attempts normal cancellation, then uses official force-cancel behavior only if the run remains active;
7. rechecks the PR head before dispatch;
8. dispatches the workflow on the unchanged head branch without creating a commit;
9. ignores all pre-existing run IDs and accepts only a new `workflow_dispatch` run for the recorded SHA;
10. watches the replacement with `--exit-status` unless `--no-watch` is supplied;
11. rechecks the PR head after completion and rejects stale evidence.

The current `ci.yml` manual path forces the complete application/database/browser selection. Recovery does not weaken required checks or convert a skipped gate into evidence.

### CodeQL and secret-history boundary

CI recovery and security evidence are separate layers.

- A successful `ci.yml` replacement is evidence only for the CI workflow it ran.
- Required CodeQL still needs a real JavaScript/TypeScript analysis associated with the pull-request candidate; do not infer CodeQL acceptance from a successful CI run.
- A manual `workflow_dispatch` of `codeql.yml` on a feature branch is not automatically equivalent to pull-request-scoped code-scanning evidence. The protected pull-request CodeQL run remains the authoritative path unless a dedicated governance change explicitly proves and configures equivalent `ref`/`sha` upload semantics.
- Secret-history evidence remains owned by the repository's secret-history workflow; CI recovery does not replace it.

This separation prevents a manual recovery workflow from producing a green mechanism signal while required security evidence is still absent.

### Safety controls

- Default automatic cancellation applies only to an `in_progress` run with at least 15 minutes of established inactivity.
- Waiting states (`queued`, `requested`, `waiting`, `pending`) return pending regardless of age unless `--force` is supplied.
- Missing or invalid activity timestamps fail safe as pending.
- `--dry-run` performs no GitHub Actions writes.
- `--force` authorizes run cancellation, not merge, deployment, branch-protection or ruleset changes.
- The command never reads or prints token values; authentication remains owned by `gh`.
- The GitHub identity needs pull-request read access and Actions write access for cancellation and dispatch.
- A moved PR head exits with code `3`; rerun the command against the new head rather than accepting old evidence.

### Recovery exit codes

- `0`: no recovery needed, dry-run completed, cancellation-only completed, replacement discovered with `--no-watch`, or replacement CI passed on the unchanged head;
- `1`: replacement CI completed unsuccessfully;
- `2`: usage, authentication, GitHub CLI, API or malformed-response error;
- `3`: PR head moved, so the result is stale;
- `8`: a run is pending/not safely recoverable, or a replacement exact-head run did not appear before the discovery timeout.

### Recovery limits

Repository tooling cannot repair a GitHub service outage or guarantee runner capacity. It can only apply the official cancellation, force-cancellation, manual-dispatch and run-watching interfaces. If a waiting-state run remains blocked, preserve the exact SHA and provider evidence rather than treating age alone as authorization to cancel it. If force-cancel is accepted but no replacement run appears, inspect GitHub Status or support channels rather than changing product code.

## Monitoring guarantees

The monitoring command:

1. reads the PR head SHA before monitoring;
2. delegates check watching to `gh pr checks --watch --fail-fast`;
3. reads the PR head SHA again after monitoring;
4. rejects the result when the head changed during the run;
5. lists only exact-head workflow runs when diagnosis is needed;
6. prints only failed-step logs through `gh run view --log-failed`.

Monitoring exit codes:

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

- [GitHub CLI: cancel a run, including `--force`](https://cli.github.com/manual/gh_run_cancel)
- [GitHub CLI: dispatch a workflow at a ref](https://cli.github.com/manual/gh_workflow_run)
- [GitHub CLI: list, rerun and watch workflow runs](https://cli.github.com/manual/gh_run)
- [GitHub Actions workflow-run REST endpoints](https://docs.github.com/en/rest/actions/workflow-runs)
- [GitHub Actions concurrency behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub code scanning SARIF upload behavior](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github)
- Playwright CI worker, sharding and browser-cache guidance.
