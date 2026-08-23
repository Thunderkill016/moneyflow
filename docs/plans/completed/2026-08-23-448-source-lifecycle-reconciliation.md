# #448 — Source lifecycle → ledger/reconciliation policy

**Status:** ready_for_review
**Execution state:** projected completion in PR #449; not merged until owner decision
**Change class:** Class 3 — financial ingestion/reconciliation boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** none after PR #449 projection activates
**Permission scope:** branch_write only; no provider/production action
**Owner:** human owner
**Issue/PR:** #448 / #449
**Base at implementation start:** `main@eb8861c71dbc5b8173e7e48fff1293470a639816`
**Last updated:** 2026-08-23

## Outcome

Make source lifecycle evidence reviewable and useful without turning provider/source status into ledger truth. Same-ID lifecycle-only changes remain durable evidence. Reviewed `posted` evidence may advance an exactly matching one-leg income/expense account leg from MoneyFlow `pending` to `cleared`; source evidence never establishes `reconciled`, overwrites ledger fields, deletes facts or demotes user/statement truth.

## Repository reconnaissance

### Pre-slice behavior

- `inbox_candidates.source_lifecycle_state` already stored nullable `pending|posted|removed` evidence and explicit predecessor identity could link different source IDs to one MoneyFlow transaction.
- Source identity resolution used financial fingerprint + approved observation history but did not expose the prior lifecycle state.
- Lifecycle was intentionally excluded from the financial fingerprint, so a same-ID pending→posted transition with unchanged economics could collapse to `source_external_id_match` and be lost as a new observation.
- Existing changed-source/replacement RPCs preserved ledger fields, reconciliation and canonical provenance.
- Account-leg reconciliation already had the stronger `pending|cleared|reconciled` contract: statement completion alone creates `reconciled`, and reconciled financial facts are mutation-guarded.
- Existing financial mutation audit records reconciliation-state changes without sensitive payloads.

### Relevant owners reused

| Area | Role in #448 |
|---|---|
| source lineage/lifecycle migration from #445 | extend identity baseline; preserve explicit source semantics |
| account reconciliation current-main migration | reuse state machine, account lock and mutation guards |
| existing changed/replacement observation helpers | preserve reviewed source identity aliases |
| Inbox source-review actions/UI | explicit human review boundary |
| financial mutation audit | audit pending→cleared effect through canonical reconciliation RPC |

## Research

### Decision question

When may upstream transaction lifecycle evidence influence MoneyFlow clearing/reconciliation without overwriting user-owned financial truth?

### Primary-source findings

- Plaid documents pending→posted as removal of a pending record plus addition of a posted record; pending and posted details may differ, pending may disappear without posting, and posted records can still later be modified/removed.
- Plaid `/transactions/sync` exposes ordered `added`, `modified`, and `removed` observations rather than an immutable final record.
- Open Banking UK distinguishes Pending from Booked and separately models transaction mutability; Booked is account-servicer booking evidence, not MoneyFlow statement reconciliation.
- TrueLayer exposes pending transactions separately and documents that pending records can remain/change before clearing.

### Research decision

Treat lifecycle as source evidence with one deliberately narrow review-gated effect: `posted` can establish MoneyFlow `cleared` only when current ledger economics still match exactly. Nothing from the source can establish `reconciled`, overwrite ledger fields, delete facts, or undo user/statement decisions.

## Specification

### Accepted policy matrix

| Reviewed source evidence | Current MoneyFlow state | Allowed effect |
|---|---|---|
| `pending` | any | preserve observation only |
| `removed` | any | preserve observation only; no delete/demotion |
| `posted`, exact ledger match | `pending` | target account leg → `cleared` |
| `posted`, exact ledger match | `cleared` | idempotent no-op |
| `posted`, exact ledger match | `reconciled` | idempotent no-op; statement truth remains stronger |
| `posted`, ledger mismatch | any | preserve observation only; no overwrite |
| split/transfer/not-one-leg | any | preserve observation only in this slice |

### Exact match boundary

Only live one-leg `income|expense` transactions are eligible. Candidate/current transaction must match kind, account, occurred date and signed amount implied by kind. Merchant/raw description/parser/category are context only and never permission to mutate ledger values. Transfers are out of scope.

### Source/replay semantics

- Source identity resolution returns latest approved lifecycle state when available.
- Same-ID lifecycle-only change produces hard `source_external_id_lifecycle_changed` instead of unchanged exact-source duplicate.
- The ordinary financial approval path cannot bypass that hard source identity even with heuristic duplicate override.
- Reviewed lifecycle evidence is approved/linked atomically with any permitted clearing effect.
- Replay of the reviewed candidate is idempotent; a later identical observation resolves against the latest reviewed baseline.

### Security/concurrency constraints

- Tenant scope remains database-enforced under authenticated SECURITY DEFINER RPCs.
- No direct browser table-write permission is added.
- `reconciled` is never changed by source lifecycle.
- Posted clearing uses the canonical `set_account_entry_reconciliation_state` path and therefore the existing privacy-safe financial audit.
- Source review follows reconciliation account→transaction lock order before helper paths may lock the target transaction; this avoids a lock-order inversion against statement reconciliation.
- No provider, deployment, production-data or credential operation is in scope.

## Implementation plan

Implemented in PR #449:

1. extend source identity baseline with lifecycle evidence and lifecycle-only plan reason;
2. add `review_source_lifecycle_observation_from_candidate(...)` as the single reviewed lifecycle/reconciliation boundary;
3. route existing same-ID changed and explicit predecessor UI actions through that boundary;
4. explain in Inbox that posted evidence may mark exact current economics cleared but never reconciled or overwrite the ledger;
5. harden account→transaction lock order in a follow-up migration;
6. add pgTAP + TypeScript regression coverage for lifecycle-only, replay, pending, removed, changed posted mismatch, explicit predecessor posted, reconciled and tenant boundaries;
7. converge this packet/board/memory in the same PR before owner handoff.

### Out of scope

- automatic provider ingestion without review;
- provider selection/connectivity;
- transfer lifecycle clearing;
- source-driven correction of amount/date/account/kind/category/note;
- source-driven deletion/restoration or statement reconciliation;
- new archive schema (existing candidate lifecycle columns are sufficient).

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Prove lifecycle/reconciliation gap | repo/source review | done |
| T2 | Define provider-neutral lifecycle policy | official research + issue #448 | done |
| T3 | Implement lifecycle-aware source identity/planning | forward migration + pgTAP | done |
| T4 | Implement reviewed posted→cleared boundary | RPC + audit/reconciliation coverage | done |
| T5 | Wire explicit Inbox action/message | server actions + review panel + provenance unit test | done |
| T6 | Independent adversarial evaluation | enum/lock/security/replay review | done; lock inversion found and fixed before final CI |
| T7 | Same-PR lifecycle convergence | this completed packet + board/memory PR #449 projection | done in branch projection |
| T8 | Exact-head Class 3 verification | non-draft CI/database/browser/UI/CodeQL/Secret History | pending final exact-head run |

## Evaluation

### Covered counterexamples

- lifecycle-only same-ID transition is not lost;
- ordinary approval cannot bypass hard lifecycle identity;
- pending does not clear/demote;
- removed does not delete/demote;
- posted changed economics are preserved but do not overwrite or clear mismatched ledger facts;
- exact posted clears only pending one-leg income/expense;
- replay creates no second reconciliation mutation;
- explicit predecessor posted can clear only when current economics still match;
- reconciled statement truth stays reconciled;
- wrong tenant cannot review another tenant candidate;
- transfer/split eligibility is intentionally excluded by the one-leg gate.

### Independent finding fixed

The first reviewed-RPC implementation could call existing changed/replacement helpers that lock the target transaction before later acquiring the reconciliation account lock. Statement reconciliation acquires account lock first. PR #449 adds an explicit lock-order hardening migration so posted review acquires the candidate account reconciliation lock before entering those helper paths, eliminating that inversion for eligible exact-account flows.

### Verification status

Draft CI #2915 is rejected as acceptance because substantive jobs were skipped while PR #449 was draft. Final claims require a non-draft exact-head run in which policy/static/unit/build/database/browser/UI/e2e plus CodeQL and Secret History actually execute successfully.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-23 | owner | implementer | implementing | issue #448; `main@eb8861c7…` | policy/code/tests not yet verified | implement bounded slice |
| 2026-08-23 | implementer | PR #449 verification | ready_for_review projection | migrations, pgTAP, TS/actions/UI, lock-order fix, same-PR convergence | final non-draft exact-head gates pending | mark PR ready, fix acceptance defects only, owner handoff when green |

## Current permission boundary

- No further product slice may be promoted inside PR #449.
- Allowed while projection is open: only #448 acceptance defects, evaluator findings, exact-head verification and same-scope documentation corrections.
- Forbidden: main write, merge, provider/deployment/production-data writes, secrets/credentials, next-source implementation.
- Merge requires a fresh owner decision.