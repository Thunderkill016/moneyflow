# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Owner direction:** MoneyFlow is released as a functional MVP; the active hardening program is **MoneyFlow Trust**; public-beta readiness remains an explicit evidence boundary
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Active provider blocker:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **UI-system migration:** P0–P11 is merged and archived with explicit physical-device limitations
- **UI closure record:** `docs/plans/completed/2026-08-08-ui-system-migration.md`
- **Current Vercel production:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for Next.js `main@fd984a18201f1663d3d8c622d51c41dfd650c816`
- **Supabase production:** **not aligned with current main**; production `delete-account` is still Edge Function v5 without the merged recent-auth gate; exactly **10 current-main MoneyFlow migrations are absent from remote history**
- **Provider Sync evidence:** exact 10-file drift proven; full current migration chain replays in CI #2070; **25 pgTAP files / 478 tests pass**; per-migration production risk review complete; actual linked union-history CLI dry-run remains pending before any provider write
- **Recent-auth state:** PR #324 is merged in Git and its Next.js side is live on Vercel, but P1 Secure remains **merged, not deployed end-to-end**, until Supabase DB/Edge alignment and provider acceptance are complete
- **UI evidence boundary:** physical Android Chrome and physical iOS/Safari were not executed for P11 and are not claimed as passed; issue #72 is closed `not_planned`
- **History model:** current truth here; task routing in `docs/context/README.md`; bounded PR provenance under `docs/research/pr-memory/YYYY/QN/`
- **Primary remaining public-beta blockers:** actual Provider Sync dry-run → owner-approved Supabase DB alignment → owner-approved current Edge deployment → live password/Google step-up acceptance → complete versioned archive/restore
- **Detailed MVP audit:** `docs/research/MVP_TRUTH_AUDIT_2026-08-03.md`
- **Release acceptance:** `docs/release/MVP_RELEASE_ACCEPTANCE_2026-08-03.md`
- **Release decision:** `docs/release/MVP_RELEASE_DECISION_2026-08-03.md`
- **Released MVP SHA:** `main@8e08a8a748a632b07bb42c27bf14539758b28824` — released as MVP, not automatically public-beta ready

## 1. Purpose and authority

This snapshot records merged implementation truth, live provider evidence, current gaps and accepted limitations. It is not a changelog.

Authority order:

1. merged code, migrations and tests;
2. live provider/database/runtime evidence appropriate to the claim;
3. exact-head CI or deployment evidence appropriate to the claim;
4. explicit owner statements without invented operational detail;
5. this snapshot;
6. architecture, product principles and delivery policy;
7. active issues/specs/work packets;
8. historical research, completed packets and PR records.

Open pull requests are candidate evidence until merge. A Git merge is not a Supabase migration or Edge deployment. Vercel `READY` proves the Next.js deployment only; it does not prove Supabase DB/Edge alignment.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required production schema/function/provider state matches the merged repository contract |
| **Implemented + production evidenced** | Merged path is verified through every production/provider boundary required by the claim |
| **Verified unmerged** | Exact-head evidence exists but work is not current product behavior |
| **Owner-reported external** | Owner reports work outside inspected evidence; exact detail remains unasserted |
| **Partial** | Useful merged behavior exists but lacks provider/product/acceptance depth |
| **Absent on main** | No merged implementation exists |
| **Candidate only** | Exists only in an open PR or branch |
| **Historical/superseded** | Preserved for provenance, not current direction |
| **Accepted limitation** | Deliberately closed without claiming unexecuted evidence passed |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs:

- record income, expense, split and transfer quickly;
- know account balances and inspect ledger movements;
- understand period income, expense, net and categories;
- correct and recover records;
- plan with budgets, recurring items and goals;
- import controlled data and export user-owned records;
- reconcile an account register against a statement when the provider-backed capability exists.

Non-goals without a new owner-approved specification: bank sync, AI financial advice, OCR as product identity, household finance, investments/crypto/credit score, full FX accounting, native rewrite, full envelope budgeting, local-first/CRDT and ERP scope.

## 4. Runtime and financial invariants

- Next.js App Router modular monolith on Vercel; React, TypeScript and shared UI primitives.
- Supabase Auth/PostgreSQL with RLS and an explicit browser-local demo runtime.
- Viewer-aware reads and validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng; supported non-VND currencies use integer minor units.
- Transfers are balanced, same-currency and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete and recovery where supported.
- Account archive is reversible; archived history/balances remain stored while active totals/new-transaction choices exclude archived accounts.
- Budgets are monthly category limits, not envelope-assigned cash.
- Unpaid commitments and expected income remain plans until explicit ledger posting.
- Goal allocation is a planning number; it does not transfer or lock account money.
- Authenticated and demo failures never silently mix.
- Missing balances, dates, commitments, income or assumptions are never invented.
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- CodeQL, secret-history scanning and risk-proportional CI remain protected gates.
- Current-main deletion code requires verified recent interactive `password` or `oauth` AMR evidence before tenant purge; **production Supabase Edge v5 does not yet contain that gate**.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. Provider alignment and public-beta depth remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | merged email/password, OAuth, recovery/reset, demo, CAPTCHA and #324 deletion step-up contract | production Supabase `delete-account` v5 is stale; provider sync + live password/Google acceptance remain open |
| Accounts | merged P6 workspace, CRUD/archive/restore, active totals, transfer and register/detail | richer closing lifecycle is separate product depth |
| Reconciliation | domain/UI merged through #261/#263 | production reconciliation migrations/tables are absent; do not claim provider-aligned reconciliation yet |
| Categories | merged lifecycle + P8 local identity presentation/hide review | nested groups, merge/tags and historical recategorization remain depth |
| Transactions | merged ledger/capture/review behavior | financial-audit provider schema is behind main; split-line correction remains depth |
| Timeline | merged reviewed-only read-only ledger projection | no mutation ownership here |
| Dashboard | merged deterministic period/range/planning/activity behavior | richer attention/drill-down depth |
| Budgets | merged category limits, historical months, previous-month comparison and drill-down | rollover/flex depth remains |
| Recurring | merged expense/income templates and occurrence linkage | broader history/schedule/matching depth remains |
| Goals | merged target, earmark, deadline, pace and archive | contribution history/account-backed funding absent |
| Reports | merged comparisons/totals/category/trend/custom ranges | account/type dimensions and deeper drill-down remain |
| Export | merged transaction/Inbox CSV/JSON with explicit scope/date range | **not a complete versioned backup/restore archive** |
| Import/Inbox | merged CSV/XLSX/PDF staging, provenance, dry-run and atomic approval | later rules/audit provider schema is behind main |
| Rules | authenticated deterministic rules merged through #265 | production `inbox_rules` absent until Provider Sync |
| Privacy/deletion | current-main #324 recent-auth/same-account/fail-closed OAuth contract | production Edge v5 lacks it; current tenant inventory also stale |
| Responsive/accessibility | broad Chromium/WebKit/text/keyboard coverage through P11/#324 | physical Android/iOS P11 acceptance not executed; accepted limitation |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider deployment or physical-device proof |

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
| P1 Secure | #324 merged as `fd984a...`; Vercel side READY; Supabase backend not current; provider acceptance blocked |
| P2 Recover | implementation blocked until Provider Sync + P1 acceptance; complete archive/restore absent |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth only after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

### P1 Vercel evidence — partial deployment only

- merge commit `fd984a18201f1663d3d8c622d51c41dfd650c816`;
- Vercel `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9`, `READY`, production, alias `mfvn.vercel.app`;
- `/` returned 200;
- ordinary `/login?next=/settings/delete-account` returned `reauth=0` when no authenticated continuity exists;
- unauthenticated `/settings/delete-account` reached the ordinary-login return boundary;
- explicit one-hour Vercel runtime-error inspection found no runtime errors.

This proves only the Next.js/Vercel side.

### Provider Sync exact evidence

Supabase project `fwpldsdkpzhswpuctbke` is `ACTIVE_HEALTHY`.

Production Edge:

- `delete-account` active version **5**;
- `verify_jwt=true`;
- deployed source lacks current AMR recent-auth evaluation and current tenant inventory.

Production DB remote history has exactly these **10 current-main MoneyFlow migrations missing**:

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

- direct remote version checks: all ten unapplied;
- exact-head CI #2070 fresh reset applies all ten in this order;
- `supabase test db`: **25 files / 478 tests / PASS**;
- production catalog preflight matches the expected pre-migration state: review/reconciliation/rules/audit types/columns/tables absent and checked target indexes absent;
- current affected table counts are small but nonzero: 47 transactions, 47 entries, 6 Inbox candidates, 3 accounts, 33 categories, 0 budgets, 0 provenance at inspection time;
- seven newer legitimate Atoryn migration-history rows exist remotely and must be preserved rather than “repaired” away.

Remaining read-only gate:

- capture an actual linked ephemeral union-history `supabase db push --include-all --dry-run` and require it to list exactly the ten reviewed MoneyFlow migrations and nothing else.

Only after that evidence may owner DB provider-write approval be requested.

## 7. UI-system migration closure truth

- `document-theme.css` remains semantic theme/color authority.
- B3.2/Fresh Blue remains selected.
- public routes remain light-only; signed-in workspace retains Light/Dark/System.
- Guided Story remains landing direction unless separately re-specified.
- P0 #297, P1 #298, P2 #299, P3 #300, P4 #301/#303, P5 #306, P6 #307, P7 #308, P8 #309, P9 #318, P10 #319, P11 #321 are delivered.
- Final P11 exact head `b9cb971...` passed CI #2043, CodeQL/Secret #1149, 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky; selected visual pairs were zero-diff.
- #321 merged as `bfdab8b...`; its exact Vercel production deployment was verified READY.
- Physical Android Chrome and iOS/Safari were not executed. Issue #72 is closed `not_planned`; this is an accepted limitation, not pass evidence.
- Completed record: `docs/plans/completed/2026-08-08-ui-system-migration.md`.

## 8. Verification and evidence boundaries

- Financial/data work requires affected unit/migration/pgTAP/browser evidence.
- Provider behavior requires provider evidence; repository/browser tests cannot manufacture it.
- Provider schema/function writes require explicit owner approval and rollback scope.
- Vercel does not deploy Supabase migrations or Edge Functions.
- Actual linked CLI dry-run is not equivalent to a manually computed version set.
- Automated browser success does not prove physical-device acceptance.
- Retry-success is a flaky signal, not equivalent to first-attempt pass.
- Raw logs/artifacts outrank a green job shell when retries appear.
- Merge to `main` does not prove every provider boundary is live.
- Accepted limitations must remain explicit rather than rewritten as successful tests.

## 9. Reconciled issue and PR status

| Item | Current status |
|---|---|
| #53 DB/import | provenance/dry-run/atomic approval merged; later reconciliation/rules/audit provider schema still behind main |
| #53 reconciliation | merged repository contract/UI; production DDL absent as of 2026-08-08 provider inspection |
| #53 authenticated rules | merged repository implementation; production `inbox_rules` absent |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed and not claimed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Vercel side READY; Supabase backend alignment open |
| #325 | active docs/provider-read reconciliation; no provider writes |

## 10. Open pull-request memory

Open PRs remain candidate evidence and must be refreshed before reuse.

| PR | Interpretation |
|---|---|
| #325 | MoneyFlow Trust provider-drift/current-memory reconciliation |
| #314 | CI recovery tooling candidate |
| #315 | task-start/work-packet hardening candidate |
| #317 | stacked acceptance-traceability candidate; depends on #315 |
| #304 | older CI hardening candidate |
| #293/#294 | older UI/recovery candidates superseded by completed UI program unless re-specified |
| #170/#171 | historical CSS cleanup evidence; do not merge wholesale |
| #119 | old visual/logo candidate requiring current evidence + owner approval |

PR #316 is closed historical evidence. #321/#322/#323/#324 are merged history.

## 11. True gaps after this audit

### P0/P1 provider alignment

- actual union-history linked Supabase CLI dry-run is still missing;
- production DB still lacks the exact 10 reviewed current-main MoneyFlow migrations;
- production `delete-account` Edge v5 lacks merged recent-auth/current tenant inventory;
- DB and Edge writes require explicit owner checkpoints;
- live password + Google step-up acceptance comes only after current Edge deployment.

### Public-beta portability

- complete versioned full archive/restore is absent;
- P2 implementation remains blocked until Provider Sync + P1 acceptance.

### Product depth

- richer account closing/reconciliation matching depth;
- split-line correction and mutation-audit product depth after provider alignment;
- budget rollover/flex, recurring history/matching, Goal funding history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions without unreviewed auto-posting.

### Accepted UI evidence limitation

- no physical Android Chrome P11 acceptance;
- no physical iOS/Safari P11 acceptance;
- these are accepted closure limitations, not physical-readiness claims.

## 12. Load-bearing merged and provider truth

- #183/#184: authenticated atomic Inbox approval/provenance merged and production migrated; production currently contains `transaction_import_provenance`.
- #206/#207: Dashboard one-RPC hardening/schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236: FK-index migration merged but absent remote.
- #255: transaction-review migration merged but absent remote.
- #261/#263: reconciliation contract/workspace merged; migrations absent remote.
- #265: authenticated rules merged; `inbox_rules` absent production.
- #270: financial mutation audit merged; audit migrations/table absent production.
- #289: custom report date ranges.
- #295: repository secret-history gate restored.
- #296–#322: completed UI migration program and archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged in Git + Vercel Next.js deployment; **not Supabase Edge deployment**.

## 13. Superseded-status register

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
- Recent-auth is unmerged; #324 is merged in Git.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production Supabase schema matches `main` merely because migrations are merged.
- Reconciliation/rules/audit are provider-aligned merely because their PRs merged.
- The 10-file migration set still needs to be discovered; it is already proven.
- A manually computed version set is equivalent to an actual linked CLI dry-run.
- Vercel deployment proves Supabase Edge deployment.
- A merge proves provider production readiness without provider-specific evidence.
