# MoneyFlow — competitive capability gap matrix

- **Status:** active gap analysis
- **Decision date:** 2026-08-02
- **Owner direction:** mature existing MoneyFlow capabilities to competitive depth; validation belongs inside each workstream and does not freeze development
- **Baseline:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Companion source:** `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`

## 1. Decision boundary

MoneyFlow already has most MVP modules. The current objective is not to add every category advertised by competitors. It is to make the capabilities that already exist feel complete, connected and trustworthy.

This matrix supersedes the validation-first sequencing in PR #215 and the earlier roadmap sentence that said to stop parity development entirely.

“Competitive depth” means:

- the core job is complete from entry to correction, history, reporting and export;
- states and calculations are explicit;
- users can recover from mistakes;
- related modules share data instead of acting as isolated screens;
- mobile and authenticated production behavior are included in acceptance;
- automation remains reviewable and reversible.

It does not mean:

- copying one competitor wholesale;
- matching bank sync, AI, OCR, family finance, investment, credit-score or marketplace services;
- adopting full envelope budgeting;
- rewriting the modular monolith;
- adding scope only because a competitor markets it.

## 2. Current position

### Already strong

- integer VND and safe-integer boundaries;
- structural income, expense and balanced transfers;
- transfer neutrality in reports;
- RLS, tenant isolation and narrow financial RPC boundaries;
- edit, soft delete and restore;
- multiple accounts;
- controlled import, provenance, duplicate planning and atomic approval;
- CSV export safety;
- modular-monolith architecture;
- layered static, database, browser and security verification.

### Present but basic or fragmented

- account lifecycle and account-level understanding;
- transaction search, review and batch correction;
- category budgets;
- recurring commitments and recurring income;
- savings goals;
- weekly, monthly and yearly reports;
- rules and import workflow UX;
- onboarding, mobile flow and public-beta Auth controls.

### Missing but directly extends existing capabilities

- account reconciliation;
- ledger-wide pending/cleared/reconciled or review state;
- persistent authenticated rules;
- period comparison and report drill-down;
- budget history/rollover decisions;
- recurring-to-transaction matching;
- goal contribution history and pace;
- complete portability/backup contract.

## 3. Capability matrix

| Capability | MoneyFlow now | Competitive depth to reach | Reference patterns | Priority |
|---|---|---|---|---:|
| Accounts and balances | Multiple cash, bank, e-wallet, credit and savings representations; derived balances; archive/edit | Account detail/register, clear archive vs reporting semantics, statement balance comparison, reconciliation history, safe adjustments | YNAB, Actual, Wallet | P0 |
| Transactions | Create income/expense/transfer, search/filter, edit, soft delete/restore | Ledger-wide review state, richer filters, list-context correction, bounded bulk actions, saved/recent filter behavior, reconciled-history warnings | Copilot, Monarch, Actual | P0 |
| Reconciliation | Absent | Pending/cleared/reconciled states, statement date/balance, exact difference, lock/reopen, explicit adjustment transaction, audit and RLS | YNAB, Actual | P0 |
| Budgets | Monthly category limits and spent values | Period history, remaining/overspent explanation, optional rollover policy, transaction drill-down, copy previous month, alerts based only on recorded facts | YNAB, Monarch, Wallet | P1 |
| Recurring commitments/income | Templates, due/pay/undo style workflows | Calendar/timeline, next due and overdue states, observed transaction matching, duplicate prevention, reminder state, occurrence history and cash-flow view | Copilot, Rocket Money, Money Lover | P1 |
| Savings goals | Create and allocate | Contribution ledger/history, target date, required pace, pause/complete/reopen, linked account or explicit funding source, progress drill-down | Monarch, Money Lover, Wallet | P1 |
| Reports | Weekly/monthly/yearly summaries | Custom date range, previous-period comparison, account/category drill-down, income/expense/net trends, cash-flow view, filter-consistent export | Monarch, Copilot, Wallet, Sheets | P1 |
| Import and Inbox | Strong provenance, duplicate planning, dry-run and atomic approval | Mapping presets, batch history, bulk review/edit, clearer duplicate resolution, retry/resume states, consistent review semantics with ledger | Actual, Firefly III, Copilot | P1 |
| Rules | Local parse rules only | Persisted per-user rules with RLS, explicit order/stage, preview, enable/disable, versioning, audit, deterministic conflict handling | Actual, Firefly III, Monarch | P2 |
| Export and ownership | Safe CSV export | Filtered exports, complete account/transaction export, stable schema/version metadata, documented restore/import path, deletion/export trust flow | Actual, Firefly III, Sheets | P2 |
| Dashboard | Balances, income, expense, net, recent and planning state | Exception-oriented cards, direct drill-down, recurring/budget/goal attention states, no unsupported spending recommendation | Copilot, Monarch, Rocket Money | P2 |
| Onboarding and quick capture | Existing onboarding and quick capture | First account to first transaction continuity, remembered safe defaults, keyboard-safe mobile entry, clear errors/retry, under-ten-second routine path | Money Lover, MISA, Copilot | P1 |
| Auth and public readiness | Email/password, OAuth, recovery and repository-side guards | Provider policy parity, callback/origin verification, confirmation/recovery acceptance, CAPTCHA/rate-limit/breached-password controls, production smoke | Current issue #174 | P0 for public beta |
| Mobile/PWA/accessibility | Responsive light/dark web UI and browser audit | Physical-device acceptance, touch targets, virtual keyboard, offline/error recovery boundaries, install/navigation stability, accessible icon names and financial-value wrapping | Existing issue #72 and product references | P1 |
| Audit/performance | Idempotency, tests and some query hardening | Non-sensitive mutation audit, realistic data benchmarks, cache invalidation tests, large-ledger responsiveness | Firefly III, Supabase/PostgreSQL evidence | P2 |

## 4. What is actually missing by module

### 4.1 Accounts

The product can represent several account types and calculate balances, but account management does not yet reach ledger-product depth.

Missing depth:

- a complete account register with balance-changing history;
- reconciliation sessions and history;
- explicit difference between archived, hidden and excluded from reports;
- controlled balance correction through a transaction rather than direct overwrite;
- clearer behavior for credit/savings representations already exposed by the product;
- account-level trends and export.

### 4.2 Transactions

The write model is strong, but the operational workflow is still oriented around single-record actions.

Missing depth:

- a general “needs review” state outside Inbox;
- multi-select and bounded bulk category/type/review operations;
- richer account/category/type/date/amount filters and predictable reset behavior;
- faster list-context editing;
- explicit warning when changing reconciled history;
- better linkage between transactions, recurring occurrences, import provenance and goals;
- review completion and correction history.

### 4.3 Reconciliation

This is the most important absent capability inside the existing account/transaction domain.

Required depth:

- pending, cleared and reconciled semantics;
- statement date and statement balance;
- cleared total, uncleared total and exact difference;
- completion only at zero difference or after an explicit adjustment transaction;
- lock and reopen with audit evidence;
- transfer, split, delete and restore behavior;
- RLS and tenant-isolation tests;
- physical-mobile workflow.

### 4.4 Budgets

Budgets exist, but they are still a monthly limit screen rather than a complete management loop.

Missing depth:

- view and compare past budget periods;
- copy last month or intentionally start clean;
- decide and explain rollover behavior;
- drill from budget category into contributing transactions;
- show remaining, overspent and no-data states clearly;
- optional factual alerts without inventing future income;
- stable behavior when categories are archived or transactions are edited/deleted.

### 4.5 Recurring commitments and income

Templates exist, but they are not yet connected strongly enough to actual transaction history.

Missing depth:

- upcoming calendar/timeline;
- due, overdue, paid, skipped and cancelled occurrence states;
- match an observed transaction to an expected occurrence;
- prevent duplicate posting or duplicate marking;
- edit one occurrence versus future schedule;
- occurrence history;
- reminders and dashboard attention states;
- monthly expected commitments/income view without treating expectations as posted facts.

### 4.6 Savings goals

Goals exist, but progress is too shallow compared with mature products.

Missing depth:

- contribution history;
- target date and pace calculation;
- source account/funding semantics;
- pause, complete, reopen and archive states;
- edit/delete correction behavior;
- drill-down from progress to contributing records;
- dashboard and report integration.

### 4.7 Reports

Current weekly/monthly/yearly reports answer basic period questions but not deeper investigation.

Missing depth:

- custom date ranges;
- comparison with previous period;
- drill-down from chart/summary to exact transactions;
- account, category and transaction-type dimensions;
- income, expense, net and balance trends;
- recurring commitment and goal context;
- consistent filters between report and export;
- large-VND and empty-state behavior.

### 4.8 Import, Inbox and rules

The data boundary is strong; the user workflow can become significantly more complete.

Missing depth:

- reusable column/mapping presets;
- import batch history and status;
- bulk candidate correction;
- duplicate-resolution explanations and actions;
- resume/retry after partial operational failure without duplicate commit;
- persisted authenticated rules;
- rule priority, preview and audit/version history;
- shared review semantics between Inbox and normal transactions.

### 4.9 Export and ownership

CSV export exists and is safe, but competitive ownership needs a fuller contract.

Missing depth:

- export by active filters/date/account;
- stable documented columns and format version;
- complete export of related user-owned planning data where appropriate;
- a documented restore/import path;
- export-before-delete flow;
- clearer confirmation that users can leave with usable data.

### 4.10 Onboarding, mobile and security

These are existing surfaces that still need product-level completion.

Missing depth:

- uninterrupted account → first transaction → first insight onboarding;
- physical Android acceptance for keyboard, sheets/dialogs and touch targets;
- long Vietnamese text and large VND resilience;
- consistent network/error/retry states;
- provider-side password, callback, email, CAPTCHA and rate-limit controls;
- production registration/login/recovery acceptance;
- PWA/navigation stability where the current application already exposes it.

## 5. Recommended implementation order

### Wave 1 — financial trust and transaction operations

Run as focused PRs, with database and UI work separated where useful:

1. account reconciliation domain and database contract;
2. account reconciliation workflow;
3. ledger-wide review state and transaction filters;
4. bounded bulk correction;
5. account lifecycle/register clarity;
6. provider public-beta controls in parallel under explicit permission.

Why first: these capabilities determine whether balances can be trusted and corrected at scale.

### Wave 2 — planning modules become complete loops

1. budget period history, drill-down and copy/rollover policy;
2. recurring occurrence model and transaction matching;
3. recurring calendar/reminders and dashboard attention;
4. goal contribution history, target pace and lifecycle;
5. integration regressions across transaction edit/delete/restore.

Why second: MoneyFlow already exposes budgets, commitments and goals; leaving them basic makes the product feel unfinished.

### Wave 3 — reports and ownership

1. custom date ranges and previous-period comparison;
2. chart/summary drill-down into transactions;
3. account/category/type trend views;
4. filter-consistent export;
5. export schema/version and restore-path documentation;
6. large-ledger performance benchmarks.

Why third: mature reports should be built on stable transaction, reconciliation and planning semantics.

### Wave 4 — automation and workflow efficiency

1. mapping presets and import batch history;
2. bulk Inbox review and clearer duplicate resolution;
3. authenticated persisted rules with RLS;
4. rule ordering, preview, version and audit;
5. recurring/import/review integration.

Why fourth: automation should accelerate a trustworthy ledger, not define an uncertain one.

### Wave 5 — experience completion

1. onboarding continuity and remembered safe defaults;
2. quick-capture speed and error recovery;
3. physical-device and accessibility remediation;
4. exception-oriented dashboard improvements;
5. production Auth/recovery polish;
6. supervised beta and commercial evidence.

Why fifth: this wave removes cross-product roughness after the underlying workflows are complete; small mobile/accessibility P0/P1 fixes may still be pulled earlier.

## 6. Parallelization

Allowed parallel tracks after each track has a focused specification:

- Track A: reconciliation/account/transaction trust;
- Track B: budgets, recurring and goals;
- Track C: reports/export/performance;
- Track D: import/rules/review workflow;
- Track E: mobile/onboarding/security.

Do not parallelize changes that independently modify the same transaction-state or ledger invariant. Those must share one domain contract first.

## 7. Definition of competitive depth

A capability is not complete merely because its page exists.

It is complete when:

- create, view, edit, archive/delete and recovery states are defined where applicable;
- calculations have domain and database tests;
- list/detail/dashboard/report/export representations agree;
- empty, loading, error, retry and large-data states exist;
- mobile physical-device behavior is verified;
- tenant ownership and production behavior are verified for high-risk paths;
- documentation and product memory reflect the merged behavior;
- no P0/P1 remains in that capability.

## 8. Explicit non-goals

The following are not counted as current gaps:

- bank sync;
- AI financial advice;
- OCR/receipt capture;
- household/shared finance;
- investments, crypto or credit scoring;
- multi-currency accounting;
- native mobile applications;
- financial-services marketplace functions;
- full YNAB envelope methodology;
- local-first/CRDT architecture rewrite.

They require separate owner decisions and research if revisited.

## 9. Final conclusion

MoneyFlow does not need more disconnected modules. It needs the existing modules to become connected operational loops.

The biggest competitive gaps are, in order:

1. reconciliation and account trust;
2. transaction review and bulk correction;
3. budget/recurring/goal depth;
4. report comparison and drill-down;
5. persistent rules and import workflow efficiency;
6. complete portability;
7. mobile/onboarding/public-beta completion.
