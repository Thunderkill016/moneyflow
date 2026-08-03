# MoneyFlow — competitive capability gap matrix

- **Status:** active capability roadmap
- **Audit date:** 2026-08-03
- **Owner direction:** mature existing MoneyFlow capabilities to competitive depth; validation belongs inside each workstream and does not freeze development
- **Code baseline:** `main@45b6f22de80aa7c1fd67f2f402f4ffd6bd147cc8`
- **Implementation authority:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Competitive evidence:** `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`

## 1. Decision boundary

MoneyFlow already has most MVP modules and several areas are deeper than earlier status documents claimed. The objective is not to add every category advertised by competitors. It is to complete the workflows already present.

“Competitive depth” means:

- entry, review, correction, history, reporting and export connect coherently;
- financial states and calculations are explicit;
- mistakes remain recoverable;
- related modules share ledger facts instead of duplicating them;
- mobile, authenticated production and tenant isolation are part of acceptance;
- automation remains deterministic, reviewable and reversible.

It does not mean bank sync, AI advice, OCR, household finance, investments, full FX accounting, native mobile, envelope-budget cloning or an architecture rewrite.

## 2. Corrected current position

### Strong or substantially implemented

- integer VND and safe-integer boundaries;
- structural income, expense, split expense and balanced transfers;
- transfer neutrality in reports;
- RLS, tenant isolation, narrow financial RPCs and idempotency;
- transaction create/edit/soft-delete/restore, text/kind/account/category/date/amount filtering, canonical URL state and filtered totals;
- account create/edit/archive/restore, per-currency totals and viewer-scoped register/detail;
- dashboard one-RPC healthy path plus schema-skew fallback;
- import parsing, provenance, dry-run, duplicate planning and atomic approval;
- week/month/year reports with previous-period comparison and trends;
- period CSV plus date-range CSV/JSON export;
- current-month recurring occurrences linked to transactions;
- goals with target, allocated amount, deadline and planned-daily pace;
- responsive, long-Vietnamese and rich-VND automated evidence;
- risk-proportional CI, real CodeQL analysis, secret scanning and pgTAP.

### Present but incomplete

- account-level trends/export and reconciliation workflow;
- ledger-wide review and batch correction;
- budget history and drill-down;
- recurring occurrence history/lifecycle/matching;
- goal contribution history and lifecycle;
- report custom ranges and drill-down;
- import batch/mapping UX;
- export portability/restore contract;
- onboarding, deep state coverage and physical-device proof;
- provider-side public-beta controls;
- performance acceptance at realistic scale.

### Actually absent

- account reconciliation;
- authenticated persisted user rules;
- general ledger review state;
- financial mutation audit trail;
- documented full restore path.

### Status anchors

| Capability | Audited status |
|---|---|
| Accounts | **Implemented, partial; register/detail merged** |
| Transactions | **Implemented, partial; date/amount filters merged** |
| Reports | **Implemented, moderate depth** |
| Recurring commitments | **Implemented, partial occurrence model** |
| Recurring income | **Implemented, partial occurrence model** |
| Savings goals | **Implemented, partial depth** |
| Export | **Implemented, stronger than old docs claim** |
| Import provenance | **Implemented + production evidenced** |

## 3. Capability matrix

| Capability | Merged behavior now | Real remaining gap | Reference patterns | Priority |
|---|---|---|---|---:|
| Accounts | account kinds, initial/derived balance, create/edit/archive/restore, per-currency totals, same-currency transfers, viewer-scoped register/detail with signed impacts | reconciliation, account-level trends/export, richer register controls and explicit hidden/report semantics | YNAB, Actual, Wallet | P0/P1 |
| Transactions | income/expense/transfer/split, text + kind/account/category/date/amount filters, canonical URL state, edit, soft delete/undo, grouped list, truthful filtered totals and pagination | review state, multi-select, bounded bulk correction, split-line editing and non-sensitive mutation audit | Copilot, Monarch, Actual | P1 |
| Reconciliation | absent | statement date/balance, pending/cleared/reconciled, exact difference, adjustment transaction, lock/reopen, history, RLS | YNAB, Actual | P0 |
| Budgets | current-month category limit and calculated spent, CRUD | period history, previous-period view, copy month, rollover policy, transaction drill-down | YNAB, Monarch, Wallet | P1 |
| Recurring commitments | template, due date, current-month occurrence, payment transaction link, pay/undo and reserved total | surfaced history, upcoming/due/overdue/skipped/cancelled states, edit-one/future, calendar/reminders, matching recorded transaction | Copilot, Rocket Money, Money Lover | P1 |
| Recurring income | template, due date, current-month receipt occurrence and expected total | history, richer lifecycle, calendar/reminders and matching | Copilot, Money Lover | P1 |
| Savings goals | target, allocated, deadline, planned-daily pace, basic allocation/archive | contribution ledger, funding source, pause/complete/reopen, drill-down and correction linkage | Monarch, Money Lover, Wallet | P1 |
| Reports | week/month/year, current + previous comparable period, change %, category shares, trend, transfer exclusion | arbitrary report range, account/type dimensions, clickable transaction drill-down and shared filters | Monarch, Copilot, Wallet | P1 |
| Export | period CSV; date-range transaction/candidate/all CSV or JSON; formula-safe UTF-8 | account/kind filter parity, schema version, broader planning export, export-before-delete and documented restore | Actual, Firefly III, Sheets | P2 |
| Import/Inbox | CSV/XLSX/PDF, direct CSV, candidates, raw source, provenance, external IDs/fingerprint, dry-run, duplicate/transfer planning, atomic approval | mapping presets, richer batch history, bulk correction, duplicate-resolution and resume/retry UX | Actual, Firefly III, Copilot | P1 |
| Rules | local deterministic parse rules | authenticated storage, RLS, order/stage, preview, enable/disable, version/audit and management UI | Actual, Firefly III, Monarch | P2 |
| Dashboard | one bundled authenticated RPC, fallback, balances/activity/planning/Inbox count | direct drill-down, evidence-based attention states, measured large-ledger acceptance | Copilot, Monarch, Rocket Money | P2 |
| Auth/security | app auth/recovery, neutral responses, CAPTCHA token plumbing, CSP/headers, hardened public ingestion, scanning | hosted provider settings, CAPTCHA enforcement, rate limits, breached-password control and edge rules | issue #174 | P0 for public beta |
| Mobile/accessibility | responsive dark/light, broad matrix, 44px targets, modal and money-value fixes, rich-VND/long-label coverage | physical devices and remaining validation/destructive/Inbox/planning states | issue #72 | P1 |
| Performance/audit | dashboard bundle/fallback, bounded window, k6 profiles, pgTAP | staging load acceptance, large-ledger benchmarks, FK-index candidate and mutation audit | PostgreSQL/Supabase evidence | P2 |

## 4. Module gap details

### 4.1 Accounts and reconciliation

Already implemented:

- cash, bank, e-wallet, credit-card and savings representations;
- initial and ledger-derived balances;
- add, edit, archive and restore;
- per-currency totals without unsafe FX aggregation;
- same-currency transfers;
- viewer-scoped account register/detail with signed ledger impacts and separate transfer movement totals.

Build next:

1. reconciliation specification and invariant tests;
2. reconciliation session/domain implementation;
3. mobile account reconciliation workflow;
4. reconciliation history;
5. account-level export/trends and richer register controls.

Do not implement direct balance overwrite. Differences are resolved through explicit financial adjustment transactions.

### 4.2 Transaction operations

Already implemented:

- search;
- kind, account, category, date and amount range filters;
- canonical shareable URL state for supported filters;
- single-record edit with filter-preserving correction context;
- soft delete and undo/restore;
- split expense creation;
- grouped/paginated register and totals derived from the complete matching set.

Build next:

- ledger review state distinct from Inbox candidate status;
- multi-select and safe bulk category/review changes;
- eligible type changes with preview/guards;
- split-line correction workflow;
- non-sensitive mutation audit.

Date/amount filtering does not imply cleared, reviewed or reconciled financial state.

### 4.3 Budgets

Already implemented:

- current-month category limits;
- current-month spent from ledger facts;
- CRUD and safe VND handling.

Build next:

- month navigation/history;
- comparison with prior month;
- copy previous month;
- explicit rollover/no-rollover decision;
- contributing-transaction drill-down;
- stable recalculation after transaction/category edits, deletes and restores.

### 4.4 Recurring commitments and income

Already implemented:

- templates, due dates, account/category assignment;
- current-month occurrence records;
- transaction linkage and paid/received state;
- undo and reserved/expected totals.

Build next:

- user-visible occurrence history;
- upcoming, due, overdue, paid/received, skipped and cancelled states;
- edit one occurrence versus future schedule;
- match independently recorded transactions;
- duplicate prevention and confidence/review behavior;
- calendar/timeline, reminders and dashboard attention.

### 4.5 Goals

Already implemented:

- target, allocation, deadline, planned-daily pace and archive.

Build next:

- contribution ledger/history;
- explicit source/funding semantics;
- pause, complete, reopen and archive lifecycle;
- drill-down and correction behavior;
- dashboard/report integration from real contribution facts.

### 4.6 Reports

Already implemented:

- week/month/year;
- current and previous comparable periods;
- income, expense, net, category shares and trends;
- transfer exclusion;
- period CSV export.

Build next:

- arbitrary date range in the report surface;
- account and transaction-type dimensions;
- chart/category drill-down to exact transactions;
- shared filter state and context-preserving back navigation;
- recurring/goal context where facts support it.

Transaction-ledger range filters are implemented but are not yet a shared report filter system.

### 4.7 Import, Inbox, rules and export

Import/provenance is already strong and production evidenced.

Build next:

- mapping presets;
- visible batch history/status;
- bulk candidate correction and duplicate resolution;
- clearer retry/resume states;
- consistent review language between Inbox and ledger;
- authenticated persisted rules only after the rule contract is specified.

Export already supports date ranges, CSV/JSON and candidate/all bundles.

Build next:

- account/kind filter parity;
- stable documented schema versions;
- broader user-owned planning-data coverage;
- export-before-delete;
- documented restoration/import path.

### 4.8 Dashboard, onboarding and mobile

Already implemented:

- one authenticated dashboard bundle RPC;
- schema-skew fallback;
- responsive route matrix;
- rich-VND/long-label regression;
- 44px target, modal, icon-name and money-wrap remediations.

Build next:

- direct drill-down from dashboard facts;
- attention states based on recorded budgets/occurrences/review/reconciliation;
- first-account-to-first-transaction continuity;
- keyboard/error/retry completion;
- remaining validation/destructive/Inbox/planning state coverage;
- physical-device acceptance.

## 5. Corrected issue map

| Issue | Completed evidence | Remaining |
|---|---|---|
| #53 domain benchmark | import provenance/dry-run/atomic approval complete; many DB invariants and performance foundations complete; account register and transaction range filters merged | reconciliation, authenticated rules, mutation audit and final performance/index acceptance |
| #72 UI audit | 20 routes/dialogs, rich VND/long Vietnamese, phone rows, report clipping, 44px/modal/accessibility batches; transaction range controls covered by browser/UI audit | validation/destructive/Inbox/planning states and physical devices |
| #172 product assessment | useful market-validation warnings | old scoring and feature-freeze direction are historical/superseded |
| #174 provider controls | source/app readiness and read-only baseline complete | hosted provider writes and production verification |

## 6. Delivery waves

Tracks may run in parallel when their domain boundaries do not conflict.

### Wave 1 — highest leverage

- reconciliation specification and invariant tests;
- transaction review-state contract;
- budget period history and transaction drill-down;
- arbitrary report range and transaction drill-down contract;
- remaining onboarding/mobile error-state completion;
- PR #211 database-index canary after current-main revalidation;
- provider controls only under explicit write permission.

### Wave 2 — connected planning

- reconciliation database and product workflow;
- recurring occurrence history/lifecycle;
- recurring transaction matching;
- goal contribution history/lifecycle;
- report shared filter state;
- richer account register controls and account trends/export.

### Wave 3 — efficiency and ownership

- bounded bulk transaction correction;
- mapping presets and Inbox batch UX;
- export schema/coverage/restore path;
- dashboard attention/drill-down;
- staging and large-ledger performance acceptance;
- non-sensitive mutation audit.

### Wave 4 — deterministic automation

- authenticated persisted rules;
- rule ordering/preview/version/audit;
- rule management UI;
- integration with import review, recurring matching and ledger review.

## 7. Validation contract

Validation is not a separate phase that freezes development.

Each implementation PR carries its own proof:

- financial/data: tests first, migration replay, pgTAP, browser and affected production verification;
- UI: responsive artifacts and physical-device proof for claims about real-device usability;
- provider: configuration export, one reversible change, rollback and production smoke;
- performance: measured baseline and acceptance, never intuition;
- documentation/status: update `CURRENT_PROJECT_MEMORY.md` in the same PR.

## 8. Superseded claims

Do not repeat these as current gaps:

- transaction date/amount filters are missing or candidate-only;
- account register/detail is missing;
- reports have no previous-period comparison or trends;
- recurring items have no occurrence-to-transaction linkage;
- goals have no deadline or pace calculation;
- export is only a simple monthly CSV;
- import provenance/dry-run/atomic approval are future work;
- dashboard still uses the original authenticated fan-out;
- rich VND, long Vietnamese, 44px targets and modal placement are wholly untested;
- CAPTCHA application plumbing is absent;
- all feature work must wait for a seven-day validation phase.
