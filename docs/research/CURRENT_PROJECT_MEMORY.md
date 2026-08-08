# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-08
- **Current main audited:** `8d0070b3d039fc80647e888aa1bd89f18b4de0b4`
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Active provider blocker:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **Current Vercel production:** `dpl_8Eak3CqtjepuqY4mnq5UTLHwfeq9` is `READY` for the #324 Next.js recent-auth implementation; Vercel does not deploy Supabase migrations or Edge Functions
- **Supabase production DB:** **aligned to the exact ten reviewed MoneyFlow migrations through `20260804160300` on 2026-08-08**; all seven legitimate shared Atoryn history rows were preserved
- **Supabase production Edge:** `delete-account` remains **v5** and does not yet contain the merged recent-auth/current-tenant contract
- **Provider Sync evidence:** CI #2070 full replay/478 pgTAP pass; PR #326 free local union-history CLI dry-run selected exactly the ten MoneyFlow migrations; owner explicitly approved the production DB checkpoint with “Go”; 10/10 migrations applied and post-write catalog/invariants/advisors verified
- **Provider Sync limitation:** actual linked-production CLI dry-run was not executed; the owner accepted the free-simulation + fresh-live-history substitution for the DB checkpoint only
- **Recent-auth state:** #324 is merged and its Next.js side is live on Vercel, but P1 Secure remains **merged, not deployed end-to-end** until the Supabase Edge rollout and safe provider acceptance complete
- **UI migration:** P0–P11 is merged and archived; physical Android/iOS were not executed and remain explicit limitations
- **History model:** current truth here; task routing lives in `docs/context/README.md`; bounded PR provenance lives under `docs/research/pr-memory/YYYY/QN/`
- **Primary public-beta blockers now:** owner-approved current Edge deployment → safe password/Google recent-auth acceptance → versioned archive/restore
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
| **Accepted limitation** | Closed or advanced without claiming unexecuted evidence passed |

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
- Build/lint/typecheck do not prove RLS, browser behavior, provider state or production correctness.
- Current-main deletion code requires recent interactive `password` or `oauth` AMR before tenant purge; production Edge v5 does not yet contain that gate.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. The database-backed review/reconciliation/rules/audit capabilities are now provider-aligned; destructive Edge recent-auth acceptance remains separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, OAuth, recovery/reset, demo, CAPTCHA and #324 deletion step-up are merged | production Supabase delete Edge is still v5; provider acceptance open |
| Accounts | CRUD/archive/restore, totals, transfer, register/detail merged | richer closing lifecycle later |
| Reconciliation | domain/UI merged through #261/#263; production schema now aligned | live user acceptance/deeper matching later |
| Categories | lifecycle + P8 presentation/hide review merged | nested/merge/tag depth later |
| Transactions | ledger/capture/review merged; review schema now production-aligned | split-line correction later |
| Dashboard | deterministic period/range/planning/activity behavior merged | richer attention/drill-down later |
| Budgets | limits/history/previous-month comparison/drill-down merged | rollover/flex later |
| Recurring | expense/income templates + occurrence linkage merged | broader history/schedule/matching later |
| Goals | target/earmark/deadline/pace/archive merged | contribution/account-backed funding absent |
| Reports | comparisons/totals/category/trend/custom ranges merged | account/type dimensions later |
| Export | transaction/Inbox CSV/JSON with scope/date range merged | **not a complete versioned backup/restore archive** |
| Import/Inbox | CSV/XLSX/PDF staging, provenance, dry-run, atomic approval merged | broader rules/actions later |
| Rules | authenticated deterministic rules merged and production schema aligned | broader conditions/actions later; no unreviewed auto-posting |
| Audit | structural financial mutation audit schema/triggers now production-aligned | service-role legacy default ACL is a forward-hardening candidate |
| Privacy/deletion | current-main #324 recent-auth/same-account/fail-closed OAuth contract | production Edge v5 lacks current code/tenant inventory |
| Responsive/accessibility | broad automated coverage through P11/#324 | physical Android/iOS P11 acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider deployment proof |

## 6. MoneyFlow Trust current truth

Canonical name: **MoneyFlow Trust**.

Conceptual sequence:

> **Secure → Recover → Prove → Improve → Release**

Operational sequence after provider discovery:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled; provider drift identified |
| Provider Sync | **DB half aligned; Edge half pending** |
| P1 Secure | #324 merged; Vercel side READY; production Supabase Edge still v5 |
| P2 Recover | implementation blocked until Provider Sync + P1 provider acceptance |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth only after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

Production DB alignment evidence on 2026-08-08:

- exact source baseline: `main@8d0070b3d039fc80647e888aa1bd89f18b4de0b4`;
- free probe #326 exact head `0662ef8690ad204b145d91da0c9d29576e2abfc7`;
- Provider Sync Free Dry Run `31259696558`: local union history selected exactly ten MoneyFlow migrations and zero Atoryn migrations;
- actual linked-production CLI dry-run: **not executed / accepted limitation**;
- owner explicitly said **“Go”** for the production DB checkpoint after the limitation was known;
- 10/10 reviewed MoneyFlow SQL migrations applied in order and tracked under their original repository versions;
- all seven legitimate Atoryn migration-history rows preserved;
- no temporary provider-generated rollout version remains;
- checked catalog: **27 target indexes / 0 invalid-or-unready; 10 target constraints / 0 unvalidated**;
- baseline affected data counts preserved: 47 transactions, 47 entries, 6 Inbox candidates, 3 accounts, 33 categories;
- new defaulted review/reconciliation columns have 0 null drift;
- RLS/security-invoker/RPC boundaries and advisors inspected.

Provider Sync forward finding:

- `financial_mutation_audit_events` has the older project's broad direct `service_role` table ACL despite the migration's read-inspection intent; existing tables show the same historical Supabase default pattern. Do not patch ad hoc. Tightening requires a new reviewed migration/spec.

Remaining Provider Sync boundary:

1. separate owner approval for current `delete-account` Edge deployment;
2. deploy/read back current Edge while preserving `verify_jwt=true`;
3. safe stale/fresh password + Google/OAuth recent-auth acceptance without destructive real-user deletion;
4. observe a post-deploy provider/runtime window before closing Secure/Provider Sync.

## 7. UI-system migration closure truth

- B3.2/Fresh Blue remains selected; `document-theme.css` remains semantic theme/color authority.
- public routes remain light-only; signed-in workspace retains Light/Dark/System.
- P0 #297 through P11 #321 are delivered; #322 archived the program.
- P11 exact head passed CI #2043, CodeQL/Secret #1149, 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky.
- #321 merged as `bfdab8b...` and its exact Vercel deployment was verified READY.
- Physical Android Chrome/iOS Safari were not executed. Issue #72 is closed `not_planned`; this is an accepted limitation, not pass evidence.

Evidence boundaries that remain load-bearing:

- provider behavior requires provider evidence;
- new provider schema/function writes require explicit owner approval;
- Vercel does not deploy Supabase migrations/Edge Functions;
- the local union-history dry-run is not an actual linked-production dry-run;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass.

## 8. Reconciled issue status

| Item | Current status |
|---|---|
| #53 DB/import | provenance/dry-run/atomic approval merged; review/reconciliation/rules/audit schema now production-aligned |
| #53 reconciliation | merged repository contract/UI + production DB schema aligned |
| #53 authenticated rules | merged + production `inbox_rules` schema aligned |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed and not claimed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Vercel side READY; Supabase Edge alignment open |
| #325 | merged provider-drift reconciliation that established the Provider Sync packet |
| #326 | closed unmerged; zero-cost local union-history dry-run evidence only |

## 9. Open pull-request memory

Provider Sync does not assume stale status for unrelated historical PRs. Fresh-query GitHub before acting on #304/#314/#315/#317 or any older UI/recovery candidate.

This evidence update must use its own bounded PR-memory record under `docs/research/pr-memory/2026/Q3/` and must not be merged without the owner's normal merge decision.

## 10. True gaps after this audit

### Provider alignment

- production DB: **aligned for the reviewed ten-file MoneyFlow set**;
- actual linked-production CLI dry-run: not executed; accepted limitation for the completed DB checkpoint;
- production `delete-account` Edge v5 still lacks merged recent-auth/current tenant inventory;
- separate owner Edge-write approval is required;
- safe password + Google/OAuth step-up acceptance remains open;
- post-Edge runtime observation remains open;
- service-role audit-table ACL tightening is a new forward-hardening candidate, not part of the historical ten-file rollout.

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
- #236: FK-index migration merged **and now production aligned**.
- #255: transaction-review migration merged **and now production aligned**.
- #261/#263: reconciliation contract/workspace merged **and now production aligned**.
- #265: authenticated rules merged **and now production aligned**.
- #270: financial mutation audit set merged **and now production aligned**.
- #289: custom report date ranges.
- #295: secret-history gate restored.
- #296–#322: completed UI migration program/archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged in Git + Vercel Next.js deployment; **not yet Supabase Edge deployment**.
- #325: merged Provider Sync reconciliation/spec.
- #326: closed unmerged free migration-selection simulation evidence.

## 12. Superseded-status register

Do not repeat these as current facts:

- Production DB still lacks the ten reviewed MoneyFlow migrations.
- Reconciliation/rules/audit are absent from production schema.
- The ten-file migration set still needs discovery.
- Actual linked-production dry-run was executed or passed.
- The free local union-history dry-run is equivalent to an actual linked-production dry-run.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production `delete-account` Edge contains the merged recent-auth gate.
- A Git merge alone proves provider readiness.
- Service-role access to the audit table is proven read-only at effective PostgreSQL privilege level.
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
