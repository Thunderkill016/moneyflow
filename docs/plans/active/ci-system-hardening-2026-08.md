# MoneyFlow CI system audit and hardening — 2026-08

**Status:** verified
**Execution state:** ready for owner review
**Active role:** human_owner
**Permission scope:** owner_merge_decision_required
**Owner:** Thunderkill016
**PR:** #304
**Baseline:** `main@429eb6777a63b3172a04ce164a512420e31085c8`
**Branch:** `agent/ci-system-hardening`
**Last updated:** 2026-08-06

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. The owner explicitly authorized a repository- and run-grounded CI audit plus direct implementation of high-priority safe improvements. This packet does not authorize merge, deployment, provider changes, production schema/data operations, reduced verification scope or Phase 5 product work.

## Outcome

Harden MoneyFlow's risk-proportional CI without weakening lint, type checking, complete tests, production build, fresh database tests, Chromium/WebKit coverage, CodeQL upload, all-ref Gitleaks or protected check identities.

Verified candidate result:

- official checkout v7.0.1 full SHA in all workflows;
- no persisted Git credentials in read-only checkout jobs;
- conditional database executor plus stable `database` summary;
- contract tests for credential and retry topology;
- selected and unselected database paths verified on GitHub-hosted runners;
- source/log-grounded baseline, decision record and current CI memory.

## Repository reconnaissance

Inspected all workflows, Dependabot configuration, npm verification scripts, Playwright configs, Supabase migration/RLS/database scripts, Vercel configuration, classifier/retry/exact-head scripts, prior CI/security work and representative workflow jobs/logs/artifacts/reruns.

Current architecture:

1. `CI`: classifier, policy/static/test/build shards, stable `verify`, conditional DB executor, stable `database`, browser smoke, UI audit and stable `e2e`.
2. `CodeQL`: real JavaScript/TypeScript extraction, query execution, SARIF upload and processing.
3. `Secret history scan`: checksum-verified Gitleaks over every branch and tag.

Deployment is external to GitHub Actions. Vercel deploys only `main`; branch deployments are disabled.

Historical decisions that remain binding:

- `ready_for_review` triggers fresh evidence;
- CodeQL uploads a real analysis on every PR head;
- stable checks remain `verify`, `database` and `e2e`;
- expensive shards remain independently retryable;
- Playwright cache requires measured evidence;
- Gitleaks retains all-ref coverage.

## Research

Official GitHub Actions, secure-use, checkout, CodeQL, Playwright, Supabase and Gitleaks documentation/source were compared with project logs.

Adopted:

- immutable full-SHA pins and least privilege;
- checkout v7.0.1 and `persist-credentials: false`;
- stable summaries validating conditional heavy jobs;
- real CodeQL upload;
- fresh Supabase reset/pgTAP;
- all-ref Gitleaks.

Rejected/deferred:

- collapse verification shards only to avoid repeated installs;
- reduce browser/test/security scope;
- cache Playwright browsers without project measurements;
- blind retries;
- unpinned or unreleased action refs;
- undocumented Supabase configuration migration;
- `merge_group` before merge queue is enabled.

## Specification

### Functional invariants

- Existing classifier decisions and commands remain unchanged.
- Workflow changes run policy, lint, typecheck, complete tests, build, DB, browser and security gates.
- `verify`, `database` and `e2e` retain stable identities.
- DB-selected changes run fresh Supabase start/reset/pgTAP.
- DB-unselected changes require executor `skipped` and stable summary `success`.
- CodeQL performs real analysis/upload.
- Gitleaks scans every ref.

### Security invariants

- Third-party actions use immutable full SHAs.
- Permissions stay explicit and least privilege.
- Read-only checkouts do not persist credentials.
- No production secret/provider/data is introduced.

### Diagnostics invariants

- Failing test/database logs retain attempt-specific artifacts.
- Selected browser evidence remains uploaded.
- Stable summaries identify unexpected shard results.

## Implementation plan

| Area | Result | State |
|---|---|---|
| All workflows | checkout v7.0.1 full SHA | verified |
| Read-only checkout | `persist-credentials: false` | verified |
| DB topology | conditional executor + stable summary | selected/unselected paths verified |
| CI contracts | credential and topology assertions | passing |
| Audit/current CI memory | baseline, incidents, decisions, ranking, lessons | recorded |
| Exact-head gates | CI, DB, browser, CodeQL and Gitleaks | passed |

## Risks and defenses

| Risk | Defense |
|---|---|
| Protected DB identity disappears | stable `database` job retained |
| incorrect skip appears successful | summary validates classifier intent and actual result |
| DB failure is hidden | summary requires selected executor success |
| checkout upgrade breaks runner | exact-head execution passed |
| hidden write needs token | inspected jobs are read-only; execution passed without persisted credentials |
| coverage is reduced | exact job/test/browser counts compared |
| savings are overstated | record only executor/action work proven removed |

## Verification plan

### Full-risk head

`d68790a5047a38eaf3a753f87ee7936883d39a6e` passed:

- CI #1764 (`31043251727`);
- CodeQL #883 (`31043252721`);
- Secret history #883 (`31043252598`).

Preserved evidence:

- 723 tests;
- production build;
- fresh Supabase reset/pgTAP;
- 58 browser smoke cases;
- UI audit 554 scheduled, 427 passed, 127 skipped, 8.3-minute command;
- CodeQL analysis of 436 TS, 17 JS and 4 workflow files;
- all-ref Gitleaks scan.

### Documentation-only probe

Closed-unmerged PR #305, run `31044872202`, proved:

- one-file documentation diff classified docs-only;
- database selection false;
- database executor skipped with `steps: null` before executor runner/action setup;
- stable summary succeeded using shell only and no repository checkout.

No probe merge/deployment/provider/product write occurred.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| CIH-T1 | Inspect workflows, scripts, deployment and contracts | source inventory | done |
| CIH-T2 | Inspect timing, failures and reruns | measured baseline | done |
| CIH-T3 | Research relevant official/upstream guidance | decision table | done |
| CIH-T4 | Upgrade checkout and disable persisted credentials | workflows/logs | done |
| CIH-T5 | Split DB executor from stable summary | topology/contracts | done |
| CIH-T6 | Record priorities and limits | audit | done |
| CIH-T7 | Open focused PR and PR memory | PR #304 | done |
| CIH-T8 | Run full exact-head gates | CI #1764; security #883 | done |
| CIH-T9 | Verify documentation-only DB path | closed probe #305 | done |
| CIH-T10 | Record final result in repo CI memory | `CI_CURRENT_MEMORY.md` | done |
| CIH-T11 | Present verified candidate to owner | this handoff | done |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | human_owner | researcher | discovery | explicit audit request | runtime unknown | inspect source/runs |
| 2026-08-06 | researcher | implementer | implementing | baseline and official research | exact head unknown | implement bounded slice |
| 2026-08-06 | implementer | evaluator | full-risk verified | CI #1764; CodeQL/secret #883 | unselected path unknown | run isolated probe |
| 2026-08-06 | evaluator | human_owner | verified | probe #305 and durable memory | merge remains unapproved | review PR #304 and decide merge separately |

## Current permission boundary

Allowed work is complete on PR #304. Forbidden without a separate explicit owner instruction:

- merge or write `main`;
- deploy or change Vercel/Supabase settings;
- change schema, Auth, RLS or production data;
- lower test/security/browser coverage;
- start Phase 5 product implementation.

## Evaluation

The candidate has verified both DB-selected and documentation-only DB-unselected paths, retained all full-risk coverage and recorded exact evidence. It is ready for owner review but remains unmerged and is not current project truth.
