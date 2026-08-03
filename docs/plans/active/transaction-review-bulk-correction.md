# Transaction review and bounded bulk correction

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #254 / #255
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A MoneyFlow user can distinguish transactions that still need checking from reviewed ledger rows, filter and select rows, update review state together and apply one safe category correction to an eligible same-kind group. Demo and authenticated modes preserve amounts, dates, accounts, transfer neutrality, split totals and recurring ownership.

## Repository reconnaissance

### Current behavior

- `/transactions` owns URL-backed filters, row selection and bounded correction.
- `/timeline` is a reviewed-only reading surface and must not expose review mutation controls.
- `useTransactions` remains the single demo/authenticated mutation owner.
- Authenticated writes use validated Server Actions and ownership-safe PostgreSQL RPCs.
- Split rows are multi-entry, recurring rows are lifecycle-owned elsewhere and transfers have balanced two-entry semantics.

### Relevant repository areas

| Area | Responsibility |
|---|---|
| `src/lib/transactions/contracts.ts` | neutral review and bulk input contracts |
| `src/lib/transaction-review.ts` | pure eligibility and demo mutation rules |
| `src/server/finance.ts` | transaction/review companion reads and schema-skew fallback |
| `src/app/actions/transaction-review.ts` | validated authenticated mutation entry |
| `src/hooks/use-transactions.ts` | demo/authenticated orchestration and local reconciliation |
| `src/components/transactions-page.tsx` | filter, selection and bulk UX |
| `supabase/migrations/20260803090000_transaction_review_bulk_correction.sql` | persisted state, view and atomic RPCs |
| `supabase/tests/database/transaction_review_bulk_correction.test.sql` | ownership, atomicity and money invariants |
| `e2e/transaction-review-bulk-correction.spec.ts` | user-flow and timeline-boundary evidence |

### Existing tests and constraints

- Unit/source contracts cover transaction filtering, optimistic mutations, split invariants and list windowing.
- Database suites cover transfer neutrality, split totals, RLS, SECURITY DEFINER functions and two-tenant attacks.
- Browser suites cover the expense path, responsive states and the focused review/correction flow.
- Product rules require integer VND, no guessed money, recoverable deletion, practical controls and calm errors.

### Open questions resolved

- [x] Existing and newly created rows default to `reviewed`; no uncertain history is invented.
- [x] Review state applies to the logical transaction and stays orthogonal to settlement/reconciliation.
- [x] Category correction is restricted to ordinary non-recurring, non-transfer, non-split rows of one kind.
- [x] Stable `transaction_feed` remains unchanged; a companion security-invoker view handles review state.
- [x] Missing/malformed review contracts disable the feature without producing a false-empty ledger.

## Research

No external research was required. The decision is bounded by current MoneyFlow code, tests, architecture and retained project memory. No dependency, provider, standard or product-identity decision is introduced.

### Adoption review

Not applicable. No dependency, service, framework or architecture layer is added.

## Specification

### Problem

Users can correct one transaction at a time but cannot record what still needs checking or safely fix the same category error across several rows. Repetitive correction increases friction and makes ledger quality hard to assess.

### User stories

- Mark transactions as needing review or reviewed.
- Filter to rows needing review without losing other filters.
- Select visible rows and update review state together.
- Atomically assign one category to eligible same-kind transactions.

### Acceptance criteria

- [x] Review state round-trips through the companion database view and demo storage.
- [x] Existing and new rows default to `reviewed`.
- [x] Review filtering composes with search/kind/account/category/date/amount and URL state.
- [x] Rows expose named checkboxes and non-color-only review labels.
- [x] Bulk review accepts 1–100 unique owned active IDs and changes only that exact set atomically.
- [x] Bulk category correction accepts only active, ordinary, same-kind income/expense rows.
- [x] Missing, archived, cross-tenant and wrong-kind categories are rejected before any write.
- [x] Transfer, recurring and split rows cannot be category-corrected in bulk.
- [x] Existing create/edit/delete/restore/transfer/split behavior remains green.
- [x] `/timeline` remains reviewed-only and exposes no reset path that can remove that boundary.
- [ ] Owner accepts the feature and explicitly authorizes merge.
- [ ] Production migration and authenticated production smoke receive separate explicit approval.

### Required states

- Loading: controls disable during mutation.
- Empty: no-match review filters use the existing filtered-empty state.
- Populated: labels, checkboxes and bulk bar remain readable on phone and desktop.
- Validation/error: ineligible selections explain why category correction is unavailable; failures preserve selection.
- Recovery/undo: restored rows preserve their prior review state.
- Accessibility: checkbox labels name the transaction; status is text, not color alone.

### Financial and security constraints

- No amount, date, account, note, sign or transfer-entry mutation.
- Integer VND, exact split totals and transfer balance remain unchanged.
- RPCs derive `auth.uid()`, lock an exact deterministic set and reject partial/cross-tenant sets.
- The destination category is ownership-checked, active, kind-compatible and row-locked through the write.
- Browser roles receive only intended execute/select grants, not direct table-update authority.

### Out of scope

- Bulk amount/date/account/note edits.
- Transfer, recurring or split category correction.
- Split-line editing.
- Clearing/reconciliation sessions.
- Import rules, bank sync, AI, OCR or background jobs.

## Implementation plan

### Architecture fit

`financial_transactions.review_status` owns logical-transaction review state. `transaction_review_feed` remains a small security-invoker companion view. The full workspace reads both feeds in the same deterministic order so PostgREST row limits cannot silently pair different slices. `useTransactions` owns local reconciliation; Server Actions validate public inputs; RPCs own atomic eligibility and tenant enforcement.

### Implemented changes

| File/area | Change |
|---|---|
| contracts/domain | review status, inputs, eligibility and apply helpers |
| migration | enum/status, active index, ordered companion view fields, two RPCs/grants |
| pgTAP | defaults, RLS, exact-set atomicity and financial guards |
| server/actions | safe companion merge and validated mutations |
| hook/store | legacy normalization, demo parity and review-preserving restore |
| page/CSS | URL filter, named selection, responsive bulk bar and immutable timeline boundary |
| unit/browser | domain/filter tests and focused Chromium/WebKit coverage |

### Data and migration impact

- Adds `transaction_review_status` and non-null `financial_transactions.review_status default 'reviewed'`.
- Adds a partial active review index.
- Adds a security-invoker companion view with ordering keys.
- Adds `set_transaction_review_status_bulk` and `bulk_update_transaction_category`.
- Existing rows receive `reviewed`; no financial value changes.
- App rollback is safe while additive objects remain. Removing database objects requires a separate owner-approved migration.

### Risks and controls

| Risk | Control/evidence |
|---|---|
| Cross-tenant/missing ID | exact lock/count plus two-user pgTAP |
| Duplicate/null/oversized set | public validation plus RPC rejection |
| Mixed income/expense | one-kind validation before update |
| Split/transfer/recurring corruption | structural guards plus pgTAP |
| Category archived during write | owned category lookup with row lock |
| Partial write | validate all rows before one update statement |
| Companion feed pagination mismatch | identical deterministic order and tie-break keys |
| Timeline leaks needs-review rows | reviewed-only initial state, hidden reset paths and Playwright assertion |
| Undo changes review status | restored snapshot status explicitly preserved |

### Verification plan

- Static: diff hygiene, knowledge, CI policy, deployment, CSS ownership, architecture, lint, typecheck and build.
- Unit: defaults, eligibility, category application and URL filter composition.
- Database: fresh reset plus focused pgTAP for view/RPC/RLS/atomic guards and invariant preservation.
- Browser: demo review/filter/correction, blocked mixed selection and reviewed-only timeline on Chromium/WebKit.
- Production: only after explicit owner merge and migration approval; no production write in current scope.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Issue, packet and contracts | #254, #255, domain tests | done |
| T2 | Migration and pgTAP | fresh reset and focused assertions | done |
| T3 | Authenticated/demo adapters | type/unit checks | done |
| T4 | Filter, selection and bulk UI | focused browser suite | done |
| T5 | Independent diff evaluation and remediation | findings below | done |
| T6 | Final exact-head gates and owner decision | final CI + owner instruction | doing |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | human_owner | implementer | implementing | owner instruction, issue #254, PR #255 | implementation incomplete | implement bounded slice |
| 2026-08-03 | implementer | evaluator | evaluating | head `ea7fa45`, prior green gates | no independent review | inspect migration, actions, read path, hook, UI and tests |
| 2026-08-03 | evaluator | implementer | implementing | four concrete review findings | timeline/restore/feed/category races | remediate on feature branch |
| 2026-08-03 | implementer | evaluator | evaluating | code head `5f1c26`; CI #1276 verify/database/browser smoke green; CodeQL/secret #418 green | final documentation head gates pending | run exact-head checks, then owner review |

### Current permission boundary

- Granted: focused branch writes, issue/PR updates and repository checks.
- Resource: `Thunderkill016/moneyflow`; GitHub only.
- Forbidden: `main`, production schema/data/provider settings, workflows and branch protection.
- Human approval required before merge, production migration, production-data smoke or release claim.

## Evaluation

### Independent review findings

1. **Timeline boundary — fixed.** The generic reset action could remove `reviewed` and reveal needs-review rows on `/timeline`. Timeline now hides every reset path and the focused browser test asserts it.
2. **Restore state — fixed.** The server feed omits review state, so undo could display a restored needs-review row as reviewed until reload. The hook now preserves the deleted snapshot's review status.
3. **Companion-feed alignment — fixed.** Unordered parallel feeds could return different slices under row limits. Both now use `occurred_on`, `created_at` and `id` in identical descending order.
4. **Category race — fixed.** The category could be archived between validation and entry update. The RPC holds a share lock on the owned category through the transaction.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| domain and filter rules | unit/static suite | pass on code head `5f1c26` |
| ownership and financial invariants | fresh reset + pgTAP | pass on CI #1276 |
| build and architecture | verify job | pass on CI #1276 |
| focused browser flow | Chromium/WebKit smoke | pass on CI #1276 code head |
| security analysis | CodeQL #418 + secret scan #418 | pass |
| final documentation head | exact-head rerun after this update | pending |

### Remaining limitations

- Split-line editing, clearing/reconciliation, merchant/tag seams and mutation audit remain separate Stage 1 work.
- No production migration has been applied and no production-user flow has been exercised.

## Delivery record

- Branch: `feat/transaction-review-bulk-correction`
- PR: #255
- Squash commit: not merged
- Final CI run: pending after evaluation-record update
- Production deployment: not authorized
- Production flow verified: no
- Work packet moved to `docs/plans/completed/`: no
