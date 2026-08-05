# MoneyFlow CI system audit and hardening — 2026-08

**Status:** implementing
**Execution state:** evaluating documentation-only path
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**PR:** #304
**Baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Branch:** `agent/ci-system-hardening`
**Last updated:** 2026-08-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner explicitly authorized a repository- and run-grounded CI audit plus direct implementation of high-priority safe improvements. This packet does not authorize merge, deployment, provider changes, production schema/data operations, reduced verification scope or Phase 5 product work.

## Outcome

Improve MoneyFlow's existing risk-proportional CI without weakening lint, type checking, complete tests, production build, fresh database tests, Chromium/WebKit coverage, CodeQL upload, all-ref Gitleaks or protected check identities.

Delivered candidate changes:

- official checkout v7.0.1 full SHA in all workflows;
- no persisted Git credentials in read-only checkout jobs;
- conditional database executor plus stable `database` summary;
- contract tests for credential and retry topology;
- source/log-grounded baseline, decision record and ranked backlog.

## Repository reconnaissance

Inspected:

- all `.github/workflows` files and Dependabot configuration;
- `package.json`, Playwright configs and Vercel configuration;
- classifier, CI-policy, retry-graph, deployment, RLS and migration scripts;
- current memory and prior CI/security/reliability packets;
- representative exact-head jobs, step logs, artifacts, failed runs and reruns.

Current workflows:

1. `CI`: classifier, policy/static/test/build shards, stable `verify`, database gate, browser smoke, UI audit and stable `e2e`.
2. `CodeQL`: real JavaScript/TypeScript extraction, query execution, SARIF upload and processing.
3. `Secret history scan`: verified Gitleaks binary over every branch and tag.

Deployment is external to GitHub Actions. Vercel deploys only `main`; branch deployments are disabled.

Historical decisions that remain binding:

- `ready_for_review` must trigger fresh evidence;
- CodeQL must upload a real analysis on every PR head;
- stable checks remain `verify`, `database` and `e2e`;
- expensive shards remain independently retryable;
- Playwright browser cache requires measured evidence;
- Gitleaks retains all-ref coverage.

## Research

### Questions

1. Is the old checkout runtime still appropriate for the current runner?
2. Do read-only jobs need persisted repository credentials?
3. Can the no-database path skip heavy setup while preserving the stable required check?
4. What is the measured critical path?
5. Which common optimizations would weaken MoneyFlow-specific protections?

### Decisions from official/upstream sources and project evidence

| Area | Decision |
|---|---|
| GitHub workflow dependencies and `always()` | stable summaries may validate conditional heavy executors |
| GitHub secure use | retain immutable pins and least privilege |
| checkout v7.0.1 | replace the old Node-runtime release with official full SHA |
| checkout credentials | set `persist-credentials: false` because inspected jobs are read-only |
| failed-job reruns | retain independent shards and summary jobs |
| CodeQL | retain real analysis/upload rather than path-skipping required evidence |
| Playwright | do not cache browser binaries without project-specific benefit |
| Supabase | retain fresh local reset and pgTAP for selected database changes |
| Gitleaks | retain verified binary and all-ref scan |

Rejected:

- collapsing static/test/build merely to avoid repeated installs;
- reducing browser projects/states/tests;
- path-skipping CodeQL or all-ref Gitleaks;
- blind retries;
- unpinned or unreleased action refs;
- undocumented Supabase configuration migration.

## Specification

### Functional invariants

- Existing classifier decisions and verification commands remain unchanged.
- Full-risk workflow changes run policy, lint, typecheck, complete tests, build, database, browser and security gates.
- `verify`, `database` and `e2e` retain stable identities.
- Selected database changes still run fresh Supabase start/reset/pgTAP.
- Unselected database changes require `database_checks: skipped` and stable `database: success`.
- CodeQL still uploads and processes a real analysis.
- Gitleaks still scans every reachable ref.

### Security invariants

- All third-party actions remain pinned to immutable full SHAs.
- Permissions remain explicit and least privilege.
- Read-only checkouts do not persist repository credentials.
- No production secret, provider token or data is introduced.

### Diagnostics invariants

- Failing test/database output remains retained with attempt-specific names.
- Browser evidence remains uploaded for selected runs.
- Summary jobs name the selected shard with an unexpected result.

## Implementation plan

| Area | Change | State |
|---|---|---|
| All workflows | checkout v7.0.1 full SHA | implemented and full-risk verified |
| Read-only checkout | `persist-credentials: false` | implemented and full-risk verified |
| Database topology | conditional `database_checks` plus stable `database` | selected path verified; unselected path evaluating |
| CI contracts | credential and database topology assertions | passing |
| Audit memory | architecture, baseline, incidents, ranking and lessons | recorded |
| Full-risk exact head | all CI/database/browser/security gates | passed |
| Documentation-only head | verify unselected executor and stable summary | in progress |

## Risks and defenses

| Risk | Defense |
|---|---|
| Protected `database` identity disappears | retain stable `database` job ID |
| skipped executor is treated as success incorrectly | summary validates classifier intent and actual `skipped` result |
| database failure is hidden | summary requires executor `success` when selected |
| checkout upgrade breaks hosted runner | exact-head runner execution passed |
| hidden write needs checkout token | inspected jobs are read-only; full-risk execution passed without persisted credentials |
| coverage is reduced accidentally | workflow changes classify full risk; exact counts are compared |
| optimization claim exceeds evidence | only exact-head measured claims are recorded |

## Verification plan

### Full-risk result

Head `d68790a5047a38eaf3a753f87ee7936883d39a6e` passed:

- CI #1764 (`31043251727`);
- CodeQL #883 (`31043252721`);
- Secret history #883 (`31043252598`).

Coverage retained:

- 723 tests;
- production build;
- fresh database start/reset/pgTAP;
- 58 browser smoke cases;
- 554 UI audit cases scheduled, 427 passed and 127 skipped;
- CodeQL analysis of 436 TS, 17 JS and 4 workflow files;
- all-ref Gitleaks scan.

### Documentation-only acceptance

The new exact head must prove:

- documentation-only classification;
- policy passes;
- static/test/build/browser executors skip;
- `database_checks` skips without runner/action setup;
- stable `database`, `verify` and `e2e` pass;
- CodeQL and all-ref Gitleaks still pass.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| CIH-T1 | Inspect workflows, scripts, deployment and delivery contracts | source inventory | done |
| CIH-T2 | Inspect run history, timing, failures and reruns | measured baseline | done |
| CIH-T3 | Research project-relevant official/upstream guidance | decision table | done |
| CIH-T4 | Upgrade checkout and disable persisted credentials | workflow diff and logs | done |
| CIH-T5 | Split database executor from stable summary | topology and contracts | done |
| CIH-T6 | Record priorities and limitations | audit document | done |
| CIH-T7 | Open focused PR and add PR memory | PR #304 | done |
| CIH-T8 | Run full exact-head gates | CI #1764, CodeQL/secret #883 | done |
| CIH-T9 | Run documentation-only exact-head comparison | workflow evidence | in progress |
| CIH-T10 | Record final measured result in current memory | memory update | pending |
| CIH-T11 | Present verified candidate to owner | review handoff | pending |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | human_owner | researcher | discovery | explicit CI audit and safe implementation request | runtime behavior unknown | inspect source and run history |
| 2026-08-06 | researcher | implementer | implementing | measured baseline and official research | exact head unverified | implement bounded slice |
| 2026-08-06 | implementer | evaluator | full-risk verified | CI #1764, CodeQL/secret #883 | unselected DB path pending | run documentation-only comparison |

## Current permission boundary

Allowed:

- focused writes on `agent/ci-system-hardening` and PR #304;
- inspect Actions logs/artifacts and Vercel deployment metadata;
- run risk-proportional checks and evidence-based same-SHA failed-job reruns.

Forbidden without separate explicit owner instruction:

- merge or write `main`;
- deploy or change Vercel/Supabase settings;
- change schema, Auth, RLS or production data;
- lower test/security/browser coverage;
- start Phase 5 product implementation.

## Evaluation

The candidate is accepted for owner review only when the documentation-only head proves the optimized unselected database path, all required security workflows remain green and the final measured result is stored without unsupported speed claims.
