# Remove repository tracking state

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** implementer / evaluator  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** cleanup requested directly by owner; PR pending creation  
**Last updated:** 2026-09-11

## Outcome

Remove the repository-maintained current-task/current-memory state machine so MoneyFlow no longer needs a plan-selection manifest plus mutable current-project snapshot to decide what an agent may execute. Preserve the useful safety system: explicit owner scope, GitHub issue/PR status, risk classes, work packets for high-risk specification/evidence, bounded PR provenance, exact-head CI and separate merge/provider/production approval.

## Repository reconnaissance

### Current behavior

`main@43f775256f0c7fcc965a81332423e0f193751052` still required `docs/plans/PLAN_AUTHORITY.json`, `docs/research/CURRENT_PROJECT_MEMORY.md`, plan resolver/lifecycle scripts and an authority-aware agent-doctor wrapper. The manifest already had `current: null` after PR #574, so there was no live executable slice to preserve.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md`, README, context router | entrypoint and source precedence | replace file-backed current-state selection with explicit task + GitHub scope |
| plan/lifecycle scripts | machine-enforced tracking state | remove |
| project-knowledge checks | useful policy/provenance validation | retain, simplify away from mutable snapshot |
| PR memory | bounded historical evidence | retain |
| agent doctor | local capability/risk projection | retain without plan authority dependency |
| CI classifier | makes policy changes exercise appropriate gates | retain and classify knowledge-policy edits as full-policy work |

### Existing tests and constraints

- Required CI check identities remain unchanged.
- `check:knowledge` and `test:ci-policy` remain mandatory policy checks.
- No workflow path filter is added; required checks must still report on the exact PR head.
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
- Expected decision: keep required workflows/check identities running; remove only the dead tracking enforcement.

### Questions researched

1. What happens when a workflow carrying a required check is skipped by branch/path filtering?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub Actions workflow syntax / required-check behavior | official provider documentation | 2026-09-11 | skipped workflows caused by path/branch filters can leave required checks pending; do not use filtering to hide cleanup checks | applies to GitHub Actions/provider check reporting, not MoneyFlow product behavior |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| keep manifest + snapshot | no migration work | preserves duplicate mutable state and recurring convergence overhead | reject |
| delete files only | small diff | leaves package scripts, doctor and knowledge CI broken | reject |
| remove tracking subsystem, retain independent policy/provenance checks | one status source and no dead dependencies | requires coordinated governance/test update | selected |

### Research decision

Retire only current-state selection/snapshot machinery. Keep GitHub Issues/PRs as status, work packets as scoped spec/evidence, PR records as history, and code/tests/migrations as implemented truth. Required CI workflows continue to run normally.

### Adoption review

Not applicable. No dependency, provider, service, framework or runtime architecture is added.

## Specification

### Problem

MoneyFlow stored overlapping execution/current-truth state in repository files in addition to GitHub issues/PRs and code. Closing a slice required synchronized manifest, snapshot and lifecycle updates, creating cleanup work that did not change product behavior.

### Acceptance criteria

- [x] `PLAN_AUTHORITY.json` and `CURRENT_PROJECT_MEMORY.md` are removed.
- [x] plan resolver/selection/lifecycle scripts and authority-aware doctor wrapper are removed.
- [x] package scripts no longer invoke removed files.
- [x] agent doctor remains useful without a mutable current-state file.
- [x] project-knowledge validation still enforces durable docs, PR provenance, stale-claim guards and packet-reference integrity.
- [x] current docs/templates no longer instruct agents to use manifest/snapshot state.
- [x] work packets remain risk/spec/evidence artifacts, not a queue or permission source.
- [x] CI policy changes select full verification rather than hiding required checks.
- [ ] exact PR-head CI is green.

### Required states

Not a product UI change. No loading/empty/mobile/accessibility states apply.

### Financial and security constraints

- No financial/domain semantics change.
- No RLS/auth/schema/provider change.
- No production data write.
- Merge remains owner-controlled.

### Out of scope

- Rewriting historical completed packets/PR records merely because they mention the retired mechanism.
- Changing required GitHub check identities or branch protection.
- Changing product backlog or feature priority.

## Implementation plan

### Architecture fit

GitHub remains the human task/status system. Repository policy remains in `AGENTS.md` and engineering docs. Work packets carry bounded specification/evidence. PR memory carries immutable provenance. Code/tests/migrations carry implemented truth.

### Planned changes

- Delete mutable tracking files and their dedicated resolver/lifecycle code/tests.
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
| dead package command/import remains | CI policy/unit checks plus repository diff review |
| project knowledge gate becomes too weak | preserve required files/markers, stale claims, PR record schema and active packet reference checks |
| required check stops reporting | do not add workflow path filtering or rename protected check identities |
| work packet accidentally becomes a replacement queue | active README and validator explicitly prohibit queue/authority semantics |

### Verification plan

- Static: `check:knowledge`, `test:ci-policy`, lint/typecheck/build as selected.
- Database: full policy-classification CI because governance tooling changed; no schema expectation changes.
- Browser/UI: full policy-classification CI to prove required shard orchestration still works; no product UI behavior changed.
- Provider: exact-head GitHub required checks.
- Production: not applicable; repository governance only.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | remove manifest/snapshot and dedicated state-machine scripts | current `main` has no selected slice | branch diff | done |
| T2 | simplify knowledge contract/checks and doctor | T1 | changed scripts/tests | done |
| T3 | reconcile entrypoint/docs/templates | T1 | docs diff | done |
| T4 | verify bounded diff and open PR | T1-T3 | compare + PR | in progress |
| T5 | add mandatory PR provenance record | PR number | PR-memory file | pending |
| T6 | obtain exact-head green CI and evaluate failures | T5 | Actions runs/jobs | pending |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-11 | owner | implementer | implementing | direct instruction; `main@43f7752` | exact-head CI not yet available | implement branch cleanup |
| 2026-09-11 | implementer | evaluator/CI | evaluating | `ops/remove-repository-tracking-state`; bounded compare against main | PR record and exact-head CI pending | open PR, add record, inspect checks |

### Current permission boundary

- Granted scope: focused branch/PR writes for this cleanup.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, merge, branch protections, provider config, production data.
- Human approval required before: merge or any provider/production action.
- Rollback: close PR/delete branch, or revert the cleanup commit after an owner-approved merge.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| state files removed | branch compare | pass |
| dedicated resolver/lifecycle code removed | branch compare | pass |
| current policy/docs no longer depend on those files | changed entrypoints and contract | pass pending CI |
| durable policy/provenance checks retained | `check-project-knowledge`, project contract and tests | pass pending CI |
| exact-head provider checks | GitHub Actions | pending |

### Research and adoption evidence

Official GitHub guidance supports keeping required workflows reporting rather than using filters to skip them. No external code/dependency was adopted.

### Review findings

- Correctness: structural cleanup is coherent at diff level; exact-head execution still required.
- Security/ownership: no permission expansion; merge/provider/production boundaries remain explicit.
- UI/UX/accessibility: no product UI diff.
- Maintainability/duplication: removes duplicate current-state bookkeeping while retaining one PR provenance stream.
- Scope compliance: no runtime/database/provider files changed.

### Remaining limitations

Historical documents and old PR records can mention `PLAN_AUTHORITY.json` or `CURRENT_PROJECT_MEMORY.md` as historical facts. They are intentionally not rewritten unless they are current entrypoints/policy.

## Delivery record

- Branch: `ops/remove-repository-tracking-state`
- PR: pending
- Squash commit: pending owner merge
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: yes
