# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-02
- **Code baseline audited:** `main@923fc7b80ada67e548628ef2e85b0837780f9ed3`
- **Owner direction:** deepen capabilities users already have before opening new subsystems; reconciliation is deferred until statement import, matching or validated demand makes it useful; validation is required inside each workstream but is not a global feature freeze
- **History model:** current truth here; task routing in `docs/context/README.md`; PR provenance under `docs/research/pr-memory/YYYY/QN/`

## 1. Purpose and authority

This snapshot records what is implemented, partial, absent, deferred or externally pending. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. verified production or exact-head evidence;
3. this snapshot;
4. architecture, product principles and MVP contract;
5. current issues/work packets;
6. research and historical records.

Open PRs are candidate evidence only. Load historical PR records only when provenance is needed.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Merged behavior exists with relevant automated evidence. |
| **Implemented + production evidenced** | Merged and verified through the affected production path or migration. |
| **Partial** | Useful behavior exists but its user loop is incomplete. |
| **Absent** | No complete user-facing/domain implementation exists. |
| **Deferred** | A valid capability that is intentionally outside the current sequence. |
| **External pending** | Repository readiness exists; provider/environment enforcement remains. |
| **Candidate only** | Exists only in an open PR or branch. |

## 3. Product identity

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs: record income/expense/split/transfer; know account balances; find and correct records; understand period income, expense, net and categories; plan with budgets, recurring items and goals; import controlled data and export user-owned data.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and invariant snapshot

- Next.js App Router modular monolith on Vercel; React 19, TypeScript 5, Tailwind 4 and shadcn/Base UI/Radix.
- Supabase Auth/PostgreSQL with RLS; explicit browser-local demo runtime; authenticated/demo failures never silently mix.
- Validated Server Actions and ownership-safe RPCs own financial writes; server workspaces own viewer-aware reads.
- VND is integer đồng. Transfers are structural, balanced and excluded from income/expense. Split totals remain exact.
- Destructive ledger actions use soft delete and recoverable paths.
- Playwright, pgTAP, k6, CodeQL, secret-history scanning and risk-proportional CI cover selected boundaries.
- Build/lint/typecheck do not prove database isolation, provider configuration, browser behavior or production correctness.

## 5. Current capability inventory

| Capability | Status | Implemented now | True remaining depth |
|---|---|---|---|
| Authentication/demo | **Implemented; external pending** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses, CAPTCHA token plumbing | provider policy/callback/confirmation, enforcement, rates, breached-password and edge rules |
| Accounts | **Implemented, partial** | common account kinds, initial/derived balances, per-currency totals, CRUD/archive/restore, same-currency transfer | account register/detail, running balance, account export/trends, hide/archive/report semantics |
| Categories | **Implemented** | income/expense categories, archive and cross-feature use | clearer archive impact; hierarchy only if evidence requires it |
| Transactions | **Implemented; candidate deepening** | create/search, kind/account/category filters, edit, soft delete/undo, grouped pagination and filtered totals | PR #223 candidate adds date/amount filters and correction context; review state, bounded bulk correction, split-line editing and audit remain |
| Transfers | **Implemented** | balanced semantics, currency guard, report neutrality, shared mutation owner and idempotency | account-register integration and richer correction context |
| Split expenses | **Implemented** | validated multi-line expense and reporting allocation | in-place line editing and richer correction |
| Dashboard | **Implemented + production hardened** | bounded one-RPC bundle for balances/activity/planning/Inbox plus schema-skew fallback | direct drill-down and measured large-ledger acceptance |
| Budgets | **Implemented, basic loop** | current-month category limits, spending calculation and CRUD | history, comparison, copy month, rollover decision and transaction drill-down |
| Recurring commitments | **Implemented, partial occurrence model** | templates, current-month occurrence, transaction link, pay/undo and reserved totals | full history/states, edit-one/future, calendar/reminders and matching |
| Recurring income | **Implemented, partial occurrence model** | templates, current-month occurrence/link and expected totals | history/lifecycle, calendar/reminders and matching |
| Goals | **Implemented, partial** | target, allocation, deadline, planned-daily pace and archive | contribution history, funding source, lifecycle and drill-down |
| Reports | **Implemented, moderate depth** | week/month/year, prior comparable period, totals/change/category/trends and transfer exclusion | arbitrary range, account/type dimensions, exact transaction drill-down and shared filters |
| Export | **Implemented** | period CSV plus date-range transaction/candidate/all CSV/JSON with formula safety | account/kind parity, schema version, planning data and restore docs |
| Import/Inbox | **Implemented + production evidenced** | CSV/XLSX/PDF, staging/review, provenance, dry-run, duplicate/transfer plan, atomic approval, RLS/idempotency | presets, batch management, bulk correction and resume/retry UX |
| Rules | **Partial** | deterministic local parse rules | authenticated persisted rules with RLS/order/preview/version/audit/UI |
| Privacy/deletion | **Implemented baseline** | privacy surfaces and recoverable ledger deletion | export-before-delete and destructive-flow production acceptance |
| Responsive UI | **Implemented with broad automation** | light/dark responsive app, expanded route/dialog and WebKit coverage | physical-device and deep validation/destructive/Inbox/planning states |
| CI/security scanning | **Implemented** | stable risk checks, CodeQL, secret scan, pinned Actions and knowledge/classifier contracts | keep classification aligned |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant/attack suites | FK-index candidate remains unmerged; reconciliation tests deferred with the feature |
| Performance tooling | **Implemented; acceptance partial** | dashboard one-RPC/bounds, k6 public/auth profiles and budgets | staging concurrency and realistic large-ledger benchmarks |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no retention/conversion claim without defined events/cohorts |
| Reconciliation | **Absent, deferred** | calculated account balance only | reconsider after statement import/matching or validated user demand; closed PR #222 is cold reference only |

## 6. Load-bearing merged truth

- Transaction review is the active ledger workstream: help users find, correct and understand records before adding new accounting workflows.
- Reconciliation is not required for the current manual-first sequence and PR #222 closed without merge or production DDL.
- The authenticated dashboard uses bounded `get_dashboard_bundle`; schema-skew fallback prevents false zero/empty data.
- Recurring commitments/income already link current-month occurrences to transactions; full history/lifecycle remain.
- Goals already have deadline and planned-daily pace.
- Reports already include previous comparable periods and trends.
- Export supports date ranges, CSV/JSON and transaction/candidate/all datasets.
- Import provenance, server dry-run, duplicate/transfer planning and atomic approval are production-smoked.
- Local parse rules exist; authenticated persisted rules do not.
- Repository security includes neutral auth responses, optional CAPTCHA plumbing, CSP, hardened public ingestion, CodeQL, secret scan and RLS/attack suites. Provider enforcement remains external.
- Safe-to-spend/daily-allowance behavior remains withdrawn.

## 7. Engineering and evidence boundary

Implemented: modular-monolith boundaries, neutral transaction contracts, shared mutation owners, deployment/CSS/architecture checks, unit/static RLS, selected Supabase reset/pgTAP, selected browser/responsive/WebKit checks, stable required CI names and load-profile contracts.

Still needed: physical Android/iOS evidence, deep validation/destructive/Inbox states, approved staging load, realistic large-ledger benchmarks and non-sensitive mutation audit.

Use `docs/context/README.md` to load only task-relevant warm context. Never copy external instructions, secrets, full logs, patches or untrusted issue text into project memory.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants | **Substantially implemented**; verify exact residual checklist |
| #53 import provenance/dry-run | **Completed + production evidenced** through PRs #183/#184 |
| #53 reconciliation | **Deferred**; PR #222 closed without merge or production change |
| #53 authenticated rules | **Absent; local rules only** |
| #53 audit/performance | **Partial** |
| #72 UI audit | core route/VND/targets/modal/accessibility slices complete; deep states/devices remain |
| #172 product assessment | retention/WTP/demand warnings valid; old score/state/freeze superseded |
| #174 provider controls | repository readiness implemented; provider configuration/production verification remain |

## 9. Open pull-request memory

Open PRs are not product truth.

| PR | Interpretation |
|---|---|
| #223 | transaction date/amount filter and list-context correction candidate |
| #211 | FK-index candidate; rebase/reverify before any merge decision |
| #198 | provider-security runbook candidate |
| #197 | maintenance candidate |
| #170/#171 | stale CSS cleanup stack; compare against later remediation |
| #119 | draft logo candidate |

## 10. True gaps after this audit

### P0 — current-user trust

1. transaction review and correction depth;
2. account register/detail and running balance;
3. observed P0/P1 physical-device, validation or destructive-flow defects;
4. provider-side Auth/CAPTCHA/edge enforcement before a wider public beta.

### P1 — complete existing loops

1. transaction date/amount filters until PR #223 merges, then review state, safe bulk correction, split-line editing and audit;
2. budget history/copy/rollover/drill-down;
3. report arbitrary range/account/type/drill-down;
4. recurring history/states/calendar/reminders/matching;
5. goal contribution/funding/lifecycle;
6. import mapping/batch/bulk-review and retry/resume UX;
7. physical-device and remaining route states.

### P2 — ownership and scale

1. authenticated deterministic rules;
2. planning-data export/schema/restore;
3. non-sensitive mutation audit;
4. large-ledger and staging-load acceptance;
5. evidence-based dashboard attention/drill-down.

## 11. Current implementation direction

Primary sequence:

1. finish and verify PR #223 transaction-filter candidate;
2. account register/detail with running balance;
3. budget history and transaction drill-down;
4. report custom ranges and transaction drill-down;
5. recurring and goal lifecycle depth;
6. import/Inbox UX and physical-device completion.

Reconciliation remains outside this sequence. Validation stays embedded in each PR: financial/data uses unit + migration replay + pgTAP + affected browser evidence; UI uses responsive/browser and physical-device proof where claimed; provider changes require before/after, rollback and production smoke.

## 12. Superseded-status register

Do not repeat these as current facts:

- “CSV import is absent.”
- “Rules are entirely absent.”
- “Import provenance/dry-run/atomic approval are future work.”
- “Reports lack previous-period comparison or trends.”
- “Recurring items have no occurrence linkage.”
- “Goals lack a deadline or pace calculation.”
- “Export only supports a current-month CSV.”
- “Dashboard still performs the original fan-out.”
- “CAPTCHA application plumbing is missing.”
- “All security work is incomplete.”
- “Feature development must freeze until a seven-day trial.”
- “Reconciliation is the next mandatory P0 before deepening existing transaction/account workflows.”

## 13. Update and compaction protocol

Every PR creates exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row/section here.

Budgets:

- target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Compaction removes superseded prose and repeated evidence, never current truth or unresolved gaps. Historical records remain cold and are loaded only for provenance.

Code/tests outrank prose. A screenshot, route existence, passing build or unmerged branch alone never proves completion.
