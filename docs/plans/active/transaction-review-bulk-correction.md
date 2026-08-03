# Transaction review and bounded bulk correction

**Status:** ready_for_owner_review
**Execution state:** verified_candidate
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #254 / #255
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A MoneyFlow user can distinguish transactions that still need checking from reviewed ledger rows, select multiple visible transactions, update their review state together and apply one safe category correction to an eligible same-kind group. Demo and authenticated modes preserve amounts, dates, accounts, transfer neutrality, split totals and recurring ownership.

## Repository reconnaissance

### Current behavior

- `/transactions` owns URL-backed query, kind, account, category, review, date and amount filters plus single-row correction.
- `useTransactions` owns authenticated/demo mutation orchestration.
- Authenticated writes use validated Server Actions and ownership-safe PostgreSQL RPCs; demo writes use browser storage.
- Split rows are multi-entry, recurring rows are lifecycle-owned elsewhere and transfers have balanced two-entry semantics.
- Current project memory lists review state, bounded bulk correction and split-line editing as post-MVP gaps. This packet owns the first two only.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `src/lib/transactions/contracts.ts` | neutral contracts | review and bulk inputs |
| `src/lib/transaction-review.ts` | shared eligibility and demo mutation rules | pure domain owner |
| `src/server/finance.ts` | authenticated workspace reads | companion review feed with exact-ID safe fallback |
| `src/app/actions/transaction-review.ts` | public authenticated mutation entry | bounded Server Actions |
| `src/hooks/use-transactions.ts` | one client mutation owner | demo/authenticated parity |
| `src/components/transactions-page.tsx` | ledger filters and correction flow | review filter, selection and bulk actions |
| `supabase/migrations/` | schema and write authority | additive status, companion view and atomic RPCs |
| `supabase/tests/database/` | money and tenant invariants | focused pgTAP |
| `e2e/` | phone/desktop flow evidence | focused demo smoke and timeline boundary |

### Existing tests and constraints

- Unit/source contracts cover transaction filtering, optimistic mutations, split invariants and list windowing.
- Database suites cover transfer neutrality, split totals, RLS, security-definer functions and two-tenant attacks.
- Browser suites cover the expense path, range filters and responsive route states.
- Product rules require integer VND, no guessed money, recoverable deletion, practical 44px controls and calm actionable errors.

### Similar implementation and recent history

- Reuse `useTransactions` demo/authenticated branching and Server Action → RPC patterns.
- PR #234 explicitly deferred review state and bulk correction.
- PR #183 demonstrates atomic review-resolution writes; PR #222 demonstrates row locking and financial correction guards.

### Resolved questions

- [x] Existing and newly created rows default to `reviewed`; no uncertain history is invented.
- [x] Review state applies to the logical transaction, including transfer/split/recurring rows.
- [x] Category correction is restricted to ordinary non-recurring, non-transfer, non-split rows of one kind.
- [x] Selection is intersected with the current filtered result so hidden rows cannot be mutated accidentally.
- [x] Stable `transaction_feed` is not changed. A companion `transaction_review_feed` avoids false-empty ledgers during app/database version skew.
- [x] Timeline always retains the reviewed-only boundary, including after clearing user filters.
- [x] Review state is read for the exact transaction IDs in the loaded ledger rather than relying on an independently capped feed.
- [x] Category rows are locked before validation/update so archive/kind changes cannot race the bulk mutation.

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

- [x] Review state round-trips through the companion database view and demo storage.
- [x] Existing and new rows default to `reviewed`.
- [x] Review filtering composes with search/kind/account/category/date/amount and URL state.
- [x] Rows expose named checkboxes and non-color-only review labels.
- [x] Select-visible and clear-selection never keep hidden filtered IDs.
- [x] Bulk review accepts 1–100 unique owned active IDs and changes only that exact set atomically.
- [x] Bulk category correction accepts 1–100 unique IDs only when all rows are active, non-recurring, non-transfer, non-split and one income/expense kind.
- [x] Missing, archived, cross-tenant and wrong-kind categories are rejected before any write.
- [x] Demo and authenticated paths produce the same visible result.
- [x] Existing create/edit/delete/restore/transfer/split behavior remains green.

### Required states

- Loading: bulk controls disable during mutation.
- Empty: no-match review filter uses the existing filtered-empty state.
- Populated: labels, checkboxes and bulk bar remain readable on phone and desktop.
- Validation/error: ineligible selections explain why category correction is unavailable; failures preserve selection.
- Recovery/undo: bulk writes require explicit action; delete undo preserves the transaction's review state.
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

## Implementation record

### Architecture fit

`financial_transactions.review_status` owns logical-transaction review state. The stable `transaction_feed` remains unchanged. `transaction_review_feed` is a small security-invoker companion view read only by the full transaction workspace. A missing/malformed companion view disables the feature without hiding the ledger. `useTransactions` remains the single client owner; Server Actions validate public inputs; PostgreSQL RPCs own atomic eligibility and tenant enforcement.

### Data and migration impact

- Add enum `transaction_review_status` and non-null `financial_transactions.review_status default 'reviewed'`.
- Add partial active review index.
- Add `transaction_review_feed(id,user_id,review_status)` with `security_invoker=true`.
- Add `set_transaction_review_status_bulk(uuid[], transaction_review_status)` and `bulk_update_transaction_category(uuid[], uuid)`.
- Existing rows receive `reviewed` through the additive default; no financial value changes.
- App rollback is safe while the additive database objects remain. Removing them requires a separate owner-approved migration.

### Independent evaluation findings fixed

| Finding | Fix | Evidence |
|---|---|---|
| Timeline could clear its reviewed-only semantic filter | Timeline now passes a locked review boundary and clearing filters restores `reviewed` | focused Playwright timeline assertions |
| Restore fallback could display the wrong review state | authenticated restore preserves the existing snapshot state when no row is returned | unit/static regression path |
| Independent review feed could omit loaded rows at API row limits | review query is restricted to the exact loaded transaction IDs | server loader implementation and type/unit checks |
| Category archive/kind could race validation | owned category row is locked before category validation and entry update | fresh reset and focused pgTAP |

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Cross-tenant or missing ID in a set | exact row lock/count and two-user pgTAP |
| Duplicate/null/oversized IDs | app normalization plus RPC rejection |
| Mixed income/expense | validate one kind before update |
| Split loses line meaning | require exactly one categorized entry |
| Transfer or recurring row corrected | explicit guards and pgTAP |
| Archived/wrong-kind/cross-tenant category | owned row lock, active lookup and kind check |
| Partial write | validate all rows before one update statement |
| Hidden filtered row remains selected | selection state is keyed by the complete filter state |
| Missing migration hides ledger | companion-view fallback disables feature only |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Issue, packet and contracts | #254, #255, domain tests | done |
| T2 | Migration and pgTAP | fresh reset and focused assertions | done |
| T3 | Authenticated/demo adapters | type/unit checks | done |
| T4 | Filter, selection and bulk UI | Chromium/WebKit Playwright | done |
| T5 | Independent evaluation and exact-head gates | CI #1278, CodeQL #420, secret scan #420 | done; final UI-audit aggregation pending at last observation |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | human_owner | implementer | implementing | owner instruction, issue #254, PR #255 | exact-head gates incomplete | implement and evaluate on branch |
| 2026-08-03 | implementer | evaluator | evaluating | branch implementation and focused tests | independent findings | fix timeline, restore, feed and category-race findings |
| 2026-08-03 | evaluator | human_owner | ready_for_owner_review | head `d074ba5`; verify/database/CodeQL/secret green; browser smoke green | final CI UI-audit aggregation and owner merge decision | observe final gate, then owner may approve merge |

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
| domain and filter rules | `src/lib/transaction-review.test.ts`, `src/lib/transaction-filters.test.ts` | passed in CI #1278 verify |
| database invariants | fresh local reset and focused pgTAP | passed in CI #1278 database |
| user flow and timeline boundary | `e2e/transaction-review-bulk-correction.spec.ts` in Chromium/WebKit suite | browser smoke passed; final cross-device audit aggregation pending at last observation |
| security scanning | CodeQL #420 and secret-history scan #420 | passed |

### Review findings

- Correctness: no unresolved finding after the four documented fixes.
- Security/ownership: exact tenant-bound locks, RPC grants and fresh pgTAP are green.
- UI/UX/accessibility: named controls, text status and responsive wrapping are covered; final UI-audit job remains the last external gate at the time of this record.
- Maintainability/duplication: one pure domain helper and one client mutation owner.
- Scope compliance: split/reconciliation and broader bulk editing remain excluded.

### Remaining limitations

- Split-line editing, broader bulk correction and reconciliation remain separate work.
- No production migration, authenticated production write or physical-device evidence is claimed by this PR.

## Delivery record

- Branch: `feat/transaction-review-bulk-correction`
- PR: #255
- Candidate head: `d074ba5cafa997c0727cb27681bf26a97a8de51b`
- CI: #1278 (verify and database passed; UI-audit aggregation pending at last observation)
- CodeQL: #420 passed
- Secret history: #420 passed
- Squash commit: pending owner merge
- Production deployment: not authorized
- Production flow verified: pending owner-approved post-merge smoke
- Work packet moved to `docs/plans/completed/`: no
