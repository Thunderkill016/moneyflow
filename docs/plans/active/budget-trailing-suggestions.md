# Budgets: trailing-average limit suggestions + one-click apply

## Repository reconnaissance

- `budget_progress` only carries categories that already have a monthly
  budget row, so it can never see the unbudgeted spending a suggestion
  exists to find — the evidence read must come from `transaction_feed`.
- `transaction_feed` exposes `split_lines` (per-category `amount_minor`
  jsonb), and `mapTransactionFeedRow` in `src/server/finance.ts` is the
  single maintained mapper — reusing it keeps suggestion attribution
  identical to `spent_minor` in `budget_progress`.
- `src/lib/planning/budgets.ts` owns month math, spend sums and rollover;
  suggestions belong in the same deterministic module.
- `BudgetsWorkspace` already passes through one loader with viewer-scoped
  queries; the page merges `result.budget` into local state after
  `saveBudgetAction` — the same path a one-click apply needs.
- Demo seeds only covered ~4 days of history, so a suggestion feature
  would have been invisible in demo without trailing-month rows.
- The e2e Supabase double missed the real PostgREST `lt` operator; any
  new query using it would have been an honest miss, not a fake pass.

## Research

The budgets comparison found one real gap: first-time setup forces every
limit to be typed by hand while the ledger already contains the evidence
for a reasonable starting figure. Money Lover and MISA have no
history-derived suggestions; YNAB auto-fills targets; Monarch and Copilot
suggest from spend. MoneyFlow can offer the suggestion honestly — shown
with its evidence window, applied only by explicit action — without
claiming auto-allocation.

## Specification

- `budgetSuggestions(transactions, monthStart, windowMonths = 3)` returns
  a `Map<categoryId, {amount, monthsWithData}>`:
  - Window: the `windowMonths` completed months before `monthStart`
    (`[shiftBudgetMonth(monthStart, -n), monthStart)`).
  - Expense rows only; transfers and income never feed a suggestion.
  - Split rows attribute each line to its own `categoryId` — identical to
    `budget_progress.spent_minor`, so a suggestion cannot disagree with
    the "Đã chi" figure a saved budget later reports.
  - `amount = round(window total / windowMonths)` — quiet months count
    toward the average because a monthly limit must cover them.
  - `monthsWithData` counts months that recorded at least one đồng so the
    UI can disclose partial evidence.
  - Averages below `BUDGET_SUGGESTION_MIN_AMOUNT` (10.000 ₫) produce no
    suggestion — noise, not signal.
- `BudgetsWorkspace.suggestions: Record<categoryId, BudgetSuggestion>`,
  populated in demo (from the same resolved demo ledger) and in
  authenticated mode (paginated `transaction_feed` read bounded to the
  trailing window, tenant- and kind-filtered).
- UI: a "Gợi ý từ chi tiêu gần đây" section between the month summary and
  the budget list, visible only while unbudgeted categories have
  suggestions. Each card states the window and `monthsWithData` in words.
  "Áp dụng" runs the identical `save` path as manual entry; "Tùy chỉnh"
  opens the same `BudgetDialog` prefilled (`initialLimit`), category
  locked to the suggestion's.
- Suggestion rows derive from live `budgets` state — an applied or
  manually created budget removes its suggestion immediately.

## Implementation plan

- Domain first (TDD): `budgetSuggestions` +
  `BUDGET_SUGGESTION_MONTHS`/`MIN_AMOUNT` in `src/lib/planning/budgets.ts`.
- Loader: seventh parallel read — `readAllPages` over `transaction_feed`
  (deterministic `occurred_on,created_at,id` ordering) bounded to
  `[suggestionWindowStart, monthStart)`; `Object.fromEntries` of the
  domain map. Export `TRANSACTION_FEED_COLUMNS` from `finance.ts`.
- Demo: extend `DEMO_SEEDS` with trailing-month "Hóa đơn"/"Giải trí" rows
  so the suggestion section demonstrates real arithmetic in demo.
- Component: `suggestionRows` from `availableCategories`; suggestion
  section with apply/customize actions; `suggestionDraft` state;
  `BudgetDialog.initialLimit` prop.
- Harness: add `lt` to the e2e Supabase double's PostgREST filter set.

## Tasks

- [x] Domain: `budgetSuggestions` + constants in
      `src/lib/planning/budgets.ts`; four tests (window average, split
      attribution + non-expense exclusion, viewed-month anchoring, noise
      floor + blank category).
- [x] Server: `suggestions` on `BudgetsWorkspace` (all five return
      sites); paginated `transaction_feed` read; `readAllPages` import;
      `TRANSACTION_FEED_COLUMNS` export.
- [x] Demo: five trailing seeds on unbudgeted categories; fixture
      workspace `suggestions: {}`.
- [x] UI: suggestion section + apply + customize; `initialLimit` on
      `BudgetDialog`.
- [x] Harness: `lt` filter in `e2e/auth/supabase-double.mjs`.
- [x] Contracts: tenant-predicate pinned for the new feed read; search
      test count updated; three capability goldens regenerated for the
      extended demo ledger.

## Evaluation

- 43/43 budgets-domain tests green (was 39).
- 1912/1912 unit tests green, including regenerated capability goldens.
- Typecheck and ESLint clean on every touched file.
- Demo-browser verification on `/budgets`: suggestion cards render with
  evidence disclosure; one-click apply creates a normal budget row;
  zero console errors.

## Out of scope

- Weekly/quarterly suggestion windows, projected overspend ("sẽ vượt
  ngày X"), auto-applying suggestions without a user action, and
  suggestion history — the ledger is the only provenance needed here.
