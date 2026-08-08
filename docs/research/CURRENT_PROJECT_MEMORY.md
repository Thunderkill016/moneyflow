# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Owner direction:** MoneyFlow is released as a functional MVP; the active hardening program is **MoneyFlow Trust**; public-beta readiness remains an explicit evidence boundary rather than a feature-freeze label
- **Active trust program:** `docs/plans/active/public-beta-trust.md` (canonical short name: **MoneyFlow Trust**)
- **Active provider blocker:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **UI-system migration:** P0–P11 is merged and archived with explicit physical-device limitations
- **UI closure record:** `docs/plans/completed/2026-08-08-ui-system-migration.md`
- **Current Vercel production:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for Next.js `main@fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Supabase production:** **not aligned with current main**; production `delete-account` is still Edge Function version 5 without the merged recent-auth gate, and production migration history is behind several merged MoneyFlow schema migrations
- **Recent-auth state:** PR #324 is merged in Git and its Next.js side is live on Vercel, but P1 Secure is **not deployed end-to-end** until Supabase database/function alignment is completed and verified
- **UI evidence boundary:** physical Android Chrome and physical iOS/Safari were not executed for P11 and are not claimed as passed; issue #72 is closed `not_planned` by explicit owner closure
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Primary remaining public-beta blockers:** Supabase provider alignment, provider-backed recent-auth acceptance, then complete versioned archive/restore
- **Detailed MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Release acceptance:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Release decision:** `docs/release/MVP_RELEASE_DECISION_2026-08-03.md`
- **Released MVP SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824` — released as MVP, not automatically public-beta ready

## 1. Purpose and authority

This snapshot records merged implementation truth, production/provider evidence, current gaps and accepted limitations. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. live provider/database/runtime evidence appropriate to the claim;
3. exact-head CI or deployment evidence appropriate to the claim;
4. explicit owner statements without invented operational detail;
5. this snapshot;
6. architecture, product principles and delivery policy;
7. active issues/specs/work packets;
8. historical research, completed packets and PR records.

Open pull requests are candidate evidence until merge. A Git merge is not a Supabase database migration or Edge Function deployment. Vercel `READY` proves the Next.js deployment only; it does not prove Supabase schema/function alignment.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required production schema/function/provider state matches the merged repository contract |
| **Implemented + production evidenced** | Merged path was verified through every affected production/provider boundary actually required by the claim |
| **Verified unmerged** | Exact-head evidence exists but the work is not current product behavior |
| **Owner-reported external** | Owner reports work outside inspected evidence; exact detail remains unasserted |
| **Partial** | Useful merged behavior exists but lacks provider depth, competitive depth or an external acceptance boundary |
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
- reconcile an account register against a statement where the provider-backed capability exists.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR as product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript and shared UI primitives.
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
- Current-main account-deletion code requires verified recent interactive `password` or `oauth` AMR evidence before tenant purge; **production Supabase Edge Function version 5 does not yet contain that gate**.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. Production-provider depth and public-beta hardening remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | Merged email/password, OAuth surfaces, recovery/reset, demo, CAPTCHA plumbing and #324 recent-auth step-up contract for deletion | current Supabase `delete-account` is still v5 without recent-auth; provider sync and then live password/Google step-up acceptance remain open |
| Accounts | Merged P6 workspace, CRUD/archive/restore, active totals, archived-balance visibility, transfer and register/detail | richer account-closing lifecycle requires separate financial specification |
| Reconciliation | Reconciliation domain/UI is merged in Git through #261/#263 | production migration history does not contain the reconciliation migrations and production reconciliation tables are absent; current application fallback must not be described as provider-aligned reconciliation |
| Categories | Merged flat income/expense lifecycle plus P8 local identity presentation, editable icon/color and reversible hide review | nested groups, merge/tags and historical recategorization remain separate depth |
| Transactions | Merged P5 ledger/capture ownership plus P11 persistence-first demo mutation ordering | deeper mutation audit/split-line correction remain product depth; provider audit schema is currently behind main |
| Timeline | Merged reviewed-only read-only ledger projection with P5 owner | P8 verifies; it does not reimplement Timeline |
| Dashboard | Merged P4 ownership, deterministic period, truthful range semantics, planning/activity summaries and schema-skew fallback | richer attention/drill-down depth |
| Budgets | Merged category limits, historical month selection, previous-month comparison, progress and drill-down | rollover, flex buckets and deeper lifecycle remain separate depth |
| Recurring | Merged expense/income templates, current-month occurrence links and pay/receive undo | broader history, flexible schedules and matching remain depth gaps |
| Goals | Merged target, planning earmark, deadline, pace and archive | contribution history and account-backed funding lifecycle are absent |
| Reports | Merged period comparisons, totals, category/trend views, custom ranges, transfer exclusion and P8 presentation | account/type dimensions and deeper drill-down |
| Export | Merged transaction/Inbox CSV/JSON with explicit scope and date-range support | **not** a complete versioned backup/restore archive |
| Import/Inbox | Merged CSV/XLSX/PDF staging, provenance, dry-run, duplicate/transfer planning, atomic approval and P8 review presentation | production provenance schema exists, but later rules/audit provider schema is behind main |
| Rules | Authenticated deterministic rules are merged in Git through #265 with demo/local compatibility | production `inbox_rules` table is absent because the merged migration has not been applied; do not claim authenticated production rules alignment |
| Privacy/deletion | Current-main code contains #324 server-enforced recent-auth policy, same-account step-up and fail-closed OAuth continuity | production Supabase Edge v5 lacks the recent-auth gate and current tenant inventory; provider alignment is a P0 Trust blocker |
| Onboarding/navigation | Merged privacy → wallet → first expense/dashboard and Core/Lab navigation | release-journey acceptance remains evidence-specific |
| Responsive/accessibility | Broad merged Chromium/WebKit/device/text/keyboard coverage through P11 and #324 | physical Android/iOS P11 acceptance was not executed; accepted closure limitation |
| CI/security | Risk-selected CI, CodeQL, secret scan, database/browser harnesses and exact-head evidence | hosted-runner success is not provider deployment, provider proof or physical-device proof |

## 6. MoneyFlow Trust current truth

Canonical short name: **MoneyFlow Trust**.

Conceptual sequence: **Secure → Recover → Prove → Improve → Release**.

A provider-alignment checkpoint has been inserted inside **Secure** because live Supabase state is behind merged repository state.

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel truth reconciled; live Supabase inspection reopened provider-baseline work and exposed material drift |
| Provider Sync | **specified / highest-priority blocker**; production DB migration history and `delete-account` function must align with current main before Secure can become deployed |
| P1 Secure | implementation merged as #324 / `fd984a18201f1663d3d8c622d51c41dfd650c816`; Next.js Vercel deployment READY; Supabase backend not deployed/aligned; provider step-up acceptance blocked |
| P2 Recover | research/spec prep may continue read-only; implementation blocked until Provider Sync + P1 acceptance; complete versioned archive/restore is absent today |
| P3 Prove | blocked by P2; physical-phone core-ledger acceptance + seven consecutive days of sanitized self-use evidence |
| P4 Improve | evidence-selected Ledger Trust depth only after P3; no speculative breadth |
| P5 Release | final owner public-beta decision with limitations named explicitly |

### P1 Vercel evidence — partial deployment only

- merge commit: `fd984a18201f1663d3d8c622d51c41dfd650c816`;
- Vercel deployment: `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9`, `READY`, target `production`, alias `mfvn.vercel.app`;
- `/` returned 200;
- `/login?next=/settings/delete-account` returned ordinary login with `reauth=0` when no authenticated continuity exists;
- unauthenticated `/settings/delete-account` reached the same ordinary-login boundary rather than pretending same-account step-up exists;
- no Vercel runtime-error cluster was found in the explicit one-hour post-deploy inspection window.

This proves the Next.js side only.

### Supabase provider drift — current blocker

Read-only provider inspection on 2026-08-08 established:

- production MoneyFlow Supabase project: `fwpldsdkpzhswpuctbke`, `ACTIVE_HEALTHY`;
- production `delete-account` Edge Function is **version 5** and does not contain current-main recent-auth claim evaluation;
- deployed v5 tenant inventory predates current provenance/rules/reconciliation/audit ownership;
- production migration history contains MoneyFlow migrations through `20260802022923_dashboard_read_bundle`, then unrelated Atoryn design/editor migrations;
- confirmed merged MoneyFlow migrations absent from remote history include FK index coverage, reconciliation domain/workspace, authenticated rules and financial mutation audit migrations;
- production catalog confirms `account_reconciliations`, `account_reconciliation_events`, `inbox_rules` and `financial_mutation_audit_events` are absent;
- production does contain `transaction_import_provenance`, while the deployed purge RPC does not explicitly delete/verify it;
- provenance foreign keys to Inbox candidates and financial transactions use `ON DELETE RESTRICT`, so the old purge path can fail closed for users who have provenance rows.

No destructive production request was used to prove this drift. No provider write was performed.

Provider Sync packet: `docs/plans/active/moneyflow-trust-provider-sync.md`.

## 7. UI-system migration closure truth

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

PR #321 merged as `bfdab8b922b71e163b38ac633602ce4c2c486c5a`. Its exact Vercel production deployment was verified READY before the UI program was archived. Physical Android Chrome and physical iOS/Safari were not executed. Issue #72 is closed `not_planned`; this is an explicit owner-accepted limitation, not pass evidence.

The completed program record is `docs/plans/completed/2026-08-08-ui-system-migration.md`.

## 8. Verification and evidence boundaries

- UI/shared-component changes require policy, lint, typecheck, complete tests, production build, Browser smoke and cross-device audit when selected.
- Financial/data work additionally requires affected unit/migration/pgTAP/browser evidence.
- Provider behavior requires provider evidence; repository/browser tests cannot manufacture it.
- Provider schema/function writes require explicit owner approval and rollback scope.
- A Vercel deployment does not deploy Supabase migrations or Edge Functions.
- Automated browser success does not prove physical-device acceptance.
- Retry-success is a flaky signal, not equivalent to a first-attempt pass.
- Raw job logs/artifacts outrank a green job shell when they expose retries.
- React state updater functions must not hide persistence side effects.
- Merge to `main` can trigger Vercel, but merge alone does not prove every provider boundary is live.
- Accepted limitations must be recorded explicitly rather than rewritten as successful tests.
- For P1 recent-auth, repository merge + Vercel READY do not prove the Supabase destructive authority is current; live Edge source/version must be checked separately.

## 9. Reconciled issue and PR status

| Item | Current status |
|---|---|
| #53 DB invariants/import | provenance, dry-run and authenticated atomic approval are merged; later reconciliation/rules/audit repository work is not fully provider-aligned in production |
| #53 reconciliation | merged repository contract/UI; production DDL absent in live catalog as of 2026-08-08 |
| #53 authenticated rules | merged repository implementation; production `inbox_rules` absent as of live inspection |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed and not claimed |
| #172 product assessment | market-validation warnings remain useful; old global feature-freeze framing is superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | **closed, superseded historical candidate**; replaced by merged #324; do not merge/reopen as current direction |
| #324 | merged recent-auth repository implementation; Next.js Vercel deployment READY; Supabase backend/provider alignment remains open |
| #325 | current docs/provider-read reconciliation candidate; must record provider drift before merge |

## 10. Open pull-request memory

Open PRs are candidate evidence and must be refreshed against current `main` before reuse.

| PR | Interpretation |
|---|---|
| #325 | MoneyFlow Trust provider-drift/current-memory reconciliation; docs + provider-read evidence only |
| #314 | CI recovery tooling candidate; separate from MoneyFlow Trust product scope unless needed |
| #315 | task-start/work-packet hardening candidate; tooling |
| #317 | stacked acceptance-traceability candidate; depends on #315 and remains draft |
| #304 | older CI hardening candidate; refresh before reuse |
| #293/#294 | older UI/recovery candidates superseded by completed P0–P11 ownership program unless deliberately re-specified |
| #170/#171 | historical CSS cleanup evidence; do not merge wholesale |
| #119 | old visual/logo candidate requiring current evidence and explicit owner approval |

PR #316 is closed historical evidence. PR #321/#322/#323/#324 are merged history and must not be described as open candidates.

## 11. True gaps after this audit

### P0/P1 provider alignment

- production Supabase migration history is behind merged MoneyFlow database contracts;
- production `delete-account` Edge Function v5 is behind current main and lacks recent-auth enforcement;
- complete local-vs-remote migration drift still needs an exhaustive mechanical comparison before any provider write;
- provider sync requires explicit owner-approved migration and Edge deployment checkpoints;
- live authenticated password + Google recent-auth step-up acceptance comes only after the current Edge Function is actually deployed.

### Public-beta portability

- complete versioned full archive/restore is absent;
- P2 implementation remains blocked until Provider Sync and P1 acceptance.

### Product depth

- richer account closing and reconciliation matching/statement workflow beyond the merged contract;
- split-line transaction correction and mutation audit depth beyond current provider alignment;
- budget rollover/flex planning, recurring history/matching and Goal funding history;
- report account/type dimensions and deeper drill-down;
- broader rule conditions/actions without automatic unreviewed ledger posting.

### Accepted UI evidence limitation

- no physical Android Chrome acceptance was executed for P11;
- no physical iOS/Safari acceptance was executed for P11;
- these are accepted closure limitations, not claims of physical-device readiness.

## 12. Load-bearing merged and provider truth

- #183/#184: authenticated atomic Inbox approval/provenance was merged and separately production migrated/accepted; production currently contains `transaction_import_provenance`.
- #206/#207: Dashboard one-RPC hardening and schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236: FK index migration is merged in Git but absent from current remote migration history.
- #261/#263: reconciliation contract/workspace are merged in Git; their current migrations are absent from production.
- #265: authenticated deterministic rules are merged in Git; `inbox_rules` is absent from production.
- #270: financial mutation audit is merged in Git; audit table/migrations are absent from production.
- #289: custom report date ranges.
- #295: repository-wide secret-history gate restored.
- #296–#300: UI parent plan, baseline, guardrails, primitives and App Shell.
- #301/#303: Phase 4 Dashboard ownership and closure.
- #306–#309: P5–P8 UI ownership.
- #318/#319: P9 public/Auth cleanup and P10 legacy retirement.
- #321/#322: P11 implementation/Vercel evidence and final UI-program archive.
- #323: MoneyFlow Trust parent program.
- #324: merged recent-auth implementation in Git + Vercel Next.js deployment; **not yet Supabase Edge deployment**.

## 13. Superseded-status register

Do not repeat these as current facts:

- Reports lack previous-period comparison, trends or custom ranges.
- CSV/XLSX/PDF staging is absent.
- Rules are entirely absent from repository implementation.
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
- PR #316 is current recent-auth direction or merge-ready.
- Recent-auth is still unmerged; **#324 is merged in Git**.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production Supabase schema matches current `main` because repository migrations are merged.
- Reconciliation, authenticated rules or financial audit are provider-aligned merely because their PRs merged.
- A Vercel deployment proves Supabase Edge Function deployment.
- A merge proves provider production readiness without provider-specific evidence.
