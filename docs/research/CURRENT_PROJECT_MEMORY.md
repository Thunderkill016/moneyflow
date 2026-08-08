# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `a65f6f59167b894f9e538e5840e989e27250fdd4`
- **Owner direction:** MoneyFlow is released as a functional MVP; validation is required inside each workstream but is not a global feature freeze; public-beta gates remain separate
- **UI-system migration:** parent plan PR #296; Phases 0–10 are merged on `main`; Phase 11 final acceptance is the only current UI-migration execution boundary
- **P11 candidate state:** PR #321 has repaired two retry-exposed races: AppShell first-paint reserve ownership and demo transaction persistence ordering. Latest source candidate `59490eaf7d739ec5838eca53d046590a4302ef92` passed CI #2039 with 785 unit/static tests, 94/94 Browser smoke and a 554-case cross-device matrix with 0 failed/0 flaky; CodeQL #1145 and secret-history #1145 passed; eight selective P10↔P11 visual baselines remain zero-diff
- **UI lifecycle reconciliation:** `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md` supersedes stale pre-merge status headers in dedicated P5–P10 packets for lifecycle status
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Memory size target:** target: **150–250 lines**
- **Memory hard failure:** hard failure: above **500 lines** or **64 KiB**
- **Current production:** Vercel deployment `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` is `READY` for current main/P10; no PR #321 preview deployment was observed
- **Current merged UI gap:** P11 physical Android/iOS and exact deployed-build production acceptance; branch-only/emulation evidence is not merged/physical evidence
- **Other current product gaps:** provider-backed recent authentication for destructive account deletion and a complete versioned archive/restore remain outside current merged capability
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

Open pull requests and branch-only artifacts are not current product behavior. A stale packet header does not override a verified merge. Current lifecycle status for P5–P10 is reconciled in the dated UI migration reconciliation record above.

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
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo and CAPTCHA plumbing; P9 owns current public/Auth presentation | hosted-provider acceptance and sensitive-action recent-auth remain separate |
| Accounts | Merged P6 workspace, CRUD/archive/restore, active totals, archived-balance visibility, transfer, register/detail and reconciliation integration | richer account-closing lifecycle requires separate financial specification |
| Reconciliation | Merged account-leg/session domain and UI with account-scoped state and exact-zero completion | no bank feed or automatic matching claim |
| Categories | Merged flat income/expense lifecycle plus P8 local identity presentation, editable icon/color and reversible hide review | nested groups, merge/tags and historical recategorization remain separate depth |
| Transactions | Merged P5 ledger/capture ownership, search/filter/ranges, review/bulk correction, edit, split/transfer and soft delete/undo | P11 candidate additionally makes demo mutation success persistence-first; not merged until #321 |
| Timeline | Merged reviewed-only read-only ledger projection with local P5 owner | P8 verifies; it does not reimplement Timeline |
| Dashboard | Merged P4 ownership, deterministic period, truthful range semantics, planning/activity summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged category limits, historical month selection, previous-month comparison, progress and drill-down | rollover, flex buckets and deeper lifecycle remain separate product depth |
| Recurring | Merged expense/income templates, current-month occurrence links and pay/receive undo | broader history, flexible schedules and matching remain depth gaps |
| Goals | Merged target, planning earmark, deadline, pace and archive | contribution history and account-backed funding lifecycle are absent |
| Reports | Merged period comparisons, totals, category/trend views, custom ranges, transfer exclusion and P8 local presentation | account/type dimensions and deeper drill-down |
| Export | Merged transaction/Inbox CSV/JSON with explicit scope and date-range support | not a complete versioned backup/restore archive |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning, authenticated atomic approval, P8 review presentation and candidate-linked demo retry | presets and broader batch UX remain depth gaps |
| Rules | Merged deterministic candidate-only rules with preview/order/version evidence, P8 review ownership and mobile-reachable add flow | broader conditions/actions and auto-posting remain out of current scope |
| Privacy/deletion | Merged privacy/export/delete baseline, server-first deletion, P8 final review and cleanup receipt | provider-backed recent-auth and deeper destructive acceptance remain separate boundaries |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance remains evidence-specific |
| Responsive/accessibility | Broad merged Chromium/WebKit/device/text/keyboard coverage through P10; P11 candidate removes retry-exposed first-paint AppShell race | physical Android/iOS acceptance remains open |
| CI/security | Risk-selected CI, CodeQL, secret scan, database/browser harnesses and exact-head evidence | hosted-runner success is not production/device proof |

## 6. UI-system migration truth

### Authority and preserved direction

- `src/app/document-theme.css` remains the executable semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- Public routes remain light-only.
- Signed-in workspace retains Light/Dark/System behavior.
- Financial colors are functional roles, not decorative palette choices.
- Guided Story remains the landing direction unless a separate redesign packet is approved.

### P0–P4 — closed foundations and Dashboard

- #297: P0 current presentation/debt baseline.
- #298: P1 no-new-presentation-debt guardrails.
- #299: P2 shared action/form/overlay/feedback/money primitives.
- #300: P3 canonical BrandLockup, App Shell/chrome, viewport/safe-area and explicit route capabilities.
- #301/#303: P4 Dashboard local ownership and accepted closure.

### P5–P10 — delivered implementation

- P5 #306 merged `f6cea659030397e21d4287912faef173bc7a0966`; production `dpl_GCYtqTVBnRuKLrEd3k7G7TnTkbbt` READY.
- P6 #307 merged `372036fe8d1e583c3a81083ebef11f902e4f8b46`; production `dpl_GD5hVfLXh66rmrJnZiiADN8f4HK9` READY.
- P7 #308 merged `31fc4e852623ee503ee85a728f4be52d1c874d1b`; production `dpl_4tr8rU45ZvixXt31WUVSNuUKQu6G` READY.
- P8 #309 merged `8b97566a9bb70228ea5593d545660900aa626efb`; production `dpl_BvY4C3T3szH22FDq93WxwGTBMHc7` READY.
- P9 #318 merged `10a11d3492af02cf303ff1ee6981e734676c15fd`; production `dpl_3DKmriP8MV8YTw2hHeMuMtHHAmav` READY.
- P10 #319 merged `a65f6f59167b894f9e538e5840e989e27250fdd4`; production `dpl_5m5ihzL1zNCPoxLAHFCweDQDYAkf` READY.
- Detailed heads/checks and P5–P10 lifecycle interpretation live in `docs/research/UI_MIGRATION_PHASES_5_10_RECONCILIATION_2026-08-08.md`.
- P10 retained one intentional `globals.css` foundation import through `legacy.css`, zero `!important` declarations and zero unauthorized document selectors.

### P11 — final acceptance

P11 is **active and unmerged**. Final acceptance has exposed two real retry-hidden races instead of accepting green job shells:

1. **AppShell first paint:** P10 WebKit/iPhone first attempt saw fixed mobile navigation while shell reserve was zero. PR #321 moves layout-critical reserve/layer/focus variables onto server-rendered `.shell` and separately verifies document-level mounted scroll padding.
2. **Demo transaction persistence:** a later raw Browser-smoke first attempt navigated away from Quick Capture before localStorage persistence happened because storage writes lived inside queued React state updater functions. PR #321 now commits the stored demo ledger synchronously before React state update/success and adds a contract forbidding storage side effects inside state updaters.

Latest source candidate `59490eaf7d739ec5838eca53d046590a4302ef92` passed:
- CI #2039 / `31245158440`;
- 785 unit/static tests;
- Browser smoke 94/94, 0 failed, 0 flaky;
- cross-device 554 total / 427 passed / 127 intentional skips / 0 failed / 0 flaky;
- CodeQL #1145 / `31245158435`;
- secret-history #1145 / `31245158458`.

Latest source Browser artifact `9018297784` has digest `sha256:62bf778b664e596920ba9f0ee96edcc26a3cb177a95791ab70eee941781919ae`; UI artifact `9018358358` has digest `sha256:de29f06b58593a81dcc4ca733f49bfa5f9c9e2fd2fd2c9cf7559a2167b035978`.

Selective visual review was refreshed against that source candidate: the same eight selected P10 screenshot hashes remain present unchanged, with zero stable pixel diff.

P11 still cannot be accepted: this evidence is branch-only, final evidence-record commits move the head, no #321 preview exists, current production is P10, and no physical Android/iOS evidence exists. The exact merged P11 build must reach Vercel `READY`, then pass both physical-device checklists and affected production verification before program archival.

## 7. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, Browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider changes require before/after evidence, rollback and production smoke.
- Automated browser success does not prove physical-device acceptance.
- Retry-success is a flaky signal, not equivalent to a first-attempt pass.
- Raw job logs/artifacts outrank a green job shell when they expose a retry.
- React state updater functions must not hide persistence side effects.
- Branch-only exact-head evidence is not merged product behavior.
- Merge to `main` can trigger Vercel, but merge alone does not prove `READY`.
- P11 physical checks must target an exact deployed P11 build, not current P10 production.
- P11 production verification follows both physical-device gates.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | Provenance, dry-run, authenticated atomic approval and public-FK coverage are merged |
| #53 reconciliation | Merged account-leg/session contract and UI; no automatic matching/bank feed claim |
| #53 authenticated rules | Persisted deterministic rules exist where server feature contract is available; broader automation remains absent |
| #53 audit/performance | Strong repository tooling exists; provider capacity claims remain evidence-specific |
| #72 UI audit | P11 candidate automated/visual source evidence is clean; physical Android/iOS + exact deployed-build production acceptance remain open |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; private provider execution is not inferred |

## 9. Open pull-request memory

Open PRs are not product truth and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #321 | P11 final acceptance candidate; two retry-hidden races repaired; latest source automated/visual evidence clean; physical/deployed-build gates open |
| #316 | recent-auth account-deletion candidate; verified but unmerged |
| #314 | CI recovery tooling candidate; separate from UI migration |
| #315 | task-start/work-packet hardening candidate; separate from UI migration |
| #317 | stacked acceptance-traceability candidate; depends on #315 and remains draft |
| #304 | older CI hardening candidate; refresh before reuse |
| #293/#294 | older UI/recovery candidates; current P0–P10 ownership supersedes assumptions |
| #170/#171 | older CSS cleanup candidates; do not merge wholesale against current P10 |
| #119 | old visual/logo candidate requiring current evidence and owner approval |

PRs #295–#309, #318 and #319 are merged product history where stated above and must not be described as candidates.

## 10. True gaps after this audit

### P11 / public-beta hardening

- one final protected exact-head rerun after the latest evidence-record commits;
- owner merge/deployment checkpoint so the exact P11 candidate exists in a testable Vercel environment;
- physical Android Chrome acceptance on that exact deployed P11 commit;
- physical iOS/Safari acceptance on that exact deployed P11 commit;
- after both device gates, affected production-route verification and runtime-error inspection;
- reconcile issue #72/final memory and archive the UI migration program after owner acceptance.

### Security/portability depth

- provider-backed recent authentication for destructive account deletion is unmerged candidate work (#316);
- complete versioned full archive/restore is absent;
- broader provider/staging capacity claims require evidence rather than inference.

### Product depth

- richer account closing/reconciliation matching/statement workflow;
- split-line transaction correction and mutation audit;
- budget rollover/flex planning, recurring history/matching and Goal funding history;
- report account/type dimensions and deeper drill-down;
- broader rule conditions/actions without automatic unreviewed ledger posting.

## 11. Load-bearing merged and verified truth

- #183/#184: authenticated atomic Inbox approval, provenance, dry-run, transfer planning and idempotency.
- #206/#207: Dashboard one-RPC hardening and schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236/#244: public-FK index coverage and pgTAP evidence.
- #261 and successors: current reconciliation domain/UI truth.
- #289: custom report date ranges.
- #295: repository-wide secret-history gate restored.
- #296–#300: UI parent plan, baseline, guardrails, primitives and App Shell.
- #301/#303: Phase 4 Dashboard ownership and closure.
- #306–#309: P5–P8 UI ownership.
- #318/#319: P9 public/Auth cleanup and P10 legacy retirement.
- #321: verified-unmerged P11 candidate only; do not treat as merged truth before owner acceptance.

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
- P5, P6, P7, P8, P9 or P10 remain unmerged candidate-only work.
- P11 is complete because Chromium/WebKit emulation passed.
- Physical iOS/Safari acceptance can be silently waived without a parent-plan change.
- A retrying browser test is equivalent to a first-attempt pass.
- A successful demo mutation may persist after returning success.
- Transaction/Inbox export is a complete restorable account backup.
- The parser-improvement preference proves remote samples are being processed.
- A merge proves Vercel production readiness without provider evidence.