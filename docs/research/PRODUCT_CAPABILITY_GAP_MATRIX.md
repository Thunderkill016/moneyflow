# MoneyFlow — competitive capability gap matrix

- **Status:** active capability roadmap
- **Audit date:** 2026-08-02
- **Owner direction:** mature capabilities already used in MoneyFlow; do not prioritize reconciliation or other new subsystems without validated need
- **Code baseline:** `main@923fc7b80ada67e548628ef2e85b0837780f9ed3`
- **Implementation authority:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Competitive evidence:** `docs/research/PRODUCT_COMPETITIVE_MEMORY.md`

## 1. Decision boundary

MoneyFlow already has most MVP modules. The objective is to complete the workflows already present:

- entry, search, review, correction, history, reporting and export connect coherently;
- financial states and calculations stay explicit;
- mistakes remain recoverable;
- related modules share ledger facts;
- mobile, authenticated production and tenant isolation belong to acceptance;
- automation remains deterministic, reviewable and reversible.

This does not authorize bank sync, AI advice, OCR product identity, household finance, investments, full FX accounting, native mobile, envelope-budget cloning, reconciliation-first sequencing or an architecture rewrite.

## 2. Corrected current position

### Strong or substantially implemented

- integer VND and safe-integer boundaries;
- structural income, expense, split expense and balanced transfers;
- transfer neutrality in reports;
- RLS, tenant isolation, narrow financial RPCs and idempotency;
- transaction create/edit/soft-delete/restore, search and kind/account/category filters;
- account create/edit/archive/restore and per-currency totals;
- dashboard one-RPC path plus schema-skew fallback;
- import parsing, provenance, dry-run, duplicate planning and atomic approval;
- week/month/year reports with previous-period comparison and trends;
- period CSV plus date-range CSV/JSON export;
- current-month recurring occurrences linked to transactions;
- goals with target, allocated amount, deadline and planned-daily pace;
- responsive, long-Vietnamese and rich-VND automated evidence;
- risk-proportional CI, CodeQL, secret scanning and pgTAP.

### Present but incomplete

- account-level history and running-balance understanding;
- ledger review state and batch correction;
- split-line correction;
- budget history and transaction drill-down;
- recurring occurrence history/lifecycle/matching;
- goal contribution history and lifecycle;
- report custom ranges and drill-down;
- import batch/mapping UX;
- export portability/restore contract;
- onboarding, deep state coverage and physical-device proof;
- provider-side public-beta controls;
- performance acceptance at realistic scale.

### Absent or deferred

- account reconciliation: absent and deferred until statement import/matching or validated demand;
- authenticated persisted user rules: absent;
- general ledger review state: absent;
- financial mutation audit trail: absent;
- documented full restore path: absent.

## 3. Capability matrix

| Capability | Merged behavior now | Real remaining gap | Priority |
|---|---|---|---:|
| Accounts | account kinds, initial/derived balance, create/edit/archive/restore, per-currency totals, same-currency transfers | account register/detail, running balance, account trends/export, explicit hidden/report semantics | P0 |
| Transactions | income/expense/transfer/split, search, kind/account/category filters, edit, soft delete/undo, grouped list and totals; PR #223 adds date/amount filters | review state, multi-select, bounded bulk correction, split-line editing and audit history | P0/P1 |
| Budgets | current-month category limit, calculated spent and CRUD | period history, prior comparison, copy month, rollover policy and transaction drill-down | P1 |
| Recurring commitments | template, due date, current-month occurrence, transaction link, pay/undo and reserved total | visible history, upcoming/due/overdue/skipped/cancelled, edit-one/future, matching and reminders | P1 |
| Recurring income | template, current-month occurrence/link and expected total | history, lifecycle, matching and reminders | P1 |
| Savings goals | target, allocation, deadline, planned-daily pace and archive | contribution ledger, funding source, pause/complete/reopen and drill-down | P1 |
| Reports | week/month/year, previous period, category shares, trends and transfer exclusion | arbitrary range, account/type dimensions, exact transaction drill-down and shared filters | P1 |
| Export | period CSV plus date-range transaction/candidate/all CSV/JSON | filter parity, schema version, planning-data coverage and restore docs | P2 |
| Import/Inbox | CSV/XLSX/PDF, candidates, provenance, dry-run, duplicate/transfer planning and atomic approval | mapping presets, batch history, bulk correction, duplicate resolution and retry/resume UX | P1 |
| Rules | local deterministic parse rules | authenticated storage, RLS, ordering, preview, version/audit and UI | P2 |
| Dashboard | bundled authenticated RPC, fallback, balances/activity/planning/Inbox count | direct drill-down, evidence-based attention and measured large-ledger acceptance | P2 |
| Auth/security | auth/recovery, neutral responses, CAPTCHA plumbing, CSP/headers, hardened ingestion and scanning | hosted provider enforcement, rate limits, breached-password controls and edge rules | P0 before wider beta |
| Mobile/accessibility | responsive dark/light, broad matrix, 44px targets, modal and money fixes | physical-device and remaining validation/destructive/Inbox/planning states | P0/P1 |
| Performance/audit | dashboard bundle/bounds, k6 profiles and pgTAP | staging load, large-ledger benchmarks, FK-index decision and mutation audit | P2 |
| Reconciliation | no merged workflow | deferred; revisit only after an evidence-backed statement workflow exists | deferred |

## 4. Current workstreams

### 4.1 Transaction operations

Already implemented:

- search;
- kind, account and category filters;
- single-record edit;
- soft delete and undo/restore;
- split expense creation;
- grouped/paginated register and filtered totals.

PR #223 adds:

- inclusive date range;
- inclusive amount range;
- canonical shareable filter URLs;
- explicit invalid-range errors;
- filter-preserving list-context correction.

Build next:

- review state distinct from Inbox candidate status;
- multi-select and safe bulk category/review changes with preview;
- split-line correction workflow;
- non-sensitive mutation audit.

### 4.2 Account understanding

Build next:

1. account detail route;
2. full account transaction register;
3. running balance after each ledger movement;
4. transaction drill-down and account-scoped export;
5. explicit archive/hide/report semantics.

This work does not require bank integration or reconciliation.

### 4.3 Budgets

Build next:

- month navigation/history;
- prior-month comparison;
- copy previous month;
- explicit rollover/no-rollover decision;
- contributing-transaction drill-down;
- stable recalculation after edits, deletes and restores.

### 4.4 Reports

Build next:

- arbitrary date range;
- account and transaction-type dimensions;
- chart/category drill-down to exact transactions;
- shared filter state and context-preserving back navigation;
- export following the active report filters.

### 4.5 Recurring and goals

Recurring next:

- occurrence history and lifecycle states;
- edit one versus future schedule;
- match independently recorded transactions;
- duplicate prevention and review behavior;
- reminders and dashboard attention.

Goals next:

- contribution ledger/history;
- explicit funding source;
- pause, complete and reopen;
- drill-down and correction linkage.

### 4.6 Import, Inbox and export

Import backend depth is already strong. Improve:

- mapping presets;
- visible batch history/status;
- bulk candidate correction and duplicate resolution;
- clear retry/resume states;
- consistent language between Inbox and ledger review.

Export next:

- account/kind filter parity;
- stable schema version;
- broader planning-data coverage;
- export-before-delete and documented restoration.

### 4.7 Mobile and provider completion

- first-account-to-first-transaction continuity;
- keyboard/error/retry completion;
- validation/destructive/Inbox/planning state evidence;
- physical Android/iOS acceptance;
- provider Auth/CAPTCHA/edge enforcement before wider public exposure.

## 5. Delivery waves

### Wave 1 — active user loops

1. transaction date/amount filters and correction context;
2. account register/detail and running balance;
3. budget history and transaction drill-down;
4. report custom range and transaction drill-down;
5. observed validation, destructive and physical-device defects.

### Wave 2 — review and planning depth

- transaction review state;
- bounded bulk correction;
- recurring occurrence history/lifecycle;
- recurring transaction matching;
- goal contribution history/lifecycle;
- report shared filter state.

### Wave 3 — efficiency and ownership

- mapping presets and Inbox batch UX;
- export schema/coverage/restore path;
- dashboard attention/drill-down;
- staging and large-ledger performance acceptance;
- non-sensitive mutation audit.

### Wave 4 — deterministic automation

- authenticated persisted rules;
- ordering/preview/version/audit;
- rule management UI;
- integration with import review, recurring matching and ledger review.

Reconciliation is not assigned to a wave. Reopen it only after statement import/matching or direct user evidence creates a real workflow.

## 6. Validation contract

Each implementation PR carries its own proof:

- financial/data: tests first, migration replay, pgTAP, browser and affected production verification;
- UI: responsive artifacts and physical-device proof for real-device claims;
- provider: configuration export, reversible change, rollback and production smoke;
- performance: measured baseline and acceptance;
- documentation/status: update `CURRENT_PROJECT_MEMORY.md` in the same PR.

## 7. Superseded claims

Do not repeat these as current gaps:

- reports have no previous-period comparison or trends;
- recurring items have no occurrence-to-transaction linkage;
- goals have no deadline or pace calculation;
- export is only a simple monthly CSV;
- import provenance/dry-run/atomic approval are future work;
- dashboard still uses the original authenticated fan-out;
- rich VND, long Vietnamese, 44px targets and modal placement are wholly untested;
- CAPTCHA application plumbing is absent;
- all feature work must wait for a validation freeze;
- reconciliation must be implemented before improving existing transaction and account workflows.
