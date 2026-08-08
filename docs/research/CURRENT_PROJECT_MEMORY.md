# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `8d0070b3d039fc80647e888aa1bd89f18b4de0b4`
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Active provider blocker:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **Current Vercel production:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for the #324 Next.js recent-auth implementation; Vercel does not deploy Supabase DB migrations or Edge Functions
- **Supabase production migration history/schema:** the exact ten reviewed MoneyFlow migrations through `20260804160300` were applied on 2026-08-08 under their original repository versions; all seven legitimate shared Atoryn history rows were preserved
- **Supabase production audit boundary:** **partial** — `financial_mutation_audit_events` exists with RLS/triggers, but effective production `service_role` still has INSERT/UPDATE/DELETE while the merged pgTAP contract requires those DML privileges denied
- **Supabase production Edge:** `delete-account` remains **v5** and does not contain the merged recent-auth/current-tenant contract
- **Provider Sync evidence:** CI #2070 full replay/478 pgTAP pass; PR #326 free local union-history dry-run selected exactly ten MoneyFlow migrations; owner explicitly approved the ten-file DB checkpoint with “Go”; 10/10 migrations applied; catalog/data/RLS/advisors/logs were inspected
- **Provider Sync limitation:** actual linked-production CLI dry-run was not executed; owner accepted the free-simulation + fresh-live-history substitution for the consumed ten-file DB checkpoint only
- **Provider Sync current state:** `evaluating`; migration drift is closed, but audit effective least privilege and the stale Edge runtime remain blockers
- **Recent-auth state:** #324 is merged and its Next.js side is live on Vercel, but P1 Secure is not deployed/accepted end-to-end until the Supabase provider contract and Edge rollout are verified
- **UI migration:** P0–P11 is merged and archived; physical Android/iOS were not executed and remain explicit limitations
- **Primary public-beta blockers now:** audit least-privilege hardening → current Edge deployment → safe password/Google recent-auth acceptance → complete versioned archive/restore
- **History model:** current truth lives here; task routing lives in `docs/context/README.md`; bounded PR provenance lives under `docs/research/pr-memory/YYYY/QN/`
- **MVP release:** `main@8e08a8a748a632b07bb42c27bf14539758b28824`; functional MVP release does not imply public-beta readiness

## 1. Purpose and authority

This snapshot records merged implementation truth, live provider evidence, current gaps and accepted limitations. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. live provider/database/runtime evidence appropriate to the claim;
3. exact-head CI/deployment evidence appropriate to the claim;
4. explicit owner decisions without invented operational detail;
5. this snapshot;
6. architecture/product/delivery policy;
7. active work packets;
8. historical research/completed packets/PR memory.

A Git merge is not a Supabase migration or Edge deployment. A migration being applied does not by itself prove every effective privilege/invariant matches clean-reset tests.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required live schema/function/privilege/runtime state matches merged repository contract |
| **Implemented + production evidenced** | Merged path is verified through every required production/provider boundary |
| **Partial** | Useful live or merged behavior exists but one or more required contracts remain unmet |
| **Candidate only** | Exists only in an open PR/branch |
| **Historical/superseded** | Preserved for provenance, not current direction |
| **Accepted limitation** | Advanced/closed without claiming unexecuted evidence passed |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

- record income, expense, split and transfer quickly;
- know account balances and inspect ledger movements;
- understand period income, expense, net and categories;
- correct and recover records;
- plan with budgets, recurring items and goals;
- import controlled data and export user-owned records;
- reconcile an account register against a statement.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript and shared UI primitives.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng; supported non-VND currencies use integer minor units.
- Transfers are balanced, same-currency and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete/recovery where supported.
- Account archive is reversible; archived history/balances remain stored while active totals exclude archived accounts.
- Budgets are monthly category limits, not envelope-assigned cash.
- Unpaid commitments/expected income remain plans until explicit ledger posting.
- Goal allocation is a planning number; it does not transfer or lock account money.
- Authenticated and demo failures never silently mix.
- Missing financial facts are never invented.
- Build/lint/typecheck do not prove RLS, provider state, effective privileges or production correctness.
- Current-main deletion code requires recent interactive `password` or `oauth` AMR before tenant purge; production Edge v5 does not yet contain that gate.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. Provider depth and public-beta acceptance remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, OAuth, recovery/reset, demo, CAPTCHA and #324 deletion step-up are merged | production delete Edge is stale; provider acceptance open |
| Accounts | CRUD/archive/restore, totals, transfer, register/detail merged | richer closing lifecycle later |
| Reconciliation | domain/UI merged; production reconciliation schema applied | live user acceptance/deeper matching later |
| Categories | lifecycle + P8 presentation/hide review merged | nested/merge/tag depth later |
| Transactions | ledger/capture/review merged; review schema applied | split-line correction later |
| Dashboard | deterministic period/range/planning/activity behavior merged | richer attention/drill-down later |
| Budgets | limits/history/previous-month comparison/drill-down merged | rollover/flex later |
| Recurring | expense/income templates + occurrence linkage merged | broader history/schedule/matching later |
| Goals | target/earmark/deadline/pace/archive merged | contribution/account-backed funding absent |
| Reports | comparisons/totals/category/trend/custom ranges merged | account/type dimensions later |
| Export | transaction/Inbox CSV/JSON with scope/date range merged | **not a complete versioned backup/restore archive** |
| Import/Inbox | CSV/XLSX/PDF staging, provenance, dry-run, atomic approval merged | broader rules/actions later |
| Rules | authenticated deterministic rules merged; production schema applied | broader conditions/actions later; no unreviewed auto-posting |
| Audit | audit schema/RLS/triggers applied in production | **effective `service_role` DML denial fails merged pgTAP contract; provider alignment partial** |
| Privacy/deletion | current-main #324 recent-auth/same-account/fail-closed OAuth contract | production Edge v5 lacks current implementation |
| Responsive/accessibility | broad automated coverage through P11/#324 | physical Android/iOS P11 acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider deployment proof |

## 6. MoneyFlow Trust current truth

Canonical sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled |
| Provider Sync | **evaluating** — ten-file migration drift closed; audit least-privilege mismatch + Edge v5 remain |
| P1 Secure | #324 merged; Vercel side READY; Supabase destructive runtime not current |
| P2 Recover | blocked until Provider Sync + P1 provider acceptance |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

### Ten-file production execution evidence

- source baseline: `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`;
- CI #2070: complete migration replay + **478 pgTAP pass**;
- PR #326 run `31259696558`: free local union-history dry-run selected exactly ten MoneyFlow migrations and no Atoryn migration;
- actual linked-production CLI dry-run: **not executed / accepted limitation**;
- owner explicitly said **“Go”** for the exact ten-file production DB checkpoint after that limitation was known;
- 10/10 reviewed SQL migrations applied in order and tracked under original repository versions;
- seven legitimate Atoryn history rows preserved;
- no temporary provider-generated rollout version remains;
- checked catalog: **27 target indexes / 0 invalid-or-unready; 10 target constraints / 0 unvalidated**;
- baseline affected data counts preserved: 47 transactions, 47 entries, 6 Inbox candidates, 3 accounts, 33 categories;
- new defaulted review/reconciliation columns have 0 null drift;
- RLS/security-invoker/RPC boundaries and advisors inspected.

### Provider Sync blocking mismatch

Clean-reset pgTAP requires `service_role` SELECT on `financial_mutation_audit_events` but denies INSERT/UPDATE/DELETE. Live production effective privilege inspection shows those DML privileges are currently present.

Therefore do **not** say:

- “the database provider is fully aligned”;
- “audit is provider-aligned”; or
- “Edge is the only remaining Provider Sync blocker”.

A new reviewed forward migration/spec plus explicit owner provider-write approval is required to restore this invariant before Provider Sync can advance past the database contract boundary.

## 7. UI-system migration closure truth

- B3.2/Fresh Blue remains selected; `document-theme.css` remains semantic theme/color authority.
- public routes remain light-only; signed-in workspace retains Light/Dark/System.
- P0 #297 through P11 #321 are delivered; #322 archived the program.
- P11 exact head passed CI #2043, CodeQL/Secret #1149, 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky.
- #321 merged as `bfdab8b...` and its exact Vercel deployment was verified READY.
- Physical Android Chrome/iOS Safari were not executed. Issue #72 is closed `not_planned`; this is an accepted limitation, not pass evidence.

## 8. Reconciled issue status

| Item | Current status |
|---|---|
| #53 DB/import | provenance/dry-run/atomic approval merged; review/reconciliation/rules schema applied |
| #53 reconciliation | merged repository contract/UI + production schema applied |
| #53 authenticated rules | merged + production schema applied |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Vercel side READY; Supabase Edge rollout open |
| #325 | merged Provider Sync reconciliation/spec |
| #326 | closed unmerged; zero-cost local union-history dry-run evidence only |
| #327 | evidence/current-memory reconciliation for ten-file production execution and audit ACL finding |

### Evidence boundaries

- provider behavior requires provider evidence;
- provider schema/function/privilege writes require explicit owner approval;
- Vercel does not deploy Supabase migrations or Edge Functions;
- the local union-history dry-run is not an actual linked-production dry-run;
- clean-reset pgTAP and live production effective privileges can differ; both matter;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass.

## 9. Open pull-request memory

Fresh-query GitHub before acting on unrelated historical PRs. Open PRs remain candidate evidence until merged. For bounded provenance, use the relevant record under `docs/research/pr-memory/YYYY/QN/` rather than treating old PR descriptions as current truth.

## 10. True gaps after this audit

### Provider alignment

- ten-file migration-history/schema drift: closed;
- effective `service_role` DML on `financial_mutation_audit_events`: open blocker against merged pgTAP contract;
- current `delete-account` Edge v5: open blocker;
- separate owner approvals required for any ACL forward migration and later Edge deployment;
- safe password + Google/OAuth step-up acceptance remains open;
- post-Edge runtime observation remains open.

### Public-beta portability

- complete versioned archive/restore is absent;
- P2 implementation remains blocked until Provider Sync + P1 acceptance.

### Product depth

- richer account closing/reconciliation matching;
- split-line correction and mutation-audit depth;
- budget rollover/flex, recurring history/matching, Goal funding history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions without unreviewed auto-posting.

### Accepted UI limitation

- no physical Android Chrome P11 acceptance;
- no physical iOS/Safari P11 acceptance.

## 11. Load-bearing merged and provider truth

- #183/#184: atomic Inbox approval/provenance merged and production migrated.
- #206/#207: Dashboard one-RPC hardening/schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236: FK-index migration merged and production applied.
- #255: transaction-review migration merged and production applied.
- #261/#263: reconciliation contract/workspace merged and production schema applied.
- #265: authenticated rules merged and production schema applied.
- #270: financial mutation audit migration set merged and production applied; **effective audit least-privilege invariant remains partial**.
- #289: custom report date ranges.
- #295: secret-history gate restored.
- #296–#322: completed UI migration program/archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged in Git + Vercel Next.js deployment; **not yet Supabase Edge deployment**.
- #325: merged Provider Sync reconciliation/spec.
- #326: closed unmerged free migration-selection simulation evidence.

## 12. Superseded-status register

Do not repeat these as current facts:

- Production still lacks the ten reviewed MoneyFlow migrations.
- Reconciliation/rules schema is absent from production.
- Audit is fully provider-aligned merely because its migrations were applied.
- Production DB fully matches every merged MoneyFlow pgTAP privilege invariant.
- Edge v5 is the only remaining Provider Sync blocker.
- Actual linked-production dry-run was executed or passed.
- The free local union-history dry-run is equivalent to an actual linked-production dry-run.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production `delete-account` Edge contains the merged recent-auth gate.
- A Git merge alone proves provider readiness.
- Physical Android/iOS acceptance was performed or passed.
- Retry-pass is equivalent to first-attempt pass.