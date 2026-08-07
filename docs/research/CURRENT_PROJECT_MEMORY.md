# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-07
- **Current main audited:** `31fc4e852623ee503ee85a728f4be52d1c874d1b` as the last fully recorded merge baseline; this snapshot also describes the post-merge state of PR #309 as required by the repository memory contract
- **Owner direction:** MoneyFlow is released as a functional MVP; validation is required inside each workstream but is not a global feature freeze; public-beta gates remain separate
- **UI-system migration:** parent plan PR #296 and Phases 0–8 are merged once PR #309 lands; Phase 9 remains unauthorized
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Memory size target:** target: **150–250 lines**
- **Memory hard failure:** hard failure: above **500 lines** or **64 KiB**
- **No production migration pending:** P8 contains no schema/data migration; its merge is expected to trigger the existing Vercel path, whose exact deployment evidence must be observed separately
- **Current production applicability:** P6 is production-evidenced; P7 is merged with repository evidence; P8 is merged with repository evidence once PR #309 lands, while its production deployment must not be inferred before exact provider evidence exists
- **Owner-confirmed external work:** none newly asserted for P8; private provider/device evidence remains owner-held unless supplied
- **Current merged gap:** physical-device acceptance, provider-backed recent authentication for destructive account deletion and a complete versioned archive/restore remain outside current merged capability
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

Open pull requests and branch-only artifacts are not current product behavior. Text that lands through a PR describes the post-merge state unless explicitly labeled candidate-only.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Implemented + production evidenced** | Merged path was verified through the affected production/provider boundary |
| **Verified unmerged** | Exact-head evidence exists but the work is not current product behavior |
| **Owner-reported external** | Owner reports work outside inspected evidence; exact detail remains unasserted |
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
- import controlled data and export user-owned records;
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
- Goal allocation is a planning number; it does not transfer or lock account money.
- Authenticated Inbox candidate approval uses the merged atomic approval path; demo/browser approval uses candidate-linked retry identity after P8.
- Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- CodeQL, secret-history scanning and risk-proportional CI remain protected gates.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete. Competitive depth and public-beta hardening remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo and CAPTCHA plumbing | hosted-provider acceptance and sensitive-action recent-auth remain separate |
| Accounts | Merged Phase 6 workspace, CRUD/archive/restore, active totals, archived-balance visibility, transfer, register/detail and reconciliation integration | richer account-closing lifecycle requires separate financial specification |
| Reconciliation | Merged account-leg/session domain and UI with account-scoped state and exact-zero completion | production applicability remains evidence-specific; no bank feed or automatic matching claim |
| Categories | Merged flat income/expense lifecycle plus P8 local identity presentation, editable icon/color and reversible hide review | nested groups, merge/tags and historical recategorization remain separate depth |
| Transactions | Merged Phase 5 ledger/capture ownership, search/filter/ranges, review/bulk correction, edit, split/transfer and soft delete/undo | split-line correction and broader mutation audit remain depth gaps |
| Timeline | Merged reviewed-only read-only ledger projection with local Phase 5 owner | P8 verifies; it does not reimplement Timeline |
| Dashboard | Merged Phase 4 ownership, deterministic period, truthful range semantics, planning/activity summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged category limits, historical month selection, previous-month comparison, progress and drill-down | rollover, flex buckets and deeper lifecycle remain separate product depth |
| Recurring | Merged expense/income templates, current-month occurrence links and pay/receive undo | broader history, flexible schedules and matching remain depth gaps |
| Goals | Merged target, planning earmark, deadline, pace and archive | contribution history and account-backed funding lifecycle are absent |
| Reports | Merged period comparisons, totals, category/trend views, custom ranges, transfer exclusion and P8 local secondary presentation | account/type dimensions and deeper drill-down |
| Export | Merged transaction/Inbox CSV/JSON with explicit scope and date-range support | not a complete versioned backup/restore archive |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning, authenticated atomic approval, P8 review presentation and candidate-linked demo retry | presets and broader batch UX remain depth gaps |
| Rules | Merged deterministic candidate-only rules with preview/order/version evidence, P8 review ownership and mobile-reachable add flow | broader conditions/actions and auto-posting remain out of current scope |
| Privacy/deletion | Merged privacy/export/delete baseline, server-first account deletion, P8 final review and cleanup receipt | provider-backed recent-auth and deeper destructive acceptance remain separate boundaries |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance only |
| Responsive/accessibility | Broad automated route/dialog/device coverage through Phase 8 across Chromium/WebKit, 200% text and keyboard | physical-device acceptance remains separate |
| CI/security/performance | Risk-selected CI, exact-head monitoring, CodeQL, secret scan, database/browser harnesses and performance docs | provider/staging capacity claims remain evidence-specific |

## 6. UI-system migration truth

### Authority and preserved direction

- `src/app/document-theme.css` is the executable semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- Public routes remain light-only.
- Signed-in workspace retains Light/Dark/System behavior.
- Financial colors are functional roles, not decorative palette choices.
- Guided Story remains the landing direction unless a separate redesign packet is approved.

### Phases 0–3 — foundations

- PR #297 established the route/presentation topology and debt baseline.
- PR #298 prevents new unowned global CSS, unreviewed `!important`, unknown token references, stale route references and known legacy-class registration.
- PR #299 established MoneyFlow Button, LinkButton, IconButton, field, Dialog, Sheet, Badge, Alert, Toast, EmptyState and MoneyValue contracts.
- PR #300 established canonical BrandLockup, App Shell/chrome ownership, viewport/safe-area contracts and explicit route capabilities.

### Phase 4 — Dashboard

PR #301 was squash-merged as `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`. Dashboard moved behind local owners and Phase 2 primitives; withdrawn safe-to-spend rendering and retired bridges were removed after active-path proof.

### Phase 5 — Transactions and Capture

PR #306 was squash-merged as `f6cea659030397e21d4287912faef173bc7a0966`. It established local Transactions, Capture and Timeline owners, shared transaction-dialog lifecycle, semantic evidence slots and preserved integer/split/transfer invariants. Exact PR evidence included CI #1831, CodeQL #949 and secret-history #949.

### Phase 6 — Accounts and Transfer

PR #307 was squash-merged as `372036fe8d1e583c3a81083ebef11f902e4f8b46`. It established local Accounts and Transfer owners, currency-separated active totals, archived-balance/history visibility, archive review and balanced same-currency transfer preservation. CI #1857, CodeQL #974 and secret-history #974 passed. Vercel deployment `dpl_GD5hVfLXh66rmrJnZiiADN8f4HK9` reached `READY` for the exact merge commit.

A zero-balance or balancing-transfer account-closing rule remains a separate Class 3 decision.

### Phase 7 — Planning

PR #308 was squash-merged as `31fc4e852623ee503ee85a728f4be52d1c874d1b` after explicit owner merge instruction. It established shared Planning workspace/header/summary/card/review owners across Budgets, Commitments, recurring income and Goals; replaced Planning browser confirms; preserved budget history/comparison and recurring ledger mutations; corrected commitment and Goal copy that overstated locked cash.

The final PR head `e273e3911537d6a90f680d4382058f0d8023b0d0` passed CI #1871, CodeQL #987 and secret-history #987, including browser smoke and Chromium/WebKit cross-device audit. P7 production deployment state has not been independently recorded in this snapshot and must not be inferred from merge alone.

### Phase 8 — secondary and safety

PR #309 establishes locally owned secondary/safety presentation and review contracts across Reports, Categories, Inbox, Rules, Imports and Settings/data-rights surfaces. It preserves existing report math, flat categories, authenticated atomic approval, review-first import defaults and Phase 5 Timeline ownership while adding candidate-linked demo approval retry identity, explicit destructive reviews, truthful export/import/privacy copy and an account-deletion cleanup receipt.

The first recovered cumulative run exposed a real mobile Rules regression after one rule existed. P8 fixes the owning AppShell contract so the add action remains reachable on phones without duplicating the empty-state CTA. Corrected implementation head `6bc575b2b8f6c0949f19c011f0327a7413f84f97` passed CI #1936 (`31150496664`), including Browser smoke, Cross-device UI audit and `e2e`, plus CodeQL #1047 and secret-history #1047. The final governance-only head is required to refresh exact-head gates before owner-authorized squash merge; final run IDs live in PR metadata to avoid a self-referential evidence commit.

P8 does not add a report builder, nested categories, automatic rule posting, bank sync, a complete backup/restore product, remote parser-training processing, provider-backed recent-auth or database/provider changes.

### Next UI boundary

Phase 9 Landing/Auth cleanup is not authorized by P8 work. A deletion-result receipt needed to display P8 cleanup outcomes is bounded safety evidence, not a general Auth redesign.

## 7. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider changes require before/after evidence, rollback and production smoke.
- Automated browser success does not prove physical-device acceptance or visual quality by itself.
- A successful job shell is not evidence when initialization/analysis or selected shards were skipped.
- P8 changes no database schema, migration, RLS or provider setting.
- Merge to `main` is expected to auto-trigger Vercel; repository evidence does not by itself prove the production deployment reached `READY`.
- Physical Android and iOS/Safari acceptance remains later physical-device evidence.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | Provenance, dry-run, authenticated atomic approval and public-FK coverage are merged |
| #53 reconciliation | Merged account-leg/session contract and UI; production applicability remains evidence-specific |
| #53 authenticated rules | Persisted deterministic rules exist where server feature contract is available; broader automation remains absent |
| #53 audit/performance | Strong repository tooling exists; provider capacity claims remain evidence-specific |
| #72 UI audit | Automated validation/destructive/import/settings and cross-device coverage is merged through P8; physical Android/iOS acceptance remains open and must not be inferred from emulation |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; private provider execution is not inferred |

## 9. Open pull-request memory

Open PRs are not product truth and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #170/#171 | older CSS cleanup candidates; compare against current ownership and tests before reuse |
| #119 | visual/logo candidate requiring current browser evidence and owner approval |

PRs #295–#309 are merged in the post-merge state described by this snapshot and must not be described as candidates. Older closed/unmerged reconciliation and transaction candidates remain provenance only.

## 10. True gaps after this audit

### Public-beta hardening

- reconcile owner-held provider/device/deep-state evidence without exposing private identifiers or data;
- complete physical Android and iOS/Safari acceptance;
- decide whether final visual-direction approval is required before broader use;
- run approved staging/provider load or advisor checks only when a capacity claim is needed.

### Post-MVP product depth

- richer account closing, reconciliation matching and statement workflow;
- split-line transaction correction and mutation audit;
- budget rollover/flex planning, recurring history/matching and Goal funding history;
- report account/type dimensions and drill-down;
- versioned full archive/restore and broader portability;
- broader rule conditions/actions without automatic unreviewed ledger posting.

### UI migration debt

- Phase 9 public/Auth cleanup after a separate owner decision;
- compatibility alias retirement after zero-reference evidence;
- final legacy CSS retirement and product-wide target-size sweep;
- separately approved component-harness adoption if evidence later justifies it.

## 11. Load-bearing merged and verified truth

- PR #183/#184 merged authenticated atomic Inbox approval, provenance, dry-run, transfer planning and idempotency.
- PR #206/#207 merged Dashboard one-RPC hardening and schema-skew fallback.
- PR #228/#229 merged account register/detail and deployment/auth-routing evidence.
- PR #236/#244 merged complete public-FK index coverage and pgTAP evidence.
- PR #261 and successors established current reconciliation domain/UI truth.
- PR #289 and closure work established custom report date ranges.
- PR #295 restored the repository-wide secret-history gate.
- PR #296–#300 merged the UI parent plan, baseline, guardrails, primitives and App Shell.
- PR #301 merged Phase 4 Dashboard ownership.
- PR #306 merged Phase 5 Transactions/Capture/Timeline ownership.
- PR #307 merged and production-evidenced Phase 6 Accounts/Transfer ownership.
- PR #308 merged Phase 7 Planning ownership after exact-head CI/security/browser evidence.
- PR #309 delivers Phase 8 secondary/safety ownership after owner-authorized final exact-head verification; production deployment evidence remains a separate post-merge observation.

## 12. Superseded-status register

Do not repeat these as current facts:

- Reports lack previous-period comparison or trends.
- Reports lack custom ranges.
- CSV/XLSX/PDF staging is absent.
- Rules are entirely absent.
- Import provenance/dry-run/atomic approval are future work.
- Budgets lack historical month selection or previous-month comparison.
- Recurring items have no occurrence linkage.
- Goals lack deadline or pace calculation.
- Goal allocation locks account money.
- Unpaid commitments are reserved cash.
- Export only supports current-month CSV or depends on a retired route.
- P7 remains candidate-only.
- P8 remains candidate-only after PR #309 merges.
- P8 branch behavior is current product truth before merge.
- Transaction/Inbox export is a complete restorable account backup.
- The parser-improvement preference proves remote samples are being processed.
- A merge proves Vercel production readiness without provider evidence.
