# MoneyFlow CI system audit — 2026-08-06

**Status:** measured implementation candidate
**Repository baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Implementation branch:** `agent/ci-system-hardening`
**Work packet:** `docs/plans/active/ci-system-hardening-2026-08.md`
**Measurement timezone:** GitHub Actions timestamps are UTC; project decisions use Asia/Ho_Chi_Minh.

## Executive result

MoneyFlow already has a comparatively strong risk-proportional CI design: immutable action pins, least-privilege top-level permissions, stale-run cancellation, stable required summaries, independent retryable shards, fresh local database tests, Chromium/WebKit browser coverage, real CodeQL upload and an all-ref secret scan.

The highest-confidence immediate improvements are therefore not a redesign of the test strategy. They are:

1. replace the deprecated `actions/checkout@v4.4.0` runtime with verified `v7.0.1`;
2. stop persisting repository credentials in every read-only checkout;
3. prevent non-database changes from allocating a runner and preparing checkout/Supabase/artifact actions only to print “not required”;
4. lock those decisions with repository tests;
5. preserve every existing command and coverage boundary.

The dominant full-risk latency is the cross-device UI audit, not checkout, npm caching or browser installation. The measured UI test command took about 8.3 minutes of a roughly 9 minute 13 second job. Reducing its coverage would make CI look faster while weakening the project, so this audit does not do that.

## Audit boundary and method

### Repository evidence

Inspected:

- all three files in `.github/workflows` currently used by the project;
- Dependabot configuration;
- npm scripts for policy, lint, type checking, tests, build, architecture and deployment contracts;
- Playwright smoke and audit configuration;
- Supabase migration/RLS/database test scripts;
- Vercel production-only deployment configuration;
- risk classifier, retry-graph and exact-head monitoring scripts;
- current project memory and prior CI work packets;
- recent pull requests that changed CI, security scans, browser reliability or deployment policy.

### Runtime evidence

The principal measured baseline is the exact implementation head of PR #301:

- commit `3a2088a3a0c80075386db9c5bf5630f87c2d209f`;
- CI run #1746, run ID `31034093941`;
- CodeQL run #866, run ID `31034093947`;
- Secret history run #866, run ID `31034093950`.

The documentation-only comparison baseline is PR #303 head `884c54df549f3f81c450c14898e0717a14218b4d`, CI #1760.

Job logs were inspected rather than inferring performance from YAML. Durations below are rounded from log timestamps and are intended as an engineering baseline, not billing-grade metrics.

### Measurement limitation

The available connector can inspect workflows associated with known commits and retrieve their jobs/logs, but it does not expose a complete paginated repository workflow-run census. Therefore this audit does **not** claim a repository-wide first-attempt failure percentage.

What is known:

- the representative PR #301 exact head completed all three workflows successfully;
- recent merged PR records consistently include exact-head green evidence, but those records do not prove first-attempt success;
- prior failures and flakes listed below are real incidents found in PR history and logs;
- a future failure-rate SLO needs a repeatable run-census collector using the GitHub Actions API or authenticated `gh` in an approved environment.

## Current CI architecture

### Workflow 1: CI

The classifier reads the complete PR diff and selects risk-proportional gates. Workflow/configuration and unknown changes receive full verification. Documentation-only changes keep policy and stable summaries while skipping application/browser work.

Full-risk graph before this change:

```text
classify
  ├─ verify_policy ─┐
  ├─ verify_static ─┤
  ├─ verify_tests ──┼─> verify
  └─ verify_build ──┘

classify ─> database

verify ─> browser_smoke ─┐
       └> ui_audit ──────┼─> e2e
```

Protected stable identities are `verify`, `database` and `e2e`. The application and browser shards are intentionally independent so “Re-run failed jobs” does not repeat already successful expensive work on the same SHA.

### Workflow 2: CodeQL

Runs on PRs to `main`, pushes to `main`, a weekly schedule and manual dispatch. It performs real JavaScript/TypeScript extraction with `build-mode: none`, executes queries, uploads SARIF and waits for processing. This is not a cosmetic workflow: a prior attempt to make CodeQL risk-selective produced a green shell result without required uploaded analysis and blocked merges.

### Workflow 3: Secret history scan

Runs on the same event classes as CodeQL. It checks out full history, fetches every branch/tag, downloads a checksum-verified Gitleaks binary and scans `--all` refs. This broad scope previously found a reviewed publishable-key finding outside the immediate product diff.

### Deployment

No GitHub Actions deployment job exists. Vercel owns automatic deployment and `vercel.json` allows it only for `main`; branch deployments are disabled. CI validates deployment environment contracts but does not deploy or mutate provider configuration.

## Measured baseline

### Full-risk exact head

| Workflow / job | Job ID | Approx. duration | Dominant measured work | Result |
|---|---:|---:|---|---|
| CI / static quality | `92401847806` | 45.8 s | `npm ci` 15.3 s; ESLint 15.7 s; typecheck 9.7 s | success with 2 lint warnings |
| CI / unit + static RLS | `92401847845` | 36 s | `npm ci` ~15 s; 723 tests 9.14 s | success |
| CI / production build | `92401847795` | 45.3 s | `npm ci` ~14 s; Next build 21.3 s | success |
| CI / policy contracts | `92401847971` | 4.6 s | full-history checkout plus fast knowledge/CI-policy scripts | success |
| CI / database, not selected | `92401847817` | 3.6 s | runner/action preparation and checkout despite no DB test | success/no-op |
| CI / browser smoke | `92402106588` | 3 m 05 s | Chromium/deps 24.4 s; 58 tests 2.3 m | success |
| CI / cross-device UI audit | `92402106498` | 9 m 13 s | browsers/deps ~36 s; 554 scheduled tests, 8.3 m | 427 passed, 127 skipped |
| CodeQL | `92401777269` | 64.9 s | real extraction/query/upload/processing; overlay cache hit | success |
| Secret history | `92401723175` | ~6 s | 2,337 commits / 14.27 MB scanned in 1.39 s | success |

### CI job count

Before this change:

- full-risk CI exposes 10 jobs;
- CodeQL adds 1 job;
- secret history adds 1 job;
- total full-risk workflow jobs visible: 12.

After the database executor/summary split:

- full-risk database-selected CI exposes 11 jobs because `database_checks` is separately retryable and `database` stays the stable summary;
- non-database changes show `database_checks` as skipped without runner execution while the stable `database` summary still runs;
- this slightly increases graph clarity/job count for database-selected runs but removes unnecessary heavy setup from the much more common non-database path.

### Slowest steps and real bottlenecks

1. **UI audit test execution:** roughly 8.3 minutes; primary wall-clock bottleneck.
2. **Browser smoke test execution:** roughly 2.3 minutes.
3. **CodeQL query/extraction/upload:** roughly one minute total; security work is genuine and benefits from overlay cache.
4. **Repeated npm install:** approximately 12–15 seconds in each Node job; visible aggregate runner cost, but independent jobs are valuable for diagnosis/retry.
5. **Playwright browser/dependency install:** approximately 24–36 seconds; meaningful but much smaller than actual browser tests.
6. **Secret history:** not a bottleneck.

## Real incidents and reliability findings

| Incident | Evidence and consequence | Current decision |
|---|---|---|
| `ready_for_review` did not activate required gates | historical PR #214; a draft could become reviewable without a fresh required result | explicit trigger and conditional are retained |
| CodeQL appeared green without uploaded analysis | historical PRs #221/#230; repository rules continued waiting for code-scanning evidence | CodeQL runs real upload on every PR head |
| One UI safety case failed then same exact head passed on rerun | historical PR #228, SAFE-09 | preserve isolated browser shards and same-SHA failed-job rerun; do not add blind automatic retry |
| WebKit interacted before hydration | historical PR #232 | fixed the locator/interaction boundary rather than weakening the assertion |
| All-ref Gitleaks found a reviewed browser-safe publishable key on another branch | PR #295 | keep all-ref scope and exact-fingerprint review; do not path-limit the scanner |
| Old checkout runtime emits Node 20 deprecation warning | repeated in CI and CodeQL logs on current runner | upgrade to checkout v7.0.1 |
| Non-database PR still downloads/prepares DB-related actions and checks out repository | measured in PR #301 and docs-only #303 | conditional executor plus stable summary |
| ESLint reports two warnings | `transactions-page.tsx`, `react-hooks/exhaustive-deps` | fix separately, then consider zero-warning policy; do not hide or abruptly fail this CI PR |
| `npm ci` reports four moderate advisories | repeated Node jobs | perform exploitability/runtime review separately; do not add a noisy blanket blocker without policy |

## Security assessment

### Strong existing controls

- top-level `contents: read` in CI and secret scan;
- CodeQL adds only `packages: read` and `security-events: write` required for analysis/upload;
- third-party actions are pinned to immutable full commit SHAs;
- Supabase CLI and Gitleaks versions are explicit;
- Gitleaks archive checksum is verified before execution;
- test keys are synthetic and labelled;
- artifacts have short retention;
- branch deployment is disabled and production is main-only;
- exact-head monitoring rejects stale green results.

### Immediate hardening applied

All read-only jobs now use `actions/checkout` v7.0.1 pinned to:

`3d3c42e5aac5ba805825da76410c181273ba90b1`

Every checkout sets `persist-credentials: false`. This removes the old Node runtime deprecation and reduces the period in which the repository token is available through local Git configuration. No inspected job pushes, tags, commits or fetches private secondary repositories.

### Deferred security work

- inspect the four moderate npm advisories against production dependency paths and reachability;
- keep Dependabot grouped/monthly noise policy unless a security advisory requires an immediate targeted PR;
- periodically refresh pinned action SHAs through reviewed Dependabot PRs;
- consider an organization/repository policy that requires full-length action pins if not already enforced outside the repo.

## Accuracy and coverage assessment

### What CI catches well

- syntax/config and knowledge-policy drift;
- architecture/CSS/deployment contract violations;
- ESLint and TypeScript errors;
- complete Node test suite and static RLS checks;
- production Next.js compilation;
- fresh local Supabase migration/reset/pgTAP for selected database changes;
- critical Chromium flows and CAPTCHA behavior;
- broad Chromium/WebKit responsive and accessibility state coverage;
- JavaScript/TypeScript security queries and workflow-code analysis;
- secrets across every reachable branch/tag history.

### Remaining accuracy gaps

- no repository-wide measured first-attempt reliability SLO;
- no physical Android/iOS acceptance in routine CI, intentionally deferred to final product acceptance;
- two lint warnings are visible but not blocking;
- npm advisory output is visible but not triaged into an explicit allow/block policy;
- Vercel production deployment success is separate from GitHub required checks; production smoke remains a deliberate post-merge boundary.

## Resource and speed assessment

### Safe savings implemented

The old `database` job always allocated a runner and prepared action dependencies. The new graph is:

```text
classify ── database=true ──> database_checks ─┐
         └─ database=false ─> skipped ─────────┼─> database (stable summary)
```

For non-database changes:

- `database_checks` must be `skipped`;
- no checkout, Supabase action or artifact action runs there;
- `database` validates the classifier and skipped result using shell only;
- branch protection retains the same stable required check name.

For database changes:

- fresh start/reset/pgTAP and diagnostics remain unchanged;
- the heavy executor can be rerun independently;
- the stable summary fails if the selected executor did not succeed.

### Savings not taken

- Recombining Node shards could avoid repeated `npm ci` but would make late failures repeat successful lint/test/build work and reduce diagnosis quality.
- Browser cache could save some download time, but Playwright does not generally recommend browser-binary caching and the measured test runtime dominates.
- Removing browser projects or states would improve wall time by reducing correctness, which violates the task.
- Narrowing CodeQL or Gitleaks would save little relative to the security evidence lost.

## Ranked improvement backlog

Scales: impact/urgency 1–5; cost/risk 1–5 where 5 is higher.

| Rank | Improvement | Impact | Urgency | Cost | Risk | Decision |
|---:|---|---:|---:|---:|---:|---|
| 1 | Upgrade checkout runtime and disable persisted credentials | 4 | 5 | 1 | 1 | do now — implemented |
| 2 | Conditional DB executor with stable required summary | 4 | 4 | 2 | 2 | do now — implemented and contract-tested |
| 3 | Preserve/extend workflow topology contracts | 4 | 4 | 1 | 1 | do now — implemented |
| 4 | Record repeatable baseline and decisions in repo | 4 | 4 | 2 | 1 | do now — this document |
| 5 | Fix two React hook lint warnings, then decide zero-warning policy | 3 | 3 | 2 | 2 | do next in focused code PR |
| 6 | Triage four moderate npm advisories by reachability/runtime | 4 | 3 | 2 | 2 | do next; do not blanket-fail yet |
| 7 | Build a complete Actions run census and reliability dashboard/SLO | 4 | 3 | 3 | 1 | do after an authenticated API/`gh` environment is available |
| 8 | Experiment with UI-audit sharding by project family | 4 wall-time / variable minutes | 2 | 4 | 3 | measure later; requires report/artifact merge design |
| 9 | Experiment with verified Next build artifact reuse in browser jobs | 3 | 2 | 4 | 3 | deferred; prior project decision requires proof |
| 10 | Cache Playwright browser binaries | 1 | 1 | 3 | 3 | not suitable now |
| 11 | Skip CodeQL or all-ref secret scanning for docs-only changes | 2 speed | 1 | 1 | 5 | rejected |
| 12 | Reduce browser matrix/test set to improve latency | 5 speed | 1 | 1 | 5 | rejected |

## Implementation diff

### `.github/workflows/ci.yml`

- checkout v7.0.1 full SHA in every repository checkout;
- `persist-credentials: false` in every checkout;
- add conditional `database_checks` executor;
- convert `database` into a stable `always()` summary;
- preserve all verification, database, browser and artifact commands.

### `.github/workflows/codeql.yml`

- checkout v7.0.1 full SHA;
- disable persisted credentials;
- preserve real analysis/upload configuration and permissions.

### `.github/workflows/secret-history.yml`

- checkout v7.0.1 full SHA;
- preserve all-ref fetch, verified Gitleaks version/checksum and scan command.

### `scripts/ci-retry-graph.test.mjs`

New permanent assertions require:

- a conditional `database_checks` executor;
- stable `database` `always()` summary;
- selected/unselected executor result validation;
- no checkout/Supabase/artifact action in the summary;
- all eight CI checkouts to disable credential persistence;
- existing retry-safe artifact names and `verify`/`e2e` topology.

## Before/after verification

This section is intentionally pending until the exact branch head runs on GitHub-hosted runners.

Required evidence before a performance or reliability claim:

- all full-risk CI shards pass;
- full database executor and stable summary pass;
- complete test count remains at least the current baseline unless legitimate tests are added/removed with explanation;
- browser smoke and Chromium/WebKit audit retain the same selected project/state coverage;
- CodeQL uploads and processing complete;
- all-ref Gitleaks completes;
- checkout logs identify v7 and no longer emit the old checkout Node 20 warning;
- a later documentation-only exact head shows `database_checks: skipped` and stable `database: success` without checkout/action setup;
- measured duration comparison is recorded here and in PR memory.

## Durable lessons

1. Optimize the measured critical path, not the most visible YAML repetition.
2. Stable required checks and conditional heavy executors can coexist.
3. Skipping an executor is safe only when a stable summary validates both classifier intent and actual result.
4. Real security evidence may need to run even when application tests are risk-proportional.
5. Same-SHA failed-job reruns are useful only when expensive work is separated into truthful job boundaries.
6. A fast all-history secret scan should not be narrowed merely because its scope looks broad.
7. CI “green” is insufficient when the required external artifact—such as uploaded CodeQL analysis—is missing.
8. Before/after claims belong to exact commit heads and concrete run/job IDs, not generic expectations.

## External source record

Primary references consulted on 2026-08-06:

- GitHub Docs: workflow syntax, job dependencies, conditions, concurrency, permissions and reruns.
- GitHub Docs: secure use of GitHub Actions and immutable action pinning.
- `actions/checkout` official v7.0.1 release and source documentation.
- `actions/setup-node` official cache behavior documentation.
- GitHub CodeQL official workflow and analysis documentation.
- Playwright official CI documentation and browser caching guidance.
- Supabase official local development and database testing documentation.
- Gitleaks official release/source documentation.

General recommendations were adopted only when supported by MoneyFlow source, logs or historical failures.
