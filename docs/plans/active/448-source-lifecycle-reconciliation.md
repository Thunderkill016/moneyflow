# #448 — Source lifecycle → ledger/reconciliation policy

**Status:** implementing
**Execution state:** implementing
**Change class:** Class 3 — financial ingestion/reconciliation boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** #448 / draft PR pending
**Base at implementation start:** `main@eb8861c71dbc5b8173e7e48fff1293470a639816`
**Last updated:** 2026-08-23

## Outcome

Make source lifecycle evidence reviewable and useful without turning provider/source status into ledger truth. Preserve lifecycle-only observations, and allow reviewed `posted` evidence to move an exactly matching one-leg income/expense account leg from MoneyFlow `pending` to `cleared`; never source-drive `reconciled`, ledger edits, deletion, or demotion.

## Repository reconnaissance

### Current behavior

- `inbox_candidates.source_lifecycle_state` stores nullable `pending|posted|removed` evidence, and explicit predecessor identity can link different source IDs to one MoneyFlow transaction.
- `resolve_inbox_source_identity(...)` resolves a latest approved source observation or canonical provenance by fingerprint, but does not expose the prior lifecycle state.
- Because lifecycle state is intentionally excluded from the financial fingerprint, a same-ID lifecycle-only change can collapse to `source_external_id_match` and cannot currently be reviewed as new evidence.
- Existing changed-source and replacement-review RPCs deliberately preserve ledger fields, reconciliation state and canonical provenance.
- Account-leg reconciliation is independent: `pending|cleared|reconciled`; only statement completion may create `reconciled`, and reconciled financial facts are mutation-guarded.
- Existing audit triggers already record any account-leg reconciliation change as privacy-safe structural metadata.

### Relevant repository areas

| Area | Role | Decision |
|---|---|---|
| `20260822094500_source_lineage_lifecycle.sql` | source identity/lifecycle evidence | extend via new migration; do not rewrite history |
| `20260803142000_account_reconciliation_current_main.sql` | canonical account-leg reconciliation | reuse states/locks/guards; never bypass |
| `src/lib/inbox/provenance.ts` | dry-run contract + user messaging | add lifecycle-specific plan reason/message |
| Inbox source review actions/UI | explicit human review boundary | add one bounded reviewed lifecycle action |
| pgTAP source/reconciliation tests | financial invariants | add adversarial cross-contract coverage |

## Research

### Decision question

When may upstream transaction lifecycle evidence influence MoneyFlow clearing/reconciliation without overwriting user-owned financial truth?

### Primary-source findings

- Plaid documents pending → posted as removal of the pending record plus addition of a posted record; pending and posted details may differ, a pending transaction may disappear without posting, and posted records can still later be modified/removed.
- Plaid `/transactions/sync` therefore exposes ordered `added`, `modified`, and `removed` observations rather than an immutable final transaction record.
- Open Banking UK distinguishes Pending from Booked and, in newer specifications, separately exposes transaction mutability; a booked transaction is account-servicer booking evidence, not proof of a MoneyFlow statement reconciliation.
- TrueLayer exposes pending transactions separately and documents that pending data can remain/change before clearing.

### Research decision

Treat lifecycle as source evidence with a deliberately one-way, review-gated effect on MoneyFlow reconciliation: `posted` can establish `cleared` only when current ledger economics still match exactly. Nothing from the source can establish `reconciled`, overwrite ledger fields, delete facts, or undo user/statement decisions.

## Specification

### Policy matrix

| Reviewed source evidence | Current MoneyFlow state | Allowed effect |
|---|---|---|
| `pending` | any | preserve observation only |
| `removed` | any | preserve observation only; no delete/demotion |
| `posted`, exact ledger match | `pending` | advance target account leg to `cleared` |
| `posted`, exact ledger match | `cleared` | idempotent no-op |
| `posted`, exact ledger match | `reconciled` | idempotent no-op; statement truth remains stronger |
| `posted`, ledger mismatch | any | preserve observation only; no overwrite |
| changed/replacement observation without exact economics | any | preserve observation only |

### Exact financial match for this slice

Only one-leg `income|expense` transactions are eligible. Candidate and current transaction must match:

- kind;
- account;
- occurred date;
- signed amount implied by kind;
- live/not deleted transaction.

Merchant, raw source description, parser metadata and category are source/review context, not permission to mutate or block clearing when the core booked economics match. Transfers are explicitly out of scope.

### Lifecycle observation semantics

- Source identity resolution must return the latest approved lifecycle state when available.
- Same-ID lifecycle-only change must produce an explicit hard-source review plan rather than `source_external_id_match`.
- Review must durably approve/link the new candidate observation before or atomically with any reconciliation effect.
- Replay of the same approved candidate is idempotent.
- A later identical observation resolves as an exact-source duplicate against the latest reviewed observation.

### Security and ownership constraints

- Authenticated tenant boundary remains database-enforced.
- Browser callers receive only the reviewed RPC; no direct table write permission is added.
- Existing reconciliation account locking must be used before changing an account leg.
- Reconciled state is never changed by this source RPC.
- Existing financial mutation audit remains authoritative for `entry_reconciliation_changed`.
- No provider, deployment, production-data or credential operation is in scope.

## Implementation plan

1. Add a forward migration that extends source identity baseline with lifecycle evidence and introduces a lifecycle-aware plan reason.
2. Add an atomic reviewed lifecycle RPC that approves source evidence and conditionally performs exact-match `pending → cleared` using the existing account reconciliation lock.
3. Keep existing changed/replacement observation RPCs valid and replay-safe; reuse them where their behavior is strictly observation-only.
4. Add TypeScript dry-run contract/message and one explicit Inbox review action/button.
5. Add pgTAP coverage for lifecycle-only same-ID, predecessor posted, changed posted, pending, removed, ledger mismatch, already-cleared, reconciled, replay and cross-tenant/browser privilege boundaries.
6. Run policy/static/build/database/browser/UI/CodeQL/secret-history Class 3 verification.
7. Before owner handoff, converge this same PR: archive packet, board current → none with this PR projection, and projected current memory.

### Out of scope

- Automatic provider ingestion without review.
- Provider selection/connectivity.
- Transfer lifecycle clearing.
- Rewriting user-corrected amount/date/account/kind/category/note.
- Source-driven deletion or statement reconciliation.
- New archive schema unless implementation proves existing candidate fields are insufficient.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Prove current lifecycle/reconciliation gap | repo/source review | done |
| T2 | Define provider-neutral lifecycle policy | official source research + issue #448 | done |
| T3 | Implement lifecycle-aware source identity/planning | migration + pgTAP | todo |
| T4 | Implement reviewed posted→cleared boundary | RPC + audit/reconciliation tests | todo |
| T5 | Wire explicit Inbox action/message | TS/UI tests | todo |
| T6 | Independent adversarial evaluation | regression review | todo |
| T7 | Same-PR lifecycle convergence | board/memory/completed packet | todo |
| T8 | Exact-head Class 3 verification | CI/database/browser/UI/CodeQL/secret history | todo |

## Evaluation

### Required counterexamples

- lifecycle-only same-ID transition is not lost;
- pending does not clear;
- removed does not delete or demote;
- posted with changed amount/date/account/kind does not overwrite ledger or clear;
- posted exact match clears only `pending` account leg;
- already cleared stays cleared without duplicate mutation;
- reconciled stays reconciled;
- deleted target is not restored;
- transfer is not handled by this RPC;
- wrong tenant cannot inspect/apply another user's lifecycle candidate;
- replay cannot create a second effect or financial fact.

### Verification status

Implementation not yet complete. Final claims require exact-head Class 3 evidence.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-23 | owner | implementer | implementing | user instruction to continue #432 plan; issue #448; fresh `main@eb8861c7…` | implementation + verification | implement on bounded branch; no merge |

## Current permission boundary

- Allowed: branch writes for issue #448, tests/docs/PR tracking required for this slice.
- Forbidden: `main` writes, merge, provider/deployment/production-data writes, secrets/credentials, unrelated roadmap work.
- Owner approval required before merge.