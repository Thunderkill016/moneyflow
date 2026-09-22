# Reconciliation adjustment transaction for nonzero differences

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent (Devin) — owner review at PR
**Issue/PR:** PR pending
**Last updated:** 2026-09-23

## Outcome

A reconciliation whose cleared ledger does not equal the statement balance no
longer dead-ends at `reconciliation_difference_nonzero`. The user may explicitly
opt in to closing the gap with a real, categorized adjustment transaction —
income when the statement exceeds the cleared balance, expense when it falls
short — dated on the statement date, posted straight into the `reconciled`
locked state, and labelled `Điều chỉnh đối soát — sao kê <dd/mm/yyyy>`. The
completion event records the true pre-adjustment difference, so the audit trail
shows what the bank said versus what the ledger held before the correction.
Completing without a category at a nonzero difference still fails exactly as
today. Demo mode performs the same flow against the browser-local store.

## Repository reconnaissance

### Current behavior

- `public.complete_account_reconciliation(uuid)` (defined once, in
  `supabase/migrations/20260803142000_account_reconciliation_current_main.sql:477`)
  locks the account, snapshots `cleared/pending/reconciled` legs where
  `occurred_on <= statement_date` (`reconciliation_snapshot_for_user`, latest
  body at `20260803144500`, security-invoker since `20260910182000`), hard-fails
  `reconciliation_difference_nonzero` when `cleared_balance_minor <>
  statement_balance_minor`, flips `cleared` legs to `reconciled`, stores the
  snapshot on the session, and writes a `completed` event with
  `difference_minor = 0` hardcoded.
- The page only enables "Hoàn tất đối soát" at `difference === 0`
  (`src/components/account-reconciliation-page.tsx:200`) and the header copy
  promises "Đối soát không thay đổi số dư hoặc tự tạo khoản chênh lệch"
  (:469-471) plus "không tự bù chênh lệch" on the difference card (:609-611).
- `completeDemoAccountReconciliation` (`src/lib/reconciliation.ts:349`) mirrors
  the same zero-only rule against `AccountReconciliationStateData` rows stored
  in `moneyflow-account-reconciliation-v1:<accountId>`.
- Reconciled rows are immutable: `guard_reconciled_transaction_mutation` and
  `normalize_cleared_entry_financial_update` raise `transaction_reconciled`;
  `reopen_account_reconciliation` returns session rows to `cleared`.
- `assert_reconciliation_account_leg_consistent` (deferred constraint trigger)
  requires every `transaction_entries` row sharing `(transaction_id, user_id,
  account_id)` to carry identical `(reconciliation_state, cleared_at,
  reconciliation_id)` — a single-leg adjustment insert satisfies this
  trivially.
- Signed convention: `transaction_entries.amount_minor` is positive for income
  legs and negative for expense legs; `cleared_balance_minor = initial +
  sum(amount_minor)` over cleared+reconciled legs with `occurred_on <=
  statement_date`. An adjustment entry therefore stores exactly
  `difference = statement − cleared`.
- `create_money_transaction` (latest: `20260922120000_transaction_payee.sql`)
  shows the category validation contract (`category_kind_mismatch` when the
  category is missing/cross-tenant/wrong-kind, `category_archived` when
  archived) and the drop-old-signature → create-new → `revoke all`/`grant
  execute to authenticated` RPC evolution pattern this migration follows.
- `financial_transactions` columns: `kind`, `note` (≤500), `payee` (≤200,
  since `20260922120000`), `occurred_on`, `idempotency_key` (uuid,
  `unique(user_id, idempotency_key)`), `review_status` default `reviewed`,
  `deleted_at`. Audit triggers write `transaction_created`/`entry_created`/
  `reconciliation_completed` rows automatically; the entry audit requires the
  parent transaction row to exist first.

Verified by reading migrations `20260803142000`, `20260803144500`,
`20260803153000`, `20260910182000`, `20260922120000`, `20260804160000` and
`src/components/account-reconciliation-page.tsx`,
`src/app/actions/reconciliation.ts`, `src/lib/reconciliation.ts`,
`src/lib/transaction-store.ts`, `src/hooks/use-transactions.ts`,
`src/components/account-detail-page.tsx`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260803142000_account_reconciliation_current_main.sql` | sole definition of `complete_account_reconciliation`; snapshot semantics (`occurred_on <= statement_date`) | change: new migration drops the 1-arg signature and creates the 4-arg one |
| `20260803144500` + `20260910182000` | latest `reconciliation_snapshot_for_user` (plpgsql, `reconciliation_snapshot_forbidden` tenant guard, security invoker) | reuse: called again post-adjustment |
| `20260922120000_transaction_payee.sql` | drop+create signature precedent; `payee` column; category validation codes | pattern source |
| `src/app/actions/reconciliation.ts` | zod schema + `reconciliationError` mapping + `completeAccountReconciliationAction` | change: optional adjustment params, new error codes |
| `src/components/account-reconciliation-page.tsx` | `canComplete` gate, header/difference copy, complete dialog | change: adjustment dialog + demo store write |
| `src/app/accounts/[accountId]/reconcile/page.tsx` + `account-reconciliation-page-gate.tsx` | prop plumbing (`financeWorkspace.categories` is active-only) | change: pass `categories` |
| `src/lib/reconciliation.ts` | demo mutation `completeDemoAccountReconciliation` | change: optional adjustment branch returning the new `Transaction` |
| `src/lib/transaction-store.ts` + `src/components/account-detail-page.tsx` | `moneyflow-demo-transactions-v1` store; register hydration via `buildAccountRegister(readStoredTransactions(), id)` | reuse: hydrate demo register entries so the adjustment row survives reloads |
| `supabase/tests/database/account_reconciliation_current_main.test.sql` | `has_function(..., array['uuid'])` pin | change: pin new signature |
| `supabase/tests/database/account_reconciliation_locking.test.sql` | `regprocedure` pin on the 1-arg signature | change: pin new signature |
| `e2e/account-reconciliation-workspace.spec.ts` | asserts disabled complete button + "không tự bù" copy at nonzero difference | change: assert adjustment dialog path instead |

### Existing tests and constraints

- `npm test` (node) covers `src/lib/reconciliation.ts` demo flows —
  `reconciliation.test.ts` asserts the no-category nonzero failure message.
- `npm run test:db` (pgTAP, CI-only — no local Docker) covers the full
  reconciliation contract; existing `complete_account_reconciliation(uuid)`
  callers keep working because the new trailing params all default.
- `account_reconciliation_locking.test.sql` resolves
  `'public.complete_account_reconciliation(uuid)'::regprocedure` — must be
  updated to the new signature or it fails to resolve.
- `browser_role_privileges.test.sql` blanket-asserts `anon` cannot execute any
  public function — the new signature must `revoke ... from public, anon`.
- `check:migrations` pins every migration's name + raw-byte hash; a new file
  requires a deliberate `--write` baseline update.
- Integer VND only; `amount_minor <> 0`; entries audit trigger requires the
  parent transaction inserted first.

### Similar implementation and recent history

- `20260922120000_transaction_payee.sql` — the drop-old-signature/create-new/
  re-grant pattern and `p_payee` validation (`payee_too_long`).
- `account-detail-page.tsx:106-131` — demo register hydration from
  `readStoredTransactions()`; the reconcile page reuses this so the persisted
  adjustment transaction appears in the workspace.
- `use-transactions.ts` demo writes — `readStoredTransactions` → prepend →
  `writeStoredTransactions` before reporting success.

### Open questions

- [x] Keep the 1-arg overload as a wrapper? No — repo precedent drops old
  signatures; callers use named params or defaults.
- [x] User-editable adjustment note? `p_adjustment_note` exists for
  completeness but defaults to the fixed system label; the UI never sends it.
- [x] Idempotency key derivation: `md5(reconciliation_id || ':reconcile-adjustment:' || prior_completed_event_count)::uuid` — deterministic, collision-free across reopen→recomplete cycles, no extension dependency.

## Research

`Not required` — the design is fixed by the task brief (user-chosen category of
the forced kind, system-fixed label, explicit opt-in, `occurred_on =
statement_date`, real pre-adjustment difference in the completion event) and
every mechanism reuses in-repo patterns verified above. External competitor
behavior (adjustment-on-reconcile exists in Actual/Quicken-style products) is
already captured in `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`; no new
dependency, provider or architecture pattern is introduced.

### Research scope and source selection

- Decision question: none open — internal contract extension only.
- Reference map consulted: not required (reconnaissance table above lists the
  authoritative in-repo sources read directly).
- Source budget: n/a.
- Expected decision or uncertainty to resolve: none.

### Adoption review

Not applicable — no new dependency, provider, service, tool, framework or
architecture pattern.

## Specification

### Problem

A user whose cleared ledger legitimately differs from the bank statement (fee,
interest, a small posting the bank made) cannot finish reconciliation at all.
The only exits are finding the missing transaction by hand or abandoning the
session — the product offers no sanctioned way to book the difference.

### User stories

- As a user with a nonzero difference, I can choose a category and let
  MoneyFlow post a clearly-labelled adjustment so the statement period closes.
- As a user, I can see in history that an adjustment closed the period (the
  completion event keeps the real pre-adjustment difference).
- As a user, I cannot accidentally trigger this: it needs an explicit category
  pick inside a confirmation dialog, and the resulting row is locked like any
  reconciled row until I reopen the period.

### Acceptance criteria

- [ ] `complete_account_reconciliation` with `p_adjustment_category_id` on a
  nonzero session atomically posts the adjustment (kind forced by the
  difference sign, `occurred_on = statement_date`, entry `reconciled` +
  `reconciliation_id` + `cleared_at`), recomputes the snapshot, completes, and
  the `completed` event carries the real pre-adjustment `difference_minor`.
- [ ] Wrong-kind or cross-tenant category → `category_kind_mismatch`; archived
  → `category_archived`; nonzero difference with no category →
  `reconciliation_difference_nonzero` (unchanged).
- [ ] The adjustment row is locked (`transaction_reconciled` on edit/delete)
  and un-reconciles to `cleared` on reopen.
- [ ] UI offers the adjustment dialog only when `difference ≠ 0`; at zero the
  existing review dialog runs unchanged. Copy no longer claims adjustments are
  impossible.
- [ ] Demo mode posts the adjustment into `moneyflow-demo-transactions-v1` and
  the in-page workspace shows it as a reconciled leg, persisting across reload.
- [ ] pgTAP + node tests green; signature pins updated.

### Required states

- Loading/empty: categories of the forced kind absent → dialog explains and
  blocks confirm (default categories normally guarantee at least one).
- Validation/error: RPC error codes mapped to Vietnamese copy.
- Recovery/undo: reopen returns the adjustment leg to `cleared`.
- Long data / large VND: |difference| ≤ `bigint` safe-integer bound already
  enforced on `statement_balance_minor`; the `±18014398509481982` event
  difference bound holds.
- Mobile/tablet/desktop + accessibility: reuses `Dialog`, `SelectField`,
  `TextField`, `Button`, `Alert` primitives; confirm requires an explicit
  selection.

### Financial and security constraints

- Integer VND; the entry amount is exactly the signed difference — no
  invention, no rounding.
- Category ownership enforced by `user_id = auth.uid()` in the same atomic
  transaction; RLS unchanged (writes happen inside the existing security
  definer RPC).
- The adjustment is a real ledger transaction: it appears in `transaction_feed`,
  reports and exports like any other.

### Out of scope

- Auto-suggesting or auto-creating the adjustment without a user pick.
- Editing/deleting adjustments separately from the reconciled-lock contract.
- Non-VND accounts (reconcile is VND-only today, unchanged).

## Implementation plan

### Architecture fit

The change lives inside the existing reconciliation boundary: one RPC gains the
compensation write, the existing account lock + snapshot + atomic-completion
machinery is reused untouched, and the demo mirror lives in the same domain
module that already owns the demo session math.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `supabase/migrations/20260923013000_reconciliation_adjustment_completion.sql` | drop `complete_account_reconciliation(uuid)`; create 4-arg version; adjustment branch + revoke/grant | the feature |
| `src/app/actions/reconciliation.ts` | `completeSchema` gains `adjustmentCategoryId`/`adjustmentPayee`; rpc args; map `category_kind_mismatch`, `category_archived`, `note_too_long`, `payee_too_long` | client contract |
| `src/components/account-reconciliation-page.tsx` | `categories` prop; enable complete at nonzero; adjustment `Dialog` (SelectField + optional payee TextField + fixed-note preview); demo path writes the returned transaction to the store and refreshes hydrated register entries; copy updates | UX |
| `src/app/accounts/[accountId]/reconcile/page.tsx` | pass `financeWorkspace.categories` | plumbing |
| `src/lib/reconciliation.ts` | `completeDemoAccountReconciliation` optional `adjustment` input → `adjustmentTransaction` + reconciled row | demo parity |
| `supabase/tests/database/account_reconciliation_adjustment.test.sql` | new pgTAP file | DB proof |
| `account_reconciliation_current_main.test.sql` + `account_reconciliation_locking.test.sql` | signature pins → `(uuid,uuid,text,text)` | keep CI green |
| `e2e/account-reconciliation-workspace.spec.ts` | nonzero test asserts the adjustment dialog instead of a dead button | UI proof |
| `src/lib/reconciliation.test.ts` + new action contract test | demo adjustment math + action schema | node proof |
| `supabase/migration-identity.json` | baseline `--write` | required by gate |

### Data and migration impact

- Schema/migration: RPC signature change only; no table changes, no backfill.
- Compatibility: positional callers of the 1-arg form still resolve (new params
  default); PostgREST named-param callers (`p_reconciliation_id` only) keep
  working; signature pins updated.
- Rollback: revert migration restores the 1-arg function; adjustment rows are
  ordinary transactions and remain valid ledger data.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Adjustment dated after the statement would not enter the snapshot and the completion would loop/fail | `occurred_on = statement_date` hardcoded; post-insert snapshot re-verified zero inside the same transaction |
| Category of the wrong sign flips the difference instead of closing it | kind forced by `v_difference` sign; `category_kind_mismatch` otherwise; pgTAP asserts |
| Stale signature overload silently serving old behavior | `drop function` + pgTAP signature pins |
| Double adjustment on reopen→recomplete | first adjustment returns to `cleared` and already covers the gap → difference 0; derived key still unique per attempt |
| Demo adjustment row lost on reload | register hydration from `readStoredTransactions()` + node test asserting store write + row persistence |
| anon/public EXECUTE regression | `revoke all ... from public, anon` + blanket privilege test |

### Verification plan

- Static: `npm run typecheck`, `npm run lint`, `npm run check:architecture`,
  `npm run check:css-ownership`, `npm run check:knowledge`,
  `npm run check:migrations`, `npm run test:ci-policy`.
- Unit/domain: `npm test` — `reconciliation.test.ts` demo-adjustment cases,
  action contract test.
- Database: `npm run test:db` — CI only (no local Docker); pgTAP authored and
  assertion counts hand-verified.
- Browser flow: `npm run test:e2e` — CI only; spec updated for the new dialog.
- Production/manual: owner decision post-merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Work packet + worktree | — | this file | done |
| T2 | Migration + identity baseline | T1 | `check:migrations` green | done |
| T3 | Server action schema + error mapping | T2 | typecheck green | done |
| T4 | Page UI + gate/page plumbing + copy | T3 | typecheck, lint green | done |
| T5 | Demo parity (`reconciliation.ts`, page store write + hydration) | T3 | `npm test` green | done |
| T6 | pgTAP file + signature pins + e2e spec + node tests | T2–T5 | `npm test` green; CI for DB/e2e | done |
| T7 | Gates, commit, PR, PR memory | T6 | gate log | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-23 | planner | implementer | implementing | work packet; migration/actions/UI/demo/tests on `feat/reconcile-adjustment` | pgTAP not locally runnable (CI) | Run gates, open PR |

### Current permission boundary

- Granted scope: `branch_write` on `feat/reconcile-adjustment` worktree only.
- Exact repositories/providers/resources: this repo; no provider or production
  writes.
- Forbidden writes: `main`, shared branches, provider/production data.
- Human approval required before: merge, deploy, any provider/production write.
- Rollback or stop condition: revert the single migration commit; PR closed.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Adjustment completes nonzero sessions atomically | pgTAP `account_reconciliation_adjustment.test.sql` (CI only — no local Docker) | written, pending CI |
| Wrong-kind/archived/cross-tenant category rejected | pgTAP throws_ok cases (CI) | written, pending CI |
| Completion event keeps real pre-adjustment difference | pgTAP event-row assertion (CI) | written, pending CI |
| Adjustment leg locked, un-reconciles on reopen | pgTAP `transaction_reconciled` + reopen assertions (CI) | written, pending CI |
| No-category nonzero still fails | pgTAP + existing node assertion | node green; pgTAP pending CI |
| UI adjustment path + honest copy | updated e2e spec (CI) | written, pending CI |
| Demo store write + workspace persistence | node tests in `reconciliation.test.ts` + `demo-transaction-persistence-contract.test.ts` | green locally |
| Signature pins + grants | updated pgTAP pins; `security_definer_contract` count stays 42 | written, pending CI |

### Research and adoption evidence

- Selected sources still support the final implementation: n/a (internal).
- Important source limitations remain respected: n/a.
- New tool/dependency/pattern passed the adoption review, or not applicable:
  not applicable.

### Review findings

Pending — filled at exact-head verification.

### Remaining limitations

- pgTAP and Playwright evidence is CI-side (no local Docker/browsers);
  assertion counts were hand-verified against `plan()` calls.
- The `p_adjustment_note` parameter exists for contract completeness but the
  shipped UI always uses the system-fixed label.
