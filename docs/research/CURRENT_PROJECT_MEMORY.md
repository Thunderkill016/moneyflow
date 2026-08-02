# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-02
- **Code baseline audited:** `main@923fc7b80ada67e548628ef2e85b0837780f9ed3` plus PR #222 exact-head database evidence
- **Owner direction:** continue developing existing capabilities toward competitive depth; validation is required inside each workstream but is not a global feature freeze
- **History model:** current truth here; task routing in `docs/context/README.md`; PR provenance under `docs/research/pr-memory/YYYY/QN/`

## 1. Purpose and authority

This compact snapshot answers what is implemented, partial, absent or externally pending. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. verified production or exact-head evidence;
3. this snapshot;
4. architecture, product principles and MVP contract;
5. current issues/work packets;
6. research and historical records.

Open PRs remain candidate evidence until merge. Load a PR memory record only when a task needs provenance.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Implemented** | Merged behavior exists with relevant automated evidence. |
| **Implemented + production evidenced** | Merged and verified through the affected production path or migration. |
| **Partial** | Useful behavior exists but lacks competitive depth. |
| **Absent** | No complete user-facing/domain implementation exists. |
| **External pending** | Repository readiness exists; provider/environment enforcement remains. |
| **Candidate only** | Exists only in an open PR or branch. |
| **Historical/superseded** | Preserved for provenance, not current direction. |

## 3. Product identity

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs: record income/expense/split/transfer; know account balances; understand period income, expense, net and categories; correct and recover records; plan with budgets/recurring/goals; import controlled data and export user-owned data.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and invariant snapshot

- Next.js App Router modular monolith on Vercel; React 19, TypeScript 5, Tailwind 4 and shadcn/Base UI/Radix.
- Supabase Auth/PostgreSQL with RLS; explicit browser-local demo runtime; authenticated/demo failures never silently mix.
- Validated Server Actions and ownership-safe RPCs own financial writes; server workspaces own viewer-aware reads.
- VND is integer đồng. Transfers are structural, balanced and excluded from income/expense. Split totals remain exact.
- Account balances remain derived from initial balance plus active ledger entries; reconciliation never overwrites a balance.
- Destructive ledger actions use soft delete and recoverable paths.
- Playwright, pgTAP, k6, CodeQL, secret-history scanning and risk-proportional CI cover selected boundaries.
- Build/lint/typecheck do not prove database isolation, provider configuration, browser behavior or production correctness.

## 5. Current capability inventory

| Capability | Status | Implemented now | True remaining depth |
|---|---|---|---|
| Authentication/demo | **Implemented; external pending** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses, CAPTCHA token plumbing | provider policy/callback/confirmation, enforcement, rates, breached-password and edge rules |
| Accounts | **Implemented, partial** | common account kinds, derived balances, CRUD/archive/restore, same-currency transfer; reconciliation DB/domain foundation with statement sessions, zero-difference completion, reopen and history | reconciliation Server Actions/UI, account register/detail, production migration/acceptance, trends/export and hide/archive/report semantics |
| Categories | **Implemented** | income/expense categories, archive and cross-feature use | clearer archive impact; hierarchy only if evidence requires it |
| Transactions | **Implemented** | create/search/filter, edit, soft delete/undo, grouping/pagination/totals; account-leg pending/cleared/reconciled state, correction reset and reconciled mutation lock | date/amount filters, review state, bounded bulk correction and broader audit |
| Transfers | **Implemented** | balanced semantics, currency guard, report neutrality, idempotency; source/destination reconciliation legs remain independent and either reconciled leg locks the transaction | reconciliation/account-register presentation |
| Split expenses | **Implemented** | validated multi-line allocation; sibling lines in one transaction/account reconcile as one account leg | in-place line editing and richer correction UX |
| Dashboard | **Implemented + production hardened** | bounded one-RPC bundle for balances/activity/planning/Inbox | attention drill-down and measured acceptance |
| Dashboard fallback | **Implemented + production evidenced** | schema-skew fallback preserves real data instead of false zeros | compatibility with future bundle changes |
| Budgets | **Implemented, basic loop** | current-month category limits, spend calculation and CRUD | history, comparison, copy month, rollover decision and drill-down |
| Recurring commitments | **Implemented, partial occurrence model** | templates, current-month occurrence, transaction link, pay/undo, reserved totals | full history/states, calendar/reminders and matching |
| Recurring income | **Implemented, partial occurrence model** | templates, current-month occurrence/link and expected totals | history/lifecycle, calendar/reminders and matching |
| Goals | **Implemented, partial** | target, allocation, deadline, planned-daily pace and archive | contribution history, funding source, lifecycle and drill-down |
| Reports | **Implemented, moderate depth** | week/month/year, prior comparable period, totals/change/category/trends, transfer exclusion | arbitrary range, account/type dimensions, drill-down/shared filters |
| Period report export | **Implemented** | safe one-click period CSV | follow future report filters |
| Export hub | **Implemented** | date range, transactions/candidates/all, CSV/JSON, UTF-8/formula safety | account/kind parity, schema version, planning data and restore docs |
| Import/Inbox | **Implemented + production evidenced** | CSV/XLSX/PDF, staging/review, provenance, dry-run, duplicate/transfer plan, atomic approval, RLS/idempotency | presets, batch management, bulk correction and resume/retry UX |
| Rules | **Partial** | deterministic local parse rules | authenticated persisted rules with RLS/order/preview/version/audit/UI |
| Privacy/deletion | **Implemented baseline** | privacy surfaces, recoverable ledger deletion and reconciliation-aware tenant purge contract | export-before-delete and destructive-flow production acceptance |
| Share Target | **Implemented and hardened** | bounded validation and ingestion | provider/edge controls and continued smoke |
| Public experience | **Implemented** | white-first/trust-blue semantic system and selected landing/auth direction merged through PR #213 | continue evidence-based iteration without local route palettes |
| Responsive UI | **Implemented with broad automation** | light/dark responsive app, expanded route/dialog and WebKit coverage | physical-device and deep error/destructive/Inbox states |
| Accessibility/mobile | **Substantially implemented** | 44px targets, accessible names, modal placement, money wrapping, Vietnamese/VND regressions | physical keyboard/device proof and remaining confirmations |
| CI/security scanning | **Implemented** | stable risk checks, CodeQL, secret scan, pinned Actions and knowledge/classifier contracts | keep classification aligned |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant/attack suites; reconciliation contract adds 92 permanent assertions | production reconciliation migration evidence; FK-index candidate remains separate |
| Performance tooling | **Implemented; acceptance partial** | dashboard one-RPC/bounds, k6 public/auth profiles and budgets | staging concurrency and realistic large-ledger benchmarks |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no retention/conversion claim without defined events/cohorts |

## 6. Load-bearing merged truth

- Reconciliation DB/domain foundation now defines account-leg pending/cleared/reconciled states, statement sessions, exact difference, zero-difference completion, reopen history, RLS and mutation locks. User-facing Server Actions/UI and production acceptance remain.
- Clearing one line of a split expense moves every sibling allocation for that transaction/account; transfer legs in different accounts remain independent.
- Editing amount/account/category/date or deleting a merely cleared transaction resets the affected leg to pending; reconciled transactions reject edit/delete.
- Initial balance cannot be rewritten after reconciliation begins; a discrepancy requires a real financial transaction.
- The authenticated dashboard uses bounded `get_dashboard_bundle`; schema-skew fallback prevents false zero/empty data.
- Recurring commitments/income already link current-month occurrences to transactions; full history/lifecycle remain.
- Goals already have deadline and planned-daily pace.
- Reports already include previous comparable periods and trends.
- Export supports date ranges, CSV/JSON and transaction/candidate/all datasets.
- Import provenance, server dry-run, duplicate/transfer planning and atomic approval are production-smoked.
- Local parse rules exist; authenticated persisted rules do not.
- Repository security includes neutral auth responses, CAPTCHA plumbing, CSP, hardened public ingestion, CodeQL, secret scan and RLS/attack suites. Provider enforcement remains external.
- Safe-to-spend/daily-allowance behavior remains withdrawn.

## 7. Engineering and evidence boundary

Implemented: modular boundaries, neutral transaction contracts, shared mutation owners, deployment/CSS/architecture checks, unit/static RLS, selected Supabase reset/pgTAP, selected browser/responsive/WebKit checks, stable required CI names and load-profile contracts.

Still needed: production application of the reconciliation migrations, reconciliation Server Actions/UI, physical Android/iOS evidence, deep validation/destructive/Inbox states, approved staging load, realistic large-ledger benchmarks and non-sensitive mutation audit.

Use `docs/context/README.md` to load only task-relevant warm context. Never copy external instructions, secrets, full logs, patches or untrusted issue text into project memory.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants | **Substantially implemented**; verify exact residual checklist |
| #53 import provenance/dry-run | **Completed + production evidenced** through PRs #183/#184 |
| #53 reconciliation | **Partial**: database/domain contract and permanent tests implemented; application workflow and production acceptance remain |
| #53 authenticated rules | **Absent; local rules only** |
| #53 audit/performance | **Partial** |
| #72 UI audit | Core route/VND/targets/modal/accessibility slices complete; deep states/devices remain |
| #172 product assessment | Retention/WTP/demand warnings valid; old score/state/freeze superseded |
| #174 provider controls | Repository readiness implemented; provider configuration/production verification remain |

## 9. Open pull-request memory

Open PRs are not product truth. Query current GitHub state before reusing any old branch. Closed-unmerged work is historical; merged behavior must be verified in current code rather than inferred from an old PR body.

## 10. True gaps after this audit

### P0 — financial/public trust

1. reconciliation Server Actions/read workspace, account workflow UI, production migration and acceptance;
2. provider-side Auth/CAPTCHA/edge enforcement and acceptance;
3. observed P0/P1 physical-device or destructive-flow defects.

### P1 — deepen existing loops

1. transaction review/date/amount/bulk correction;
2. account register/detail and reconciliation presentation;
3. budget history/copy/rollover/drill-down;
4. recurring history/states/calendar/reminders/matching;
5. goal contribution/funding/lifecycle;
6. report arbitrary range/account/type/drill-down;
7. import mapping/batch/bulk-review;
8. physical-device and remaining route states.

### P2 — ownership and scale

1. authenticated deterministic rules;
2. planning-data export/schema/restore;
3. non-sensitive mutation audit;
4. large-ledger and staging-load acceptance;
5. evidence-based dashboard attention/drill-down.

## 11. Current implementation direction

Next ledger-trust slice: reconciliation server workspace and validated Server Actions, followed by the account register/reconciliation UI. Transaction review, budget history, report depth and mobile findings may proceed in parallel when they do not change the same financial contract.

Validation remains embedded in each PR: financial/data uses migration replay + pgTAP + affected application evidence; UI uses responsive/browser and physical-device proof where claimed; provider changes require before/after evidence, rollback and production smoke.

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
- “Reconciliation is entirely absent.”
- “Feature development must freeze until a seven-day trial.”

## 13. Update and compaction protocol

Every PR creates exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row/section here.

Budgets:

- target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Compaction removes superseded prose and repeated evidence, never current truth or unresolved gaps. Historical records remain cold and are loaded only for provenance.

Code/tests outrank prose. A screenshot, route existence, passing build or unmerged branch alone never proves completion.
