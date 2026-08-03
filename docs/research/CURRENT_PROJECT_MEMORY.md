# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-03
- **Code baseline audited:** `main@29b24617d80b1329072ad681086ce3656a5ab790`
- **Owner direction:** continue developing existing capabilities toward competitive depth; validation is required inside each workstream but is not a global feature freeze
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`

## 1. Purpose and authority

This compact snapshot answers what is implemented, partial, absent, externally pending or candidate-only. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. verified production or exact-head evidence;
3. this snapshot;
4. architecture, product principles, MVP and delivery policy;
5. current issues, specs and work packets;
6. historical research and PR records.

Open pull requests and unmerged feature artifacts are candidate evidence only.

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
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Server workspaces own viewer-aware reads; validated Server Actions and ownership-safe RPCs own financial writes.
- VND is integer đồng. Transfers are structural, balanced and excluded from income/expense. Split totals must remain exact.
- Destructive ledger actions use soft delete and recovery. Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- Playwright, pgTAP, k6, secret-history scanning and risk-proportional CI cover selected boundaries.
- Protected CodeQL performs and uploads a real JavaScript/TypeScript analysis for every pull request.
- Spec Kit is an adopted feature-artifact interface; MoneyFlow governance, permissions, work packets, PR memory and owner decisions remain authoritative.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.

## 5. Current capability inventory

| Capability | Status | Implemented now | True remaining depth |
|---|---|---|---|
| Authentication/demo | **Implemented; external pending** | email/password, OAuth surfaces, recovery/reset, explicit demo, neutral responses, CAPTCHA token plumbing | provider policy/callback/confirmation, enforcement, rates, breached-password and edge rules |
| Accounts | **Implemented, partial** | common account kinds, initial/derived balances, per-currency totals, CRUD/archive/restore, same-currency transfer, viewer-scoped register/detail with signed ledger impacts | reconciliation, trends/export, hide/archive/report semantics and richer register controls |
| Categories | **Implemented** | income/expense categories, archive and cross-feature use | clearer archive impact; hierarchy only if evidence requires it |
| Transactions | **Implemented, partial** | create/search, kind/account/category/date/amount filters, canonical URL state, edit, soft delete/undo, grouping/pagination and truthful filtered totals | review state, bounded bulk correction, split-line editing and non-sensitive mutation audit |
| Transfers | **Implemented** | balanced semantics, currency guard, report neutrality, shared mutation owner, idempotency and account-register source/destination presentation | reconciliation |
| Split expenses | **Implemented** | validated multi-line expense and reporting allocation | in-place line editing and richer correction |
| Dashboard | **Implemented + production hardened** | bounded one-RPC bundle for balances/activity/planning/Inbox | attention drill-down and measured acceptance |
| Dashboard fallback | **Implemented + production evidenced** | schema-skew fallback preserves real data instead of false zeros | compatibility with future bundle changes |
| Budgets | **Implemented, basic loop** | current-month category limits, spend calculation and CRUD | history, comparison, copy month, rollover decision and drill-down |
| Recurring commitments | **Implemented, partial occurrence model** | templates, current-month occurrence, transaction link, pay/undo and reserved totals | full history/states, calendar/reminders and matching |
| Recurring income | **Implemented, partial occurrence model** | templates, current-month occurrence/link and expected totals | history/lifecycle, calendar/reminders and matching |
| Goals | **Implemented, partial** | target, allocation, deadline, planned-daily pace and archive | contribution history, funding source, lifecycle and drill-down |
| Reports | **Implemented, moderate depth** | week/month/year, prior comparable period, totals/change/category/trends and transfer exclusion | arbitrary range, account/type dimensions, drill-down/shared filters |
| Period report export | **Implemented** | safe one-click period CSV | follow future report filters |
| Export hub | **Implemented** | date range, transactions/candidates/all, CSV/JSON and UTF-8/formula safety | account/kind parity, schema version, planning data and restore docs |
| Import/Inbox | **Implemented + production evidenced** | CSV/XLSX/PDF, staging/review, provenance, dry-run, duplicate/transfer plan, atomic approval, RLS/idempotency | presets, batch management, bulk correction and resume/retry UX |
| Rules | **Partial** | deterministic local parse rules | authenticated persisted rules with RLS/order/preview/version/audit/UI |
| Privacy/deletion | **Implemented baseline** | privacy surfaces and recoverable ledger deletion | export-before-delete and destructive-flow production acceptance |
| Share Target | **Implemented and hardened** | bounded validation and ingestion | provider/edge controls and continued smoke |
| Responsive UI | **Implemented with broad automation** | light/dark responsive app, expanded route/dialog and WebKit coverage | physical-device and deep error/destructive/Inbox states |
| Accessibility/mobile | **Substantially implemented** | 44px targets, accessible names, modal placement, money wrapping and Vietnamese/VND regressions | physical keyboard/device proof and remaining confirmations |
| CI/security scanning | **Implemented** | stable risk checks, real CodeQL analysis on every PR, secret scan, pinned Actions and knowledge/classifier contracts | keep ruleset, workflow and classifier guidance aligned |
| Specification workflow | **Implemented** | pinned Spec Kit adapter, constitution and templates integrated with MoneyFlow governance | run/review official initializer only in a dedicated pinned upgrade |
| Database verification | **Implemented** | fresh reset, pgTAP domain/RLS/tenant/attack suites | reconciliation tests; PR #236 is candidate-only for complete foreign-key index coverage |
| Performance tooling | **Implemented; acceptance partial** | dashboard one-RPC/bounds, k6 public/auth profiles and budgets | staging concurrency and realistic large-ledger benchmarks |
| Analytics | **Implemented baseline** | Vercel Analytics and Speed Insights | no retention/conversion claim without defined events/cohorts |

## 6. Load-bearing merged truth

- Reconciliation is absent: calculated balance, account history and date/amount filtering are not statement reconciliation.
- Account register/detail is merged through PR #228; PR #229 archived its packet and synchronized production-deployed truth.
- PR #230 removed the CodeQL skip path. A green job shell with skipped initialization/analysis is not valid code-scanning evidence.
- PR #231 merged the Spec Kit adapter; generated specs cannot weaken financial invariants, permissions or required checks.
- PR #233 archived completed governance and public-experience packets and reconciled superseded PR truth.
- PR #234 merged inclusive transaction date and integer-amount filters, canonical URL state, explicit invalid-range feedback, filter-preserving correction context and responsive controls at `45b6f22de80aa7c1fd67f2f402f4ffd6bd147cc8`.
- PR #234 exact head passed CI #1145, CodeQL #298 and Secret history scan #298, including browser smoke and cross-device UI audit; that is repository/browser evidence, not a production-deployment claim.
- PR #235 reconciled canonical memory and completed the transaction-range Spec Kit lifecycle at `29b24617d80b1329072ad681086ce3656a5ab790`; it made no runtime or database change.
- PR #215 established layered project memory: concise hot rules, current snapshot, task routing and bounded cold PR records.
- PR #213 merged and deployed one landing/auth/color candidate. That proves implementation, not final owner design approval.
- The authenticated dashboard uses bounded `get_dashboard_bundle`; schema-skew fallback prevents false zero/empty data and must not be removed without equivalent evidence.
- Recurring commitments/income already link current-month occurrences to transactions.
- Goals already have deadline and planned-daily pace.
- Reports already include previous comparable periods and trends.
- Export supports date ranges, CSV/JSON and transaction/candidate/all datasets.
- Import provenance, server dry-run, duplicate/transfer planning and atomic approval are production-smoked.
- Local parse rules exist; authenticated persisted rules do not.
- Provider enforcement remains external even though repository-side auth/CAPTCHA/security readiness exists.
- Safe-to-spend/daily-allowance behavior remains withdrawn.

## 7. Engineering and evidence boundary

Implemented engineering evidence includes modular boundaries, neutral transaction contracts, shared mutation owners, viewer-scoped account register projection, composable transaction filters, deployment/CSS/architecture checks, unit/static RLS, selected Supabase reset/pgTAP, selected browser/responsive/WebKit checks, stable required CI names, real CodeQL analysis and load-profile contracts.

Still needed: physical Android/iOS evidence, deep validation/destructive/Inbox states, approved staging load, realistic large-ledger benchmarks and non-sensitive mutation audit.

A screenshot, route existence, passing build or unmerged branch alone never proves completion. Provider and production claims require provider/production evidence.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants | **Substantially implemented**; verify exact residual checklist |
| #53 import provenance/dry-run | **Completed + production evidenced** through PRs #183/#184 |
| #53 reconciliation | **Absent; valid financial-trust workstream** |
| #53 authenticated rules | **Absent; local rules only** |
| #53 audit/performance | **Partial**; PR #236 is an unmerged current-main FK-index candidate |
| #72 UI audit | Core route/VND/targets/modal/accessibility slices complete; deep states/devices remain |
| #172 product assessment | Retention/WTP/demand warnings remain useful; old score/state/freeze is superseded |
| #174 provider controls | Repository readiness implemented; provider configuration/production verification remain |

## 9. Open pull-request memory

Open PRs are not product truth. Refresh and reverify against current `main` before merge.

| PR | Interpretation |
|---|---|
| #236 | current-main candidate adding 14 foreign-key coverage indexes plus a diagnostic complete left-prefix pgTAP invariant; two separately proven nullable-FK partial indexes remain valid; no production migration applied |
| #198 | provider-security runbook candidate; repository documentation only, no provider operation performed |
| #197 | Dependabot-noise maintenance candidate from an older baseline; refresh before reuse |
| #170/#171 | diverged stacked CSS cleanup candidates; compare current CSS ownership and tests before reuse |
| #119 | logo candidate requiring current browser evidence and explicit owner visual approval |

Recently closed unmerged as stale, redundant or superseded: #236 replaces #211; #232 replaced #223 and was itself replaced by merged #234 because of ancestry protection; #230 replaced #221; merged #213 superseded #208; current runtime superseded #217; #199 was a no-op analytics lockfile PR.

## 10. True gaps after this audit

### P0 — financial/public trust

1. account reconciliation;
2. provider-side Auth/CAPTCHA/edge enforcement and acceptance;
3. observed P0/P1 physical-device or destructive-flow defects.

### P1 — deepen existing loops

1. transaction review state, bounded bulk correction and split-line correction;
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

Transaction range filters are merged and should be treated as an existing ledger capability. The next ledger slice must specify review state or bounded correction separately. Reconciliation requires its own owner-approved financial/data specification and must never be inferred from account history or filtering.

PR #236 is the current-main technical candidate for complete public foreign-key index coverage: 13 original advisor-derived indexes plus one provenance-owner index discovered by strict current-main pgTAP. It must pass final exact-head migration replay and full pgTAP; historical PR #211 checks are provenance only and cannot authorize merge or production deployment.

Validation is embedded in each PR: financial/data uses unit + migration replay + pgTAP + affected browser evidence; UI uses responsive/browser and physical-device proof where claimed; provider changes require before/after evidence, rollback and production smoke. Protected CodeQL analysis is required for every PR independently of product-layer gate selection.

## 12. Superseded-status register

Do not repeat these as current facts:

- CSV import is absent.
- Rules are entirely absent.
- Import provenance/dry-run/atomic approval are future work.
- Reports lack previous-period comparison or trends.
- Recurring items have no occurrence linkage.
- Goals lack a deadline or pace calculation.
- Export only supports a current-month CSV.
- Dashboard still performs the original fan-out.
- CAPTCHA application plumbing is missing.
- Account register/detail is absent.
- Transaction date/amount filters are missing or candidate-only.
- Account history or transaction filtering proves reconciliation.
- PR #211 is the current FK-index delivery candidate.
- Thirteen advisor findings alone prove complete public FK coverage.
- A successful CodeQL job shell proves scanning when initialization or analysis was skipped.
- Spec Kit replaces MoneyFlow governance.
- The merged public-experience candidate is the owner-approved final design.
- All security work is incomplete.
- Feature development must freeze until a seven-day trial.

## 13. Update and compaction protocol

Every PR creates exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row or section here.

Budgets:

- snapshot target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Compaction removes superseded prose and repeated evidence, never current truth or unresolved gaps. Historical records remain cold and are loaded only for provenance. Code, migrations and tests outrank prose.
