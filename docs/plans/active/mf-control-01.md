# MF CONTROL-01 — Project Truth Reconciliation

**Status:** evaluating  
**Owner:** MoneyFlow  
**Issue/PR:** #148 / #149  
**Last updated:** 2026-07-30

## Outcome

Remove false work-in-progress and restore one reliable development queue before the next implementation initiative starts.

GitHub issues and pull requests own dynamic work status. Repository documents own durable product truth, architecture boundaries, decision rationale and delivery evidence. This packet is a temporary handoff for #148, not a second backlog.

## Repository reconnaissance

### Current behavior

`docs/plans/active/mf-safe-ux.md` still described authenticated owner acceptance as pending even though #134 closed as completed after PR #146, CI #559, production deployment and real-phone owner acceptance.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `docs/plans/active/` | Must represent deliberately active work only | remove the completed SAFE-UX packet |
| `docs/plans/completed/` | Preserves final delivery evidence | add the accepted SAFE-UX record |
| GitHub issue #148 | Owns the changing development queue | keep `NOW/NEXT/LATER/PARKED` here |

### Existing tests and constraints

- `npm run check:knowledge` enforces the work-packet structure.
- `docs/plans/README.md` defines active packets as handoff contracts, not speculative backlog.
- This change is documentation-only and must not modify runtime, financial logic, database, Auth or RLS.

### Similar implementation and recent history

Completed packets already preserve why work was done and how it was verified. MF SAFE-UX should follow the same lifecycle rather than remain falsely active.

### Open questions

None. GitHub history and owner acceptance provide sufficient delivery evidence.

## Research

No new product or technology research is required. This is an internal state-reconciliation change using existing repository rules and observed GitHub history.

The operating choice is intentionally conservative:

- dynamic status stays in issues and pull requests;
- durable completion evidence stays in the repository;
- no project board, label taxonomy, ADR or repository-wide documentation reorganization is introduced without a demonstrated need.

## Specification

### Problem

A completed initiative remains represented as active work. A future agent can therefore select the wrong packet, repeat finished work or misunderstand the real project priority.

### Acceptance criteria

- [x] `docs/plans/active/` no longer contains MF SAFE-UX.
- [x] A completed SAFE-UX packet records PR #146, merge commit, CI, production deployment, owner acceptance and residual risk.
- [x] The active-packet README says dynamic status belongs in GitHub issues/PRs.
- [x] The change remains documentation-only and independently reviewable.
- [ ] CI passes on the final PR head.
- [ ] Owner approves merge.

### Financial and security constraints

No financial, database or authorization behavior changes. Leaked-password protection remains accurately recorded as the provider/plan blocker tracked by #40; no fake code workaround is introduced.

### Out of scope

- Implementing #145, #72, #53 or #40.
- Merging, closing or redesigning PR #119.
- Introducing a new project-management system.
- Reclassifying all historical documentation in this PR.

## Implementation plan

### Architecture fit

This change stays inside the existing documentation lifecycle. GitHub owns live work state; `docs/plans/active/` owns temporary handoff context; `docs/plans/completed/` owns durable delivery evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/plans/active/mf-safe-ux.md` | remove | initiative is completed |
| `docs/plans/completed/2026-07-30-mf-safe-ux.md` | add final record | preserve accepted delivery evidence |
| `docs/plans/active/README.md` | clarify lifecycle | prevent closed work remaining active |
| `docs/plans/active/mf-control-01.md` | track this bounded cleanup | allow reliable handoff and CI validation |

### Data and migration impact

None. No schema, runtime, deployment or production-data change.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| GitHub state is copied into another permanent queue | keep changing queue only in #148 |
| Historical evidence is lost | preserve a completed packet rather than deleting the record |
| Process expands beyond the observed problem | restrict PR to four documentation paths |
| Active packet fails repository contract | run `check:knowledge` through CI |

### Verification plan

- Static: `check:knowledge`, deployment, CSS ownership and architecture contracts through CI.
- Unit/build: run through the standard `verify` job because the repository workflow does not define a docs-only shortcut.
- Database/E2E: allowed to run unchanged by the standard CI workflow; no runtime behavior is claimed from this PR.
- Manual: inspect the final diff and confirm `active/` contains only deliberate WIP.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Reconcile issues, PRs and packets | none | issue #148 | done |
| T2 | Archive MF SAFE-UX with final evidence | T1 | completed packet | done |
| T3 | Clarify active-packet lifecycle | T1 | active README diff | done |
| T4 | Open focused delivery PR | T2, T3 | PR #149 | done |
| T5 | Obtain passing CI on final head | T4 | GitHub Actions run | in progress |
| T6 | Merge after owner approval and close #148 | T5 | merge record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| False active packet removed | PR #149 diff | pass |
| Accepted SAFE-UX history preserved | completed packet | pass |
| Dynamic status not duplicated | issue #148 + lifecycle rule | pass |
| No runtime scope creep | four documentation paths only | pass |
| Repository contracts | CI on final head | pending |

### Review findings

- Correctness: final SAFE-UX record matches issue #134 completion evidence.
- Security/ownership: residual Supabase setting is not misrepresented as fixed.
- Maintainability: the change removes duplicate status rather than adding a new system.
- Scope compliance: no runtime, architecture or feature implementation is included.

### Remaining limitations

This PR does not resolve the larger historical-document drift or rescope #72/#53. Those remain separate deliberate decisions after CONTROL-01 closes.

## Delivery record

- Branch: `agent/mf-control-01`
- PR: #149
- Squash commit: pending
- CI run: pending final green run
- Production deployment: not required for documentation-only behavior
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge
