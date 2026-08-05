# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-05
- **Code baseline audited before this PR:** `main@c11c845cfcd5fe3f588f0564211566bac28f7afd`
- **Owner direction:** MoneyFlow is released as a functional MVP; validation is required inside each workstream but is not a global feature freeze; public-beta gates remain separate
- **UI-system migration:** parent plan PR #296 and Phases 0–3 are delivered through PRs #297–#300; Phase 4 remains unauthorized
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
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

Open pull requests and branch-only artifacts are not current product behavior. Text in this file that lands through a PR describes the post-merge state of that PR.

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
- import controlled data and export user-owned data.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR as product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript, Tailwind and shared Base UI/Radix primitives.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Viewer-aware server reads and validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng.
- Transfers are balanced and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete and recovery where supported.
- Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- CodeQL, secret-history scanning and risk-proportional CI remain protected gates.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete. Competitive depth and public-beta hardening remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo and CAPTCHA plumbing | hosted-provider acceptance remains separate |
| Accounts | Merged CRUD/archive/restore, balances, transfers and register/detail | reconciliation integration and richer controls |
| Reconciliation | Verified-unmerged database/domain contract through PR #222 | owner decides integrate or rebuild; no current-main UI |
| Categories | Merged income/expense category lifecycle | clearer archive-impact depth if required |
| Transactions | Merged create/search/filter/edit, split/transfer, soft delete/undo and truthful totals | review state, bulk correction and split-line editing |
| Dashboard | Merged bounded bundle, planning/activity/Inbox summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged current-month category limits and CRUD | history, comparison, copy, rollover and drill-down |
| Recurring | Merged templates, current-month occurrence/link and pay/undo baseline | history, lifecycle, reminders and matching |
| Goals | Merged target, allocation, deadline, planned pace and archive | contribution history and funding lifecycle |
| Reports | Merged period comparisons, totals, category/trend views and transfer exclusion | arbitrary range, account/type dimensions and drill-down |
| Export | Merged direct CSV plus date-range CSV/JSON bundles | restore documentation and broader planning portability |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning and atomic approval | presets, batch UX and resume/retry depth |
| Rules | Partial deterministic local parse rules | authenticated persisted rules |
| Privacy/deletion | Merged baseline privacy surfaces and recoverable ledger deletion | deep destructive public-beta acceptance |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance only |
| Responsive/accessibility | Broad automated route/dialog/device coverage | physical-device acceptance remains separate |
| CI/security/performance | Risk-selected CI, CodeQL, secret scan, database/browser harnesses and performance documentation | provider/staging capacity claims remain evidence-specific |

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

The global-CSS freeze, `!important` budget, route rules and legacy-class list are MoneyFlow policy rather than universal Next.js/web requirements.

### Phase 2 — token and primitive ownership

PR #299 establishes:

- additive Button semantic intent/density/target/pending API while preserving compatibility variants/sizes;
- real-link LinkButton and accessible-name-required IconButton;
- TextField, native-first SelectField, CheckboxField and native grouped RadioGroup;
- native modal Dialog and explicit modal/non-modal Sheet;
- semantic Badge, Alert, Toast/ToastRegion and EmptyState contracts;
- MoneyValue using existing money-formatting helpers and tabular numerals;
- source-contract tests for semantics, target policy, native control use, overlay distinction, live-region policy and canonical token references.

Target policy:

- WCAG AA baseline is 24×24 CSS px or a valid defined exception;
- 44×44 CSS px is the MoneyFlow important-action target for important financial, destructive, confirmation, icon-only, mobile-navigation and frequent-capture controls;
- 44px is not forced onto every link, button or select.

`MinimumTargetSizeContract` remains compatibility debt because it still combines universal targets, important route actions, action discoverability and responsive layout repairs. Phase 2 classifies its remaining groups but does not remove them.

Success/danger token aliases remain until zero-reference evidence. New semantic primitive references use canonical `--mf-*-subtle` roles. No token value or financial-domain behavior changes in Phase 2.

Storybook remains deferred because current source/unit/browser evidence covers the initial slice and no separate dependency adoption was approved.

### Phase 3 — App Shell and chrome ownership

PR #300 establishes:

- canonical main-branch `BrandLockup` as the signed-in desktop/mobile identity owner; draft logo PR #119 remains excluded;
- typed root viewport with `viewportFit: "cover"` and safe-area environment insets;
- one measured 74px mobile-nav height and a reserve derived from that height plus the bottom safe area;
- distinct shell reserve, route spacing, focus clearance and feedback clearance contracts;
- root scroll padding only while App Shell is mounted;
- Capture and More composed from Phase 2 Sheet/Dialog behavior, including Escape and focus restoration;
- centered Capture placement on tablet/desktop and shared bottom-sheet behavior where applicable;
- shared ToastRegion feedback and a bounded normal shell layer map, with modal behavior outside numeric z-index ownership;
- explicit Accounts `showPrimaryActionOnMobile` capability instead of `body:has()`/positional inference;
- removal of active App Shell `/insights` branches, signed-in logo guardrail, route-global bottom padding and broad `dialog[open]` repairs;
- `MobileShellContract` reduced to transaction-dialog dark amount-field compatibility owned for Phase 5 removal.

Exact runtime head `0c61edc40f05bad25f3ea85e3290eb2b8df425cd` passed CI #1706 policy/static/type/build, 716 tests, browser smoke and Chromium/WebKit cross-device audit. CodeQL #828 and secret-history scan #828 passed. Browser artifact `8937883473` and UI-audit artifact `8938133878` own the retained evidence.

Automated browser evidence does not prove physical Android or iOS/Safari acceptance. That remains Phase 11.

### Next UI boundary

Phase 4 Dashboard work is not authorized by Phase 3 completion. A new explicit owner instruction and a bounded Phase 4 packet are required before product-code writes.

## 7. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider changes require before/after evidence, rollback and production smoke.
- Automated browser success does not prove physical-device acceptance or visual quality by itself.
- A successful job shell is not evidence when initialization/analysis or selected shards were skipped.
- PR #300 changes no database, auth, RLS, provider, production-data or financial-domain boundary.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | Substantially implemented; provenance, dry-run, atomic approval and public-FK coverage are merged |
| #53 reconciliation | Verified-unmerged contract through PR #222; absent on main |
| #53 authenticated rules | Absent on main; deterministic local rules exist |
| #53 audit/performance | Partial; strong repository tooling exists while capacity claims remain evidence-specific |
| #72 UI audit | Broad automated coverage merged; physical-device detail remains separate |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; private provider execution is not inferred |

## 9. Open pull-request memory

Open PRs are not product truth and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #170/#171 | older CSS cleanup candidates; compare against current ownership and tests before reuse |
| #119 | visual/logo candidate requiring current browser evidence and owner approval |

PRs #295–#300 are merged and must not be described as candidates. PR #222 is closed-unmerged verified evidence, not an open PR and not current behavior.

## 10. True gaps after this audit

### Public-beta hardening

- reconcile owner-held provider/device/deep-state evidence without exposing private identifiers or data;
- decide whether final visual-direction approval is required before broader use;
- run approved staging/provider load or advisor checks only when a capacity claim is needed.

### Post-MVP product depth

- decide whether to integrate or rebuild reconciliation;
- transaction review state, bounded bulk correction and split-line correction;
- budget/recurring/goal history and lifecycle;
- report arbitrary range/account/type/drill-down;
- import batch UX, authenticated persisted rules, portability and mutation audit.

### UI migration debt

- Phase 4 Dashboard pilot and later route-by-route adoption of Phase 2 primitives;
- compatibility-variant and alias retirement after zero-reference evidence;
- Phase 5 removal of the transaction-dialog remainder from `MobileShellContract`;
- local ownership of responsive repairs currently in `MinimumTargetSizeContract` and its final removal;
- physical Android and iOS/Safari acceptance;
- separately approved component-harness adoption if evidence later justifies it.

## 11. Load-bearing merged and verified truth

- PR #183/#184 merged atomic Inbox approval, provenance, dry-run, transfer planning and idempotency.
- PR #206/#207 merged dashboard one-RPC hardening and schema-skew fallback.
- PR #228/#229 merged account register/detail and deployment/auth-routing evidence.
- PR #231 merged the Spec Kit adapter without replacing MoneyFlow governance.
- PR #234/#235 merged transaction date/amount filters.
- PR #236/#244 merged complete public-FK index coverage and pgTAP evidence.
- PR #245 merged grouped monthly Dependabot configuration.
- PR #249 merged a public-safe provider runbook without provider writes.
- PR #250/#251/#252 merged functional-MVP audit, release-evidence reconciliation and empty-state/export acceptance.
- PR #295 restored the repository-wide secret-history gate through a reviewed fingerprint-specific repair.
- PR #296/#297/#298 merged the UI-system parent plan, Phase 0 baseline and Phase 1 guardrails.
- PR #299 delivered Phase 2 shared primitive ownership.
- PR #300 delivered canonical App Shell/chrome ownership with protected browser evidence.
- PR #222 remains verified unmerged and is not current behavior.

## 12. Superseded-status register

Do not repeat these as current facts:

- CSV import is absent.
- Rules are entirely absent.
- Import provenance/dry-run/atomic approval are future work.
- Reports lack previous-period comparison or trends.
- Recurring items have no occurrence linkage.
- Goals lack deadline or pace calculation.
- Export only supports current-month CSV or depends on `/insights`.
- Dashboard still performs the original authenticated fan-out.
- CAPTCHA plumbing, account register/detail or transaction range filters are missing.
- Reconciliation was never designed or tested.
- Closed-unmerged PR #222 is current product behavior.
- Missing public evidence proves the owner did not perform private work.
- Functional MVP requires every competitive-depth item.
- Provider/device acceptance is automatically part of the locked MVP exit definition.
- Repository tests prove private provider state or physical-device acceptance.
- Spec Kit replaces MoneyFlow governance.
- The UI migration parent or Phases 0–3 are still pending, blocked or unauthorized.
- Phase 2 is unauthorized or only documentation.
- Phase 3 still uses a private Brand, private shell dialogs/toast, `body:has()` route inference or a 68px nav reserve.
- 44×44 is the universal WCAG AA target minimum.
- Every sheet is modal or every toast should be assertive.
- A 320px phone viewport alone proves WCAG reflow.

## 13. Update and compaction protocol

Every PR changes exactly one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md`. A status-changing PR also updates the affected row or section here.

Budgets:

- target: **150–250 lines**;
- soft warning: above **300 lines** or **32 KiB**;
- hard failure: above **500 lines** or **64 KiB**;
- PR record hard failure: above **140 lines** or **12 KiB**.

Record private operational evidence only as redacted summaries. Never store secrets, provider identifiers, exact defensive thresholds, request IDs, user financial data or unredacted screenshots here.
