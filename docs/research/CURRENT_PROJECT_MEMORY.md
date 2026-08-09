# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-09
- **Current main audited:** `1618f817c6a96810160f6261029dd038eb8b41ea`
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Active provider packet:** `docs/plans/active/moneyflow-trust-provider-sync.md`
- **Supabase production migration/schema:** the previously missing ten MoneyFlow migrations plus `20260809010648_financial_audit_service_role_read_only` are applied under their original repository versions; legitimate shared Atoryn history rows remain preserved
- **Supabase production audit boundary:** **provider aligned** for the reviewed invariant — RLS remains enabled; `authenticated` retains SELECT; `service_role` has SELECT and no effective INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN
- **Supabase production Edge:** `delete-account` remains **v5** and does not contain #324's merged recent-auth/current-tenant contract
- **Provider Sync current state:** `evaluating`; database migration/schema/ACL drift is closed, Edge v5 is the remaining live provider blocker
- **Recent-auth state:** #324 is merged and its Next.js side has production Vercel evidence, but P1 Secure is not accepted end-to-end until Supabase Edge rollout and provider-backed step-up verification are complete
- **Provider Sync limitation:** the earlier ten-file production checkpoint did not execute an actual linked-production CLI dry-run; the owner explicitly accepted the free local union-history simulation + fresh live history substitution for that consumed DB checkpoint only
- **UI migration:** P0–P11 is merged and archived; physical Android/iOS were not executed and remain explicit limitations
- **Primary public-beta blockers now:** current Edge deployment → safe password/Google recent-auth acceptance → complete versioned archive/restore → physical/seven-day proof
- **History model:** task routing lives in `docs/context/README.md`; bounded PR provenance lives under `docs/research/pr-memory/YYYY/QN/`
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

A Git merge is not a Supabase migration or Edge deployment. Local tests do not prove cloud provider state. Provider evidence does not waive later product/device acceptance.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required live schema/function/privilege/runtime state matches the reviewed repository contract for the named boundary |
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

- Next.js App Router modular monolith on Vercel; Supabase Auth/PostgreSQL with RLS; browser-local demo mode is explicit.
- Validated Server Actions/ownership-safe RPCs own financial writes.
- VND is integer đồng; supported non-VND currencies use integer minor units.
- Transfers are balanced, same-currency and excluded from income/expense.
- Split totals remain exact.
- Destructive ledger actions use soft delete/recovery where supported.
- Account archive is reversible; archived history remains stored while active totals exclude archived accounts.
- Budgets are monthly category limits, not envelope cash.
- Unpaid recurring items remain planning facts until explicitly posted to the ledger.
- Goal allocations are planning earmarks only; they do not post, transfer or lock account money.
- Authenticated and demo failures never silently mix.
- Missing financial facts are never invented.
- Build/lint/typecheck do not prove RLS, provider state, effective privileges or production correctness.
- Current-main deletion code requires recent interactive `password` or `oauth` AMR before tenant purge; production Edge v5 does not yet contain that gate.

## 5. Current capability inventory

MoneyFlow is functional-MVP complete in repository terms. Provider depth and public-beta acceptance remain separate.

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, OAuth, recovery/reset, demo, CAPTCHA and #324 deletion step-up merged | production delete Edge stale; provider acceptance open |
| Accounts | CRUD/archive/restore, totals, transfer, register/detail merged | richer closing lifecycle later |
| Reconciliation | domain/UI merged; production schema aligned | live user acceptance/deeper matching later |
| Categories | lifecycle + current presentation merged | nested/merge/tag depth later |
| Transactions | ledger/capture/review merged; production review schema aligned | split-line correction later |
| Dashboard | deterministic period/range/planning/activity behavior merged | richer attention/drill-down later |
| Budgets | limits/history/previous-month comparison/drill-down merged | rollover/flex later |
| Recurring | expense/income templates + occurrence linkage merged | broader history/schedule/matching later |
| Goals | target/earmark/deadline/pace/archive merged | contribution/account-backed funding absent |
| Reports | comparisons/totals/category/trend/custom ranges merged | account/type dimensions later |
| Export | transaction/Inbox CSV/JSON with scope/date range merged | **not a complete versioned backup/restore archive** |
| Import/Inbox | CSV/XLSX/PDF staging, provenance, dry-run, atomic approval merged | broader rules/actions later |
| Rules | authenticated deterministic rules merged + production schema aligned | broader conditions/actions later; no unreviewed auto-posting |
| Audit | schema/RLS/triggers + SELECT-only service-role boundary aligned in production | richer user-facing traceability later |
| Privacy/deletion | #324 recent-auth/same-account/fail-closed OAuth contract merged | production Edge v5 lacks current implementation |
| Responsive/accessibility | broad automated coverage through P11/#324 | physical Android/iOS acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider deployment proof |

## 6. MoneyFlow Trust current truth

Canonical sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled |
| Provider Sync | **evaluating** — database migration/schema/ACL drift closed; Edge v5 remains |
| P1 Secure | #324 merged; Next.js side production-evidenced; Supabase destructive runtime stale |
| P2 Recover | blocked until Provider Sync + P1 provider acceptance |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

### Database Provider Sync evidence

- exact ten historical MoneyFlow migrations were applied in dependency order under repository versions;
- seven legitimate shared Atoryn migration-history rows were preserved;
- PR #326 free local union-history dry-run selected exactly those ten MoneyFlow migrations and no Atoryn migration;
- actual linked-production CLI dry-run for that ten-file checkpoint was not executed and remains an accepted limitation;
- checked rollout catalog had 27/27 target indexes valid/ready and 10/10 target constraints validated;
- affected baseline data counts were preserved during the ten-file rollout;
- PR #328 merged the focused audit ACL forward migration at `main@1618f817c6a96810160f6261029dd038eb8b41ea`;
- exact-head #328 evidence: CI #2113, CodeQL #1212, Secret history #1212, fresh reset and **26 files / 481 pgTAP tests PASS**;
- owner then explicitly approved the scoped production audit ACL migration with `go`;
- provider migration endpoint applied the exact SQL; its generated history version was guarded-normalized to repository version `20260809010648` after successful application;
- final production history has exactly one correct row and no stray same-name generated row;
- live `service_role` effective permissions are SELECT=true and INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN=false;
- RLS remains enabled and `authenticated` SELECT remains true;
- immediate Postgres/provider inspection showed a clean commit and no new ACL-specific permission-error cluster; this is not Edge-flow smoke evidence.

### Remaining Provider Sync blocker

Production `delete-account` remains Edge Function **v5**. It lacks the merged recent-auth evaluator and current tenant-cleanup verification path from #324.

Do not say Provider Sync is complete, P1 Secure is accepted, or production deletion is recent-auth protected until the current Edge source is deployed and provider-backed step-up behavior is safely verified.

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
| #53 DB/import | provenance/dry-run/atomic approval merged; review/reconciliation/rules schema production-aligned |
| #53 reconciliation | merged repository contract/UI + production schema aligned |
| #53 authenticated rules | merged + production schema aligned |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Next.js side production-evidenced; Supabase Edge rollout open |
| #325 | merged Provider Sync reconciliation/spec |
| #326 | closed unmerged; zero-cost local union-history dry-run evidence only |
| #327 | merged ten-file production execution evidence and audit ACL finding |
| #328 | merged audit ACL hardening; production migration applied and live privilege read-back aligned |

### Evidence boundaries

- provider behavior requires provider evidence;
- provider schema/function/privilege writes require explicit owner approval;
- Vercel does not deploy Supabase migrations or Edge Functions;
- the free local union-history dry-run is not an actual linked-production dry-run;
- clean-reset pgTAP and live production effective privileges can differ; both matter;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass.

## 9. Open pull-request memory

Fresh-query GitHub before acting on unrelated historical PRs. Open PRs remain candidate evidence until merged. For bounded provenance, use the relevant record under `docs/research/pr-memory/YYYY/QN/` rather than treating old PR descriptions as current truth.

## 10. True gaps after this audit

### Provider alignment

- ten-file migration-history/schema drift: closed;
- audit `service_role` SELECT-only boundary: closed and live-verified;
- current `delete-account` Edge v5: **open blocker**;
- separate explicit owner approval required for Edge deployment;
- safe password + supported OAuth/Google step-up acceptance remains open;
- post-Edge runtime observation remains open.

### Public-beta portability

- complete versioned archive/restore is absent;
- P2 implementation remains blocked until Provider Sync + P1 provider acceptance.

### Product depth

- richer account closing/reconciliation matching;
- split-line correction and user-facing mutation-audit depth;
- budget rollover/flex, recurring history/matching, goal funding history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions without unreviewed auto-posting.

### Accepted UI limitation

- no physical Android Chrome P11 acceptance;
- no physical iOS/Safari P11 acceptance.

## 11. Load-bearing merged and provider truth

- #183/#184: atomic Inbox approval/provenance merged and production migrated.
- #206/#207: Dashboard one-RPC hardening/schema-skew fallback.
- #228/#229: account register/detail and deployment/auth-routing evidence.
- #236/#255/#261/#263/#265/#270: FK indexes, review, reconciliation, rules and financial-audit domains merged and production schema applied.
- #289: custom report date ranges.
- #295: secret-history gate restored.
- #296–#322: completed UI migration program/archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged in Git + Next.js production evidence; **not yet current Supabase Edge deployment**.
- #325: Provider Sync reconciliation/spec.
- #326: closed unmerged free migration-selection simulation evidence.
- #327: ten-file production database evidence.
- #328: audit service-role read-only migration merged and production-aligned under exact version `20260809010648`.

## 12. Superseded-status register

Do not repeat these as current facts:

- Production still lacks the ten reviewed MoneyFlow migrations.
- Reconciliation/rules schema is absent from production.
- Audit `service_role` still has broad non-read table privileges.
- Audit is only partial at the database ACL boundary.
- Actual linked-production dry-run was executed or passed for the earlier ten-file rollout.
- The free local union-history dry-run is equivalent to an actual linked-production dry-run.
- #324 recent-auth is fully deployed because Vercel is READY.
- Production `delete-account` Edge contains the merged recent-auth gate.
- Provider Sync is complete before Edge rollout and provider-backed recent-auth verification.
- A Git merge alone proves provider readiness.
- Physical Android/iOS acceptance was performed or passed.
- Retry-pass is equivalent to first-attempt pass.
