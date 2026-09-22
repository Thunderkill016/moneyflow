# Deleted-transactions browse + restore surface ("trash")

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent (Devin) — owner review at PR
**Issue/PR:** this PR
**Last updated:** 2026-09-23

## Outcome

A `/transactions/trash` surface lists soft-deleted ledger rows newest-deleted
first, each with its "Đã xóa lúc …" timestamp and a "Khôi phục" action that
reuses the existing `restore_money_transaction` RPC. Recovery stops being a
single 8-second undo toast: any soft-deleted row remains browsable and
restorable until the account itself is deleted. Demo mode mirrors the same
behaviour through a persisted on-device tombstone store.

## Repository reconnaissance

### Current behavior

- `soft_delete_money_transaction` sets `deleted_at = now()`; it refuses rows
  with commitment or income-template occurrences (`recurring_payment_locked`),
  and `guard_reconciled_transaction_mutation` raises `transaction_reconciled`
  on any non-metadata update — including `deleted_at` — for rows with
  reconciled entries.
- `restore_money_transaction` clears `deleted_at` for an owned row. The only
  user-facing recovery is the 8-second undo toast in the transactions
  workspace (`showDeleteNotice` + `handleUndoDelete`).
- `transaction_feed` filters `deleted_at is null`; deleted rows are invisible
  everywhere after the toast expires.
- The same reconciled guard resets `cleared` entries to `pending`
  (`reconciliation_id = null`, `cleared_at = null`) whenever `deleted_at`
  changes — so a restored row returns with entries pending, not cleared.
- Demo mode (`NEXT_PUBLIC_APP_MODE=demo`) stores its ledger in
  `localStorage["moneyflow-demo-transactions-v1"]`; demo delete currently
  drops rows outright.

Verified by reading migrations `20260714000800` (soft delete), `20260725012045`
(restore), `20260725012129` (recurring locks), `20260922120000` (reconciled
guard + latest `transaction_feed`), `src/hooks/use-transactions.ts` and
`src/components/transactions/transactions-workspace.tsx` (undo flow).

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260922120000_transaction_payee.sql` | latest `transaction_feed` projection incl. `payee`, split lines, recurring flags | reuse: mirror projection verbatim + `deleted_at`, flip `where` to `is not null` |
| `supabase/migrations/20260803090000_transaction_review_bulk_correction.sql` | companion `security_invoker` view + partial-index pattern | reuse: `deleted_transaction_feed` follows the same shape |
| `src/server/finance.ts` | `feedSchema`, `mapTransactionFeedRow`, `readAllPages` | change: add `getDeletedTransactions()` + deleted-row mapper |
| `src/hooks/use-transactions.ts` | demo `deleteTransaction`/`bulkDeleteTransactions`/`restoreTransaction` | change: demo writes tombstones; demo restore releases tombstone |
| `src/lib/transaction-store.ts` | `isTransaction`, `readStoredTransactions`, `restoreTransactionInList`, `TRANSACTION_STORAGE_KEY` | reuse unchanged; new sibling module owns the tombstone key |
| `src/lib/deleted-transactions.ts` (new) | tombstone store: `moneyflow-demo-transactions-deleted-v1` | new: validator + read/write/tombstone/release helpers |
| `src/lib/delete-account.ts` | `LOCAL_DATA_STORAGE_KEYS` wipe list | change: register tombstone key |
| `src/components/transactions/transactions-workspace.tsx` | delete entry surface; `headingActions` slot | change: quiet "Đã xóa" link to `/transactions/trash` (ledger variant only) |
| `src/app/actions/transactions.ts` | `restoreTransactionAction`, `feedColumns`, `refreshFinancePages` | reuse restore action; add `/transactions/trash` revalidate |
| `src/components/transactions/transactions-trash-page.tsx` (new) + `.module.css` | read-only trash list + per-row restore | new |
| `src/app/transactions/trash/page.tsx` | server route | new |

### Existing tests and constraints

- `demo-transaction-persistence-contract.test.ts` pins the literal
  `const next = readStoredTransactions().filter` +
  `commitDemoTransactions(next)` sequence in demo `deleteTransaction` —
  tombstoning must wrap around that shape, not replace it.
- `schema_and_rls`/`browser_role_privileges`/`security_catalog` pin view and
  privilege expectations; the new view needs `security_invoker`, authenticated
  `SELECT`-only, no anon access.
- `check:migrations` pins every migration by byte hash; new migrations require
  a deliberate `--write` baseline update.
- Supabase JS `select()` on a view is a plain read — ordering must come from
  the query (`.order("deleted_at")`), not rely on view `ORDER BY`.

### Open questions

- [x] Extend `transaction_feed` vs companion view: companion — dashboard,
  reports and `get_dashboard_bundle` all assume active-only rows; touching the
  feed risks false balances (the 20260803090000 header says exactly this).
- [x] Retention claim: "giữ đến khi xóa tài khoản" — no purge job exists, so no
  30-day promise is made.
- [x] Where the entry link lives: quiet link in the transactions-workspace
  heading actions (ledger variant), where deletes originate; settings hub is
  account-level and would hide a ledger concern.

## Research

Pre-decided upstream: competitor sweep (`docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`,
`PRODUCT_COMPETITIVE_MEMORY.md`) shows YNAB/Actual/Firefly/Money Lover have no
browse+restore surface; the design decision and copy constraints are fixed by
the task spec. `Not required` beyond that — implementation reuses existing
view/store/action patterns.

## Specification

### Migration `20260923090000_deleted_transaction_feed.sql`

- Partial index `financial_transactions_user_deleted_idx` on
  `(user_id, deleted_at desc) where deleted_at is not null`.
- `create view public.deleted_transaction_feed with (security_invoker = true)`
  — verbatim `transaction_feed` projection (kind/note/dates/amount/account/
  category/split lines/destination/is_recurring_payment/payee) plus
  `transaction_record.deleted_at`, same joins and group-by, `where
  transaction_record.deleted_at is not null`, `order by deleted_at desc`.
- `revoke all … from public, anon; grant select … to authenticated` —
  identical to `transaction_review_feed`.

### Server read path

- `src/server/finance.ts`: `DELETED_TRANSACTION_FEED_COLUMNS` =
  `TRANSACTION_FEED_COLUMNS` + `,deleted_at`; `deletedFeedSchema` extends
  `feedSchema` with `deleted_at: z.string()`; `mapDeletedTransactionFeedRow`
  returns `{ transaction, deletedAt }` reusing `mapTransactionFeedRow`;
  `getDeletedTransactions()` pages `deleted_transaction_feed` ordered
  `deleted_at` desc, demo → `{ deleted: [], dataError: null }`.

### Demo tombstone store (`src/lib/deleted-transactions.ts`)

- `DELETED_TRANSACTION_STORAGE_KEY = "moneyflow-demo-transactions-deleted-v1"`.
- Record `{ transaction: Transaction; deletedAt: string }`; validator
  `isDeletedTransactionRecord` = `isTransaction(transaction)` + parseable
  `deletedAt`.
- `readStoredDeletedTransactions(storage?)` returns valid records sorted
  `deletedAt` desc; `tombstoneTransactions`/`releaseDeletedTransactions`
  write through; storage injectable (mirrors `clearLocalMoneyFlowStores`).
- `use-transactions.ts`: demo `deleteTransaction` tombstones the removed row
  (keeping the pinned `readStoredTransactions().filter` →
  `commitDemoTransactions` sequence); demo `bulkDeleteTransactions` tombstones
  `plan.eligible`; demo `restoreTransaction` releases the tombstone after
  re-inserting.
- `delete-account.ts`: key added to `LOCAL_DATA_STORAGE_KEYS`.

### Route + component

- `src/app/transactions/trash/page.tsx` → `TransactionsTrashPage` (client).
  Auth rows come from `getDeletedTransactions()`; demo hydrates from the
  tombstone key on mount (same `requestAnimationFrame` pattern as
  `useTransactions`).
- Rows are read-only: kind icon, note, subtitle (payee · category · account;
  `transferRowSubtitle` for transfers; split caption stays "Chia · N danh
  mục"), `Đã xóa lúc <vi-VN datetime in Asia/Ho_Chi_Minh>`, amount, and a
  "Khôi phục" button → demo: `restoreTransactionInList` + release tombstone;
  auth: `restoreTransactionAction` then remove the row and notice.
- Header copy states honestly: rows are kept until account deletion; restore
  returns rows with entries back to pending (cleared state is not preserved);
  reconciled and recurring rows can never appear here.
- `refreshFinancePages` gains `revalidatePath("/transactions/trash")`.

### Copy contract (no invented claims)

- No retention window is stated — there is no purge job.
- Recurring/reconciled exclusion is explained, not implied.

## Implementation plan

1. Migration + `supabase/migration-identity.json` baseline update.
2. `finance.ts` deleted-feed loader + mapping.
3. `deleted-transactions.ts` store; `use-transactions.ts` demo wiring;
   `delete-account.ts` key registration.
4. Route + `transactions-trash-page.tsx` + CSS module; quiet link in
   `transactions-workspace` heading actions; revalidate path.
5. Tests: `deleted_transaction_feed.test.sql` (pgTAP, CI-only) +
   `src/lib/deleted-transactions.test.ts` (validator, tombstone/release
   round-trip, deletedAt ordering) + `finance.ts` source-contract assertions.
6. Gates: typecheck, lint, `npm test`, build, `check:migrations`,
   `check:knowledge`, `test:ci-policy`, `check:architecture`,
   `check:css-ownership`. `test:db` runs in CI only (no local Docker).

## Tasks

- [x] Recon + spec
- [x] Migration + baseline
- [x] Server loader/mapper
- [x] Tombstone store + demo wiring + account-deletion key
- [x] Route/component/CSS + entry link
- [x] pgTAP + node tests
- [ ] Gates green on exact head; PR + memory record

## Evaluation

- pgTAP (`deleted_transaction_feed.test.sql`, `plan(36)`): tenant A sees only
  own deleted rows; anon denied (`42501`); active rows absent; `deleted_at`
  populated; newest-deleted-first ordering; restore removes the row from the
  feed and returns it to `transaction_feed`; recurring deletion stays blocked
  (`recurring_payment_locked`); reconciled rows blocked
  (`transaction_reconciled`); cleared→pending reset on delete verified.
  Catalog tests updated: `schema_and_rls` (+1 `has_view`, plan 81),
  `browser_role_privileges` (select-only list), `security_catalog`
  (security-invoker count 5→6).
- Node (`src/lib/deleted-transactions.test.ts`, 9 cases): tombstone validator
  accepts/rejects correctly; demo delete→trash→restore round-trip leaves
  stores consistent; ordering newest-first; re-delete refreshes `deletedAt`
  without duplicating; corrupt key dropped; `formatDeletedAtLabel`
  deterministic in Asia/Ho_Chi_Minh; tombstone key registered in
  `LOCAL_DATA_STORAGE_KEYS`; source-contract pins for the server loader and
  demo wiring.
- UI: trash rows show deletion time and restore; empty/error states honest;
  entry reachable from `/transactions` header; `noticeTone` passed explicitly
  per PR #683.
- Gates on exact head: `typecheck` pass, `lint` pass (1 pre-existing warning
  in `quick-add-defaults.test.ts`), `npm test` 1691 pass, `build` pass
  (`/transactions/trash` registered), `check:migrations` pass (66 pinned),
  `check:knowledge` pass, `test:ci-policy` pass (191), `check:architecture`
  pass, `check:css-ownership` pass, `git diff --check` clean.
- `npm run test:db` not runnable locally — no Docker/Supabase local stack
  (`ECONNREFUSED 127.0.0.1:54322`); the pgTAP file runs in CI.

## Risks

- View joins `accounts`/`transaction_entries` inner — identical semantics to
  `transaction_feed`; rows only vanish when the tenant is purged, which also
  empties trash correctly.
- `readAllPages` bounds the scan; the partial index keeps `deleted_at is not
  null` reads cheap.
- Demo `restoreTransaction` is shared by the undo toast and the trash page —
  releasing the tombstone on undo is correct (the row is no longer deleted).

## Rollback

Revert migration drops the view + index; routes/store are additive and can be
reverted independently. No data written by the migration itself.
