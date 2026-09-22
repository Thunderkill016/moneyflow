# Payee as a first-class ledger field

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent (Devin) — owner review at PR
**Issue/PR:** PR #673
**Last updated:** 2026-09-22

## Outcome

Transactions gain a `payee` (nơi giao dịch) field end-to-end: captured at Inbox
candidate review, carried onto the ledger row at commit, editable on manual
transactions, searchable, and preserved through export/restore. This unlocks
payee-grouped reports and payee→category memory later without re-deriving
merchant names from free-text notes.

## Repository reconnaissance

### Current behavior

- `inbox_candidates.merchant` exists (≤200 chars) and is editable in review, but
  `approve_inbox_candidate` flattens it into `note` via `concat_ws` — the payee
  is destroyed at commit.
- `financial_transactions` has `note` (≤500) only; no payee/tags/attachments.
- Manual add/edit dialogs have no payee field.
- `filterTransactions` searches note/category/account names only.

Verified by reading migrations `20260714000100` (schema), `20260823124000`
(latest `approve_inbox_candidate`), `20260725035128` (latest `transaction_feed`).

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/20260714000100_initial_financial_schema.sql` | table + `note` constraint pattern | change: new migration adds `payee` |
| `20260725063926` / `20260725012245` | latest `create`/`update_money_transaction` | change: new sig with `p_payee`, drop old |
| `20260823124000` | latest `approve_inbox_candidate` | change: insert `v_candidate.merchant` → `payee` |
| `20260725065918` | latest `pay_recurring_commitment` | change: insert commitment name → `payee` |
| `20260725035128` | latest `transaction_feed` view | change: append `payee` column |
| `20260812000000`/`20260812010000` | export/restore explicit column manifests | change: add `payee` |
| `src/server/finance.ts` | `mapTransactionFeedRow` + workspace | change: map `payee` |
| `src/lib/contracts.ts` / feed types | Transaction type | change: add `payee?: string` |
| `src/lib/inbox/review.ts` | `buildLedgerPost` merchant→note concat | change: carry merchant→payee instead of only note |
| `src/lib/transaction-filters.ts` | search haystack | change: include payee (folded) |
| `src/components/add-transaction-dialog.tsx` + edit dialog | forms | change: payee text field + datalist |
| `src/lib/transaction-store.ts` + demo seeds | demo validator | change: accept `payee` |

### Existing tests and constraints

- `test:db` covers RPC signatures/constraints — new migration must keep them green.
- RLS: `payee` lives on the tenant-scoped row; no policy change needed.
- Archive manifests pin column lists — omitting `payee` would silently drop data.

### Open questions

- [x] Nullable vs `not null default ''`: choose `not null default ''` to mirror `note` and keep concat/search simple.
- [x] Transfers/splits: `payee` stays `''` (no merchant semantics); split parent may carry payee if the candidate had one.

## Research

`Not required` — internal/mechanical schema extension; external behavior already
researched in `docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md` (payee is
first-class in Actual/Monarch/Copilot/Firefly/Money Lover).

## Specification

### Column

- `financial_transactions.payee text not null default ''` +
  `check (char_length(payee) <= 200)` matching `inbox_candidates.merchant`.
- No backfill: existing rows keep `payee = ''`. Never invent payees from notes.

### RPC changes (drop old signature → create new → re-grant)

- `create_money_transaction(..., p_payee text default '', p_idempotency_key ...)`
  — stores `left(btrim(p_payee),200)`; validation error `payee_too_long` mirrors
  `note_too_long`.
- `update_money_transaction(..., p_payee text default '', p_idempotency_key ...)`
  — overwrite semantics like `note`: `''` clears.
- `create_split_expense(..., p_payee text default '', ...)` — same insert.
- `approve_inbox_candidate`: the public wrapper gains
  `p_payee text default null` appended; after delegating to
  `approve_inbox_candidate_pre_source_lineage` it sets
  `payee = left(btrim(coalesce(p_payee, candidate.merchant)),200)` on the new row
  (non-transfer only). Client passes the *reviewed* merchant — candidate.merchant
  in DB is the pre-review value (the inner function never persists merchant
  edits). `approve_inbox_candidates_batch` keeps calling with 10 args → default
  null → falls back to `candidate.merchant` per row. Note behavior unchanged:
  note still falls back to merchant when p_note is empty (no display regression).
- `pay_recurring_commitment` — `payee = left(v_commitment.name,200)`; note keeps
  name (existing display contract).
- `record_recurring_income_template` — `payee = left(v_template.name,200)`.
- Transfers: `payee` stays `''` (no merchant semantics).
- `transaction_feed` — append `transaction_record.payee` at END of select list
  (create-or-replace-view only appends) + add to `group by`.

### Reconciled-guard decision

`guard_reconciled_transaction_mutation` excludes `payee` from the row diff
(alongside `review_status`/`updated_at`): payee is descriptive metadata, not
reconciliation truth (amount/date/account/kind stay protected). Consequences:
payee is editable on reconciled rows via `update_money_transaction`, and the
restore post-update needs no bypass flag.

### Archive (third generation layer, mirrors source-lineage wrappers)

- New generation `20260922120000` adds `payee` to `tables.transactions` rows.
- `export_user_archive` → rename `_pre_payee`; new wrapper injects `payee` into
  each transaction row (join back to table) + bumps generation everywhere.
- `validate_archive_for_restore` → rename `_pre_payee`; new wrapper accepts all
  three generations; for the new gen it strips `payee` + downgrades to
  `20260822094500`, delegates, then verifies `payee` present, string, ≤200.
- `restore_user_archive` → rename `_pre_payee`; new wrapper strips + delegates
  for new gen, then post-updates `financial_transactions.payee` by id and
  refreshes `archive_restore_rows` row_hash for the transactions collection.
- TS mirrors: `payee-archive-validator.ts` (gen-aware, delegates to
  `validateMoneyFlowArchiveWithSourceLineage`) + `payee-archive-ingress.ts`;
  `backup-settings-page.tsx` + `archive.ts` action switch to the new entrypoints.
- The frozen `moneyflow-archive.ts` spec keeps `ARCHIVE_SCHEMA_GENERATION =
  20260804160000` — legacy rows must NOT gain payee in the base validator.

### TS / UI

- `Transaction.payee?: string` (optional: demo rows stored before this field
  exist must still validate); `CreateTransactionInput.payee?`,
  `UpdateMoneyTransactionInput.payee?`.
- All `feedColumns`/`TRANSACTION_FEED_COLUMNS` strings + `feedSchema` + `mapTransactionFeedRow`.
- `createTransactionAction`/`updateMoneyTransactionAction` pass `p_payee`;
  zod `payee: z.string().trim().max(200).optional()`.
- `approveInboxCandidateAction` schema + `p_payee` = reviewed draft.merchant.
- Add/edit dialog: payee text field (`datalist` of distinct existing payees).
- `filterTransactions` haystack += folded payee.
- Demo: `isTransaction` accepts `payee?: string`; demo pay path sets payee =
  commitment/template name; sample fixtures may set a few payees.

## Implementation plan

1. New migration `20260922120000_transaction_payee.sql`: column + check,
   reconciled-guard exclusion (payee is editable metadata), RPC redefinitions
   (`p_payee` appended last for positional compatibility), `transaction_feed`
   trailing column, `get_dashboard_bundle` projection, archive
   `export/validate/restore` wrapped to `*_pre_payee` under generation
   `20260922120000`, grants mirroring the source-lineage pattern.
2. `contracts.ts`/`finance.ts` mapping; all feed column strings; server actions
   (`transactions.ts`, `inbox-approval.ts`, `reports.ts`); add/edit dialog
   fields + payee `datalist`; filter haystack; `transactions.search` capability
   schema + haystack + golden; demo fixtures + `isTransaction` tolerance;
   payee-aware subtitles in both transaction workspaces; archive
   validator/ingress third layer (`payee-archive-validator.ts`,
   `payee-archive-ingress.ts`) wired into `archive.ts` + `backup-settings-page`.
3. Tests: `transaction-filters.test.ts` (payee match),
   `payee-archive-validator.test.ts`, `transaction_payee.test.sql` (17 pgTAP
   assertions), signature pins in `schema_and_rls`/`browser_role_privileges`,
   `transactions.search` payee test + regenerated golden.
4. Gates: typecheck, lint, `npm test`, `test:db` (CI — no local Docker),
   `check:knowledge`, `ci-policy`, `build`, `check:architecture`,
   `check:css-ownership`, `check:capabilities`.

## Tasks

- [x] Migration + feed view + dashboard bundle + archive wrappers
- [x] Server actions, contracts, feed mapping, capability schema/haystack
- [x] Add/edit dialog fields + datalist, workspace subtitles, demo/store/filters
- [x] Unit + contract tests; DB test authored (runs in CI)
- [ ] `npm run test:db` on CI; fix any pgTAP failures before merge
- [ ] Owner review + merge authorization

## Evaluation

- `transactions.search` and UI search match `an uong` → payee `Ăn uống` rows.
- Inbox approval persists the reviewed merchant as `payee`; batch path falls
  back to the persisted candidate merchant.
- Reconciled rows accept payee edits; money fields still locked (DB test 6).
- Legacy archives (0416, 0945) still validate/restore; current generation
  requires `payee` on every transaction row (validator + SQL tests).
- `docs/agents/capabilities.json` regenerated; `check:capabilities` green.

### Gate evidence (worktree `wt-payee`, exact head)

- `npm test` — 1533/1533 pass (incl. payee archive 7/7, ingress chain
  accepts 0416 + 0945 + 0922, `transactions.search matches payee text`).
- `npm run typecheck`, `npm run lint` (1 pre-existing warning) — pass.
- `npm run build` — 51 routes.
- `npm run check:knowledge`, `check:migrations` (65 pinned),
  `test:ci-policy` 191/191, `check:architecture`, `check:css-ownership`,
  `check:rls` 9/9 — pass.
- `npm run test:db` — **not runnable locally** (no Docker/Podman); CI gate.
- `npm run test:e2e` — **not runnable locally** (no Playwright browsers);
  CI gate. Dialog change is additive inside the collapsed optional section.

## Risks

- `create or replace function` with a different arg list creates an overload —
  must `drop function` the old signature or stale callers silently write `''`.
- `create or replace view` can only append columns — `payee` must go last in the
  select list.
- Demo-mode `isTransaction` validator must accept `payee` or demo rows drop it.

## Rollback

Revert migration is a new migration dropping the column — safe because `payee`
is additive and never the only carrier of merchant info (note concat retained).
