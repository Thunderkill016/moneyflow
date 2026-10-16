# Event budgets — research + specification (D2)

**Status:** implemented — verified; deployment pending owner approval
**Execution state:** verification complete
**Active role:** agent — bounded slice below
**Permission scope:** code + migration files + tests; NO production apply, NO deploy
**Owner:** agent (Devin)
**Issue/PR:** gap D2 in `RESEARCH_TOP_FINANCE_APPS.md` §10 (owner task: implement on `feat/mobile-theme`)
**Last updated:** 2026-10-16

## Research

Vietnamese budgeting runs on occasions, not calendar months: Tết, đám cưới,
du lịch, mùa tựu trường. The local leader (Money Lover) ships "Events &
Travel Mode" — a budget scoped to an event — as a signature feature
(research §6.6, verdict `ADAPT`: "event = tag-scope + date range + limit,
not a parallel wallet"). D1 (`debts`) is the direct precedent for shape:
a tracked record + reviewed SECURITY DEFINER writes + RLS select-only,
never a second ledger.

## Repository reconnaissance

Existing seams this slice reuses:

- `transaction_entries` per-category legs + `budget_progress`'s
  `entry.amount_minor < 0 → -amount` accounting — the honest spend math.
- `RealStore.loadTransactionsInRange(from, to)` — the activity feed's
  range read, used for the read-only drill.
- `Transaction.splitLines` — feed-split awareness so a split expense's
  in-scope leg matches the view's per-entry math.
- `budgetState` / `monthPace` / `MfTickBar` — state vocabulary and the
  "hôm nay" marker pattern from `planning_page.dart`.
- Debts conventions: advisory-lock + `creation_intent` idempotent create,
  `p_expected_updated_at` stale-write update, soft delete, RLS
  select-only + `guard_oauth_mutation`, menu entry with no demo seam.

## Specification

**`event_budgets`** — name (≤80), `start_date`/`end_date` (inclusive,
`end >= start`), `limit_minor`, `idempotency_key` + `creation_intent`
(create replay pinning), `updated_at`, `deleted_at` tombstone.
**`event_budget_categories`** — optional scope set: zero rows = every
expense counts ("Tất cả danh mục"); rows restrict spend to those
categories. Both FKs are composite `(id, user_id)` like every tenant
table; category FK is RESTRICT (same as `monthly_budgets` —
`delete_financial_category` already translates the violation into
`category_in_use`).

**`event_budget_progress` view** (security_invoker): the row + `category_ids`
array + `spent_minor` = sum of expense entry legs with `occurred_on` in
[start, end] and (no scope rows OR leg category in scope), tombstoned
events excluded. Transfers/income structurally excluded by `kind='expense'`.

**RPCs** (all `auth.uid()`-scoped, `search_path=''`, authentication_required
first — reviewed boundaries per `security_definer_contract.test.sql`):

- `create_event_budget(name, start, end, limit, category_ids[], idempotency_key)`
  — validates shape + ownership + expense-kind of every scope category;
  advisory-lock + `creation_intent` replay identical to `create_money_transaction`.
- `update_event_budget(id, name, start, end, limit, category_ids,
  expected_updated_at)` — FOR UPDATE + `stale_write` on drift; replaces
  the scope set atomically in the same transaction.
- `soft_delete_event_budget(id)` — tombstone only; ledger untouched.

**Phases are derived, never stored:** `upcoming` (today < start),
`active` (start ≤ today ≤ end), `closed` (today > end) — the brief's
"closed when end_date passes".

**Mobile surface:** "Sự kiện" on the authenticated dashboard menu (no demo
seam — honest absence, same as DebtsPage). List sections: active (progress
bar with day-pace marker, "Còn N ngày"), upcoming ("Bắt đầu dd/mm"), closed
("Đã kết thúc", final spent vs limit). Create/edit dialog: name, date-range
pickers, limit, category multi-select (expense only; none = all). Detail
page: progress + scope + the in-range in-scope transaction list via
`loadTransactionsInRange` filtered by the same predicate the view uses —
split-aware via `splitLines`, showing the in-scope portion of partial
splits so the list sums to the progress figure. Read-only drill: no delete
or edit affordances on rows.

## Implementation plan

1. Migration `20261016180000_event_budgets.sql` (supabase + generated
   `db/neon` twin): tables, scope table, indexes, triggers, RLS,
   `event_budget_progress`, three definer RPCs, grants/revokes.
2. `security_definer_contract.test.sql` inventory 66 → 69 + comments;
   `event_budgets.test.sql` pgTAP (create/validate/idempotency/progress/
   inclusive bounds/scope/transfer exclusion/stale-write/RLS/soft delete).
3. `mobile/lib/domain/events.dart`: `EventPhase`, day arithmetic,
   `EventBudget`/`EventDraft`, `eventSpentOfTransaction` (the drill
   predicate matching the view), scope label, error-token mapping.
4. `RealStore`: `loadEventBudgets` (view read), `createEventBudget`,
   `updateEventBudget` (expected_updated_at), `deleteEventBudget`.
5. `EventsPage` + `EventDetailPage` + `showEventFormDialog` in
   `mobile/lib/features/events/events_page.dart`; menu entry in
   `app.dart` (auth only — no demo seam, same as debts).
6. Tests: `events_test.dart`, `events_store_test.dart`,
   `events_page_test.dart`; FIXLOG + PROGRESS.

## Tasks

- [x] Migration + Neon twin + identity baseline + security inventory
- [x] pgTAP test (63 files pass in embedded harness)
- [x] Domain module + store RPC methods
- [x] Page + detail + form + menu wiring
- [x] Dart tests (domain 21 asserts, store 5, widget 9)
- [x] Gates: format, analyze, flutter test, pgtap, check:migrations,
  check:rls, check:knowledge, test:ci-policy
- [x] FIXLOG + PROGRESS, commit + push `feat/mobile-theme`

## Evaluation

Exact-head evidence (2026-10-16, head 432ecf7a + this diff):

- `flutter analyze` — clean, 0 issues.
- `flutter test` — **1321 tests, all pass** (includes 35 new D2 tests).
- `node scripts/neon-poc/run-pgtap.mjs` — **63 files, 0 failed**
  (incl. `event_budgets.test.sql`, 24 assertions) on a disposable
  embedded Postgres; production Neon untouched.
- `npm run check:migrations` + `check:rls` — pass (9/9 RLS checks).
- `npm run check:knowledge` — pass; `test:ci-policy` — 203/203.
- `npm run agent:doctor -- --json` — `ready:false` on environment
  freshness only (missing NEXT_PUBLIC_* env + docker capability);
  no policy blockers for this scope.
- Migration NOT applied to production Neon (files only, per scope).

## Risks / boundaries held

- Never a second ledger: creating/editing/deleting an event writes no
  `financial_transactions` row; spent is computed, never stored.
- Never invent numbers: `spent_minor` is a SQL aggregate over real
  `transaction_entries`; the drill list sums to the same predicate.
- Transfers never count (product invariant — `kind='expense'`).
- RLS select-only + definer-only writes + `guard_oauth_mutation` on both
  tables; every public FK carries a left-prefix cover index.
- Idempotent create (lost-response replay returns the same row id);
  update fails closed on `stale_write`.

**WAIVED sub-scope (explicit, with reason):**

- *Account/wallet scope* (research task column mentions it): the brief's
  minimum is name/dates/limit/category-set; a second filter dimension
  adds picker + view complexity for marginal value — revisit if asked.
- *Event picker on capture / explicit transaction tagging*: derived
  linkage (date range ∩ category scope) answers "đi Đà Lạt hết bao nhiêu
  rồi" without a schema change to the ledger or capture ceremony. A
  stored `event_id` on transactions is a follow-on only if tagging
  across boundaries is asked for.
- *Auto-close summary / notification at end date*: the closed section is
  the summary; a push notification needs a scheduled job — no seam today.
- *Manual early-close*: editing `end_date` covers it.
- *One-off future-dated planned expense* (research D2 second clause —
  Simplifi 5.2): deferred to its own slice; it is a ledger row kind, not
  a budget property.

## Rollback

Migration is additive (two tables, one view, three functions — no edits
to existing objects). Mobile surface is additive (new page + one menu
row). Rollback = drop the objects + remove the menu item; ledger rows
are untouched by construction.
