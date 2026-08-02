# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-02
- **Code baseline:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Owner direction:** continue developing existing MoneyFlow capabilities toward competitive depth; validation is required inside each workstream but is not a global feature freeze
- **Scope:** merged product behavior, architecture, security, operations, verification, open work and current roadmap

## 1. Purpose and authority

This file is the durable answer to: **What has MoneyFlow actually implemented now, what is only partial, and what remains?**

Use this file before using old issue bodies, old competitor tables, abandoned design concepts or chat summaries. It is based on current merged code, migrations, tests, recent merge history and issue follow-up evidence rather than route names alone.

Authority order for implementation status:

1. current merged code, migrations and tests;
2. verified production or exact-head PR evidence;
3. this current-project memory;
4. `ARCHITECTURE.md`, product principles and current MVP contract;
5. current issue comments and accepted work packets;
6. competitive and UI/UX research;
7. historical issue bodies, old status tables and superseded design concepts.

When a feature is merged after this snapshot, update this file in the same PR. Do not leave a completed item marked missing merely because an old issue remains open.

Every pull request also updates `docs/research/PR_MEMORY_LOG.md`. This snapshot changes only when implementation, architecture, security, operational or verification status changes; the per-PR log records bounded work even when `Status impact: none`.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Merged behavior exists in authenticated or explicitly documented demo runtime and has relevant automated evidence. |
| **Implemented + production evidenced** | Merged and checked through the affected production path or migration. |
| **Partial** | Useful behavior exists, but the workflow is not complete at competitive depth. |
| **Absent** | No complete user-facing or domain implementation exists. |
| **External pending** | Repository/app readiness exists, but provider-side configuration or real environment proof remains. |
| **Candidate only** | Exists in an open PR or design branch and is not current product truth. |
| **Historical/superseded** | Preserved as evidence but must not direct new implementation. |

## 3. Product identity

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

1. record income, expense, split expense or internal transfer;
2. understand balances across declared accounts;
3. understand income, expense, net and category distribution for a stated period;
4. correct mistakes and recover soft-deleted records;
5. plan with budgets, recurring items, recurring income and goals;
6. import controlled source data and export user-owned data.

Current non-goals unless the owner creates a new specification:

- bank sync or credential sharing;
- AI financial advice or automatic financial decisions;
- OCR as a product identity;
- household/shared finance;
- investment, crypto, credit-score or financial-services marketplace features;
- full multi-currency accounting or FX conversion;
- native-mobile rewrite;
- full YNAB envelope methodology;
- local-first/CRDT rewrite;
- accounting ERP scope.

## 4. Runtime and technology snapshot

### Runtime architecture

- single-deployment modular monolith;
- Next.js App Router application;
- Supabase Auth and PostgreSQL for authenticated data;
- explicit browser-local demo runtime;
- Vercel deployment;
- authenticated and demo failures never silently fall back into one another.

### Current package baseline

- Next.js `16.2.11`;
- React and React DOM `19.2.4`;
- TypeScript 5;
- Supabase SSR and JavaScript clients;
- Zod validation;
- Tailwind CSS 4 and shadcn/Base UI/Radix primitives;
- Playwright browser and responsive auditing;
- k6 load-profile scripts;
- Vercel Web Analytics and Speed Insights;
- SheetJS for spreadsheet parsing/export-adjacent workflows.

### Domain boundaries already established

- neutral transaction contracts are separate from presentation metadata and demo fixtures;
- server workspaces own viewer-aware reads and persistence mapping;
- client mutation owners are shared instead of being reconstructed per screen;
- financial writes pass through validated Server Actions and ownership-safe RPCs;
- VND totals use safe integers;
- transfers and split expenses are structural ledger behavior, not label inference.

## 5. Current capability inventory

### Summary matrix

| Capability | Current status | What is already implemented | Remaining depth |
|---|---|---|---|
| Authentication and demo | **Implemented; provider controls external pending** | email/password, supported OAuth, recovery/reset surfaces, explicit demo mode, neutral auth responses, CAPTCHA token plumbing | hosted provider policy/callback/confirmation verification, CAPTCHA enforcement, rate limits, breached-password control and edge rules |
| Accounts | **Implemented, partial depth** | cash/bank/e-wallet/credit/savings kinds, initial and derived balances, per-currency totals, add/edit/archive/restore, same-currency transfer, display-only FX separation | account register/detail, reconciliation history, account-level trends/export, clearer hidden vs archived vs report-inclusion semantics |
| Categories | **Implemented** | income/expense categories, active/archive behavior, presentation metadata, category use across capture/planning/reporting | deeper archive-impact explanation and any future hierarchy only if real use requires it |
| Income/expense transactions | **Implemented** | create, search, query, kind/account/category filters, edit, soft delete, undo/restore, pagination/grouping and filtered totals | date/amount filters, ledger-wide review state, bounded bulk correction and correction/audit history |
| Transfers | **Implemented** | one transaction with balanced source/destination semantics, same-currency guards, report neutrality, shared mutation owner, idempotent authenticated writes | reconciliation interaction and account-register presentation |
| Split expenses | **Implemented** | multi-entry expense contract, validated split totals, reporting/category allocation, create flow | editing split lines remains delete-and-recreate; richer correction workflow is absent |
| Dashboard | **Implemented + production incident hardened** | bounded financial window, current balances, period activity, budgets, commitments, recurring income, goals and Inbox count through one RLS-aware RPC | attention-oriented drill-down and remaining schema/performance acceptance; no unsupported spending recommendation |
| Dashboard fallback | **Implemented + production evidenced** | schema-skew/invalid-bundle fallback preserves real ledger data instead of showing false zero balances | keep fallback compatible when bundle schema changes |
| Budgets | **Implemented, basic current-period loop** | current-month category limits, calculated spent, create/edit/delete, safe VND mapping | period history, previous-period view, copy-month workflow, explicit rollover policy and transaction drill-down |
| Recurring commitments | **Implemented, partial occurrence model** | template/feed, due date, current-month occurrence linked to a payment transaction, paid/undo behavior and reserved totals | full occurrence history, upcoming/due/overdue/skipped/cancelled states, calendar/reminders and observed-transaction matching workflow |
| Recurring income | **Implemented, partial occurrence model** | templates, due date, current-month receipt occurrence linked to transaction and expected totals | occurrence history, received/skipped/cancelled lifecycle, calendar/reminders and matching workflow |
| Savings goals | **Implemented, partial depth** | target, allocated amount, deadline, planned-daily calculation, create/allocate/archive behavior | contribution ledger/history, explicit funding source, pause/complete/reopen lifecycle and transaction drill-down |
| Reports | **Implemented, moderate depth** | week/month/year periods, current and previous comparable period, income/expense/net, expense change, category shares, daily/monthly trends and transfer exclusion | arbitrary report date range, account/type dimensions, clickable transaction drill-down and shared filter state |
| Period report export | **Implemented** | one-click period CSV from reports with safe integer money and spreadsheet-formula protection | align deeper report filters when those filters exist |
| Export hub | **Implemented, stronger than old docs claim** | optional date range, transactions/candidates/all, CSV or JSON, UTF-8 BOM, Vietnamese text, formula safety and generated filenames | account/kind filter parity, documented schema version, broader planning-data export and restore/import documentation |
| Import and Inbox | **Implemented + production evidenced** | CSV/XLSX/PDF parsing, direct CSV import, candidate review, raw snippets, source metadata, external IDs, versioned fingerprints, server dry-run, duplicate and transfer planning, immutable provenance, atomic approval, RLS and idempotency | reusable mapping presets, richer batch history/management, bulk candidate correction and clearer resume/retry UX |
| Rules | **Partial** | deterministic local parse rules during import | authenticated persisted rules with RLS, explicit order/stage, preview, versioning, audit and management UI |
| Privacy and deletion | **Implemented baseline** | privacy surfaces, recoverable ledger deletion model and account/data trust copy | export-before-delete integration and final production/provider acceptance of destructive flows |
| Share Target/public ingestion | **Implemented and hardened** | bounded request handling, payload validation and safe public ingestion behavior | provider/edge abuse controls and continued legitimate-flow production smoke |
| Responsive UI | **Implemented with broad automated coverage** | light/dark responsive web UI, 13-project PR audit, 20-route expansion and WebKit coverage | physical-device acceptance and remaining deep error/destructive/Inbox state coverage |
| Accessibility/mobile remediation | **Substantially implemented** | 44px practical targets, accessible icon names, modal positioning, money-value wrapping/paint bounds, long Vietnamese/rich-VND regression coverage | physical keyboard/device proof, remaining validation and destructive confirmation states |
| CI/security scanning | **Implemented** | risk-proportional stable checks, CodeQL, secret-history scanning, pinned Actions, project knowledge and classifier contracts | keep classifications synchronized with new boundaries |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant isolation and attack-oriented suites | reconciliation tests when added; merge/deploy pending FK index candidate if accepted |
| Performance tooling | **Implemented, acceptance partial** | dashboard one-RPC reduction, bounded windows, k6 public/authenticated profiles and performance-budget contracts | approved staging concurrency acceptance, realistic large-ledger benchmarks and open FK-index work |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no claim of product retention or conversion until events/cohorts are intentionally defined |

## 6. Detailed merged truth

### 6.1 Authentication and security

Merged repository behavior includes:

- email/password authentication, OAuth integration surfaces and recovery/reset;
- application password validation and neutral responses intended to reduce account enumeration;
- optional Turnstile/CAPTCHA token flow through login, registration and password reset;
- CAPTCHA remains disabled until provider configuration is verified;
- CSP and security headers;
- bounded public Share Target handling;
- repository CodeQL and secret-history scans;
- RLS and attack-oriented database suites.

Current boundary:

- source-code readiness is not the same as hosted-provider enforcement;
- issue #174 correctly remains open for provider exports, trusted origins/callbacks, email confirmation, CAPTCHA publication/enforcement, rate limits, breached-password protection and edge abuse rules;
- exact provider identifiers, rule IDs and thresholds stay outside public Git.

### 6.2 Accounts and currencies

Implemented:

- account kinds: cash, bank, e-wallet, credit card and savings;
- initial balances and derived balances from ledger entries;
- create, edit, archive and restore;
- per-currency totals;
- transfers only between compatible currencies;
- non-VND accounts may be tracked separately, while dashboard aggregate money remains VND-only.

Not implemented:

- full FX conversion or multi-currency accounting;
- account statement reconciliation;
- a dedicated account register/history route.

Old documents that say “multi-currency is absent” need nuance: display/tracking separation exists; cross-currency calculation remains deliberately absent.

### 6.3 Transaction ledger

Implemented:

- income and expense creation;
- two-sided internal transfers;
- split expenses with validated line totals;
- single-record edit;
- soft delete and timed undo/restore;
- free-text search;
- kind, account and category filters;
- filtered income, expense and net totals;
- date grouping and incremental list window;
- shared authenticated/demo mutation ownership;
- idempotency and RLS-backed writes.

Still missing:

- date and amount range filters on the general register;
- a ledger-wide “needs review” state distinct from Inbox candidates;
- multi-select and bounded bulk changes;
- editing split lines in place;
- reconciled-history guards because reconciliation itself is absent;
- non-sensitive mutation audit history.

### 6.4 Dashboard

The authenticated healthy path uses one bounded `get_dashboard_bundle` RPC containing:

- recent and period transactions;
- accounts, categories and balances;
- current budgets;
- recurring commitments and current occurrences;
- recurring income and current occurrences;
- goals;
- pending Inbox count.

A backward-compatible fallback loads focused workspaces when migration/deployment schema skew makes the bundle unavailable or invalid. This was added after a real production incident in which the dashboard could otherwise render false empty/zero data.

The dashboard performance work is already implemented. Remaining work is measured acceptance and product depth, not another data-layer rewrite.

### 6.5 Planning

#### Budgets

Already implemented:

- current-month category budgets;
- calculated current-month spending;
- category metadata and safe money mapping;
- create/edit/delete UI and authenticated storage.

Actual gaps:

- browsing historical budget periods;
- previous-period comparison at the budget level;
- copying a previous month;
- explicit rollover/no-rollover semantics;
- drill-down to contributing transactions.

#### Recurring commitments and recurring income

Already implemented:

- templates with amount, due day, account and category;
- due date for the current month;
- current-month occurrence tables;
- occurrence-to-transaction linkage;
- paid/received state and undo behavior;
- reserved/expected totals.

Actual gaps:

- durable occurrence history surfaced to users;
- richer states such as upcoming, overdue, skipped and cancelled;
- edit-one-versus-future-schedule semantics;
- calendar/timeline and reminders;
- matching an independently recorded transaction to an expected occurrence with review.

#### Goals

Already implemented:

- target and allocated amount;
- deadline;
- planned-daily pace calculation;
- archive state and basic allocation workflow.

Actual gaps:

- contribution records/history;
- source-account or funding semantics;
- pause, complete and reopen lifecycle;
- drill-down and correction linkage when source records change.

### 6.6 Reports and export

Reports already support:

- week, month and year;
- current period and the immediately preceding comparable number of days;
- income, expense and net;
- previous income/expense/net;
- expense change percentage;
- category shares, including split-expense lines;
- daily trend for week/month and monthly trend for year;
- transfer exclusion;
- period CSV export.

Therefore “previous-period comparison” and “trend reporting” are not gaps.

Actual report gaps:

- user-selected arbitrary report ranges;
- account and transaction-type dimensions;
- direct chart/category-to-transaction drill-down;
- shared filter state with the transaction register;
- richer recurring/goal context.

The export hub already supports:

- optional inclusive from/to dates;
- transaction, Inbox candidate or combined export;
- CSV and JSON;
- formula-injection protection;
- UTF-8/Vietnamese text;
- predictable generated filenames.

Actual export gaps are narrower: account/kind filter parity, documented schema versions, broader planning-data portability, export-before-delete and a documented restoration path.

### 6.7 Import, Inbox and provenance

The advanced import boundary is one of the most complete areas of the project.

Implemented and production-smoked:

- CSV/XLSX/PDF parsing paths;
- candidate staging and review;
- original/raw source retention;
- source type, batch/row identity and parser/mapping versions;
- external IDs where available;
- versioned fallback fingerprints;
- duplicate/match reason and confidence;
- server-side dry-run classification;
- candidate-to-financial-transaction provenance;
- suspected transfer planning and explicit override behavior;
- atomic authenticated approval;
- idempotent retries and tenant isolation;
- local deterministic parse rules.

Issue #53 PR B is completed and must not remain described as future work.

Remaining import/rules depth:

- mapping preset management;
- richer batch history/status UX;
- bulk candidate correction and duplicate resolution;
- authenticated persisted rule storage, ordering, preview and audit.

## 7. Engineering, operations and verification

### Implemented engineering foundation

- modular monolith with explicit reasons against premature services/packages;
- transaction authority split: contracts, presentation metadata and demo fixtures;
- one mutation owner per financial use case where migrated;
- safe-integer money and transfer-neutral reporting;
- RLS, ownership constraints and pgTAP;
- soft-delete/recovery paths;
- risk-proportional CI with stable required job names;
- project-knowledge contract;
- CodeQL and Gitleaks/secret-history scanning;
- browser smoke, responsive and WebKit evidence;
- load-profile contracts;
- deployment configuration checks;
- CSS ownership/debt checks and measured dead-CSS cleanup.

### UI/accessibility work already completed

Do not re-add these as unimplemented roadmap items:

- broad route audit expanded to 20 user-facing routes and representative dialogs;
- rich VND and long Vietnamese stress states on dashboard, transactions, reports and quick capture;
- transaction phone-row overflow correction;
- report monetary-value clipping correction;
- complete practical 44px interactive-target contract;
- modal placement across desktop and phone;
- accessible collapsed-sidebar names;
- one-line/wrapping and paint-bound protections for money values;
- one authoritative Vietnam “today” calculation;
- removal of withdrawn safe-to-spend/daily-allowance behavior from the finance core.

Remaining UI evidence:

- physical Android/iOS use;
- validation and destructive-confirmation states across all relevant routes;
- Inbox/import complex review states;
- remaining planning/settings state combinations.

### Performance state

Completed:

- bounded dashboard transaction windows;
- one authenticated dashboard bundle RPC;
- schema-skew fallback;
- k6 public and authenticated-dashboard scripts;
- load-budget contracts.

Pending:

- approved staging load run with recorded acceptance;
- large-ledger benchmarks for register, budgets and reports;
- PR #211 covering indexes for uncovered foreign keys is open, not merged or deployed;
- cache work is not authorized without measurement and invalidation tests.

## 8. Reconciled issue status

### Issue #53 — domain benchmark

| Original slice | Current status |
|---|---|
| PR A permanent DB invariants | **Substantially implemented** through transfer/split/idempotency/soft-delete/RLS pgTAP and later attack suites; verify exact checklist before closing |
| PR B import provenance/dry-run | **Completed and production evidenced** through PRs #183/#184 |
| PR C reconciliation | **Absent; valid next financial trust capability** |
| PR D authenticated rules | **Absent; local parse rules only** |
| PR E audit/performance | **Partial**: dashboard/load work implemented; mutation audit and final performance/index acceptance remain |

Keep issue #53 open only for the unresolved slices; do not execute its sequence as though PR B were still pending.

### Issue #72 — route/state UI audit

Completed slices include:

- 20-route/dialog matrix;
- rich VND and long Vietnamese states;
- transaction phone overflow;
- report clipping;
- 44px target and accessible-name work;
- modal positioning and monetary paint-bound protections.

Remaining:

- validation/error states;
- destructive confirmations;
- Inbox/import review states;
- remaining planning/settings state depth;
- physical-device acceptance.

### Issue #172 — product assessment

Historical conclusions still valid:

- retention, willingness to pay and market demand are unproven;
- real-use metrics remain valuable.

Superseded conclusions:

- the old `5.8/10` snapshot predates major security, import, dashboard, performance, CI and UI work;
- the instruction to freeze feature development is superseded by the owner decision dated 2026-08-02;
- validation now belongs inside each capability workstream.

### Issue #174 — provider controls

Repository and deployment readiness are implemented. Remaining work is strictly provider-side configuration and reversible production verification. Do not reopen source-code CAPTCHA plumbing unless a real provider smoke exposes a defect.

## 9. Open pull-request memory

Open PRs are not current product behavior.

| PR | Current interpretation |
|---|---|
| #211 foreign-key covering indexes | focused database performance candidate; not deployed; rebase/reverify against current `main` before merge |
| #213 landing/auth product-evidence redesign | large visual candidate requiring owner review; no database/RLS/Auth behavior change claimed |
| #215 project memory and capability maturation | this documentation/current-state correction branch; now also establishes mandatory per-PR memory; must be exact-head verified before owner merge |
| #216 public experience, brand color and wireframe research | research/spec candidate; does not change current UI until implemented and merged |
| #198 provider security runbook | documentation candidate supporting issue #174 |
| #197 Dependabot noise control | workflow/maintenance candidate |
| #208 older landing/auth design | likely superseded by newer design/research; do not merge without an explicit comparison |
| #170/#171 old CSS cleanup stack | stale historical cleanup; current CSS ownership and later merged remediation must be compared before reuse |
| #119 logo prototype | draft visual candidate requiring owner judgment |

## 10. True gaps after this audit

### P0 — financial/public trust

1. account reconciliation and reconciliation history;
2. provider-side Auth/CAPTCHA/edge enforcement and production acceptance;
3. any remaining P0/P1 physical-device or destructive-flow defect when observed.

### P1 — deepen existing product loops

1. transaction review state, date/amount filters and bounded bulk correction;
2. account register/detail and account-level drill-down;
3. budget history, copy-month/rollover decision and transaction drill-down;
4. recurring occurrence history, richer states, calendar/reminders and transaction matching;
5. goal contribution history, source semantics and lifecycle;
6. arbitrary report range, account/type dimensions and transaction drill-down;
7. import mapping/batch/bulk-review UX;
8. physical-device and remaining route-state completion.

### P2 — efficiency, ownership and scale

1. authenticated deterministic rules;
2. broader planning-data export, schema/version contract and restore path;
3. non-sensitive financial mutation audit;
4. large-ledger and staging-load acceptance;
5. dashboard attention/drill-down improvements based on existing facts.

## 11. Current implementation direction

The owner decision is capability maturation, not a global validation freeze.

Work may proceed in parallel when database contracts do not conflict:

### Track A — ledger trust

- reconciliation specification, tests, database and workflow;
- ledger review and bounded bulk correction;
- account register/lifecycle depth.

### Track B — planning depth

- budget history and drill-down;
- recurring history/state/matching;
- goal contribution and lifecycle.

### Track C — understanding and ownership

- report custom ranges and drill-down;
- export schema/coverage/restore path;
- measured performance acceptance.

### Track D — advanced capture

- mapping and batch workflow;
- bulk Inbox review;
- authenticated persistent rules after provenance contracts.

### Track E — product completion

- onboarding/quick capture refinements;
- remaining route-state and physical-device evidence;
- provider controls under explicit owner permission.

Validation requirements remain embedded in each PR:

- financial/data changes: unit + migration replay + pgTAP + browser evidence;
- UI changes: responsive/browser artifacts and physical-device proof where claimed;
- provider changes: before/after, rollback and production smoke;
- production behavior claims: verify the exact affected deployment.

## 12. Superseded-status register

The following claims must not be repeated as current facts:

- “CSV import is absent.”
- “Rules are entirely absent.” Local parse rules exist; authenticated persisted rules are absent.
- “Import provenance/dry-run/atomic approval are future work.” They are completed.
- “Reports lack previous-period comparison or trends.” Both exist.
- “Recurring items have no occurrence linkage.” Current-month occurrence-to-transaction links exist.
- “Goals lack a deadline or pace calculation.” Both exist.
- “Export only supports a simple current-month CSV.” Date ranges, CSV/JSON and candidates/all export exist.
- “Dashboard still performs the original fan-out.” The healthy authenticated path uses one bundle RPC.
- “Long Vietnamese and large VND states are untested.” Core route regression coverage exists.
- “CAPTCHA application plumbing is missing.” It is merged; provider enforcement is pending.
- “All security work is incomplete.” Repository security is strong; provider operations remain.
- “Feature development must be frozen until a seven-day trial finishes.” Superseded by the owner decision.

## 13. Update protocol

Every pull request targeting `main` must update project memory.

Required for every PR:

- append one entry to `docs/research/PR_MEMORY_LOG.md`;
- identify the affected capability or project boundary;
- state the status impact, using `none` when implementation truth did not change;
- record what changed, what was verified and what remains;
- state whether production/provider evidence exists;
- state whether an issue, roadmap or old claim became stale.

Additionally, a PR that changes implementation, architecture, security, operational or verification status must update at least one affected row or section in this snapshot.

Do not mark a feature complete from a screenshot, route existence, passing build or unmerged branch alone.
