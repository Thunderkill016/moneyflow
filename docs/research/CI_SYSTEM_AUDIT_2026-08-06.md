# MoneyFlow CI system audit — 2026-08-06

**Status:** implementation and selected/unselected database paths verified
**Repository baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Implementation branch:** `agent/ci-system-hardening`
**Pull request:** #304
**Probe:** closed-unmerged PR #305
**Work packet:** `docs/plans/active/ci-system-hardening-2026-08.md`

## Executive result

MoneyFlow already had a strong risk-proportional pipeline: immutable action pins, explicit permissions, stale-run cancellation, stable protected summaries, independently retryable shards, fresh local database tests, Chromium/WebKit coverage, real CodeQL upload and all-ref secret scanning.

The first safe hardening slice therefore does not rewrite or reduce verification. It:

1. upgrades every checkout from deprecated `actions/checkout@v4.4.0` to official `v7.0.1` pinned by full SHA;
2. disables persisted Git credentials in all read-only checkout jobs;
3. separates the conditional Supabase executor from the stable protected `database` summary;
4. removes checkout and Supabase/artifact action preparation from non-database database checks while retaining one tiny summary runner;
5. locks the new topology and credential behavior with tests;
6. preserves every existing lint, typecheck, test, build, database, browser and security command.

The measured critical path remains the 8.3-minute cross-device UI test execution. No project, width, browser, state or assertion was removed.

## Audit boundary

Inspected:

- all files in `.github/workflows` and `.github/dependabot.yml`;
- package scripts for policy, lint, typecheck, tests, build and browser audits;
- Playwright smoke/audit configuration;
- Supabase migration, reset, RLS and pgTAP scripts;
- Vercel production-only configuration and deployment checks;
- classifier, retry graph and exact-head monitoring scripts;
- prior CI/security/reliability PRs and work packets;
- exact workflow jobs, step logs, artifacts, failures and same-SHA reruns.

The available connector does not expose a complete paginated workflow-run census. This audit does **not** claim a repository-wide first-attempt failure percentage. A future SLO needs a GitHub Actions REST API or authenticated `gh` collector.

## Current architecture

```text
classify
  ├─ verify_policy ─┐
  ├─ verify_static ─┤
  ├─ verify_tests ──┼─> verify
  └─ verify_build ──┘

classify ── database=true ──> database_checks ─┐
         └─ database=false ─> skipped ─────────┼─> database

verify ─> browser_smoke ─┐
       └> ui_audit ──────┼─> e2e
```

Stable protected identities remain `verify`, `database` and `e2e`. Heavy jobs stay independent so GitHub can rerun failed jobs without repeating successful expensive work.

CodeQL still performs real JavaScript/TypeScript extraction, query execution, SARIF upload and processing on every PR head. Secret scanning still fetches and scans every branch and tag with a checksum-verified Gitleaks binary.

GitHub Actions does not deploy MoneyFlow. Vercel deploys only `main`; branch deployments are disabled.

## Measured baseline

Principal before-state: PR #301 head `3a2088a3a0c80075386db9c5bf5630f87c2d209f`.

- CI #1746, run `31034093941`;
- CodeQL #866, run `31034093947`;
- Secret history #866, run `31034093950`.

| Job | Approx. duration | Measured work |
|---|---:|---|
| Static | 45.8 s | install 15.3 s; lint 15.7 s; typecheck 9.7 s |
| Unit/static RLS | 36 s | 723 tests; command 9.14 s |
| Build | 45.3 s | build command 21.3 s |
| Policy | 4.6 s | full-history checkout and policy scripts |
| Old unselected database job | 3.6 s | allocated runner, prepared actions and checked out repository despite no DB work |
| Browser smoke | 3 m 05 s | 58 tests; command 2.3 m |
| UI audit | 9 m 13 s | 554 scheduled; 427 passed; 127 skipped; command 8.3 m |
| CodeQL | 64.9 s | extraction/query/upload/processing |
| Secret history | ~6 s | 2,337 commits; scan 1.39 s |

Bottleneck order:

1. UI audit test execution;
2. browser smoke execution;
3. CodeQL;
4. repeated `npm ci`;
5. Playwright browser/dependency installation;
6. secret history is not a bottleneck.

## Real incidents and preserved decisions

| Incident | Decision retained |
|---|---|
| `ready_for_review` once missed required gates | keep explicit trigger and conditions |
| shell-only CodeQL once failed to upload required analysis | run real CodeQL on every PR head |
| SAFE-09 failed once and passed on same-SHA rerun | keep independent browser shards and diagnostic reruns; no blind retry |
| WebKit interacted before hydration | fix test boundary, not assertion scope |
| all-ref Gitleaks found a reviewed finding on another branch | retain all-ref coverage |
| checkout v4 emitted Node-runtime deprecation warnings | upgrade to checkout v7.0.1 |
| non-database checks prepared DB-related actions | conditional executor plus stable summary |

## Research decisions

Official GitHub, checkout, CodeQL, Playwright, Supabase and Gitleaks documentation/source were compared with project logs before changes.

Adopted:

- immutable full-SHA action pins;
- least-privilege permissions;
- checkout v7.0.1;
- `persist-credentials: false` for read-only jobs;
- stable summaries validating conditional heavy jobs;
- real CodeQL upload;
- fresh Supabase reset/pgTAP;
- all-ref Gitleaks.

Rejected or deferred:

- do not combine static/test/build merely to avoid repeated installs;
- do not cache Playwright browsers without project measurements;
- do not narrow CodeQL or Gitleaks for documentation changes;
- do not reduce browser matrix/states/tests;
- do not add blind retries;
- do not use unpinned or unreleased action refs;
- do not migrate Supabase `[inbucket]` to `[local_smtp]` while CLI warning and official docs remain inconsistent;
- add `merge_group` only if the repository actually enables merge queue.

## Implementation

### Workflows

- all CI, CodeQL and secret-history checkouts now use `actions/checkout` v7.0.1 at `3d3c42e5aac5ba805825da76410c181273ba90b1`;
- every checkout sets `persist-credentials: false`;
- `database_checks` owns Supabase setup, fresh reset, pgTAP, diagnostics and cleanup;
- stable `database` validates selected success or unselected skip using shell only;
- verification commands and browser/security scope are unchanged.

### Contracts

`ci-retry-graph.test.mjs` requires:

- conditional `database_checks`;
- stable `database` with selected/unselected result validation;
- no checkout, Supabase or artifact action in the summary;
- all eight CI checkouts to disable credential persistence;
- existing `verify`, `e2e` and attempt-specific artifact behavior.

## Full-risk exact-head verification

Head `d68790a5047a38eaf3a753f87ee7936883d39a6e` passed:

- CI #1764, run `31043251727`;
- CodeQL #883, run `31043252721`;
- Secret history #883, run `31043252598`.

| Gate | Result |
|---|---|
| Policy/topology | knowledge, diff hygiene and CI contracts passed |
| Static | lint, typecheck, architecture, CSS and deployment contracts passed; same 2 existing hook warnings |
| Tests | 723/723 passed; command 7.954 s |
| Build | production build passed; command ~22.1 s |
| Database selected path | fresh Supabase start/reset/pgTAP passed |
| Stable database | validated executor success |
| Browser smoke | 58 passed in 2.2 m |
| UI audit | 554 scheduled; 427 passed; 127 skipped; command 8.3 m |
| Stable e2e | validated both browser shards |
| CodeQL | scanned 436 TS, 17 JS and 4 workflow files; upload processed |
| Secret history | scanned all refs; 2,358 commits in 1.29 s |

Interpretation:

- correctness and coverage preservation are proven;
- checkout v7 works on the hosted runner and the old checkout deprecation warning is gone;
- static/build timing was similar or slightly slower from runner variance;
- tests/browser smoke were faster on this sample, also normal variance;
- UI audit remains the same 8.3-minute critical path;
- no general wall-clock speedup is claimed.

## Documentation-only database-path verification

Closed-unmerged probe PR #305 targeted an isolated non-main base containing the candidate topology. Its diff contained one documentation file only.

Workflow `CI docs-only database probe` run `31044872202` proved:

- classifier: success and documentation-only;
- database required: false;
- `Probe database executor`: **skipped**, with `steps: null`, so no executor runner, checkout or Supabase action setup occurred;
- `Probe stable database summary`: **success**;
- summary shell validated `classify=success`, `database=false` and executor result `skipped`;
- summary runner performed no repository checkout and completed its validation in well under one second after runner startup.

Before/after interpretation:

- before: the unselected database job took about 3.6 seconds and still prepared actions/checked out the repository;
- after: the heavy executor is never allocated; the stable protected check uses one tiny shell-only runner;
- proven saving: removal of executor allocation, checkout and DB/artifact action preparation from non-database changes;
- not claimed: removal of all runner usage or a repository-wide wall-clock percentage.

PR #305 was closed without merge after evidence was recorded. It did not target `main`, deploy or alter product behavior.

## Security follow-up

- Track the open upstream bundled-dependency DoS report for `actions/setup-node@v7.0.0`; current fixed inputs, read-only permissions and timeouts reduce exposure, but upgrade to the first official patched release.
- Triage four moderate npm advisories by production reachability rather than adding a blanket noisy blocker.
- Continue reviewed Dependabot updates for pinned action SHAs.

## Ranked backlog

Impact/urgency: 1–5. Cost/risk: 1–5 where 5 is higher.

| Rank | Improvement | Impact | Urgency | Cost | Risk | Decision |
|---:|---|---:|---:|---:|---:|---|
| 1 | checkout v7 + no persisted credentials | 4 | 5 | 1 | 1 | implemented and verified |
| 2 | conditional DB executor + stable summary | 4 | 4 | 2 | 2 | both paths verified |
| 3 | topology/credential contracts | 4 | 4 | 1 | 1 | implemented and passing |
| 4 | durable measured audit | 4 | 4 | 2 | 1 | implemented |
| 5 | fix two hook warnings and decide warning policy | 3 | 3 | 2 | 2 | next focused PR |
| 6 | triage npm advisories | 4 | 3 | 2 | 2 | next security review |
| 7 | monitor setup-node advisory | 4 | 4 | 1 | 2 | urgent watch |
| 8 | build Actions reliability census/SLO | 4 | 3 | 3 | 1 | later |
| 9 | UI-audit sharding experiment | 4 wall-time | 2 | 4 | 3 | measure later |
| 10 | build-artifact reuse experiment | 3 | 2 | 4 | 3 | deferred |
| 11 | Playwright browser cache | 1 | 1 | 3 | 3 | rejected now |
| 12 | narrow security/browser coverage | apparent speed only | 1 | 1 | 5 | rejected |

## Durable lessons

1. Optimize measured critical paths, not visible YAML repetition.
2. Stable protected checks and conditional executors can coexist.
3. Skips are safe only when a stable summary validates intent and actual result.
4. Security evidence may need full coverage even when application gates are risk-proportional.
5. Same-SHA reruns require truthful independent job boundaries.
6. Fast all-history scans should not be narrowed merely because their scope looks broad.
7. A green shell is insufficient if CodeQL analysis was not uploaded.
8. Before/after claims belong to exact heads and run/job IDs.
9. Upstream warnings are signals, not permission for undocumented migration.
10. This slice improves security and non-database resource use without unsupported latency claims.
