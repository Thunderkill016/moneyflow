# MoneyFlow CI system audit and hardening — 2026-08

**Status:** implementing
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**PR:** #304
**Baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Branch:** `agent/ci-system-hardening`
**Last updated:** 2026-08-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner explicitly requested a repository- and run-grounded audit of GitHub Actions, CI, migrations and deployment, plus direct implementation of high-priority safe improvements. This authorizes focused workflow, contract-test and documentation writes on one branch. It does not authorize merge, deployment, provider changes, production schema/data operations, reduced test coverage or Phase 5 product work.

## Outcome

Make MoneyFlow's existing risk-proportional CI more secure and resource-efficient without reducing the commands, browser matrix, database coverage, CodeQL upload requirement or all-ref secret-history coverage that currently protect the project.

The first bounded slice:

- upgrades the deprecated checkout runtime to the current verified full-SHA release;
- prevents read-only jobs from persisting repository credentials;
- keeps the stable required `database` check while moving expensive database setup into a conditional executor;
- records measured baseline, historical failures, project-specific research decisions and before/after evidence;
- preserves exact-head and selective failed-job retry behavior.

## Repository reconnaissance

### Sources inspected

- `.github/workflows/ci.yml`, `codeql.yml` and `secret-history.yml`;
- `.github/dependabot.yml`, `package.json`, Playwright configs and `vercel.json`;
- CI classifier, retry graph, deployment environment, RLS, migration and exact-head monitoring scripts;
- current project memory, risk-proportional delivery documentation and prior CI work packets;
- recent pull requests, exact-head workflow runs, job timings, failed logs, reruns and retained artifacts.

### Current architecture

MoneyFlow has three GitHub Actions workflows:

1. `CI`: path classifier, policy/static/test/build shards, stable `verify`, database gate, browser smoke, cross-device UI audit and stable `e2e`.
2. `CodeQL`: real JavaScript/TypeScript extraction, analysis, SARIF upload and processing on every PR head, main push, schedule and manual run.
3. `Secret history scan`: verified Gitleaks binary and all-ref scan on every PR head, main push, schedule and manual run.

Production deployment is not performed by a GitHub Actions workflow. `vercel.json` allows automatic deployment only for `main`; branch deployments are disabled.

### Binding historical decisions

- Keep `ready_for_review` because an earlier topology skipped required checks when a draft became ready.
- Keep real CodeQL analysis/upload on every PR head because an earlier shell-only green result left ruleset evidence missing.
- Keep verification and browser shards split because failed-job reruns operate at job granularity.
- Keep stable required check identities `verify`, `database` and `e2e`.
- Keep Playwright browser installation uncached unless project measurements prove a benefit.
- Keep Gitleaks all-ref coverage because it previously found a real reviewed finding outside the immediate PR path and current measured cost is small.

## Research

### Decision questions

1. Is the current checkout action/runtime still supported on the hosted runner?
2. Which credentials and permissions are actually needed by read-only jobs?
3. Can the no-op database path avoid repository/action setup without changing the stable required check?
4. Which setup work is a real bottleneck versus a small visible cost?
5. Which common optimizations would weaken or duplicate MoneyFlow's protections?

### Authoritative sources and project decisions

| Source | Decision |
|---|---|
| GitHub Actions workflow syntax, dependencies and `always()` | retain stable summaries and conditionally execute heavy shards |
| GitHub secure-use guidance | continue full-SHA pinning and least-privilege permissions |
| `actions/checkout` v7.0.1 release/source | upgrade from v4.4.0 because current logs show old Node runtime deprecation |
| `actions/checkout` credential behavior | set `persist-credentials: false` because every inspected checkout is read-only |
| GitHub failed-job rerun documentation | preserve job boundaries and dependent summaries |
| GitHub CodeQL documentation | preserve real analysis, upload and processing rather than path-skipping required evidence |
| Playwright CI documentation | do not add browser-binary caching without measured project value |
| Supabase local testing documentation | retain fresh local reset and pgTAP for selected database changes |
| Gitleaks release/source and checksum | keep verified binary and all-ref scan |

### Rejected generic optimizations

- Do not combine static, test and build jobs merely to avoid repeated `npm ci`.
- Do not remove WebKit, widths, states or test cases to shorten UI audit time.
- Do not narrow CodeQL or secret scanning to application-only PRs.
- Do not cache Playwright browsers by default.
- Do not reuse a Next build artifact in browser jobs until a measured experiment proves compatibility and net savings.
- Do not add blind automatic retries for deterministic failures.

## Specification

### Functional invariants

- Every command selected by the current classifier remains selected after this slice.
- `lint`, `typecheck`, complete unit/static tests, production build, fresh database reset/pgTAP, browser smoke and Chromium/WebKit audit retain current commands and fixtures.
- `verify`, `database`, `e2e`, CodeQL and secret-history remain stable protected identities.
- Database changes still require fresh local database execution; non-database changes receive a truthful stable summary without checkout or Supabase setup.
- CodeQL still performs and uploads a real analysis for every PR head.
- Secret scan still fetches and scans every branch and tag.

### Security invariants

- Third-party actions remain pinned to immutable full SHAs.
- Workflow permissions remain explicit and least privilege.
- Read-only checkout steps do not persist credentials after checkout.
- No new secret, provider token or production credential is introduced.

### Diagnostics invariants

- Failed test and database logs retain attempt-specific artifacts.
- Browser and UI-audit evidence remains uploaded on every selected run.
- Stable summary jobs identify unexpected shard results.

## Implementation plan

| Area | Change | State |
|---|---|---|
| All workflows | Upgrade `actions/checkout` from v4.4.0 to verified v7.0.1 full SHA | implemented |
| All read-only checkout steps | Set `persist-credentials: false` | implemented |
| CI database topology | Add conditional `database_checks` executor and keep `database` as stable lightweight summary | implemented |
| CI topology contracts | Assert database selection/result behavior, no heavy commands in summary and no persisted checkout credentials | implemented |
| Audit memory | Record architecture, baseline, evidence, ranking and decisions | implemented |
| Exact-head evaluation | Run all classifier-selected application, database, browser and security gates | in progress |
| Before/after measurement | Compare full-risk and documentation-only paths on exact heads | pending |

## Risks and defenses

| Risk | Defense |
|---|---|
| Stable `database` check disappears | retain the `database` job ID and make it an `always()` summary |
| Skipped executor is mistaken for success | summary requires `skipped` only when classifier says database is not required |
| Database failure is hidden | summary requires executor `success` whenever selected |
| Checkout upgrade breaks runner | hosted runner exceeds checkout v7 minimum; exact-head Actions verify behavior |
| Credential removal breaks a hidden write | inspected jobs are read-only; exact-head Actions prove execution |
| Workflow refactor reduces coverage | workflow changes classify full risk; compare jobs, test counts and browser matrix |
| Optimization claim exceeds evidence | report only exact-head measurements and mark unavailable global rates |

## Verification plan

### Static and policy

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run lint`
- `npm run typecheck`

### Test and build

- complete `npm run test`;
- production `npm run build`;
- fresh local Supabase start/reset and pgTAP because workflow files classify as database-impacting.

### Browser and security

- existing Chromium browser smoke;
- existing Chromium/WebKit cross-device UI audit;
- CodeQL extraction, analysis, upload and processing;
- Gitleaks all-ref history scan;
- inspect logs for checkout v7 and `persist-credentials: false`.

### Measurement

- Full-risk head: compare against PR #301 CI #1746, CodeQL #866 and secret-history #866.
- Documentation-only head: compare against PR #303 CI #1760 and prove `database_checks` skips while stable `database` passes without checkout/action setup.
- Do not claim a repository-wide first-attempt failure percentage without a complete run census.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| CIH-T1 | Inspect workflows, scripts, deployment and project delivery contracts | source inventory | done |
| CIH-T2 | Inspect representative run history, step timing, failures and reruns | audit baseline | done |
| CIH-T3 | Research project-relevant official/upstream guidance | source decision table | done |
| CIH-T4 | Upgrade checkout and disable persisted credentials | three workflow diffs | done |
| CIH-T5 | Split database executor from stable summary | CI topology and contract | done |
| CIH-T6 | Record audit, priorities and limitations | research document | done |
| CIH-T7 | Open focused PR and add PR memory | PR #304 and record | done |
| CIH-T8 | Run full exact-head CI, database, browser and security gates | workflow evidence | in progress |
| CIH-T9 | Run documentation-only exact-head comparison | workflow evidence | pending |
| CIH-T10 | Update project memory with final measured result | current-memory diff | pending |
| CIH-T11 | Present verified candidate to owner | ready-for-review handoff | pending |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | human_owner | researcher | discovery | explicit full CI audit and safe implementation request | actual run behavior not yet measured | inspect source and Actions history |
| 2026-08-06 | researcher | planner | planned | source inventory, exact-head logs, historical incidents and official research | repository-wide first-attempt rate unavailable | define bounded slice |
| 2026-08-06 | implementer | evaluator | evaluating | PR #304, workflow changes, contracts and audit | final exact-head gates pending | correct schema and rerun exact head |

## Current permission boundary

Allowed:

- focused writes on `agent/ci-system-hardening`;
- create/update PR #304;
- inspect Actions logs, artifacts and Vercel deployment metadata;
- rerun failed jobs when evidence indicates runner/transient failure.

Forbidden without a separate explicit owner instruction:

- merge or push to `main`;
- deploy or change Vercel settings;
- change Supabase project, schema, Auth, RLS or production data;
- lower security/test/browser coverage;
- start Phase 5 product implementation.

## Evaluation

The candidate is not accepted because its YAML is plausible. It becomes ready for review only after GitHub validates the workflow graph, all selected commands pass on the exact head, the stable database summary handles selected and unselected paths, and before/after measurements are recorded without overstating causality.
