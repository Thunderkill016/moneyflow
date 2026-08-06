# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-06
- **Current main audited:** `372036fe8d1e583c3a81083ebef11f902e4f8b46`
- **Owner direction:** MoneyFlow is released as a functional MVP; validation is required inside each workstream but is not a global feature freeze; public-beta gates remain separate
- **UI-system migration:** parent plan PR #296 and Phases 0–6 are merged; Phase 7 Planning is candidate-only on PR #308
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Memory size target:** target: **150–250 lines**
- **Memory hard failure:** hard failure: above **500 lines** or **64 KiB**
- **Detailed MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Release acceptance:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Release decision:** `docs/release/MVP_RELEASE_DECISION_2026-08-03.md`
- **Released MVP SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824` — released as MVP, not automatically public-beta ready

## 1. Purpose and authority

This snapshot records merged implementation truth, verified-unmerged work, owner-reported external work, partial depth and known gaps. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. exact-head or production evidence appropriate to the claim;
3. explicit owner statements without invented operational detail;
4. this snapshot;
5. architecture, product principles and delivery policy;
6. active issues/specs/work packets;
7. historical research and PR records.

Open pull requests and branch-only artifacts are not current product behavior. Text in this file that lands through a PR describes the post-merge state of that PR unless it is explicitly labeled candidate-only.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with relevant repository evidence |
| **Implemented + production evidenced** | Merged path was also verified through the affected production/provider boundary |
| **Verified unmerged** | Exact-head evidence exists but the work is not current product behavior |
| **Owner-reported external** | Owner reports work outside inspected public evidence; exact detail remains unasserted |
| **Partial** | Useful merged behavior exists but lacks competitive depth |
| **Absent on main** | No merged implementation exists |
| **Candidate only** | Exists only in an open PR or branch |
| **Historical/superseded** | Preserved for provenance, not current direction |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

- record income, expense, split and transfer;
- know account balances and inspect ledger movements;
- understand period income, expense, net and categories;
- correct and recover records;
- plan with budgets, recurring items and goals;
- import controlled data and export user-owned data;
- reconcile an account register against a statement where the merged capability is available.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR as product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript, Tailwind and shared Base UI/Radix primitives.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Viewer-aware server reads and validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng; supported non-VND currencies use integer minor units.
- Transfers are balanced, same-currency and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete and recovery where supported.
- Account archive is reversible; archived balances/history remain stored while active-account totals and new-transaction choices exclude archived accounts.
- Budgets are monthly category limits, not envelope-assigned cash.
- Unpaid commitments and expected income remain plans until explicit ledger posting.
- Goal allocation is a planning number; current main does not transfer or lock account money.
- Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- CodeQL, secret-history scanning and risk-proportional CI remain protected gates.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete. Competitive depth and public-beta hardening remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo and CAPTCHA plumbing | hosted-provider acceptance remains separate |
| Accounts | Merged Phase 6 local workspace, CRUD/archive/restore, explicit active totals, archived-balance visibility, transfers, register/detail and reconciliation route integration | richer account-closing lifecycle requires separate financial specification |
| Reconciliation | Merged account-leg/session domain and UI integration with account-scoped state and exact-zero completion contracts | production/provider applicability remains evidence-specific; no bank feed or automatic matching claim |
| Categories | Merged income/expense category lifecycle | clearer archive-impact depth if required |
| Transactions | Merged Phase 5 local ledger/capture ownership, search/filter/ranges, review/bulk correction, edit, split/transfer and soft delete/undo | split-line correction and broader mutation audit remain depth gaps |
| Timeline | Merged reviewed-only read-only ledger projection | broader history/export depth only |
| Dashboard | Merged Phase 4 local presentation ownership, deterministic period, truthful range semantics, planning/activity summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged category limits, historical month selection, previous-month comparison, progress and transaction drill-down | rollover, flex buckets and deeper lifecycle remain separate product depth |
| Recurring | Merged expense/income templates, current-month occurrence links and pay/receive undo baseline | broader history, flexible schedules and matching remain depth gaps |
| Goals | Merged target, planning allocation, deadline, planned pace and archive | contribution history and account-backed funding lifecycle are absent |
| Reports | Merged period comparisons, totals, category/trend views, custom ranges and transfer exclusion | account/type dimensions and deeper drill-down |
| Export | Merged direct CSV plus date-range CSV/JSON bundles | restore documentation and broader planning portability |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning and atomic approval | presets, batch UX and resume/retry depth |
| Rules | Partial deterministic local parse rules | authenticated persisted rules |
| Privacy/deletion | Merged baseline privacy surfaces and recoverable ledger deletion | deep destructive public-beta acceptance |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance only |
| Responsive/accessibility | Broad automated route/dialog/device coverage through Phase 6 across Chromium/WebKit, 200% text and keyboard | physical-device acceptance remains separate; Phase 7 candidate evidence pending |
| CI/security/performance | Risk-selected CI, exact-head monitoring commands, CodeQL, secret scan, database/browser harnesses and performance documentation | provider/staging capacity claims remain evidence-specific |

## 6. UI-system migration truth

### Authority and preserved direction

- `src/app/document-theme.css` is the executable semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- Public routes remain light-only.
- Signed-in workspace retains Light/Dark/System behavior.
- Financial colors are functional roles, not decorative palette choices.
- Guided Story remains the preserved landing direction unless a separate redesign packet is approved.

### Phase 0 — accepted baseline

PR #297 established the authority index, route/presentation topology and starting debt measurements. The accepted starting figures were two root CSS owners, seven legacy imports, nine document-selector allowlist files, 1,112 `!important` declarations against a temporary 1,200 ceiling and two invisible root presentation contracts. Those are migration-baseline figures, not timeless external standards.

### Phase 1 — no-new-debt guardrails

PR #298 prevents new unowned global CSS layers, CSS import chains, unreviewed `!important`, unknown token references, stale `/insights` use and known legacy-class registration. The rules inspect added lines so existing debt can be migrated incrementally.

### Phase 2 — token and primitive ownership

PR #299 established MoneyFlow-native Button, LinkButton, IconButton, field, Dialog, Sheet, Badge, Alert, Toast, EmptyState and MoneyValue contracts with source/unit evidence. WCAG AA 24×24 remains the accessibility baseline; 44×44 is the MoneyFlow important-action policy, not a requirement for every control.

### Phase 3 — App Shell and chrome ownership

PR #300 established canonical BrandLockup ownership, typed edge-to-edge viewport/safe-area contracts, one measured mobile-navigation reserve, Phase 2 Sheet/Dialog/Toast composition, explicit route capabilities and reduced compatibility ownership.

### Phase 4 — Dashboard ownership pilot

PR #301 was squash-merged as `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`. Dashboard presentation moved behind local owners and Phase 2 primitives; withdrawn safe-to-spend rendering and retired bridges were removed after active-path proof. Exact-head policy/static/unit/build/browser/CodeQL/secret evidence passed.

### Phase 5 — Transactions and Capture

PR #306 was squash-merged as `f6cea659030397e21d4287912faef173bc7a0966`. It established local `/transactions`, capture and timeline owners, shared transaction-dialog lifecycle, semantic evidence slots, full-width phone dialogs, preserved integer/split/transfer invariants and retired the old transaction owner.

Exact head `15a7ed6fcaf97596088f365c7703e9d3227ed97d` passed CI #1831, CodeQL #949 and secret-history scan #949, including browser smoke and the Chromium/WebKit cross-device matrix.

### Phase 6 — Accounts and Transfer

PR #307 was squash-merged as `372036fe8d1e583c3a81083ebef11f902e4f8b46` after explicit owner merge instruction. It established:

- a locally owned Accounts workspace and shared account form/review contracts;
- explicit active-account totals separated by currency;
- retained archived balances/history with restore and register access;
- shared review for account archive instead of `window.confirm`;
- dedicated Transfer presentation ownership while preserving balanced same-currency mutations;
- responsive account/transfer evidence and retirement of the old Accounts page owner.

The exact PR head passed CI #1857, CodeQL #974 and secret-history scan #974. Merging `main` automatically triggered Vercel production deployment `dpl_GD5hVfLXh66rmrJnZiiADN8f4HK9`, which reached `READY` for merge commit `372036fe8d1e583c3a81083ebef11f902e4f8b46`. The agent did not manually trigger that deployment.

A rule requiring zero account balance, a balancing transfer or automatic account-closing entry remains a separate Class 3 financial decision.

### Phase 7 — Planning candidate

Owner instruction `làm đi` authorized bounded Phase 7 work on 2026-08-06. PR #308 is candidate-only and is not current product behavior until owner-authorized merge.

The candidate:

- introduces locally owned Planning workspace/header/summary/card/review contracts;
- migrates Budgets, Commitments, recurring income and Goals to Phase 2 primitives;
- preserves Budget history/comparison/drill-down and recurring ledger mutations;
- replaces Planning `window.confirm` flows with explicit reversible reviews;
- corrects copy that implied unpaid commitments were locked cash or Goal allocations moved account money;
- preserves the current tracking-budget model and does not add envelope, rollover, auto-posting, account-backed Goals or safe-to-spend guidance.

### Next UI boundary

Phase 8 is not authorized by Phase 7 branch work. It requires a new explicit owner instruction after PR #308 reaches an owner decision.

## 7. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider changes require before/after evidence, rollback and production smoke.
- Automated browser success does not prove physical-device acceptance or visual quality by itself.
- A successful job shell is not evidence when initialization/analysis or selected shards were skipped.
- Candidate PR #308 changes no database, Auth, RLS, provider setting, production data or financial formula.
- A future merge to `main` is expected to auto-trigger Vercel; branch verification does not authorize that merge.
- Physical Android and iOS/Safari acceptance remains Phase 11 evidence.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | Substantially implemented; provenance, dry-run, atomic approval and public-FK coverage are merged |
| #53 reconciliation | Merged account-leg/session contract and UI integration; production applicability remains evidence-specific |
| #53 authenticated rules | Absent on main; deterministic local rules exist |
| #53 audit/performance | Partial; strong repository tooling exists while capacity claims remain evidence-specific |
| #72 UI audit | Broad automated coverage merged through Phase 6; validation/destructive/import/planning depth and physical-device detail remain separate |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; private provider execution is not inferred |

## 9. Open pull-request memory

Open PRs are not product truth and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #308 | authorized Phase 7 Planning candidate; exact-head evaluation in progress; not merged |
| #170/#171 | older CSS cleanup candidates; compare against current ownership and tests before reuse |
| #119 | visual/logo candidate requiring current browser evidence and owner approval |

PRs #295–#307 are merged and must not be described as candidates. Older closed/unmerged reconciliation and transaction candidates remain provenance only.

## 10. True gaps after this audit

### Public-beta hardening

- reconcile owner-held provider/device/deep-state evidence without exposing private identifiers or data;
- decide whether final visual-direction approval is required before broader use;
- run approved staging/provider load or advisor checks only when a capacity claim is needed.

### Post-MVP product depth

- richer account-closing lifecycle, reconciliation matching depth and bank-independent statement workflow;
- split-line transaction correction and mutation audit;
- budget rollover/flex planning, recurring history/matching and Goal funding/contribution history;
- report account/type dimensions and drill-down;
- import batch UX, authenticated persisted rules and portability.

### UI migration debt

- evaluate/merge or reject Phase 7 candidate PR #308;
- Phase 8 and later route-by-route adoption of Phase 2 primitives;
- compatibility-variant and alias retirement after zero-reference evidence;
- remaining local ownership of responsive repairs and final legacy CSS retirement;
- physical Android and iOS/Safari acceptance;
- separately approved component-harness adoption if evidence later justifies it.

## 11. Load-bearing merged and verified truth

- PR #183/#184 merged atomic Inbox approval, provenance, dry-run, transfer planning and idempotency.
- PR #206/#207 merged dashboard one-RPC hardening and schema-skew fallback.
- PR #228/#229 merged account register/detail and deployment/auth-routing evidence.
- PR #231 merged the Spec Kit adapter without replacing MoneyFlow governance.
- PR #234/#235 merged transaction date/amount filters.
- PR #236/#244 merged complete public-FK index coverage and pgTAP evidence.
- PR #261 and successors established current reconciliation domain/UI truth on main.
- PR #289 and closure work established custom report date ranges.
- PR #295 restored the repository-wide secret-history gate through a reviewed fingerprint-specific repair.
- PR #296/#297/#298 merged the UI-system parent plan, Phase 0 baseline and Phase 1 guardrails.
- PR #299 delivered Phase 2 shared primitive ownership.
- PR #300 delivered canonical App Shell/chrome ownership.
- PR #301 delivered and merged the Phase 4 Dashboard ownership pilot.
- PR #302 delivered exact-head CI monitoring commands and runbook.
- PR #306 delivered and merged Phase 5 Transactions/Capture ownership.
- PR #307 delivered and production-deployed Phase 6 Accounts/Transfer ownership.
- PR #308 remains candidate-only until cumulative exact-head verification and owner merge decision.

## 12. Superseded-status register

Do not repeat these as current facts:

- Reports lack previous-period comparison or trends.
- CSV import is absent.
- Rules are entirely absent.
- Import provenance/dry-run/atomic approval are future work.
- Reports lack custom ranges.
- Budgets lack historical month selection or previous-month comparison.
- Recurring items have no occurrence linkage.
- Goals lack deadline or pace calculation.
- Export only supports current-month CSV or depends on `/insights`.
- Dashboard still performs the original authenticated fan-out.
- Dashboard still depends on page-imported global CSS or a CSS-only safe-to-spend withdrawal bridge.
- CAPTCHA plumbing, account register/detail, reconciliation integration or transaction range filters are missing.
- Transactions still use the retired manager workspace or transaction dialog classes.
- Phase 5 remains unauthorized, pending or unmerged.
- PR #307 remains candidate-only or unmerged.
- Phase 6 was not deployed after merge.
- Candidate PR #308 is current product behavior.
- Missing public evidence proves the owner did not perform private work.
- Functional MVP requires every competitive-depth item.
- Provider/device acceptance is automatically part of the locked MVP exit definition.
- Repository tests prove private provider state or physical-device acceptance.
- Spec Kit replaces MoneyFlow governance.
- Completion of one UI phase automatically authorizes the next.
