# Transaction review and bounded bulk correction

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** #254 / pending  
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A MoneyFlow user can distinguish transactions that still need checking from reviewed ledger rows, select multiple visible transactions, update their review state together and apply one safe category correction to an eligible same-kind group. The flow must work in demo and authenticated modes without changing amounts, dates, accounts, transfer neutrality, split totals or recurring ownership.

## Repository reconnaissance

### Current behavior

- `/transactions` loads the full ledger through `getFinanceWorkspace()` and presents single-row edit/delete with URL-backed filters.
- `useTransactions` is the shared client mutation owner for authenticated and demo transaction flows.
- Authenticated changes enter through validated Server Actions and ownership-safe PostgreSQL RPCs; demo changes persist through the browser transaction store.
- `Transaction` has no review field, the feed view exposes no review state and the UI has no multi-select or bulk correction surface.
- Split rows can only be deleted and recreated; recurring rows are locked; transfers have separate mutation semantics.
- Current project memory lists review state, bounded bulk correction and split-line editing as post-MVP transaction-depth gaps. This packet owns the first two only.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/transactions/contracts.ts` | neutral transaction and mutation contracts | extend with review and bulk inputs |
| `src/server/finance.ts` | authenticated workspace mapping and feed validation | include persisted review state |
| `src/app/actions/transactions.ts` | validated public mutation entrypoints | add bounded bulk actions |
| `src/hooks/use-transactions.ts` | one client orchestration owner for demo/authenticated | add demo parity and state reconciliation |
| `src/components/transactions-page.tsx` | existing ledger filters, rows and correction feedback | add review filter, selection and bulk bar |
| `src/components/transactions-page.module.css` | route-owned responsive UI | add scoped selection/status/bulk styles |
| `supabase/migrations/` | schema, view and ownership-safe RPC authority | additive review column + atomic bulk RPCs |
| `supabase/tests/database/` | financial and tenant invariants | add bulk mutation pgTAP |
| `e2e/` | desktop/mobile user-flow evidence | add focused review/bulk smoke |

### Existing tests and constraints

- Related unit tests: transaction filters, list windowing, split validation, optimistic transactions and source contracts.
- Database/RLS tests: finance invariants, two-tenant attacks, security-definer catalog and ownership constraints.
- Browser tests: expense path, range filters and cross-device transaction-route audits.
- Product/architecture rules: integer VND, balanced transfer neutrality, recoverable destruction, one mutation owner per runtime, no direct Supabase client in components, one primary action per viewport.

### Similar implementation and recent history

- Existing pattern to reuse: `useTransactions` demo/authenticated branching and Server Action → RPC → feed-row mapping.
- Relevant issue/PR/decision: #254; PR #234 explicitly deferred review state and bulk correction; PR #183 demonstrates atomic authenticated review-resolution writes; PR #222 demonstrates row locking and correction guards for financial state.

### Open questions

- [x] Existing rows default to `reviewed`; no historical uncertainty is invented.
- [x] Manual and approved Inbox creation default to `reviewed`; users can explicitly mark a row `needs_review` later.
- [x] Bulk category correction is limited to ordinary non-recurring, non-transfer, non-split rows of one kind.
- [x] Selection follows visible filtered rows only; changing filters removes hidden IDs from selection.

## Research

Not required. The decision is internal and bounded by current MoneyFlow contracts, current project memory and already-verified mutation/RLS patterns. No new dependency, provider, external standard or product identity decision is introduced.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture layer is added.

## Specification

### Problem

Users can correct one transaction at a time but cannot record which rows still need checking or safely fix the same category mistake across several transactions. This creates repetitive work and makes imported/manual ledger quality hard to assess without introducing a new accounting or reconciliation subsystem.

### User stories

- As a ledger user, I can mark a transaction as needing review or reviewed so I know what still requires attention.
- As a ledger user, I can filter to rows needing review so I can work through them without losing other filters.
- As a ledger user, I can select visible rows and update their review state together.
- As a ledger user, I can assign one category to several eligible same-kind rows atomically so repeated classification mistakes are fixed consistently.

### Acceptance criteria

- [ ] `Transaction.reviewStatus` round-trips from database/feed and demo storage.
- [ ] Existing rows migrate to `reviewed`; newly created rows are `reviewed` by default.
- [ ] Review-state filtering composes with existing search/kind/account/category/date/amount filters and URL state.
- [ ] Each visible row exposes an accessible selection control and non-color-only review label.
- [ ] Select-visible and clear-selection never select hidden rows.
- [ ] Bulk review accepts 1–100 unique owned active IDs and updates only those rows atomically.
- [ ] Bulk category correction accepts 1–100 unique IDs only when every row is active, non-recurring, non-transfer, non-split and has the same income/expense kind.
- [ ] Category correction rejects missing, archived, cross-tenant or wrong-kind categories and changes no row on failure.
- [ ] Demo and authenticated flows produce the same user-visible result.
- [ ] Existing create/edit/delete/restore/transfer/split behavior remains green.

### Required states

- Loading: existing route loading behavior remains unchanged; bulk controls disable during mutation.
- Empty: review filter with no matches shows the existing filtered-empty treatment and reset action.
- Populated: labels, checkboxes and bulk bar remain readable at phone and desktop widths.
- Validation/error: ineligible mixed selection explains why category correction is unavailable; server failures preserve selection and show calm copy.
- Recovery/undo: bulk review/category writes are explicit confirmed actions; no guessed reverse mutation. Existing delete undo remains unchanged.
- Long data / large VND: selection and labels must not clip notes or amounts; no amount mutation is included.
- Mobile/tablet/desktop: bulk bar wraps without horizontal overflow and controls retain practical 44px targets.
- Accessibility: checkbox labels name the transaction; bulk status is not color-only; disabled reasons are visible text.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact because no amount or transfer entry is changed.
- Ownership/RLS implications: RPCs derive `auth.uid()`, lock and validate every selected transaction, reject cross-tenant/partial sets and expose no direct table update grant.

### Out of scope

- Bulk amount/date/account/note edits.
- Transfer, recurring or split category correction.
- Split-line editing.
- Reconciliation sessions or cleared/reconciled states.
- Import rules, bank sync, AI, OCR or background jobs.

## Implementation plan

### Architecture fit

`financial_transactions` owns review state because the status applies to the whole logical transaction, including transfers and split expenses. The transaction feed carries the read model. `useTransactions` remains the single client orchestration owner for demo and authenticated modes. Server Actions validate public inputs, while atomic ownership and eligibility checks live in security-definer RPCs.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| contracts/domain | add review status and bulk input/result contracts; pure selection eligibility helper | shared parity and testability |
| migration | add constrained `review_status`, update feed, add two atomic RPCs and grants | persisted safe authority |
| pgTAP | prove defaults, ownership, atomicity, category guards and invariant preservation | Class 3 evidence |
| server finance/actions | map review state and expose validated mutation entrypoints | authenticated adapter |
| transaction hook/store | demo parity and state reconciliation | one client mutation owner |
| transaction page/CSS | filter, labels, selection and bounded bulk controls | user flow |
| unit/browser tests | eligibility, filter URL and desktop/mobile flow | regression evidence |
| memory/PR record | update only after candidate behavior is verified | truthful project state |

### Data and migration impact

- Schema/migration: add `financial_transactions.review_status text not null default 'reviewed'` with a two-value check; recreate `transaction_feed` with the extra column; add `set_transaction_review_status_bulk(uuid[], text)` and `bulk_update_transaction_category(uuid[], uuid)`.
- Backfill: default plus `not null` makes all existing active/deleted rows reviewed without inventing uncertain history.
- Compatibility: application parsing treats the new column as required after migration; deployment must apply migration before or with the corresponding app release.
- Rollback: application rollback first; database rollback may leave the additive column/RPCs in place. Removing the column requires recreating the feed without it and is an owner-approved migration, never an automatic production action.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Cross-tenant ID included with owned IDs | lock exact owned set and reject count mismatch; two-user pgTAP |
| Duplicate IDs distort count | normalize unique IDs in app and RPC |
| Mixed income/expense group | RPC rejects kind mismatch atomically |
| Split expense gets one category and loses split meaning | reject transactions with entry count other than one |
| Transfer or recurring row is corrected | explicit RPC guards and pgTAP |
| Archived/wrong-kind category | owned active category lookup + kind equality |
| Partial write if one row fails | one RPC transaction; validate all rows before update |
| Selection survives filter change and mutates hidden row | intersect selection with current visible IDs on filter/list changes |
| New feed column breaks historical recreation | migration recreates the full current feed definition including recurring and split fields; static contract test |

### Verification plan

- Static: knowledge, CI policy, deployment, CSS ownership, architecture, lint, typecheck, build.
- Unit/domain: selection eligibility, input normalization, filter composition, demo bulk mutation and source contract.
- Database: fresh reset + pgTAP for default, feed, review RPC, category RPC, tenant isolation, atomic failure and transfer/split/recurring guards.
- Browser flow: demo desktop/mobile select rows, mark review, filter, valid bulk category correction and blocked ineligible selection.
- Responsive/visual: transaction route at phone/desktop, light/dark, no horizontal overflow and 44px controls.
- Production/manual: after owner merge and migration approval, synthetic authenticated smoke only; no production-data write in agent scope.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add packet, issue and contracts | none | issue #254 + packet | in_progress |
| T2 | Add migration and pgTAP invariants | T1 | reset + focused pgTAP | todo |
| T3 | Add authenticated/demo mutation adapters | T2 | unit/typecheck | todo |
| T4 | Add review filter, selection and bulk UI | T3 | browser/responsive evidence | todo |
| T5 | Evaluate diff, update memory/PR record and run exact-head gates | T2–T4 | CI/CodeQL/secret scan | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.
- A task may advance only when the current execution state's evidence exists.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | human_owner | implementer | implementing | owner instruction, issue #254, current-main reconnaissance | migration and browser behavior unverified | implement on focused branch |

### Current permission boundary

- Granted scope: focused branch writes, issue/PR updates and repository checks.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; GitHub only.
- Forbidden writes: `main`, production Supabase/Vercel settings, production schema/data, branch protection and workflows.
- Human approval required before: merge, production migration, production-data smoke or release claim.
- Rollback or stop condition: stop if current schema contradicts the planned feed/RPC contract, ownership cannot be proven atomically or scope requires split/reconciliation redesign.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| pending | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: internal code/tests/policy only.
- Important source limitations remain respected: repository/browser checks will not be described as production provider proof.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- Split-line editing and broader bulk correction remain separate work.

## Delivery record

- Branch: `feat/transaction-review-bulk-correction`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not authorized
- Production flow verified: pending owner-approved post-merge smoke
- Work packet moved to `docs/plans/completed/`: no
