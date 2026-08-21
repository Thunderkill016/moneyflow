# #436 — Reconcile manual transactions with later source evidence

**Status:** active
**Execution state:** evaluating
**Change class:** Class 3 — financial import/reconciliation boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/436-manual-import-reconciliation`
**Base:** `main@38ae8f8694554d8d69508f86bcc66b2bdfe68b95`
**Owner:** human owner

## Outcome

When a user already recorded a digital income/expense and later source evidence for the same event arrives, MoneyFlow can attach that evidence to the reviewed existing ledger fact instead of creating a duplicate. Linking source evidence must never silently rewrite the existing fact or its reconciliation state.

This is the second bounded P1 slice after #434/#435. It does not add a provider or broaden fuzzy matching.

## Repository reconnaissance

Current main after #435 already has a neutral persisted acquisition foundation: import batches, candidates, source/external identity, versioned fingerprints, match status/reason/confidence, transaction provenance, atomic candidate approval, deterministic rules, reconciliation and privacy-safe financial mutation audit.

`plan_inbox_candidate()` checks prior imported provenance/candidates but, before this slice, did not search existing non-deleted ledger transactions that had no import provenance. Therefore later import evidence could still duplicate an earlier user-created fact.

`approve_inbox_candidate()` creates a new ledger transaction when review proceeds. `transaction_import_provenance.transaction_id` is currently unique/primary, so this slice can attach the first source evidence to an unprovenanced existing transaction but deliberately does not redesign provenance into a one-to-many evidence model.

`update_money_transaction()` and entry mutations are audited structurally. The correction-precedence rule is therefore simple and testable: the source-link operation must not update the existing transaction or entries at all.

The Inbox review panel already supported an explicit heuristic-duplicate override. #436 adds a small authenticated server-plan state and explicit link action without redesigning Inbox.

## Research

Actual Budget's current import documentation allows a manually-entered transaction to be matched by a later import. Its import API also makes deleted-reimport behavior explicit. These are useful contract lessons: reconcile later evidence instead of blindly duplicating, and make deletion behavior deliberate.

MoneyFlow intentionally does **not** adopt imported-data precedence. Source evidence in this slice cannot overwrite a user's amount, date, note, account, category, review state or reconciliation state.

Firefly III Data Importer history repeatedly documents duplicate failures when source identity/data handling changes. The applicable lesson is conservative identity and explicit review, not copying provider-specific heuristics.

Independent concurrency review against current PostgreSQL locking/isolation semantics also constrains this slice: the reviewed target row is locked and the match is recomputed before provenance insert, but a row lock is not a predicate lock against a brand-new matching transaction inserted after that final recheck. Because #436 is an explicit human-reviewed attach action and never auto-links or overwrites ledger data, that residual race is accepted for this bounded slice. Any future automatic attachment requires a stronger concurrency/idempotency contract rather than reusing this fallback as-is.

External references are design evidence only. Current MoneyFlow code/tests and #432 remain authority.

## Specification

### Match planning

After existing exact source/provenance checks, a pending non-manual income/expense candidate with an owned account may look for existing ledger facts that:

- belong to the same user;
- are not soft-deleted;
- are income/expense, never transfer;
- have the same kind and date;
- contain one entry with exactly the same signed amount on the candidate account;
- have no `transaction_import_provenance` row;
- were not already approved from an Inbox candidate;
- are not recurring-generated or split facts.

If exactly one eligible fact exists, dry-run returns `duplicate` with reason `existing_transaction_match`, confidence `0.7`, and `matched_transaction_id`.

If more than one eligible fact exists, dry-run returns `duplicate` with reason `existing_transaction_ambiguous`, confidence `0.4`, and no target ID. It must never choose one by row order.

Exact source external ID and existing provenance/fingerprint matching remain stronger than this fallback.

### Explicit source-link operation

`attach_inbox_candidate_to_existing_transaction(candidate_id, transaction_id)` must:

1. derive `auth.uid()` and lock the candidate;
2. be replay-safe when the candidate is already linked to the same transaction;
3. reject another tenant, deleted target, transfer target, already-provenanced target or a target not equal to the current unique `existing_transaction_match` plan;
4. lock the reviewed target and recompute the narrow match before writing evidence;
5. write `transaction_import_provenance` using candidate source evidence and the reviewed match reason/confidence;
6. mark the candidate approved and link `approved_transaction_id`;
7. leave the target transaction and every entry unchanged;
8. leave reconciliation state unchanged;
9. never restore a deleted transaction or fabricate a source external ID.

### UX

Authenticated review loads the server plan only for persisted UUID candidates. A unique existing match shows **“Gắn nguồn, giữ nguyên sổ”** and explicitly states that ledger and reconciliation values stay unchanged and form edits are not applied by the attach action.

The existing duplicate override remains the route to intentionally create a separate transaction. Ambiguous matches show a warning but no attach button. Server-plan state is keyed by candidate identity so a prior candidate's match cannot leak into the next review. Demo IDs remain local and make no server-provenance claim.

### Deferred boundary

The current provenance table permits one provenance row per ledger transaction. Supporting multiple independent source observations/source updates for one fact is a later P1 decision and must not be smuggled into this slice.

Automatic source attachment is also deferred. The explicit review fallback in #436 is not an auto-merge primitive and must not be promoted to one without a stronger concurrency contract.

## Implementation plan

1. Add counterexample-first pgTAP for unique existing match, ambiguity, deletion, already-provenanced facts, tenant isolation, replay and unchanged ledger/reconciliation state.
2. Add a migration that extends `plan_inbox_candidate()` conservatively and adds the reviewed source-link RPC with least privilege.
3. Update migration identity and SECURITY DEFINER inventory contracts without weakening them.
4. Extend `InboxDryRunResult` user messaging only for the new reasons.
5. Add a server action for the link operation and read back the existing transaction after success.
6. Add authenticated review-plan state and one explicit attach-source action; keep the existing separate-transaction override.
7. Add unit/static/UI safety tests around copy and decision routing.
8. Run exact-head Class 3 CI: knowledge/policy, lint/typecheck/build, unit/static RLS, fresh Supabase + pgTAP, browser/auth ownership, cross-device UI/e2e, CodeQL and secret history.
9. Independent review must challenge false merges, stale plans/races, correction overwrite, reconciliation mutation, tenant leakage and retry ambiguity.

Rollback: revert this slice. Existing candidate approval and #435 Direct CSV atomic path remain available.

## Tasks

| ID | Task | Status |
|---|---|---|
| 436.1 | reconcile #434 lifecycle and inspect current main | done |
| 436.2 | research manual→later-import reconciliation behavior | done |
| 436.3 | persist issue/branch/packet/board authority | done |
| 436.4 | add DB match/link contract + counterexample pgTAP | done |
| 436.5 | add authenticated server action | done |
| 436.6 | add explicit Inbox review decision | done |
| 436.7 | unit/static/UI safety coverage | done |
| 436.8 | exact-head Class 3 verification | evaluating |
| 436.9 | independent evaluation/fixes | evaluating |
| 436.10 | owner merge handoff | pending |

## Evaluation

Acceptance requires one final exact head proving:

- one unique eligible unprovenanced existing transaction is surfaced as reviewable `existing_transaction_match`;
- multiple same-account/date/amount eligible facts are ambiguous and never auto-selected;
- exact source-ID duplicates remain hard duplicates;
- deleted, transfer, cross-tenant and already-provenanced facts cannot be linked;
- explicit link creates provenance and candidate approval linkage but no second financial transaction;
- replay returns the same transaction and creates no second provenance row;
- transaction kind/date/note/review/deletion state and entry account/category/amount/reconciliation state are unchanged by linking;
- keyed UI plan state cannot expose a stale previous-candidate target;
- no provider/native/AI capability is claimed;
- risk-selected exact-head CI, database/security/browser and security scans are green before owner merge decision.

Independent review found no silent ledger overwrite or tenant-leak path in the implemented boundary. The remaining concurrency limitation is intentionally bounded to explicit human review; it is a blocker for future automatic attachment, not for this review-only slice.

If safe linking requires overwriting user data or guessing among multiple targets, stop and leave the candidate unresolved instead.
