# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-02
- **Code baseline audited:** `main@f57b92ec471e816f96fa13dd464a7a98297bb2d4`
- **Owner direction:** continue developing existing MoneyFlow capabilities toward competitive depth; validation is required inside each workstream but is not a global feature freeze
- **Scope:** current merged behavior, architecture, security, operations, verification, candidates and true remaining gaps
- **History model:** compact snapshot here; detailed PR provenance under `docs/research/pr-memory/YYYY/QN/`

## 1. Purpose and authority

This file answers: **What has MoneyFlow actually implemented now, what is partial, and what remains?**

Implementation-status authority order:

1. current merged code, migrations and tests;
2. verified production or exact-head evidence;
3. this compact snapshot;
4. architecture, product principles and MVP contract;
5. current issue comments and accepted work packets;
6. competitive/UI research;
7. historical issue bodies, old tables and superseded concepts.

Open PRs are candidate evidence only. Do not mark candidate behavior as merged truth.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Merged behavior exists and has relevant automated evidence. |
| **Implemented + production evidenced** | Merged and verified through the affected production path or migration. |
| **Partial** | Useful behavior exists, but the workflow lacks competitive depth. |
| **Absent** | No complete user-facing/domain implementation exists. |
| **External pending** | Repository readiness exists; provider/environment enforcement remains. |
| **Candidate only** | Exists only in an open PR or unmerged branch. |
| **Historical/superseded** | Preserved for provenance, not current direction. |

## 3. Product identity

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

1. record income, expense, split expense or internal transfer;
2. understand balances across declared accounts;
3. understand income, expense, net and category distribution by period;
4. correct mistakes and recover soft-deleted records;
5. plan with budgets, recurring items, recurring income and goals;
6. import controlled source data and export user-owned data.

Current non-goals without a new owner-approved specification:

- bank sync or credential sharing;
- AI financial advice or automatic financial decisions;
- OCR as product identity;
- household/shared finance;
- investments, crypto, credit score or financial-services marketplace;
- full FX accounting;
- native-mobile rewrite;
- full envelope-budget methodology;
- local-first/CRDT rewrite;
- accounting ERP scope.

## 4. Runtime and architecture snapshot

- Next.js App Router modular monolith on Vercel;
- React 19, TypeScript 5, Tailwind 4 and shadcn/Base UI/Radix primitives;
- Supabase Auth and PostgreSQL with RLS for authenticated users;
- explicit browser-local demo runtime;
- authenticated/demo failures never silently fall back into one another;
- validated Server Actions and ownership-safe RPCs own financial writes;
- server workspaces own viewer-aware reads and persistence mapping;
- VND uses safe integer đồng;
- transfers and split expenses are structural ledger behavior;
- Playwright provides browser/responsive evidence; k6 provides load-profile contracts;
- CodeQL, secret-history scanning and risk-proportional CI are active.

## 5. Current capability inventory

| Capability | Current status | Already implemented | Remaining depth |
|---|---|---|---|
| Authentication/demo | **Implemented; external pending** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses, CAPTCHA token plumbing | provider policy/callback/confirmation, CAPTCHA enforcement, rates, breached-password and edge rules |
| Accounts | **Implemented, partial depth** | cash/bank/e-wallet/credit/savings, initial/derived balances, per-currency totals, create/edit/archive/restore, same-currency transfer | register/detail, reconciliation history, trends/export, archive/hide/report semantics |
| Categories | **Implemented** | income/expense categories, archive state and use across capture/planning/reports | clearer archive impact; hierarchy only if real use requires it |
| Transactions | **Implemented** | create/search, kind/account/category filters, edit, soft delete, undo, pagination/grouping and filtered totals | date/amount filters, ledger review state, bounded bulk correction and audit history |
| Transfers | **Implemented** | balanced two-sided semantics, same-currency guard, report neutrality, shared mutation owner, idempotent writes | reconciliation and account-register integration |
| Split expenses | **Implemented** | multi-entry expense, validated totals and reporting allocation | in-place split-line editing and richer correction flow |
| Dashboard | **Implemented + production hardened** | bounded window, balances, period activity, budgets, recurring, goals and Inbox count through one RLS-aware bundle RPC | evidence-based attention/drill-down and measured acceptance |
| Dashboard fallback | **Implemented + production evidenced** | schema-skew/invalid-bundle fallback preserves real data instead of false zeros | maintain compatibility when bundle schema changes |
| Budgets | **Implemented, basic loop** | current-month category limits, spent calculation and CRUD | history, previous-period view, copy month, rollover decision and transaction drill-down |
| Recurring commitments | **Implemented, partial occurrence model** | templates, due date, current-month occurrence, transaction linkage, pay/undo and reserved totals | full history, richer states, calendar/reminders and matching |
| Recurring income | **Implemented, partial occurrence model** | templates, current-month occurrence, transaction linkage and expected totals | history, lifecycle, calendar/reminders and matching |
| Goals | **Implemented, partial depth** | target, allocation, deadline, planned-daily pace and archive | contribution history, funding source, lifecycle and drill-down |
| Reports | **Implemented, moderate depth** | week/month/year, comparable prior period, income/expense/net, change %, category shares, daily/monthly trends, transfer exclusion | arbitrary range, account/type dimensions, transaction drill-down and shared filters |
| Period report export | **Implemented** | one-click safe-integer CSV with spreadsheet-injection protection | follow future report filters |
| Export hub | **Implemented** | optional date range, transactions/candidates/all, CSV/JSON, UTF-8 and formula safety | account/kind parity, schema version, planning data and restore documentation |
| Import/Inbox | **Implemented + production evidenced** | CSV/XLSX/PDF parsing, staging/review, raw source, IDs/fingerprints, dry-run, duplicates/transfers, immutable provenance, atomic approval, RLS/idempotency | mapping presets, batch management, bulk correction and resume/retry UX |
| Rules | **Partial** | deterministic local parse rules | authenticated persisted rules, RLS, order/stage, preview, version, audit and UI |
| Privacy/deletion | **Implemented baseline** | privacy surfaces and recoverable ledger deletion | export-before-delete and production destructive-flow acceptance |
| Share Target/public ingestion | **Implemented and hardened** | bounded request handling and validation | provider/edge controls and continued production smoke |
| Responsive UI | **Implemented with broad automation** | responsive light/dark web, expanded route/dialog matrix and WebKit coverage | physical-device acceptance and deep error/destructive/Inbox states |
| Accessibility/mobile remediation | **Substantially implemented** | practical 44px targets, accessible names, modal placement, money wrapping, long Vietnamese/rich VND regressions | physical keyboard/device proof and remaining confirmation states |
| CI/security scanning | **Implemented** | stable risk-proportional checks, CodeQL, secret scan, pinned Actions, knowledge/classifier contracts | keep classification aligned with new boundaries |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant isolation and attack suites | reconciliation tests; FK-index candidate remains unmerged |
| Performance tooling | **Implemented; acceptance partial** | dashboard one-RPC, bounded windows, k6 public/auth profiles and budgets | approved staging concurrency and realistic large-ledger benchmarks |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no retention/conversion claim until intentional events/cohorts exist |

## 6. Load-bearing merged truth

### 6.1 Financial and data

- VND is integer đồng; internal transfers never count as income or expense.
- Transfers are one structural transaction with balanced source/destination entries.
- Split expenses allocate category amounts while preserving a single expense total.
- Financial records use ownership-safe RPC/Server Action boundaries, RLS and idempotency.
- Destructive ledger changes use soft delete and recoverable paths.
- Reconciliation remains absent; balance calculation is not statement reconciliation.

### 6.2 Dashboard incident lesson

The healthy authenticated path uses one bounded `get_dashboard_bundle` RPC. A fallback loads focused workspaces when deployment/schema skew makes the bundle unavailable or invalid. This fallback was added after a production incident that could otherwise display false empty/zero data.

Do not reintroduce unbounded dashboard fan-out or remove fallback compatibility without equivalent production-safe evidence.

### 6.3 Planning depth

- Budgets currently cover the current month; history/copy/rollover/drill-down remain.
- Recurring commitments and recurring income already have current-month occurrence-to-transaction linkage; full occurrence history/lifecycle remain.
- Goals already have deadline and planned-daily pace; contribution history and funding semantics remain.

### 6.4 Reports and ownership

- Reports already include previous comparable periods and trends.
- Export already supports date ranges, CSV/JSON and transaction/candidate/all datasets.
- Import provenance, server dry-run, duplicate/transfer planning and atomic approval are completed and production-smoked.
- Local parse rules exist; authenticated persisted rules do not.

### 6.5 Security and operations

Repository/application readiness already includes:

- password validation and neutral auth responses;
- optional CAPTCHA plumbing;
- CSP/security headers;
- hardened public ingestion;
- CodeQL and secret-history scans;
- RLS and attack-oriented database suites.

Provider-side policy, callbacks, email confirmation, CAPTCHA enforcement, rate limits, breached-password protection and edge abuse rules remain external pending work.

### 6.6 UI/accessibility completed slices

Do not re-add these as missing:

- expanded 20-route/dialog coverage;
- rich VND and long Vietnamese stress states;
- transaction phone-row overflow and report-money clipping fixes;
- practical 44px target contract;
- modal positioning and accessible collapsed-sidebar names;
- monetary wrapping/paint-bound protections;
- one authoritative Vietnam “today” calculation;
- removal of withdrawn safe-to-spend/daily-allowance behavior.

## 7. Engineering and verification state

Implemented foundation:

- modular monolith with no current service-extraction need;
- neutral transaction contracts separated from presentation/demo fixtures;
- shared mutation owners for migrated financial use cases;
- deployment configuration, CSS ownership and architecture checks;
- Node unit/static RLS tests;
- fresh Supabase reset and pgTAP where database boundaries change;
- Playwright browser/responsive/WebKit evidence where UI boundaries change;
- risk-proportional CI with stable required names;
- project-memory and classifier contracts;
- CodeQL and secret-history controls;
- load-profile scripts and performance-budget contracts.

Remaining evidence:

- physical Android/iOS use;
- deep validation/destructive/Inbox states;
- approved staging load acceptance;
- realistic large-ledger register/budget/report benchmarks;
- mutation audit metadata.

## 8. Reconciled issue status

### Issue #53 — domain benchmark

| Slice | Current status |
|---|---|
| Permanent DB invariants | **Substantially implemented**; verify exact remaining checklist before closure |
| Import provenance/dry-run | **Completed + production evidenced** through PRs #183/#184 |
| Reconciliation | **Absent; valid financial-trust workstream** |
| Authenticated rules | **Absent; local parse rules only** |
| Audit/performance | **Partial**; dashboard/load work exists, mutation audit and final acceptance remain |

### Issue #72 — route/state UI audit

Completed: expanded route/dialog matrix, rich VND/long Vietnamese, phone overflow, report clipping, 44px targets, accessible names, modal and money-bound protections.

Remaining: validation/error states, destructive confirmations, Inbox/import review states, planning/settings combinations and physical-device acceptance.

### Issue #172 — product assessment

Still valid: retention, willingness to pay and market demand are unproven.

Superseded: old score, old feature-state claims and global feature freeze. Validation now belongs inside each workstream.

### Issue #174 — provider controls

Repository/deployment readiness is implemented. Remaining work is provider configuration and reversible production verification. Do not rebuild CAPTCHA plumbing unless provider smoke reveals a real defect.

## 9. Open pull-request memory

Open PRs are not current product behavior.

| PR | Current interpretation |
|---|---|
| #211 | foreign-key index candidate; not merged/deployed; rebase and reverify first |
| #213 | large landing/auth visual candidate requiring owner review |
| #215 | current project-memory, capability-gap and bounded-memory-policy candidate |
| #216 | public experience/brand/wireframe research candidate |
| #198 | provider-security runbook candidate |
| #197 | Dependabot/maintenance candidate |
| #208 | older landing/auth design likely superseded; compare before reuse |
| #170/#171 | stale CSS cleanup stack; compare with later merged remediation |
| #119 | draft logo prototype requiring owner judgment |

## 10. True gaps after this audit

### P0 — financial/public trust

1. account reconciliation and reconciliation history;
2. provider-side Auth/CAPTCHA/edge enforcement and production acceptance;
3. observed P0/P1 physical-device or destructive-flow defects.

### P1 — deepen existing loops

1. transaction review state, date/amount filters and bounded bulk correction;
2. account register/detail and account drill-down;
3. budget history, copy/rollover decision and transaction drill-down;
4. recurring history, richer states, calendar/reminders and matching;
5. goal contribution history, funding semantics and lifecycle;
6. arbitrary report range, account/type dimensions and transaction drill-down;
7. import mapping/batch/bulk-review UX;
8. physical-device and remaining route-state completion.

### P2 — efficiency, ownership and scale

1. authenticated deterministic rules;
2. planning-data export, schema/version and restore path;
3. non-sensitive financial mutation audit;
4. large-ledger and staging-load acceptance;
5. dashboard attention/drill-down based on existing facts.

## 11. Current implementation direction

Parallel tracks are allowed when contracts do not conflict:

- **Track A — ledger trust:** reconciliation, review/bulk correction, account register.
- **Track B — planning depth:** budget history, recurring history/matching, goal contributions.
- **Track C — understanding/ownership:** report ranges/drill-down, export/restore, measured performance.
- **Track D — advanced capture:** import mapping/batches, bulk Inbox review, persistent rules.
- **Track E — product completion:** onboarding/capture, remaining route/device evidence, provider controls under explicit permission.

Validation remains embedded in every PR:

- financial/data: unit + migration replay + pgTAP + affected browser evidence;
- UI: responsive/browser artifacts and physical-device proof where claimed;
- provider: before/after, rollback and production smoke;
- production claims: verify the exact affected deployment.

## 12. Superseded-status register

Do not repeat these as current facts:

- “CSV import is absent.”
- “Rules are entirely absent.” Local parse rules exist; authenticated persisted rules are absent.
- “Import provenance/dry-run/atomic approval are future work.” They are completed.
- “Reports lack previous-period comparison or trends.” Both exist.
- “Recurring items have no occurrence linkage.” Current-month links exist.
- “Goals lack a deadline or pace calculation.” Both exist.
- “Export only supports a current-month CSV.” Date ranges, CSV/JSON and candidates/all exist.
- “Dashboard still performs the original fan-out.” Healthy auth uses one bundle RPC.
- “Long Vietnamese and large VND states are untested.” Core regression coverage exists.
- “CAPTCHA application plumbing is missing.” It is merged; provider enforcement remains.
- “All security work is incomplete.” Repository security is strong; provider operations remain.
- “Feature development must freeze until a seven-day trial.” Superseded by owner direction.

## 13. Update and compaction protocol

Every PR targeting `main` must create or update exactly one own record:

`docs/research/pr-memory/YYYY/QN/PR-<number>.md`

The record states affected boundary, status impact, change, verification, remaining work, provider/production evidence, snapshot impact and superseded claims.

Additionally, a PR changing capability, architecture, security, operational or verification status must update the affected snapshot row or section here.

Size budgets enforced by CI:

- this snapshot: maximum 900 lines and 120 KiB;
- each PR record: maximum 140 lines and 12 KiB.

Do not copy logs, patches, screenshots or issue bodies into memory. Identify the exact PR/run and keep only current truth, true gaps and load-bearing incident lessons here.

When this snapshot approaches its budget, a focused compaction PR removes superseded prose and consolidates repeated evidence. Historical per-PR records remain unchanged and are loaded only when provenance is needed.

Do not mark a feature complete from a screenshot, route existence, passing build or unmerged branch alone.
