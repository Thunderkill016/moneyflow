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
- Independent review of the first recovery implementation found that elapsed time was incorrectly treated as sufficient evidence to auto-cancel `queued`/waiting states. The final contract keeps `queued`, `requested`, `waiting` and `pending` fail-safe unless `--force` is explicitly supplied; only `in_progress` can cross the automatic stale threshold.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/watch-pr-ci.mjs` | Existing exact-head terminology and monitoring contract | Reused concepts; recovery writes remain in a separate command |
| `scripts/recover-pr-ci.mjs` | New operational recovery owner | Added and independently hardened |
| `scripts/recover-pr-ci.test.mjs` | Safety and orchestration contracts | Added; includes queued-state no-write regression |
| `.github/workflows/ci.yml` | Supports `workflow_dispatch`; manual runs force all gates | Read only; unchanged |
| `.github/workflows/codeql.yml` | Required real code-scanning analysis | Read only; not replaced by CI recovery |
| `docs/operations/ci-observability.md` | Durable operator handoff | Extended |
| `package.json` | Discoverable command and policy test surface | Added `ci:recover` and test entry |

### Existing tests and constraints

- Related tests: CI classifier, retry graph, exact-head monitor and project-knowledge contracts.
- Database/RLS and browser tests are not directly applicable to the CLI implementation; a replacement manual CI run still executes the full repository suite.
- Class 3 CI operations work requires owner review, exact-head evidence and rollback.
- A successful manual `ci.yml` run is not a substitute for protected CodeQL or secret-history evidence.

### Similar implementation and recent history

- PR #302 introduced exact-head monitoring but intentionally stopped at observation and diagnostics.
- The new command extends that boundary rather than replacing `ci:status` or `ci:watch`.

### Open questions

- [x] Current GitHub CLI supports `gh run cancel <id> --force`.
- [x] `gh workflow run <workflow> --ref <branch>` can dispatch against an unchanged branch head.
- [x] Replacement evidence can be bounded by exact SHA, prior run IDs, `workflow_dispatch` event and before/after PR-head checks.
- [x] Waiting-state age alone is insufficient cancellation evidence; explicit `--force` is required.
- [x] Manual CI recovery does not prove CodeQL/security evidence; protected security workflows remain separate.

## Research

### Research scope and source selection

- Decision question: what is the smallest official GitHub-supported recovery flow for a stuck exact-head Actions run while preserving required security evidence?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus official GitHub documentation.
- Source budget: focused GitHub/GitHub CLI references plus CodeQL/SARIF documentation for the security-evidence boundary.
- Expected decision: cancel/force-cancel semantics, manual dispatch by ref, run discovery/watching, concurrency limits and what a manual run does not prove.

### Questions researched

1. Which official command force-cancels a run that ignores normal cancellation?
2. How can CI run on the existing branch without a new commit?
3. How can the replacement be proven to target the recorded exact head?
4. When must automatic recovery refuse to cancel a waiting run?
5. Does a manual CI/CodeQL workflow automatically satisfy pull-request code-scanning requirements?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub CLI `gh run cancel` manual | Official CLI docs | 2026-08-07 | Normal and `--force` cancellation | Requires authenticated Actions write permission |
| GitHub CLI `gh workflow run` manual | Official CLI docs | 2026-08-07 | `workflow_dispatch` against `--ref` | Workflow must support manual dispatch |
| GitHub CLI run list/view/watch/rerun manuals | Official CLI docs | 2026-08-07 | Exact-commit filtering, JSON fields and exit-status watching | Provider scheduling remains external |
| GitHub Actions workflow-run/concurrency docs | Official platform docs | 2026-08-07 | Force-cancel is for unresponsive cancellation; concurrency affects scheduling | Waiting time alone does not identify the provider cause |
| GitHub code scanning/SARIF documentation | Official security docs | 2026-08-07 | Code-scanning results are associated with ref/SHA and PR analysis semantics matter | A generic feature-branch manual run must not be assumed equivalent to PR-scoped analysis |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Manual UI instructions | No code | Slow, inconsistent and hidden-session dependent | Rejected |
| No-op commits | Familiar PR event | Pollutes history and violates repository guidance | Rejected |
| Concurrency-policy change | May prevent some future collisions | Changes required-check behavior and does not recover an existing zombie | Rejected for this slice |
| Auto-cancel any old waiting run | Fast | Can cancel healthy work waiting on capacity/concurrency/approval | Rejected after independent review |
| Dedicated `gh` command | Official, auditable, testable and exact-head aware | Requires authenticated `gh` | Selected |

### Research decision

Keep monitoring and recovery separate. The recovery command records the PR head, selects only exact-head runs, refuses queued/requested/waiting/pending cancellation unless `--force` is supplied, permits stale-threshold automatic recovery only for an `in_progress` run with established inactivity, attempts normal then force cancellation, dispatches `ci.yml` on the unchanged branch, discovers only a new manual run for the recorded SHA, watches with exit status and rejects moved-head evidence.

Security evidence stays separate: successful CI recovery does not imply CodeQL or secret-history success. Required CodeQL still needs real pull-request code-scanning evidence, and secret-history remains owned by its protected workflow.

### Adoption review

- Observed problem: agents can diagnose but cannot reproducibly recover stuck Actions runs.
- Existing/simpler alternatives: manual UI, connector retries, no-op commits and concurrency changes were insufficient or unsafe.
- License/code reuse: no copied code and no dependency.
- Secrets/privacy: delegates authentication to `gh`; never prints token values or financial data.
- Runtime/deployment cost: development-only Node script; zero application bundle impact.
- Owner: `scripts/` with procedure in `docs/operations/`.
- Migration/rollback: remove script, tests, package command and runbook section.
- Verification: pure tests, fake-`gh` CLI integration tests and exact-head PR gates.
- Removal condition: remove if the command cannot preserve exact-head identity or causes incorrect cancellation.

## Specification

### Problem

A contributor can identify a stuck CI run but cannot recover it reproducibly. Manual retries can target the wrong record, create unnecessary commits or lead to stale-head claims. An over-aggressive recovery tool can also cancel healthy work that is merely waiting for provider capacity.

### User stories

- As a contributor, I can recover a stale CI run with one command without changing code.
- As an agent, I can prove the replacement run targets the original head.
- As an owner, I can preview every Actions write through dry-run mode and know waiting states are not cancelled from age alone.

### Acceptance criteria

- [x] Resolve PR number/URL, repository, branch and exact head through `gh pr view`.
- [x] List and select only runs whose `headSha` matches the recorded head.
- [x] Return pending without writes for `queued`, `requested`, `waiting` or `pending` unless `--force` is supplied.
- [x] Return pending for fresh or unknown-idle `in_progress` runs.
- [x] Support `--force`, `--dry-run`, `--cancel-only` and `--no-watch`.
- [x] Attempt normal cancellation, then official force cancellation with REST fallback.
- [x] Dispatch the configured workflow against the unchanged branch.
- [x] Discover only a new `workflow_dispatch` run for the recorded SHA.
- [x] Watch with non-zero failure status and reject moved-head evidence.
- [x] Unit-test parsing, selection, staleness, planning and force-cancel path construction.
- [x] Exercise dry-run, fresh-run and stale-queued safety through a fake GitHub CLI.
- [x] Document commands, permissions, exit codes, security-evidence boundaries and rollback.
- [ ] Pass final non-skipped exact-head repository gates on PR #314.

### Required states

- Loading: prints PR, branch, exact SHA and newest exact-head run.
- Empty: dispatches a clean run when no exact-head CI run exists.
- Populated: exits when newest exact-head CI already succeeded.
- Validation/error: clear exit for invalid flags, missing `gh`, authorization failure, malformed JSON or moved head.
- Waiting: queued/requested/waiting/pending return exit `8` without writes unless explicitly forced.
- Recovery: dry-run, bounded `in_progress` stale threshold, force override and preserved failed-run diagnostics.
- Accessibility: text output does not depend on color.
- Financial/mobile states: not applicable.

### Financial and security constraints

- No product, finance, database, Auth, RLS, provider configuration or production-data behavior changes.
- Never print credentials.
- Never merge, push to `main`, change branch protection or bypass checks.
- Never treat recovered CI as a substitute for required CodeQL or secret-history evidence.

### Out of scope

- Automatic merge or deployment.
- Workflow concurrency, required-check, permissions or ruleset changes.
- Reconfiguring CodeQL/SARIF upload semantics.
- Non-GitHub CI providers.
- Background agents or persistent services.

## Implementation plan

### Architecture fit

The command belongs in `scripts/` as repeatable repository automation and composes existing GitHub CLI/workflow interfaces. It adds no application runtime layer or dependency. Monitoring, recovery and security scanning remain separate owners.

### Planned changes

| File/area | Change | Result |
|---|---|---|
| `scripts/recover-pr-ci.mjs` | Add recovery CLI and fail-safe decisions | implemented + independent safety fix |
| `scripts/recover-pr-ci.test.mjs` | Add helper and fake-CLI contracts | implemented; 10 focused tests |
| `package.json` | Add `ci:recover` and policy-test entry | implemented |
| `docs/operations/ci-observability.md` | Add recovery procedure, waiting-state and CodeQL limits | implemented |
| `docs/research/pr-memory/2026/Q3/PR-314.md` | Record bounded provenance/evidence | implemented |
| this packet | Track Class 3 state/evidence | updated |

### Data and migration impact

- Schema/backfill: none.
- Compatibility: current `gh`; force-cancel falls back through `gh api`.
- Rollback: remove additive tooling/docs.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Cancel healthy queued/waiting work | waiting states never auto-cancel from age; explicit `--force` required; fake-`gh` regression proves no writes |
| Cancel a fresh `in_progress` run | 15-minute established inactivity threshold; invalid timestamp returns pending |
| Dispatch on moved branch | PR head checked before dispatch, during discovery and after watch |
| Reuse old run | previous IDs excluded; event and SHA validated |
| Hide replacement failure | `gh run watch --exit-status`; final run status/conclusion checked |
| Treat CI green as CodeQL green | runbook/packet explicitly separate protected security evidence |
| Leak credentials | no token reads/prints; auth delegated to `gh` |
| Claim provider outage repaired | runbook states scheduler/outage limits explicitly |

### Verification plan

- Static: project knowledge, CI policy, lint, typecheck and build through ready-for-review exact-head CI.
- Unit: Node helper and fake-CLI tests; final local focused suite 10/10.
- Database/browser/responsive: no direct tool surface; manual recovery dispatch still forces all CI gates when used.
- Security: protected real CodeQL and secret-history workflows on exact head.
- Manual: dry-run against an open PR when an environment with authenticated `gh` is available.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Research/specification/rollback | packet + official sources | done |
| T2 | Implement recovery command | `scripts/recover-pr-ci.mjs` | done |
| T3 | Add tests and npm command | 10/10 focused tests locally | done |
| T4 | Extend runbook and PR memory | docs diff | done |
| T5 | Run final non-skipped exact-head gates | ready-for-review PR #314 workflows | in_progress |
| T6 | Independent acceptance review | queued-state finding + fix + CodeQL boundary review | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repo reconnaissance + official GitHub docs | CLI implementation pending | Plan bounded script |
| 2026-08-07 | planner | implementer | planned | branch + packet | tests/CI pending | Implement T2–T4 |
| 2026-08-07 | implementer | evaluator | evaluating | PR #314 diff; initial focused tests | exact-head CI and independent review pending | Review actual failure modes |
| 2026-08-07 | evaluator | implementer | evaluating | found stale queued auto-cancel risk | waiting states could be healthy | fail-safe queued/waiting behavior |
| 2026-08-07 | implementer | evaluator | evaluating | 10/10 focused tests; stale queued no-write regression; updated runbook/memory | final head gates pending | move PR ready and inspect exact-head evidence |

### Current permission boundary

- Granted: write only `chore/ci-recovery-tooling` and PR #314.
- Resources: repository files and GitHub metadata/actions read for verification.
- Forbidden: `main`, unrelated branches/PRs, branch protection, rulesets, provider configuration, deployment and production data.
- Human approval required before: merge or any governance/provider-setting write.
- Stop condition: exact-head identity cannot be guaranteed or broader credentials become necessary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Exact-head recovery decisions | helper tests | pass |
| Dry-run performs no writes | fake-`gh` call log | pass |
| Fresh active run remains untouched | fake-`gh` integration, exit `8` | pass |
| Stale queued/waiting run remains untouched by default | fake-`gh` integration, exit `8`, no cancel/dispatch | pass |
| Durable runbook and rollback | operations doc + packet | pass |
| Independent acceptance review | actual diff review + regression fix | pass locally |
| Required exact-head checks | ready-for-review final head | pending |

### Research and adoption evidence

- Official CLI fields/flags used by the implementation remain documented.
- Force cancellation is used only after normal cancellation and only for an eligible or explicitly forced run.
- GitHub code-scanning guidance supports keeping PR CodeQL evidence separate from a generic manual CI recovery signal.
- No dependency, application runtime or hidden service was introduced.

### Review findings

- Correctness: exact SHA, new run ID and moved-head checks are explicit; waiting states no longer auto-cancel from elapsed time.
- Security/ownership: Actions writes require existing `gh` permissions; tokens are not exposed; CI recovery cannot claim CodeQL/secret evidence.
- Accessibility: text-only CLI output.
- Maintainability: standalone tool extends rather than overloads monitoring; safety rule is covered by an integration fixture.
- Scope: workflow topology and provider rules remain unchanged.

### Remaining limitations

- GitHub outages and runner capacity remain provider concerns.
- A real force-cancel/dispatch exercise requires an environment with authenticated GitHub CLI; CI can verify code contracts but should not mutate unrelated live runs.
- Protected security workflows still need to run on the final exact head; a manual branch workflow must not be treated as equivalent without a separate governance contract.

## Delivery record

- Branch: `chore/ci-recovery-tooling`
- PR: #314
- Squash commit: pending owner decision
- CI run: final ready-for-review exact-head evidence pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge/acceptance
