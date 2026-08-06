# Exact-head CI recovery tooling

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** human owner + implementing agent  
**Issue/PR:** PR #314  
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow contributors and coding agents can recover a stuck GitHub Actions run from one repository command without changing product code, creating no-op commits, bypassing required checks or losing exact-head guarantees.

## Repository reconnaissance

### Current behavior

- `scripts/watch-pr-ci.mjs` already reads and watches PR checks, rejects stale-head evidence and prints failed exact-head logs.
- Before this candidate, repository tooling could not cancel an unresponsive run, force-cancel a zombie record, dispatch a clean manual CI run or prove that the replacement still targeted the original head.
- PR #309 exposed the gap when CI run #1933 remained queued/running after independent jobs were cancelled and the available connector lacked force-cancel/workflow-dispatch actions.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/watch-pr-ci.mjs` | Existing exact-head terminology and monitoring contract | Reused concepts; recovery writes remain in a separate command |
| `scripts/recover-pr-ci.mjs` | New operational recovery owner | Added |
| `scripts/recover-pr-ci.test.mjs` | Safety and orchestration contracts | Added |
| `.github/workflows/ci.yml` | Supports `workflow_dispatch`; manual runs force all gates | Read only; unchanged |
| `docs/operations/ci-observability.md` | Durable operator handoff | Extended |
| `package.json` | Discoverable command and policy test surface | Added `ci:recover` and test entry |

### Existing tests and constraints

- Related tests: CI classifier, retry graph, exact-head monitor and project-knowledge contracts.
- Database/RLS and browser tests are not directly applicable to the CLI implementation; the replacement manual CI run still executes the full repository suite.
- Class 3 CI operations work requires owner review, exact-head evidence and rollback.

### Similar implementation and recent history

- PR #302 introduced exact-head monitoring but intentionally stopped at observation and diagnostics.
- The new command extends that boundary rather than replacing `ci:status` or `ci:watch`.

### Open questions

- [x] Current GitHub CLI supports `gh run cancel <id> --force`.
- [x] `gh workflow run <workflow> --ref <branch>` can dispatch against an unchanged branch head.
- [x] Replacement evidence can be bounded by exact SHA, prior run IDs, `workflow_dispatch` event and before/after PR-head checks.

## Research

### Research scope and source selection

- Decision question: what is the smallest official GitHub-supported recovery flow for a stuck exact-head Actions run?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus official GitHub documentation.
- Source budget: four primary GitHub/GitHub CLI references.
- Expected decision: cancel/force-cancel semantics, manual dispatch by ref, run discovery/watching and concurrency limits.

### Questions researched

1. Which official command force-cancels a run that ignores normal cancellation?
2. How can CI run on the existing branch without a new commit?
3. How can the replacement be proven to target the recorded exact head?
4. When must automatic recovery refuse to cancel a fresh run?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub CLI `gh run cancel` manual | Official CLI docs | 2026-08-07 | Normal and `--force` cancellation | Requires authenticated Actions write permission |
| GitHub CLI `gh workflow run` manual | Official CLI docs | 2026-08-07 | `workflow_dispatch` against `--ref` | Workflow must support manual dispatch |
| GitHub CLI run list/view/watch/rerun manuals | Official CLI docs | 2026-08-07 | Exact-commit filtering, JSON fields and exit-status watching | Provider scheduling remains external |
| GitHub Actions workflow-run/concurrency docs | Official platform docs | 2026-08-07 | Force-cancel is for unresponsive cancellation; concurrency replaces runs in one group | Does not guarantee runner capacity |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Manual UI instructions | No code | Slow, inconsistent and hidden-session dependent | Rejected |
| No-op commits | Familiar PR event | Pollutes history and violates repository guidance | Rejected |
| Concurrency-policy change | May prevent some future collisions | Changes required-check behavior and does not recover an existing zombie | Rejected for this slice |
| Dedicated `gh` command | Official, auditable, testable and exact-head aware | Requires authenticated `gh` | Selected |

### Research decision

Keep monitoring and recovery separate. The recovery command records the PR head, selects only exact-head runs, refuses fresh/unknown-idle cancellation unless `--force` is supplied, attempts normal then force cancellation, dispatches `ci.yml` on the unchanged branch, discovers only a new manual run for the recorded SHA, watches with exit status and rejects moved-head evidence.

### Adoption review

- Observed problem: agents can diagnose but cannot reproducibly recover stuck Actions runs.
- Existing/simpler alternatives: manual UI, connector retries, no-op commits and concurrency changes were insufficient or unsafe.
- License/code reuse: no copied code and no dependency.
- Secrets/privacy: delegates authentication to `gh`; never prints token values or financial data.
- Runtime/deployment cost: development-only Node script; zero application bundle impact.
- Owner: `scripts/` with procedure in `docs/operations/`.
- Rollback: remove script, tests, package command and runbook section.
- Verification: pure tests, fake-`gh` CLI integration tests and exact-head PR gates.
- Removal condition: remove if the command cannot preserve exact-head identity or causes incorrect cancellation.

## Specification

### Problem

A contributor can identify a stuck CI run but cannot recover it reproducibly. Manual retries can target the wrong record, create unnecessary commits or lead to stale-head claims.

### User stories

- As a contributor, I can recover a stale CI run with one command without changing code.
- As an agent, I can prove the replacement run targets the original head.
- As an owner, I can preview every Actions write through dry-run mode.

### Acceptance criteria

- [x] Resolve PR number/URL, repository, branch and exact head through `gh pr view`.
- [x] List and select only runs whose `headSha` matches the recorded head.
- [x] Return pending without writes for a fresh active run or unknown idle timestamp.
- [x] Support `--force`, `--dry-run`, `--cancel-only` and `--no-watch`.
- [x] Attempt normal cancellation, then official force cancellation with REST fallback.
- [x] Dispatch the configured workflow against the unchanged branch.
- [x] Discover only a new `workflow_dispatch` run for the recorded SHA.
- [x] Watch with non-zero failure status and reject moved-head evidence.
- [x] Unit-test parsing, selection, staleness, planning and force-cancel path construction.
- [x] Exercise dry-run and fresh-run safety through a fake GitHub CLI.
- [x] Document commands, permissions, exit codes, safety limits and rollback.
- [ ] Pass final exact-head repository gates on PR #314.

### Required states

- Loading: prints PR, branch, exact SHA and newest exact-head run.
- Empty: dispatches a clean run when no exact-head run exists.
- Populated: exits when newest exact-head CI already succeeded.
- Validation/error: clear exit for invalid flags, missing `gh`, authorization failure, malformed JSON or moved head.
- Recovery: dry-run, bounded stale threshold, force override and preserved failed-run diagnostics.
- Accessibility: text output does not depend on color.
- Financial/mobile states: not applicable.

### Financial and security constraints

- No product, finance, database, Auth, RLS, provider configuration or production-data behavior changes.
- Never print credentials.
- Never merge, push to `main`, change branch protection or bypass checks.

### Out of scope

- Automatic merge or deployment.
- Workflow concurrency, required-check, permissions or ruleset changes.
- Non-GitHub CI providers.
- Background agents or persistent services.

## Implementation plan

### Architecture fit

The command belongs in `scripts/` as repeatable repository automation and composes existing GitHub CLI/workflow interfaces. It adds no application runtime layer or dependency.

### Planned changes

| File/area | Change | Result |
|---|---|---|
| `scripts/recover-pr-ci.mjs` | Add recovery CLI and pure decisions | implemented |
| `scripts/recover-pr-ci.test.mjs` | Add helper and fake-CLI contracts | implemented |
| `package.json` | Add `ci:recover` and policy-test entry | implemented |
| `docs/operations/ci-observability.md` | Add recovery procedure and limits | implemented |
| `docs/research/pr-memory/2026/Q3/PR-314.md` | Record bounded provenance | implemented |
| this packet | Track Class 3 state/evidence | updated |

### Data and migration impact

- Schema/backfill: none.
- Compatibility: current `gh`; force-cancel falls back through `gh api`.
- Rollback: remove additive tooling/docs.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Cancel healthy queued work | 15-minute idle threshold; invalid timestamp returns pending; explicit `--force` required to override |
| Dispatch on moved branch | PR head checked before dispatch, during discovery and after watch |
| Reuse old run | previous IDs excluded; event and SHA validated |
| Hide replacement failure | `gh run watch --exit-status`; final run status/conclusion checked |
| Leak credentials | no token reads/prints; auth delegated to `gh` |
| Claim provider outage repaired | runbook states scheduler/outage limits explicitly |

### Verification plan

- Static: project knowledge, CI policy, lint, typecheck and build through PR #314.
- Unit: Node helper and fake-CLI tests.
- Database/browser/responsive: no direct tool surface; manual recovery dispatch still forces all gates when used.
- Manual: dry-run against an open PR after merge/availability of authenticated `gh`.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Research/specification/rollback | packet + official sources | done |
| T2 | Implement recovery command | `scripts/recover-pr-ci.mjs` | done |
| T3 | Add tests and npm command | 9/9 focused tests locally | done |
| T4 | Extend runbook and PR memory | docs diff | done |
| T5 | Run final exact-head gates | PR #314 workflows | in_progress |
| T6 | Independent acceptance review | evaluation matrix | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repo reconnaissance + official GitHub docs | CLI implementation pending | Plan bounded script |
| 2026-08-07 | planner | implementer | planned | branch + packet | tests/CI pending | Implement T2–T4 |
| 2026-08-07 | implementer | evaluator | evaluating | PR #314 diff; 9 focused tests pass locally | exact-head CI and authenticated real dry-run pending | Review diff and run selected gates |

### Current permission boundary

- Granted: write only `chore/ci-recovery-tooling` and PR #314.
- Resources: repository files and GitHub metadata/actions read for verification.
- Forbidden: `main`, unrelated branches/PRs, branch protection, rulesets, provider configuration, deployment and production data.
- Human approval required before: merge or any governance/provider write.
- Stop condition: exact-head identity cannot be guaranteed or broader credentials become necessary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Exact-head recovery decisions | helper tests | pass |
| Dry-run performs no writes | fake-`gh` call log | pass |
| Fresh active run remains untouched | fake-`gh` integration, exit `8` | pass |
| Durable runbook and rollback | operations doc + packet | pass |
| Required exact-head checks | pending PR #314 | pending |

### Research and adoption evidence

- Official CLI fields/flags used by the implementation remain documented.
- Force cancellation is used only after normal cancellation and only for an eligible or explicitly forced run.
- No dependency, application runtime or hidden service was introduced.

### Review findings

- Correctness: exact SHA, new run ID and moved-head checks are explicit.
- Security/ownership: Actions writes require existing `gh` permissions; tokens are not exposed.
- Accessibility: text-only CLI output.
- Maintainability: standalone tool extends rather than overloads monitoring.
- Scope: workflow topology and provider rules remain unchanged.

### Remaining limitations

- GitHub outages and runner capacity remain provider concerns.
- A real force-cancel/dispatch dry-run requires an environment with authenticated GitHub CLI; CI can verify code contracts but should not mutate unrelated live runs.

## Delivery record

- Branch: `chore/ci-recovery-tooling`
- PR: #314
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge/acceptance
