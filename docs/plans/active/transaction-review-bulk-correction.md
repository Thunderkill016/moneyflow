# Transaction review and bounded bulk correction

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #254 / #255
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A MoneyFlow user can distinguish transactions that still need checking from reviewed ledger rows, select multiple visible transactions, update their review state together and apply one safe category correction to an eligible same-kind group. Demo and authenticated modes must preserve amounts, dates, accounts, transfer neutrality, split totals and recurring ownership.

## Repository reconnaissance

### Current behavior

- `/transactions` owns URL-backed query, kind, account, category, date and amount filters plus single-row correction.
- `useTransactions` owns authenticated/demo mutation orchestration.
- Authenticated writes use validated Server Actions and ownership-safe PostgreSQL RPCs; demo writes use browser storage.
- Split rows are multi-entry, recurring rows are lifecycle-owned elsewhere and transfers have balanced two-entry semantics.
- Current project memory lists review state, bounded bulk correction and split-line editing as post-MVP gaps. This packet owns the first two only.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `src/lib/transactions/contracts.ts` | neutral contracts | extend with review and bulk inputs |
| `src/lib/transaction-review.ts` | shared eligibility and demo mutation rules | new pure domain owner |
| `src/server/finance.ts` | authenticated workspace reads | merge a companion review feed with safe fallback |
| `src/app/actions/transaction-review.ts` | public authenticated mutation entry | new bounded Server Actions |
| `src/hooks/use-transactions.ts` | one client mutation owner | add demo/authenticated parity |
| `src/components/transactions-page.tsx` | ledger filters and correction flow | add review filter, selection and bulk actions |
| `supabase/migrations/` | schema and write authority | additive status, companion view and atomic RPCs |
| `supabase/tests/database/` | money and tenant invariants | focused pgTAP |
| `e2e/` | phone/desktop flow evidence | focused demo smoke |

### Existing tests and constraints

- Unit/source contracts cover transaction filtering, optimistic mutations, split invariants and list windowing.
- Database suites cover transfer neutrality, split totals, RLS, security-definer functions and two-tenant attacks.
- Browser suites cover the expense path, range filters and responsive route states.
- Product rules require integer VND, no guessed money, recoverable deletion, practical 44px controls and calm actionable errors.

### Similar implementation and recent history

- Reuse `useTransactions` demo/authenticated branching and Server Action → RPC patterns.
- PR #234 explicitly deferred review state and bulk correction.
- PR #183 demonstrates atomic review-resolution writes; PR #222 demonstrates row locking and financial correction guards.

### Open questions

- [x] Existing and newly created rows default to `reviewed`; no uncertain history is invented.
- [x] Review state applies to the logical transaction, including transfer/split/recurring rows.
- [x] Category correction is restricted to ordinary non-recurring, non-transfer, non-split rows of one kind.
- [x] Selection is intersected with the current filtered result so hidden rows cannot be mutated accidentally.
- [x] Stable `transaction_feed` is not changed. A companion `transaction_review_feed` avoids false-empty ledgers during app/database version skew.

## Research

Not required. The decision is bounded by current MoneyFlow code, tests, architecture and retained project memory. No external provider, dependency, standard or product-identity decision is introduced.

### Adoption review

Not applicable. No dependency, service, framework or architecture layer is added.

## Specification

### Problem

Users can correct one transaction at a time but cannot record what still needs checking or safely fix the same category error across several rows. Repetitive correction increases friction and makes ledger quality hard to assess.

### User stories

- As a ledger user, I can mark transactions as needing review or reviewed.
- As a ledger user, I can filter to rows needing review without losing other filters.
- As a ledger user, I can select the rows currently visible and update review state together.
- As a ledger user, I can atomically assign one category to eligible same-kind transactions.

### Acceptance criteria

- [ ] Review state round-trips through the companion database view and demo storage.
- [ ] Existing and new rows default to `reviewed`.
- [ ] Review filtering composes with search/kind/account/category/date/amount and URL state.
- [ ] Rows expose named checkboxes and non-color-only review labels.
- [ ] Select-visible and clear-selection never keep hidden filtered IDs.
- [ ] Bulk review accepts 1–100 unique owned active IDs and changes only that exact set atomically.
- [ ] Bulk category correction accepts 1–100 unique IDs only when all rows are active, non-recurring, non-transfer, non-split and one income/expense kind.
- [ ] Missing, archived, cross-tenant and wrong-kind categories are rejected before any write.
- [ ] Demo and authenticated paths produce the same visible result.
- [ ] Existing create/edit/delete/restore/transfer/split behavior remains green.

### Required states

- Loading: bulk controls disable during mutation.
- Empty: no-match review filter uses the existing filtered-empty state.
- Populated: labels, checkboxes and bulk bar remain readable on phone and desktop.
- Validation/error: ineligible selections explain why category correction is unavailable; failures preserve selection.
- Recovery/undo: bulk writes require explicit action; existing delete undo remains unchanged.
- Long data / large VND: no clipping or horizontal overflow; amounts are never modified.
- Mobile/tablet/desktop: controls wrap and retain practical target sizes.
- Accessibility: checkbox labels name the transaction; status is text, not color alone.

### Financial and security constraints

- No amount, date, account or entry-sign mutation.
- Integer VND, exact split totals and transfer balance remain unchanged.
- RPCs derive `auth.uid()`, lock a deterministic exact set, validate every row/category and reject partial/cross-tenant sets.
- Browser roles receive execute/select only for intended RPC/view surfaces, not direct table update rights.

### Out of scope

- Bulk amount/date/account/note edits.
- Transfer, recurring or split category correction.
- Split-line editing.
- Reconciliation sessions or cleared/reconciled states.
- Import rules, bank sync, AI, OCR or background jobs.

## Implementation plan

### Architecture fit

`financial_transactions.review_status` owns logical-transaction review state. The stable `transaction_feed` remains unchanged. `transaction_review_feed` is a small security-invoker companion view read only by the full transaction workspace. A missing/malformed companion view disables the feature without hiding the ledger. `useTransactions` remains the single client owner; Server Actions validate public inputs; PostgreSQL RPCs own atomic eligibility and tenant enforcement.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| contracts/domain | review status, bulk inputs, pure eligibility/apply helpers | shared parity and testability |
| migration | enum/status column, active index, companion view, two RPCs/grants | persisted authority without feed skew |
| pgTAP | defaults, RLS, atomicity and financial guards | Class 3 evidence |
| server/actions | safe companion merge and validated mutations | authenticated adapter |
| hook/store | normalize legacy demo rows and apply bulk changes | demo/auth parity |
| page/CSS | URL filter, named selection and responsive bulk bar | usable flow |
| unit/browser | domain/filter tests and phone/desktop Playwright | regression proof |
| memory/PR | update only after verified candidate | truthful status |

### Data and migration impact

- Add enum `transaction_review_status` and non-null `financial_transactions.review_status default 'reviewed'`.
- Add partial active review index.
- Add `transaction_review_feed(id,user_id,review_status)` with `security_invoker=true`.
- Add `set_transaction_review_status_bulk(uuid[], transaction_review_status)` and `bulk_update_transaction_category(uuid[], uuid)`.
- Existing rows receive `reviewed` through the additive default; no financial value changes.
- App rollback is safe while the additive database objects remain. Removing them requires a separate owner-approved migration.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Cross-tenant or missing ID in a set | exact row lock/count and two-user pgTAP |
| Duplicate/null/oversized IDs | app normalization plus RPC rejection |
| Mixed income/expense | validate one kind before update |
| Split loses line meaning | require exactly one categorized entry |
| Transfer or recurring row corrected | explicit guards and pgTAP |
| Archived/wrong-kind/cross-tenant category | owned active lookup and kind check |
| Partial write | validate all rows before one update statement |
| Hidden filtered row remains selected | selection intersection with filtered IDs |
| Missing migration hides ledger | companion-view fallback disables feature only |

### Verification plan

- Static: diff hygiene, knowledge, CI policy, deployment, CSS ownership, architecture, lint, typecheck and build.
- Unit: review default, eligibility, category application and URL filter composition.
- Database: fresh reset plus focused pgTAP for default/view/RPC/RLS/atomic guards and invariant preservation.
- Browser: demo desktop/mobile review, filtering, valid category correction and blocked mixed selection.
- Responsive: no overflow and named practical-size controls.
- Production: after owner merge and migration approval, synthetic authenticated smoke only; no production write in agent scope.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Issue, packet and contracts | #254, #255, domain tests | done |
| T2 | Migration and pgTAP | fresh reset and focused assertions | in_progress |
| T3 | Authenticated/demo adapters | type/unit checks | in_progress |
| T4 | Filter, selection and bulk UI | desktop/mobile Playwright | in_progress |
| T5 | Evaluate diff, finalize memory and exact-head gates | CI/CodeQL/secret scan | todo |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | human_owner | implementer | implementing | owner instruction, issue #254, PR #255 | exact-head gates incomplete | fix CI findings on branch |

### Current permission boundary

- Granted: focused branch writes, issue/PR updates and repository checks.
- Resource: `Thunderkill016/moneyflow`; GitHub only.
- Forbidden: `main`, production schema/data/provider settings, workflows and branch protection.
- Human approval required before merge, production migration, production-data smoke or release claim.
- Stop if ownership cannot be proven atomically or scope requires split/reconciliation redesign.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| domain rules | `src/lib/transaction-review.test.ts` | pending CI |
| database invariants | focused pgTAP | pending fresh reset |
| user flow | focused Playwright desktop/mobile | pending CI |

### Research and adoption evidence

- Internal code/tests/policy remain sufficient for the selected design.
- Repository/browser evidence will not be described as provider or production proof.
- Adoption review: not applicable.

### Review findings

- Correctness: pending exact-head evaluation.
- Security/ownership: pending fresh database evidence.
- UI/UX/accessibility: pending browser evidence.
- Maintainability/duplication: one domain helper and one client mutation owner selected.
- Scope compliance: split/reconciliation and broader bulk editing remain excluded.

### Remaining limitations

- Split-line editing, broader bulk correction and reconciliation remain separate work.

## Delivery record

- Branch: `feat/transaction-review-bulk-correction`
- PR: #255
- Squash commit: pending
- CI run: pending
- Production deployment: not authorized
- Production flow verified: pending owner-approved post-merge smoke
- Work packet moved to `docs/plans/completed/`: no
