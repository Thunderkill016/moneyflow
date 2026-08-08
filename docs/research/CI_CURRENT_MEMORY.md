# MoneyFlow CI — current memory

**Status:** verified-unmerged candidate on PR #304
**Baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Detailed audit:** `docs/research/CI_SYSTEM_AUDIT_2026-08-06.md`
**Work packet:** `docs/plans/active/ci-system-hardening-2026-08.md`
**Last updated:** 2026-08-06

## Current architecture

MoneyFlow uses three GitHub Actions workflows:

1. `CI` — risk classifier; policy/static/test/build shards; stable `verify`; conditional database executor plus stable `database`; Chromium smoke and Chromium/WebKit audit plus stable `e2e`.
2. `CodeQL` — real JavaScript/TypeScript extraction, query execution, SARIF upload and processing on every PR head, main push, schedule and manual run.
3. `Secret history scan` — checksum-verified Gitleaks over every branch and tag on the same event classes.

Vercel deployment is outside GitHub Actions and is automatic only from `main`; branch deployments are disabled.

Stable protected check identities are `verify`, `database` and `e2e`. Heavy shards stay separate for same-SHA failed-job reruns.

## PR #304 candidate changes

- Every workflow checkout uses official `actions/checkout@v7.0.1` pinned to `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- Every read-only checkout sets `persist-credentials: false`.
- `database_checks` owns selected Supabase setup, fresh reset, pgTAP, diagnostics and cleanup.
- Stable `database` validates selected success or unselected skip using shell only.
- CI contracts prevent credential persistence and topology regression.
- Lint, typecheck, 723 tests, build, database, browser and security scope are unchanged.

## Verified evidence

Full-risk head `d68790a5047a38eaf3a753f87ee7936883d39a6e`:

- CI #1764 (`31043251727`): success;
- CodeQL #883 (`31043252721`): success;
- Secret history #883 (`31043252598`): success;
- 723 tests passed;
- production build passed;
- fresh Supabase start/reset/pgTAP passed;
- 58 browser smoke tests passed;
- UI audit retained 554 scheduled cases: 427 passed and 127 skipped, with the same 8.3-minute test runtime;
- CodeQL scanned 436 TypeScript, 17 JavaScript and 4 workflow files and processed the upload;
- all-ref Gitleaks scanned 2,358 commits in 1.29 seconds.

Closed-unmerged probe PR #305, run `31044872202`:

- one-file documentation diff classified documentation-only;
- database selection was false;
- database executor was skipped with `steps: null`, so no executor runner, checkout or Supabase action setup occurred;
- stable database summary succeeded using one shell-only runner and no repository checkout.

## Measured interpretation

- Primary latency remains the cross-device UI audit test command at about 8.3 minutes.
- This slice does not claim a general CI wall-clock speedup.
- Proven security improvement: supported checkout runtime and no persisted repository credentials.
- Proven resource improvement for non-database changes: no database executor allocation, checkout or Supabase/artifact action preparation; one tiny stable summary runner remains.
- Full-risk correctness and browser/security coverage were preserved exactly.

## Historical constraints that must not regress

- Keep `ready_for_review` because it previously missed required evidence.
- Keep real CodeQL upload on every PR head; a shell-only green result is insufficient.
- Keep all-ref Gitleaks; it previously found a reviewed finding outside the immediate PR path.
- Keep stable protected identities and separate expensive shards for failed-job reruns.
- Do not cache Playwright browsers, collapse shards or reduce browser coverage without measured project evidence.
- Do not add blind retries.

## Next work

Priority order:

1. fix two existing `react-hooks/exhaustive-deps` warnings, then decide zero-warning policy;
2. triage four moderate npm advisories by reachability;
3. track the upstream `actions/setup-node@v7.0.0` bundled-dependency issue and upgrade to the first official patched release;
4. build a complete Actions run census and first-attempt reliability SLO when an authenticated API/`gh` environment is available;
5. reconcile Supabase CLI's `[inbucket]` warning with official docs before moving to `[local_smtp]`;
6. add `merge_group` only if merge queue is enabled;
7. measure UI-audit sharding and build-artifact reuse in separate experiments.

## Permission boundary

PR #304 is verified-unmerged. Do not merge, deploy, change provider/database/Auth/RLS settings, touch production data, reduce verification scope or start Phase 5 without a separate explicit owner instruction.
