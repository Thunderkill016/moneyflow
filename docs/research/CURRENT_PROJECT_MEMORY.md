# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `bfdab8b922b71e163b38ac633602ce4c2c486c5a`
- **Owner direction:** MoneyFlow is released as a functional MVP; validation is required inside each workstream but is not a global feature freeze; public-beta gates remain separate
- **UI-system migration:** P0–P11 implementation is merged and the program is owner-accepted for archive with explicit physical-device limitations
- **UI closure record:** `docs/plans/completed/2026-08-08-ui-system-migration.md`
- **Current production:** Vercel `dpl_AvhNmvjmKR93VVA6PX5LGfsDKESX` is `READY` for P11 merge `bfdab8b922b71e163b38ac633602ce4c2c486c5a`
- **UI evidence boundary:** physical Android Chrome and physical iOS/Safari were not executed and are not claimed as passed; issue #72 is closed `not_planned` by explicit owner closure
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Other current product gaps:** provider-backed recent authentication for destructive account deletion and a complete versioned archive/restore remain outside current merged capability
- **Detailed MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Release acceptance:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Release decision:** `docs/release/MVP_RELEASE_DECISION_2026-08-03.md`
- **Released MVP SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824` — released as MVP, not automatically public-beta ready

## 1. Purpose and authority

This snapshot records merged implementation truth, production evidence, current gaps and accepted limitations. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. exact-head or production evidence appropriate to the claim;
3. explicit owner statements without invented operational detail;
4. this snapshot;
5. architecture, product principles and delivery policy;
6. active issues/specs/work packets;
7. historical research, completed packets and PR records.

Open pull requests are candidate evidence until merge. Historical packet headers do not override merged code or this current snapshot.

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
| **Accepted limitation** | Deliberately closed without claiming the unexecuted evidence passed |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

- record income, expense, split and transfer quickly;
- know account balances and inspect ledger movements;
- understand period income, expense, net and categories;
- correct and recover records;
- plan with budgets, recurring items and goals;
- import controlled data and export user-owned records;
- reconcile an account register against a statement where merged capability exists.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR as product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript, Tailwind and shared Base UI/Radix primitives.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Viewer-aware server reads and validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng; supported non-VND currencies use integer minor units.
- Transfers are balanced, same-currency and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete and recovery where supported.
- Account archive is reversible; archived history/balances remain stored while active totals and new-transaction choices exclude archived accounts.
- Budgets are monthly category limits, not envelope-assigned cash.
- Unpaid commitments and expected income remain plans until explicit ledger posting.
- Goal allocation is a planning number; it does not transfer or lock account money.
- Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or planning assumptions are never invented.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- CodeQL, secret-history scanning and risk-proportional CI remain protected gates.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete. Competitive depth and public-beta hardening remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo and CAPTCHA plumbing; P9 owns public/Auth presentation | hosted-provider acceptance and sensitive-action recent-auth remain separate |
| Accounts | Merged P6 workspace, CRUD/archive/restore, active totals, archived-balance visibility, transfer, register/detail and reconciliation integration | richer account-closing lifecycle requires separate financial specification |
| Reconciliation | Merged account-leg/session domain and UI with account-scoped state and exact-zero completion | no bank feed or automatic matching claim |
| Categories | Merged flat income/expense lifecycle plus P8 local identity presentation, editable icon/color and reversible hide review | nested groups, merge/tags and historical recategorization remain separate depth |
| Transactions | Merged P5 ledger/capture ownership plus P11 persistence-first demo mutation ordering | deeper mutation audit/split-line correction remain product depth |
| Timeline | Merged reviewed-only read-only ledger projection with P5 owner | P8 verifies; it does not reimplement Timeline |
| Dashboard | Merged P4 ownership, deterministic period, truthful range semantics, planning/activity summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged category limits, historical month selection, previous-month comparison, progress and drill-down | rollover, flex buckets and deeper lifecycle remain separate depth |
| Recurring | Merged expense/income templates, current-month occurrence links and pay/receive undo | broader history, flexible schedules and matching remain depth gaps |
| Goals | Merged target, planning earmark, deadline, pace and archive | contribution history and account-backed funding lifecycle are absent |
| Reports | Merged period comparisons, totals, category/trend views, custom ranges, transfer exclusion and P8 presentation | account/type dimensions and deeper drill-down |
| Export | Merged transaction/Inbox CSV/JSON with explicit scope and date-range support | not a complete versioned backup/restore archive |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning, atomic approval and P8 review presentation | presets and broader batch UX remain depth gaps |
| Rules | Merged deterministic candidate-only rules with preview/order/version evidence and P8 review ownership | broader conditions/actions and auto-posting remain out of current scope |
| Privacy/deletion | Merged privacy/export/delete baseline, server-first deletion, P8 final review and cleanup receipt | provider-backed recent-auth remains separate boundary |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance remains evidence-specific |
| Responsive/accessibility | Broad merged Chromium/WebKit/device/text/keyboard coverage through P11 | physical Android/iOS was not executed; accepted closure limitation |
| CI/security | Risk-selected CI, CodeQL, secret scan, database/browser harnesses and exact-head evidence | hosted-runner success is not physical-device or provider proof |

## 6. UI-system migration closure truth

### Preserved direction

- `src/app/document-theme.css` remains executable semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- public routes remain light-only.
- signed-in workspace retains Light/Dark/System behavior.
- financial colors are functional roles, not decorative-only signals.
- Guided Story remains the landing direction unless a separate redesign packet is approved.

### Delivered sequence

- P0 #297: current presentation/debt baseline.
- P1 #298: no-new-presentation-debt guardrails.
- P2 #299: shared action/form/overlay/feedback/money primitives.
- P3 #300: canonical BrandLockup, App Shell/chrome, viewport/safe-area and explicit route capabilities.
- P4 #301/#303: Dashboard local ownership and closure.
- P5 #306: Transactions/Capture/Timeline ownership.
- P6 #307: Accounts/Transfer ownership.
- P7 #308: Planning ownership.
- P8 #309: secondary/safety ownership.
- P9 #318: public/Auth cleanup.
- P10 #319: legacy retirement.
- P11 #321: retry-exposed AppShell and demo-persistence fixes plus final automated/visual acceptance.

### P11 exact-head and production evidence

Final P11 exact head `b9cb97106ef78b21c8211cb0c8ff1107e94f3ddc` passed CI #2043, CodeQL #1149 and secret-history #1149 with 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky. Selected P10↔P11 visual baselines remained zero-diff.

PR #321 merged as `bfdab8b922b71e163b38ac633602ce4c2c486c5a`. Vercel deployment `dpl_AvhNmvjmKR93VVA6PX5LGfsDKESX` is `READY` for that exact commit. Public `/` and `/login` returned 200; unauthenticated `/dashboard` reached the expected login boundary; no runtime-error cluster was found in the inspected post-deploy window.

Physical Android Chrome and physical iOS/Safari were not executed. Issue #72 is closed `not_planned`; this is an explicit owner-accepted limitation, not pass evidence.

The completed program record is `docs/plans/completed/2026-08-08-ui-system-migration.md`. P5–P10 lifecycle reconciliation remains useful historical evidence but no longer represents the current open boundary.

## 7. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, Browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider changes require before/after evidence, rollback and production smoke.
- Automated browser success does not prove physical-device acceptance.
- Retry-success is a flaky signal, not equivalent to a first-attempt pass.
- Raw job logs/artifacts outrank a green job shell when they expose retries.
- React state updater functions must not hide persistence side effects.
- Merge to `main` can trigger Vercel, but merge alone does not prove `READY`.
- Accepted limitations must be recorded explicitly rather than rewritten as successful tests.

## 8. Reconciled issue status

| Issue/slice | Current status |
|---|---|
| #53 DB invariants/import | provenance, dry-run, authenticated atomic approval and public-FK coverage are merged |
| #53 reconciliation | merged account-leg/session contract and UI; no automatic matching/bank-feed claim |
| #53 authenticated rules | persisted deterministic rules exist where server feature contract is available; broader automation remains absent |
| #72 UI audit | closed `not_planned`; P11 merged/production evidenced; physical Android/iOS not executed and not claimed |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; private provider execution is not inferred |

## 9. Open pull-request memory

Open PRs are candidate evidence and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #316 | recent-auth account-deletion candidate; separate public-beta/security hardening |
| #314 | CI recovery tooling candidate; separate from UI migration |
| #315 | task-start/work-packet hardening candidate; separate from UI migration |
| #317 | stacked acceptance-traceability candidate; depends on #315 and remains draft |
| #304 | older CI hardening candidate; refresh before reuse |
| #293/#294 | older UI/recovery candidates superseded by the completed P0–P11 ownership program unless deliberately re-specified |
| #170/#171 | historical CSS cleanup evidence; do not merge wholesale |
| #119 | old visual/logo candidate requiring current evidence and explicit owner approval |

PR #321 is merged product history and must not be described as an open candidate.

## 10. True gaps after this audit

### Public-beta/security/portability

- provider-backed recent authentication for destructive account deletion is still unmerged candidate work (#316);
- complete versioned full archive/restore is absent;
- broader provider/staging capacity claims require evidence rather than inference.

### Product depth

- richer account closing and reconciliation matching/statement workflow;
- split-line transaction correction and mutation audit;
- budget rollover/flex planning, recurring history/matching and Goal funding history;
- report account/type dimensions and deeper drill-down;
- broader rule conditions/actions without automatic unreviewed ledger posting.

### Accepted UI evidence limitation

- no physical Android Chrome acceptance was executed for P11;
- no physical iOS/Safari acceptance was executed for P11;
- these are accepted closure limitations, not current claims of physical-device readiness.

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
- #321: P11 final acceptance implementation merged and production evidenced, with physical-device limitations recorded separately.

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
- P5, P6, P7, P8, P9, P10 or P11 remain unmerged candidate-only work.
- P11 is complete because Chromium/WebKit emulation passed.
- Physical Android/iOS acceptance was performed or passed.
- A retrying browser test is equivalent to a first-attempt pass.
- A successful demo mutation may persist after returning success.
- Transaction/Inbox export is a complete restorable account backup.
- A merge proves Vercel production readiness without provider evidence.