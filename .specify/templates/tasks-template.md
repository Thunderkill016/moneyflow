# Tasks: <feature name>

**Specification:** `specs/<feature-slug>/spec.md`
**Plan:** `specs/<feature-slug>/plan.md`
**Active work packet:** `docs/plans/active/<slug>.md` | not required
**Current authorized task:** <task ID or none>
**Last updated:** YYYY-MM-DD

> Tasks are execution units, not permission grants. The active MoneyFlow packet or owner instruction selects the current task and permission scope.

## Task Format

```text
- [ ] T001 [P?] [US1?] Description with exact path(s)
  - Depends on: <task IDs or none>
  - Permission: read_only | branch_write | provider_read | approved provider/production scope
  - Evidence: <observable artifact, test or review result>
  - Stop condition: <condition requiring spec/plan update or owner decision>
```

- `[P]` means the task can run in parallel without overlapping files or ownership boundaries.
- `[US1]`, `[US2]`, etc. map tasks to independently testable user stories.
- Every implementation task MUST name exact files or areas.
- Tests are included before implementation when the accepted plan requires test-first evidence.

## Phase 1 — Setup and Reconnaissance

- [ ] T001 Inspect current behavior, affected code, tests and current project memory
  - Depends on: none
  - Permission: read_only
  - Evidence: repository reconnaissance recorded in `plan.md` or the active work packet
  - Stop condition: current behavior contradicts the accepted specification

- [ ] T002 Confirm risk class, work-packet requirement and permission boundary
  - Depends on: T001
  - Permission: read_only
  - Evidence: accepted classification and selected verification layers
  - Stop condition: Class 3/cross-cutting work lacks a full packet or required owner approval

## Phase 2 — Foundational Work

Use this phase only for shared prerequisites that block all user stories. Avoid speculative abstractions.

- [ ] T003 <foundational task with exact path>
  - Depends on: T002
  - Permission: branch_write
  - Evidence:
  - Stop condition:

**Checkpoint:** shared prerequisites are independently reviewable and do not implement unrelated user behavior.

## Phase 3 — User Story 1: <title> (P1)

**Independent test:** <how this story can be verified by itself>

### Tests or contracts

- [ ] T010 [P] [US1] Add or update <test/contract path>
  - Depends on: T002
  - Permission: branch_write
  - Evidence: failing-then-passing or contract evidence required by the plan
  - Stop condition: test requires changing unaccepted behavior

### Implementation

- [ ] T011 [US1] Implement <behavior> in `<path>`
  - Depends on: T010
  - Permission: branch_write
  - Evidence: independent user-story acceptance evidence
  - Stop condition: work crosses financial/data/security or out-of-scope boundaries

**Checkpoint:** User Story 1 works and is testable independently.

## Phase 4 — User Story 2: <title> (P2)

**Independent test:** <how this story can be verified by itself>

- [ ] T020 [P] [US2] Add or update <test/contract path>
  - Depends on: T002
  - Permission: branch_write
  - Evidence:
  - Stop condition:

- [ ] T021 [US2] Implement <behavior> in `<path>`
  - Depends on: T020
  - Permission: branch_write
  - Evidence:
  - Stop condition:

**Checkpoint:** User Stories 1 and 2 each remain independently testable.

## Final Phase — Integration, Evaluation and Delivery

- [ ] T090 Run the risk-selected product-layer verification and protected security workflows
  - Depends on: all implementation tasks in scope
  - Permission: branch_write; provider/production writes remain forbidden unless separately approved
  - Evidence: exact commands, run links/artifacts and pass/fail/not-applicable reasons; real CodeQL initialization/analysis and secret scan for the exact head
  - Stop condition: any required gate fails, CodeQL analysis is skipped, or a claimed gate did not run

- [ ] T091 Evaluate the actual diff against every acceptance criterion and constitutional gate
  - Depends on: T090
  - Permission: read_only evaluation
  - Evidence: acceptance table with pass/fail and concrete evidence
  - Stop condition: scope drift, unverified claims or unresolved high-risk findings

- [ ] T092 Create/update the bounded PR memory record and delivery evidence
  - Depends on: T091
  - Permission: branch_write
  - Evidence: `docs/research/pr-memory/YYYY/QN/PR-<number>.md`
  - Stop condition: current project memory would be updated without a real status change

- [ ] T093 Prepare ready-for-review handoff
  - Depends on: T092
  - Permission: branch_write
  - Evidence: branch, PR, exact-head checks, remaining limitations and owner-only next action
  - Stop condition: unapproved deployment or production write is attempted

## Dependency and Parallelism Rules

- A user story may start after its real prerequisites, not merely after every earlier story.
- `[P]` tasks MUST edit different files or non-overlapping ownership areas.
- Database migrations, RLS, financial semantics, authentication and provider configuration are never assumed parallel-safe.
- New discoveries update `spec.md` and `plan.md` before task scope changes.
- One task should produce one reviewable result.
- Do not add cleanup, refactors or adjacent fixes unless the accepted scope requires them.

## Progress Record

| Task | Status | Owner/role | Evidence | Notes/blockers |
|---|---|---|---|---|
| T001 | todo | | | |

Allowed statuses: `todo`, `active`, `blocked`, `verify`, `done`, `superseded`. A `done` task does not imply the feature or PR is accepted.
