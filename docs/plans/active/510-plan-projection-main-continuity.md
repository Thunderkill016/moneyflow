# Plan projection main continuity

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** MoneyFlow owner  
**Issue/PR:** PR #510  
**Last updated:** 2026-08-28

## Outcome

Keep an already-activated post-merge authority projection valid through later
`main` merges that do not edit the Current Work Board, while rejecting any
later board edit that is not itself the declared projection.

## Repository reconnaissance

### Current behavior

PR #507 merged without changing the board. Its exact `main` checkout then made
`npm run plan:resolve` fail because the resolver compared the projection number
with the newest main commit rather than the commit that last changed the board.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/plan-authority.mjs` | Owns board freshness validation | Change minimally |
| `scripts/plan-authority.test.mjs` | Pins valid and invalid projection histories | Extend |
| board and current memory | Carry the same post-merge projection marker | Project PR #510 |

### Existing tests and constraints

- Related unit tests: `scripts/plan-authority.test.mjs`.
- Database/RLS tests: not applicable; no data boundary changes.
- Browser tests: selected by CI policy because this is governance code, not by a UI change.
- Product/architecture rules: fail closed on changed boards; no current slice is selected.

### Similar implementation and recent history

- Existing pattern: PR #509 distinguishes a child branch that leaves the board unchanged from a later board edit.
- Relevant decision: the post-merge projection is a recovery-only authority transition, never a new-work authorization.

### Open questions

- [x] Whether a later `main` commit may retain the projection: yes, only when the projected board commit is its ancestor.

## Research

Not required. This is a deterministic repository-contract defect reproduced from
merged PR #507 and the local resolver; no external product, provider, standard
or dependency behavior informs the decision.

## Specification

### Problem

Any normal merge after an activated board projection made the authority route
stale even when the board itself was unchanged, blocking all later work.

### User stories

- As a maintainer, I can merge an unrelated bounded PR without invalidating an unchanged authority board.
- As a maintainer, I still get a hard failure if a later PR edits the board without declaring its own projection.

### Acceptance criteria

- [x] A projected board commit that is an ancestor of a later main commit resolves.
- [x] A later board commit whose PR differs from the projection fails closed.
- [x] The #507 exact main checkout passes `plan:resolve` and `check:knowledge`.

### Required states

- Loading: not applicable.
- Empty: no current agent-executable slice remains an explicit warning.
- Populated: board/master authority resolves.
- Validation/error: unprojected later board edits fail closed.
- Recovery/undo: one focused revert restores prior strict behavior.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: not applicable.

### Financial and security constraints

- No financial calculation, ledger, RLS, Auth, schema or provider behavior changes.
- The validator remains fail-closed for board changes.

### Out of scope

- Selecting a product slice, changing required checks, deployment and provider operations.

## Implementation plan

### Architecture fit

`plan-authority.mjs` is the existing authority boundary. It can ask Git whether
the board's own projection commit is an ancestor of the expected main/base SHA.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/plan-authority.mjs` | Identify the PR from the board commit and verify ancestry | Preserve unchanged board state across later merges |
| `scripts/plan-authority.test.mjs` | Add main-continuity regression | Distinguish this from a later board edit |
| board/current memory | Project PR #510 from #507 baseline | Same-PR authority convergence |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: deterministic local Git only.
- Rollback: revert the focused PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| An old projection blesses a newer board edit | Compare the PR that changed the board with the declared projection |
| An unrelated later main merge becomes stale | Ancestor regression test |

### Verification plan

- Static: formatter, lint and typecheck.
- Unit/domain: `scripts/plan-authority.test.mjs` red-green and full policy tests.
- Database: CI-only; Docker is unavailable locally.
- Browser flow: CI-selected browser smoke.
- Responsive/visual: CI-selected audit.
- Production/manual: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Reproduce main continuity failure | #507 merged | failing regression | done |
| T2 | Implement ancestry-based projection validation | T1 | regression passes | done |
| T3 | Project recovery and verify exact head | T2 | CI + review | in_progress |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Unchanged later main resolves | focused regression + local exact-main reproduction | pass locally |
| Later board edit remains rejected | existing negative regression | pass locally |
| Exact PR head gates | pending GitHub CI | pending |

### Review findings

- Correctness: one ownership boundary changed.
- Security/ownership: no provider, secret or tenant boundary touched.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: reuses existing PR-subject parser and Git runner.
- Scope compliance: recovery-only.

### Remaining limitations

- Docker-backed local database gate cannot run on this host; required exact-head CI remains pending.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-28 | evaluator | implementer | implementing | #507 exact main failure; red regression | CI/review pending | Open focused recovery PR |

### Current permission boundary

- Granted scope: focused branch write and PR creation.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` only.
- Forbidden writes: main, provider configuration, production and user data.
- Human approval required before: merge; owner supplied `merge` for this recovery chain.
- Rollback or stop condition: any failure of the fail-closed negative test.

## Delivery record

- Branch: `fix/plan-projection-main-continuity`
- PR: #510 (candidate)
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge
