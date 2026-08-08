# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Active provider blocker:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **Current Vercel production:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for Next.js `main@fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Supabase production:** not aligned with current main; `delete-account` is still Edge Function v5 without merged recent-auth; exactly 10 current-main MoneyFlow migrations are absent from remote history
- **Provider Sync evidence:** exact 10-file drift proven; full current migration chain replays in CI #2070; 25 pgTAP files / 478 tests pass; per-migration risk review complete; actual linked union-history CLI dry-run remains pending
- **Recent-auth state:** #324 is merged and its Next.js side is live on Vercel, but P1 Secure remains **merged, not deployed end-to-end** until Supabase DB/Edge alignment and provider acceptance complete
- **UI migration:** P0–P11 is merged and archived; physical Android/iOS were not executed and remain explicit limitations
- **History model:** current truth here; task routing lives in `docs/context/README.md`; bounded PR provenance lives under `docs/research/pr-memory/YYYY/QN/`
- **Primary public-beta blockers:** Provider Sync dry-run → owner-approved DB alignment → owner-approved current Edge deployment → password/Google step-up acceptance → versioned archive/restore
- **MVP release:** `main@8e08a8a748a632b07bb42c27bf14539758b28824`; functional MVP release does not imply public-beta readiness

## 1. Purpose and authority

This snapshot records merged implementation truth, live provider evidence, current gaps and accepted limitations. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. live provider/database/runtime evidence appropriate to the claim;
3. exact-head CI or deployment evidence appropriate to the claim;
4. explicit owner decisions without invented operational detail;
5. this snapshot;
6. architecture/product/delivery policy;
7. active work packets;
8. historical research/completed packets/PR memory.

A Git merge is not a Supabase migration or Edge deployment. Vercel `READY` proves the Next.js deployment only.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required production schema/function/provider state matches merged repository contract |
| **Implemented + production evidenced** | Merged path is verified through every required production/provider boundary |
| **Verified unmerged** | Exact-head evidence exists but work is not current product behavior |
| **Partial** | Useful merged behavior exists but lacks provider/product/acceptance depth |
| **Candidate only** | Exists only in an open PR/branch |
| **Historical/superseded** | Preserved for provenance, not current direction |
| **Accepted limitation** | Closed without claiming unexecuted evidence passed |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

- record income, expense, split and transfer quickly;
- know account balances and inspect ledger movements;
- understand period income, expense, net and categories;
- correct and recover records;
- plan with budgets, recurring items and goals;
- import controlled data and export user-owned records;
- reconcile an account register against a statement when provider-backed capability exists.

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
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- Current-main deletion code requires recent interactive `password` or `oauth` AMR before tenant purge; production Edge v5 does not yet contain that gate.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. Provider alignment and public-beta depth remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, OAuth, recovery/reset, demo, CAPTCHA and #324 deletion step-up are merged | production Supabase delete Edge is stale; provider acceptance remains open |
| Accounts | CRUD/archive/restore, totals, transfer, register/detail merged | richer closing lifecycle is later depth |
| Reconciliation | domain/UI merged through #261/#263 | production reconciliation migrations/tables absent |
| Categories | lifecycle + P8 presentation/hide review merged | nested/merge/tag depth remains |
| Transactions | ledger/capture/review merged | audit provider schema behind main; split-line correction later |
| Dashboard | deterministic period/range/planning/activity behavior merged | richer attention/drill-down later |
| Budgets | limits/history/previous-month comparison/drill-down merged | rollover/flex later |
| Recurring | expense/income templates + occurrence linkage merged | broader history/schedule/matching later |
| Goals | target/earmark/deadline/pace/archive merged | contribution/account-backed funding absent |
| Reports | comparisons/totals/category/trend/custom ranges merged | account/type dimensions later |
| Export | transaction/Inbox CSV/JSON with scope/date range merged | **not a complete versioned backup/restore archive** |
| Import/Inbox | CSV/XLSX/PDF staging, provenance, dry-run, atomic approval merged | later rules/audit provider schema behind main |
| Rules | authenticated deterministic rules merged through #265 | production `inbox_rules` absent until Provider Sync |
| Privacy/deletion | current-main #324 recent-auth/same-account/fail-closed OAuth contract | production Edge v5 lacks it and tenant inventory is stale |
| Responsive/accessibility | broad automated coverage through P11/#324 | physical Android/iOS P11 acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider deployment proof |

## 6. MoneyFlow Trust current truth

Canonical name: **MoneyFlow Trust**.

Conceptual sequence:

> **Secure → Recover → Prove → Improve → Release**

Operational sequence after live provider discovery:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled; provider drift identified |
| Provider Sync | **planned / highest-priority blocker**; exact 10-file drift + 478-pgTAP replay + risk review complete; real linked CLI dry-run pending |
| P1 Secure | #324 merged as `fd984a...`; Vercel side READY; Supabase backend not current |
| P2 Recover | implementation blocked until Provider Sync + P1 acceptance |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth only after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

Provider Sync exact missing migration set:

1. `20260802060004_cover_foreign_key_indexes.sql`
2. `20260803090000_transaction_review_bulk_correction.sql`
3. `20260803142000_account_reconciliation_current_main.sql`
4. `20260803144500_account_reconciliation_ci_hardening.sql`
5. `20260803153000_account_reconciliation_workspace_read_model.sql`
6. `20260804110000_authenticated_deterministic_rules.sql`
7. `20260804160000_financial_mutation_audit.sql`
8. `20260804160100_financial_read_plan_indexes.sql`
9. `20260804160200_financial_audit_service_role_inspection.sql`
10. `20260804160300_financial_audit_request_id_token.sql`

Evidence:

- all ten are absent from production migration history;
- exact-head CI #2070 fresh reset applies all ten in order;
- `supabase test db`: **25 files / 478 tests / PASS**;
- production catalog matches expected pre-migration state;
- seven legitimate newer Atoryn remote migrations must be preserved;
- remaining pre-write gate: actual linked ephemeral union-history `supabase db push --include-all --dry-run` listing exactly these ten MoneyFlow migrations.

Only after that dry-run may owner DB provider-write approval be requested.

## 7. UI-system migration closure truth

- B3.2/Fresh Blue remains selected; `document-theme.css` remains semantic theme/color authority.
- public routes remain light-only; signed-in workspace retains Light/Dark/System.
- P0 #297 through P11 #321 are delivered; #322 archived the program.
- P11 exact head passed CI #2043, CodeQL/Secret #1149, 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky.
- #321 merged as `bfdab8b...` and its exact Vercel deployment was verified READY.
- Physical Android Chrome/iOS Safari were not executed. Issue #72 is closed `not_planned`; this is an accepted limitation, not pass evidence.

Evidence boundaries that remain load-bearing:

- provider behavior requires provider evidence;
- provider schema/function writes require explicit owner approval;
- Vercel does not deploy Supabase migrations/Edge Functions;
- actual linked CLI dry-run is not equivalent to a manually computed set;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass.

## 8. Reconciled issue status

| Item | Current status |
|---|---|
| #53 DB/import | provenance/dry-run/atomic approval merged; later reconciliation/rules/audit provider schema behind main |
| #53 reconciliation | merged repository contract/UI; production DDL absent as of provider inspection |
| #53 authenticated rules | merged repository implementation; production `inbox_rules` absent |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed and not claimed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Vercel side READY; Supabase backend alignment open |
| #325 | active docs/provider-read reconciliation; no provider writes |

## 9. Open pull-request memory

| PR | Interpretation |
|---|---|
| #325 | MoneyFlow Trust provider-drift/current-memory reconciliation |
| #314 | CI recovery tooling candidate |
| #315 | task-start/work-packet hardening candidate |
| #317 | stacked acceptance-traceability candidate; depends on #315 |
| #304 | older CI hardening candidate |
| #293/#294 | older UI/recovery candidates superseded unless re-specified |
| #170/#171 | historical CSS cleanup evidence; do not merge wholesale |
| #119 | old visual/logo candidate requiring current evidence + owner approval |

#316 is closed historical evidence. #321/#322/#323/#324 are merged history.

## 10. True gaps after this audit

### Provider alignment

- actual linked union-history Supabase CLI dry-run is missing;
- production DB lacks the exact 10 reviewed current-main migrations;
- production `delete-account` Edge v5 lacks merged recent-auth/current tenant inventory;
- DB and Edge writes require explicit owner checkpoints;
- live password + Google step-up acceptance follows current Edge deployment.

### Public-beta portability

- complete versioned archive/restore is absent;
- P2 implementation is blocked until Provider Sync + P1 acceptance.

### Product depth

- richer account closing/reconciliation matching;
- split-line correction and mutation-audit depth after provider alignment;
- budget rollover/flex, recurring history/matching, Goal funding history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions without unreviewed auto-posting.

### Accepted UI limitation

- no physical Android Chrome P11 acceptance;
- no physical iOS/Safari P11 acceptance.

## 11. Load-bearing merged and provider truth

- #183/#184: atomic Inbox approval/provenance merged and production migrated; `transaction_import_provenance` exists in production.
- #206/#207: Dashboard one-RPC hardening/schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236: FK-index migration merged but absent remote.
- #255: transaction-review migration merged but absent remote.
- #261/#263: reconciliation contract/workspace merged; migrations absent remote.
- #265: authenticated rules merged; `inbox_rules` absent production.
- #270: financial mutation audit merged; audit migrations/table absent production.
- #289: custom report date ranges.
- #295: secret-history gate restored.
- #296–#322: completed UI migration program/archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged in Git + Vercel Next.js deployment; **not Supabase Edge deployment**.

## 12. Superseded-status register

Do not repeat these as current facts:

- Reports lack previous-period comparison, trends or custom ranges.
- CSV/XLSX/PDF staging is absent.
- Rules are entirely absent from repository implementation.
- Import provenance/dry-run/atomic approval are future work.
- Budgets lack historical month selection/previous-month comparison.
- Recurring items have no occurrence linkage.
- Goals lack deadline/pace calculation.
- Goal allocation locks account money.
- Unpaid commitments are reserved cash.
- Transaction/Inbox export is a complete restorable backup.
- P5–P11 UI migration remain unmerged candidate work.
- Physical Android/iOS acceptance was performed or passed.
- Retry-pass is equivalent to first-attempt pass.
- #316 is current recent-auth direction.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production Supabase schema matches `main` because migrations are merged.
- Reconciliation/rules/audit are provider-aligned because their PRs merged.
- The 10-file migration set still needs discovery; it is already proven.
- A manually computed version set is equivalent to actual linked CLI dry-run.
- Vercel deployment proves Supabase Edge deployment.
- A merge proves provider readiness without provider-specific evidence.
