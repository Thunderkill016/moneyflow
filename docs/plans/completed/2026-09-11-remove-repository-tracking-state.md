# Remove repository tracking state

**Status:** ready_for_review
**Execution state:** ready_for_review
**Active role:** implementer / evaluator
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** PR #575
**Last updated:** 2026-09-11

## Outcome

Remove the repository-maintained current-task/current-memory state machine so MoneyFlow no longer needs a plan-selection manifest plus mutable current-project snapshot to decide what an agent may execute. Preserve explicit owner scope, GitHub issue/PR status, risk classes, work packets for high-risk specification/evidence, bounded PR provenance, exact-head CI and separate merge/provider/production approval.

## Repository reconnaissance

### Current behavior

`main@43f775256f0c7fcc965a81332423e0f193751052` required `docs/plans/PLAN_AUTHORITY.json`, `docs/research/CURRENT_PROJECT_MEMORY.md`, plan resolver/lifecycle scripts and an authority-aware agent-doctor wrapper. The manifest already had `current: null` after PR #574, so there was no live executable slice to preserve.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md`, README, context router | entrypoint/source precedence | explicit task + GitHub scope |
| plan/lifecycle scripts | machine-enforced tracking state | remove |
| project-knowledge checks | useful policy/provenance validation | retain without mutable snapshot |
| PR memory | bounded historical evidence | retain |
| agent doctor | local capability/risk projection | retain without plan authority |
| CI classifier | policy changes must exercise gates | retain and classify knowledge-policy edits as full-policy work |

### Existing tests and constraints

- Required CI check identities remain unchanged.
- `check:knowledge` and `test:ci-policy` remain mandatory policy checks.
- No workflow path filter is added.
- No runtime, financial, database, RLS, provider or production-data behavior is changed.

### Similar implementation and recent history

PR #574 completed the final manifest-selected production-migration slice and returned `PLAN_AUTHORITY.current` to `null`, providing a clean boundary for retiring the tracker rather than migrating live work.

### Open questions

None blocking implementation. Historical documents may still mention retired files as historical context; current entrypoints/policy must not depend on them.

## Research

### Research scope and source selection

- Decision question: how to retire repository tracking state without making required GitHub checks disappear or become falsely green.
- Reference map consulted: internal CI policy plus official GitHub Actions documentation.
- Source budget: one focused primary source was sufficient for the narrow external question.
- Expected decision: keep required workflows/check identities running; remove only dead tracking enforcement.

### Questions researched

1. What happens when a workflow carrying a required check is skipped by branch/path filtering?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub Actions workflow syntax / required-check behavior | official provider documentation | 2026-09-11 | skipped workflows caused by path/branch filters can leave required checks pending | provider check reporting only |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| keep manifest + snapshot | no migration work | duplicate mutable state and convergence overhead | reject |
| delete files only | small diff | broken package scripts/doctor/knowledge CI | reject |
| remove tracking subsystem, retain independent policy/provenance checks | one status surface and no dead dependencies | coordinated governance/test update | selected |

### Research decision

Retire current-state selection/snapshot machinery. Keep GitHub Issues/PRs as status, work packets as scoped spec/evidence, PR records as history, and code/tests/migrations as implemented truth. Required workflows continue to run normally.

### Adoption review

Not applicable. No dependency, provider, service, framework or runtime architecture is added.

## Specification

### Problem

MoneyFlow stored overlapping execution/current-truth state in repository files in addition to GitHub issues/PRs and code. Closing a slice required synchronized manifest, snapshot and lifecycle updates that did not change product behavior.

### Acceptance criteria

- [x] `PLAN_AUTHORITY.json` and `CURRENT_PROJECT_MEMORY.md` are removed.
- [x] resolver/selection/lifecycle scripts and authority-aware doctor wrapper are removed.
- [x] package scripts no longer invoke removed files.
- [x] agent doctor remains useful without mutable current-state files.
- [x] project-knowledge validation retains durable docs, PR provenance, stale-claim guards and packet-reference integrity.
- [x] current docs/templates no longer instruct agents to use manifest/snapshot state.
- [x] work packets remain risk/spec/evidence artifacts, not a queue or permission source.
- [x] CI policy changes select full verification rather than hiding required checks.
- [ ] exact PR-head CI is green.

### Required states

Not a product UI change; loading/empty/mobile/accessibility states are not applicable.

### Financial and security constraints

- No financial/domain semantics, RLS/auth/schema/provider or production-data change.
- Merge remains owner-controlled.

### Out of scope

- Rewriting historical completed packets/PR records merely because they mention the retired mechanism.
- Changing required GitHub check identities or branch protection.
- Changing product backlog or feature priority.

## Implementation plan

### Architecture fit

GitHub remains the human task/status system. Repository policy remains in `AGENTS.md` and engineering docs. Work packets carry bounded specification/evidence. PR memory carries immutable provenance. Code/tests/migrations carry implemented truth.

### Planned changes

- Delete mutable tracking files and dedicated resolver/lifecycle code/tests.
- Route `agent:doctor` directly to its policy/environment implementation.
- Simplify project knowledge contract to durable assertions only.
- Keep per-PR record enforcement but remove snapshot/lifecycle fields.
- Update current entrypoints, Spec Kit adapter, plan docs and PR template.
- Update CI classifier tests so knowledge-policy changes still exercise all gates.

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| dead command/import remains | CI policy/unit checks + diff review |
| knowledge gate becomes too weak | preserve required docs/markers, stale claims, PR schema and packet-reference checks |
| required check stops reporting | no path filtering/check renaming |
| work packet becomes replacement queue | active README + validator prohibit queue/authority semantics |

### Verification plan

- Static: `check:knowledge`, `test:ci-policy`, lint/typecheck/build as selected.
- Database/browser/UI: full policy-classification CI because governance tooling changed; no behavior expectation changes.
- Provider: exact-head GitHub required checks.
- Production: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | remove manifest/snapshot and state-machine scripts | no selected current slice | branch diff | done |
| T2 | simplify knowledge contract/checks and doctor | T1 | changed scripts/tests | done |
| T3 | reconcile entrypoints/docs/templates | T1 | docs diff | done |
| T4 | verify bounded diff and open PR | T1-T3 | PR #575 | done |
| T5 | add mandatory PR provenance record | PR number | `PR-575.md` | done |
| T6 | obtain exact-head green CI and evaluate failures | T5 | Actions runs/jobs | in progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-11 | owner | implementer | implementing | direct instruction; `main@43f7752` | exact-head CI unavailable | implement branch cleanup |
| 2026-09-11 | implementer | evaluator/CI | evaluating | PR #575 + `PR-575.md` | exact-head CI pending | inspect/fix branch-caused failures |

### Current permission boundary

- Granted scope: focused branch/PR writes for this cleanup.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, merge, branch protections, provider config, production data.
- Human approval required before: merge or any provider/production action.
- Rollback: close PR/delete branch, or revert an owner-approved merge.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| state files removed | branch compare | pass |
| resolver/lifecycle code removed | branch compare | pass |
| current policy/docs no longer depend on those files | entrypoints + contract diff | pass pending CI |
| durable policy/provenance checks retained | knowledge contract/scripts/tests | pass pending CI |
| exact-head provider checks | GitHub Actions | pending |

### Research and adoption evidence

Official GitHub guidance supports keeping required workflows reporting rather than filtering them away. No external code/dependency was adopted.

### Review findings

- Correctness: structural cleanup is coherent; exact-head execution still required.
- Security/ownership: no permission expansion; merge/provider/production boundaries remain explicit.
- UI/UX/accessibility: no product UI diff.
- Maintainability/duplication: removes duplicate current-state bookkeeping while retaining bounded PR provenance.
- Scope compliance: no runtime/database/provider files changed.

### Remaining limitations

Historical documents and old PR records can mention `PLAN_AUTHORITY.json` or `CURRENT_PROJECT_MEMORY.md` as historical facts. They are intentionally not rewritten unless they are current entrypoints/policy.

## Delivery record

- Branch: `ops/remove-repository-tracking-state`
- PR: #575
- Squash commit: pending owner merge
- CI run: pending exact-head rerun after hygiene fix
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: yes
