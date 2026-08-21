# #436 — Reconcile manual transactions with later source evidence

**Status:** active
**Execution state:** implementing
**Change class:** Class 3 — financial import/reconciliation boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/436-manual-import-reconciliation`
**Base:** `main@38ae8f8694554d8d69508f86bcc66b2bdfe68b95`
**Owner:** human owner

## Outcome

When a user already recorded a digital income/expense manually and later source evidence for the same event arrives, MoneyFlow can attach that evidence to the reviewed existing ledger fact instead of creating a duplicate. Linking source evidence must never silently rewrite the existing fact or its reconciliation state.

This is the second bounded P1 slice after #434/#435. It does not add a provider or broaden fuzzy matching.

## Repository reconnaissance

Current main after #435 already has a neutral persisted acquisition foundation: import batches, candidates, source/external identity, versioned fingerprints, match status/reason/confidence, transaction provenance, atomic candidate approval, deterministic rules, reconciliation and privacy-safe financial mutation audit.

`plan_inbox_candidate()` currently checks, in order, already-approved candidates, exact source external IDs, provenance fingerprints, earlier candidate fingerprints, transfer suspicion and required account/category fields. It does **not** search existing non-deleted ledger transactions that have no import provenance. Therefore a later import can still duplicate an earlier manually-created fact.

`approve_inbox_candidate()` always creates a new ledger transaction when review proceeds. `transaction_import_provenance.transaction_id` is currently unique/primary, so this slice can attach the first source evidence to an unprovenanced manual transaction but deliberately does not redesign provenance into a one-to-many evidence model.

`update_money_transaction()` and entry mutations are audited structurally. That makes the safest correction-precedence rule simple and testable: the new source-link operation must not update the existing transaction or entries at all.

The Inbox review panel already supports an explicit heuristic-duplicate override. It does not currently run the server dry-run when a review opens, so this slice can add a small plan state and one explicit link action without redesigning Inbox.

## Research

Actual Budget's current import documentation allows a manually-entered transaction to be matched by a later import. Its import API also makes deleted-reimport behavior explicit. These are useful contract lessons: reconcile later evidence instead of blindly duplicating, and make deletion behavior deliberate.

MoneyFlow intentionally does **not** adopt Actual's imported-data precedence. Source evidence in this slice cannot overwrite a user's amount, date, note, account, category, review state or reconciliation state.

Firefly III Data Importer history repeatedly documents duplicate failures when source identity/data handling changes. The applicable lesson is conservative identity and explicit review, not copying provider-specific heuristics.

External references are design evidence only. Current MoneyFlow code/tests and #432 remain authority.

## Specification

### Match planning

After existing exact source/provenance checks and before returning `would_create`, a pending income/expense candidate with an owned account may look for existing ledger facts that:

- belong to the same user;
- are not soft-deleted;
- are income/expense, never transfer;
- have the same kind and date;
- contain exactly the same signed amount on the candidate account;
- have no `transaction_import_provenance` row.

If exactly one eligible fact exists, dry-run returns `duplicate` with reason `manual_transaction_match`, a bounded confidence below exact identity, and `matched_transaction_id`.

If more than one eligible fact exists, dry-run returns a duplicate/review state with reason `manual_transaction_ambiguous` and no target ID. It must never choose one by row order.

Exact source external ID remains stronger than any manual match. Existing provenance/fingerprint duplicate logic remains ahead of this fallback.

### Explicit source-link operation

Add one authenticated SECURITY DEFINER operation that takes candidate ID + reviewed existing transaction ID. It must:

1. derive `auth.uid()` and lock the candidate;
2. be replay-safe when the candidate is already linked to the same transaction;
3. reject another tenant, deleted target, transfer target, already-provenanced target or a target not equal to the current unique `manual_transaction_match` plan;
4. write `transaction_import_provenance` using the candidate source evidence and match reason/confidence;
5. mark the candidate approved and link `approved_transaction_id`;
6. leave the target transaction and every entry unchanged;
7. leave reconciliation state unchanged;
8. never restore a deleted transaction or fabricate a source external ID.

### UX

For authenticated review only, load the server plan for the open candidate. When it is a unique manual match, show a calm explicit option to attach source evidence to that existing transaction. The UI must state that MoneyFlow will keep the existing ledger values unchanged.

The existing “Vẫn ghi sổ” duplicate override remains the route to intentionally keep a separate transaction. Ambiguous matches get no attach button.

Demo remains local and makes no server-provenance claim.

### Deferred boundary

The current provenance table permits one provenance row per ledger transaction. Supporting multiple independent source observations/source updates for one fact is a later P1 decision and must not be smuggled into this slice.

## Implementation plan

1. Add counterexample-first pgTAP for unique manual match, ambiguity, deletion, already-provenanced facts, tenant isolation, replay and unchanged ledger/reconciliation state.
2. Add a migration that extends `plan_inbox_candidate()` conservatively and adds the reviewed source-link RPC with least privilege.
3. Update migration identity and SECURITY DEFINER inventory contracts without weakening them.
4. Extend `InboxDryRunResult` user messaging only for the new reasons.
5. Add a server action for the link operation and read back the existing transaction after success.
6. Add review-plan state to authenticated Inbox and expose one explicit attach-source action; keep the existing separate-transaction override.
7. Add unit/static/UI safety tests around copy and decision routing.
8. Run exact-head Class 3 CI: knowledge/policy, lint/typecheck/build, unit/static RLS, fresh Supabase + pgTAP, browser/auth ownership, cross-device UI/e2e, CodeQL and secret history.
9. Independent review must challenge false merges, stale plans/races, correction overwrite, reconciliation mutation, tenant leakage and retry ambiguity.

Rollback: revert this slice. Existing candidate approval and #435 Direct CSV atomic path remain available.

## Tasks

| ID | Task | Status |
|---|---|---|
| 436.1 | reconcile #434 lifecycle and inspect current main | done |
| 436.2 | research manual→later-import reconciliation behavior | done |
| 436.3 | persist issue/branch/packet/board authority | implementing |
| 436.4 | add DB match/link contract + counterexample pgTAP | pending |
| 436.5 | add authenticated server action | pending |
| 436.6 | add explicit Inbox review decision | pending |
| 436.7 | unit/static/UI safety coverage | pending |
| 436.8 | exact-head Class 3 verification | pending |
| 436.9 | independent evaluation/fixes | pending |
| 436.10 | owner merge handoff | pending |

## Evaluation

Acceptance requires one final exact head proving:

- one unique eligible unprovenanced manual transaction is surfaced as reviewable `manual_transaction_match`;
- multiple same-account/date/amount eligible facts are ambiguous and never auto-selected;
- exact source-ID duplicates remain hard duplicates;
- deleted, transfer, cross-tenant and already-provenanced facts cannot be linked;
- explicit link creates provenance and candidate approval linkage but no second financial transaction;
- replay returns the same transaction and creates no second provenance row;
- transaction kind/date/note/review/deletion state and entry account/category/amount/reconciliation state are unchanged by linking;
- no provider/native/AI capability is claimed;
- risk-selected exact-head CI, database/security/browser and security scans are green before owner merge decision.

If safe linking requires overwriting user data or guessing among multiple targets, stop and leave the candidate unresolved instead.