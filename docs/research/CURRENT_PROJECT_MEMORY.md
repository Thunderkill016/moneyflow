# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-03
- **Code baseline audited:** `main@25c9e988500dc60d2a22b654714ff22dafeecde3`
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

Open PRs are candidate evidence only. Load a PR memory record only when a task needs provenance.

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

Core jobs: record income/expense/split/transfer; know account balances; inspect the ledger movements behind those balances; understand period income, expense, net and categories; correct and recover records; plan with budgets/recurring/goals; import controlled data and export user-owned data.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and invariant snapshot

- Next.js App Router modular monolith on Vercel; React 19, TypeScript 5, Tailwind 4 and shadcn/Base UI/Radix.
- Supabase Auth/PostgreSQL with RLS; explicit browser-local demo runtime; authenticated/demo failures never silently mix.
- Validated Server Actions and ownership-safe RPCs own financial writes; server workspaces own viewer-aware reads.
- VND is integer đồng. Transfers are structural, balanced and excluded from income/expense. Split totals must remain exact.
- Destructive ledger actions use soft delete and recoverable paths.
- Playwright, pgTAP, k6, secret-history scanning and risk-proportional CI cover selected product boundaries; protected CodeQL performs and uploads a real analysis for every pull request.
- Build/lint/typecheck do not prove database isolation, provider configuration, browser behavior or production correctness.

## 5. Current capability inventory

| Capability | Status | Implemented now | True remaining depth |
|---|---|---|---|
| Authentication/demo | **Implemented; external pending** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses, CAPTCHA token plumbing | provider policy/callback/confirmation, enforcement, rates, breached-password and edge rules |
| Accounts | **Implemented, partial** | common account kinds, initial/derived balances, per-currency totals, CRUD/archive/restore, same-currency transfer, viewer-scoped register/detail with signed ledger impacts | reconciliation, trends/export, hide/archive/report semantics and richer register controls |
| Categories | **Implemented** | income/expense categories, archive and cross-feature use | clearer archive impact; hierarchy only if evidence requires it |
| Transactions | **Implemented** | create/search, kind/account/category filters, edit, soft delete/undo, grouping/pagination/totals | date/amount filters, review state, bounded bulk correction and audit |
| Transfers | **Implemented** | balanced semantics, currency guard, report neutrality, shared mutation owner, idempotency and account-register source/destination presentation | reconciliation |
| Split expenses | **Implemented** | validated multi-line expense and reporting allocation | in-place line editing and richer correction |
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
| Privacy/deletion | **Implemented baseline** | privacy surfaces and recoverable ledger deletion | export-before-delete and destructive-flow production acceptance |
| Share Target | **Implemented and hardened** | bounded validation and ingestion | provider/edge controls and continued smoke |
| Responsive UI | **Implemented with broad automation** | light/dark responsive app, expanded route/dialog and WebKit coverage | physical-device and deep error/destructive/Inbox states |
| Accessibility/mobile | **Substantially implemented** | 44px targets, accessible names, modal placement, money wrapping, Vietnamese/VND regressions | physical keyboard/device proof and remaining confirmations |
| CI/security scanning | **Implemented** | stable risk checks, real CodeQL analysis on every PR, secret scan, pinned Actions and knowledge/classifier contracts | keep ruleset, workflow and classifier guidance aligned |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant/attack suites | reconciliation tests; FK-index candidate remains unmerged |
| Performance tooling | **Implemented; acceptance partial** | dashboard one-RPC/bounds, k6 public/auth profiles and budgets | staging concurrency and realistic large-ledger benchmarks |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no retention/conversion claim without defined events/cohorts |

## 6. Load-bearing merged truth

- Reconciliation is absent: calculated balance and account history are not statement reconciliation.
- Account register/detail is merged through PR #228: active and archived accounts link to a viewer-scoped read-only register; source/destination transfer legs remain distinct and transfers never become income or expense.
- PR #229 archived the account-register work packet and synchronized its merged/production-deployed status into canonical memory.
- PR #230 removed the CodeQL skip path: every pull request now performs real initialization, analysis and upload because the provider ruleset does not accept a successful job shell without analysis data.
- The authenticated dashboard uses bounded `get_dashboard_bundle`; schema-skew fallback was added after a production incident that could show false zero/empty data. Do not remove it without equivalent evidence.
- Recurring commitments/income already link current-month occurrences to transactions; full history/lifecycle remain.
- Goals already have deadline and planned-daily pace.
- Reports already include previous comparable periods and trends.
- Export supports date ranges, CSV/JSON and transaction/candidate/all datasets.
- Import provenance, server dry-run, duplicate/transfer planning and atomic approval are production-smoked.
- Local parse rules exist; authenticated persisted rules do not.
- Repository security includes neutral auth responses, optional CAPTCHA plumbing, CSP, hardened public ingestion, real CodeQL analysis, secret scan and RLS/attack suites. Provider enforcement remains external.
- Completed UI slices include the 20-route/dialog audit, rich VND/long Vietnamese, phone/report clipping fixes, 44px targets, modal/accessibility and money paint bounds.
- Safe-to-spend/daily-allowance behavior remains withdrawn.

## 7. Engineering and evidence boundary

Implemented: modular monolith boundaries, neutral transaction contracts, shared mutation owners, viewer-scoped account register projection, deployment/CSS/architecture checks, unit/static RLS, selected Supabase reset/pgTAP, selected browser/responsive/WebKit checks, stable required CI names, real CodeQL analysis for every PR and load-profile contracts.

Still needed: physical Android/iOS evidence, deep validation/destructive/Inbox states, approved staging load, realistic large-ledger benchmarks and non-sensitive mutation audit.

Use `docs/context/README.md` to load only task-relevant warm context. Never copy external instructions, secrets, full logs, patches or untrusted issue text into project memory.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants | **Substantially implemented**; verify exact residual checklist |
| #53 import provenance/dry-run | **Completed + production evidenced** through PRs #183/#184 |
| #53 reconciliation | **Absent; valid financial-trust workstream** |
| #53 authenticated rules | **Absent; local rules only** |
| #53 audit/performance | **Partial** |
| #72 UI audit | Core route/VND/targets/modal/accessibility slices complete; deep states/devices remain |
| #172 product assessment | Retention/WTP/demand warnings valid; old score/state/freeze superseded |
| #174 provider controls | Repository readiness implemented; provider configuration/production verification remain |

## 9. Open pull-request memory

Open PRs are not product truth. Rebase and reverify against current `main` before any merge decision.

| PR | Interpretation |
|---|---|
| #231 | current-main Spec Kit adapter/constitution/templates candidate; not repository authority until merged |
| #223 | transaction date/amount filters candidate; no merged transaction behavior change yet |
| #221 | superseded by merged PR #230; close without merge rather than reusing the stale branch |
| #220 | broad project-memory reconciliation candidate from an older baseline; compare against current truth before reuse |
| #218 | public-experience packet archive candidate from an older baseline |
| #217 | paused browser theme-color candidate pending owner palette selection |
| #211 | FK-index candidate; not merged/deployed; rebase/reverify first |
| #208 | older landing/auth design likely superseded by the merged public-experience direction |
| #198 | provider-security runbook candidate |
| #197 | maintenance candidate |
| #170/#171 | stale CSS cleanup stack; compare against current CSS ownership/remediation |
| #119 | draft logo candidate requiring visual owner approval |

## 10. True gaps after this audit

### P0 — financial/public trust

1. account reconciliation;
2. provider-side Auth/CAPTCHA/edge enforcement and acceptance;
3. observed P0/P1 physical-device or destructive-flow defects.

### P1 — deepen existing loops

1. transaction review/date/amount/bulk correction;
2. budget history/copy/rollover/drill-down;
3. recurring history/states/calendar/reminders/matching;
4. goal contribution/funding/lifecycle;
5. report arbitrary range/account/type/drill-down;
6. import mapping/batch/bulk-review;
7. account trends/export and richer register controls;
8. physical-device and remaining route states.

### P2 — ownership and scale

1. authenticated deterministic rules;
2. planning-data export/schema/restore;
3. non-sensitive mutation audit;
4. large-ledger and staging-load acceptance;
5. evidence-based dashboard attention/drill-down.

## 11. Current implementation direction

Parallel tracks: ledger trust; planning depth; reports/export/performance; advanced import/rules; onboarding/mobile/provider completion.

The next ledger work must not silently conflate account history with reconciliation. Existing open transaction-filter work may be completed as a separate P1 slice after rebasing and exact-head verification; reconciliation requires its own owner-approved financial/data specification.

Validation is embedded in each PR: financial/data uses unit + migration replay + pgTAP + affected browser evidence; UI uses responsive/browser and physical-device proof where claimed; provider changes require before/after, rollback and production smoke. Protected CodeQL analysis is required for every PR independently of those product-layer selections.

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
- “Account register/detail is absent.”
- “Account history proves reconciliation.”
- “A successful CodeQL job shell proves a code-scanning result when initialization or analysis was skipped.”
- “All security work is incomplete.”
- “Feature development must freeze until a seven-day trial.”

## 13. Update and compaction protocol

Every PR creates exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row or section here.

Budgets:

- target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Compaction removes superseded prose and repeated evidence, never current truth or unresolved gaps. Historical records remain cold and are loaded only for provenance.

Code/tests outrank prose. A screenshot, route existence, passing build or unmerged branch alone never proves completion.
