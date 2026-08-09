# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-09
- **Current main audited:** `cfbff67171421d5f2ee70460b5e81edc59e8a6b1`
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Execution routing:** this snapshot does not own generic `Go` or task routing; active workstreams resolve one execution packet per session/handoff under the delivery contract
- **Supabase production migration/schema:** reviewed MoneyFlow migrations plus `20260809010648_financial_audit_service_role_read_only` are applied under repository versions; legitimate shared Atoryn history remains preserved
- **Supabase production audit boundary:** provider aligned for the reviewed invariant — RLS enabled; `authenticated` SELECT retained; `service_role` SELECT-only for the checked table privileges
- **Supabase production Edge:** `delete-account` is now **v6 ACTIVE**, `verify_jwt=true`, with the current recent-auth helper and tenant cleanup inventory read back from the provider
- **Provider Sync current state:** source/schema/ACL drift is closed; remaining boundary is provider-backed password/Google recent-auth acceptance
- **Recent-auth state:** #324 is merged; Next.js side has production Vercel evidence; Supabase Edge v6 now contains the merged gate, but P1 Secure is not accepted until safe authenticated provider flows prove password/OAuth step-up and same-account continuity
- **Provider Sync limitation:** the earlier ten-file DB checkpoint did not execute an actual linked-production CLI dry-run; owner accepted the free local union-history simulation + fresh live history substitution for that consumed DB checkpoint only
- **UI migration:** P0–P11 is merged and archived; physical Android/iOS were not executed and remain explicit limitations
- **Primary public-beta blockers now:** provider-backed password/Google recent-auth acceptance → complete versioned archive/restore → physical/seven-day proof
- **History model:** workstream/context discovery lives in `docs/context/README.md`; current task execution state lives in the uniquely resolved execution packet; bounded PR provenance lives under `docs/research/pr-memory/YYYY/QN/`
- **MVP release:** `main@8e08a8a748a632b07bb42c27bf14539758b28824`; functional MVP release does not imply public-beta readiness

## 1. Purpose and authority

This snapshot records merged implementation truth, live provider evidence, current gaps and accepted limitations. It is not a changelog and does not choose the current execution packet for a chat/session.

Authority order:

1. merged code, migrations and tests;
2. live provider/database/runtime evidence appropriate to the claim;
3. exact-head CI/deployment evidence appropriate to the claim;
4. explicit owner decisions without invented operational detail;
5. this snapshot;
6. architecture/product/delivery policy;
7. active work packets;
8. historical research/completed packets/PR memory.

A Git merge is not a provider deployment. Provider source read-back is not authenticated-flow acceptance. Local/browser tests do not manufacture production provider evidence.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required live provider state matches the reviewed repository contract for the named boundary |
| **Implemented + production evidenced** | Merged path is verified through every required production/provider boundary |
| **Partial** | Useful live or merged behavior exists but one or more required contracts remain unmet |
| **Candidate only** | Exists only in an open PR/branch |
| **Historical/superseded** | Preserved for provenance, not current direction |
| **Accepted limitation** | Advanced/closed without claiming unexecuted evidence passed |

## 3. Product identity and non-goals

MoneyFlow is a Vietnamese manual-first personal income-and-expense ledger.

Core jobs: record income/expense/split/transfer quickly; know balances and ledger movements; understand period totals/categories; correct and recover records; plan with budgets/recurring/goals; import controlled data; export user-owned records; reconcile account registers.

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
- Current deletion source requires recent interactive `password` or `oauth` AMR before tenant purge; production Edge v6 now contains this source, but authenticated provider behavior is still awaiting acceptance evidence.

## 5. Current capability inventory

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, OAuth, recovery/reset, demo, CAPTCHA and deletion step-up merged | provider-backed password/Google deletion-step-up acceptance open |
| Accounts | CRUD/archive/restore, totals, transfer, register/detail merged | richer closing lifecycle later |
| Reconciliation | domain/UI merged; production schema aligned | deeper matching/user acceptance later |
| Transactions | ledger/capture/review merged; production review schema aligned | split-line correction later |
| Dashboard | deterministic period/range/planning/activity behavior merged | richer attention/drill-down later |
| Budgets | limits/history/comparison/drill-down merged | rollover/flex later |
| Recurring | expense/income templates + occurrence linkage merged | broader history/matching later |
| Goals | target/earmark/deadline/pace/archive merged | contribution/account-backed funding absent |
| Reports | comparisons/totals/category/trend/custom ranges merged | account/type dimensions later |
| Export | transaction/Inbox CSV/JSON merged | **not a complete versioned backup/restore archive** |
| Import/Inbox | CSV/XLSX/PDF staging, provenance, dry-run, atomic approval merged | broader rules/actions later |
| Rules | authenticated deterministic rules merged + production schema aligned | broader conditions/actions later; no unreviewed auto-posting |
| Audit | schema/RLS/triggers + SELECT-only service-role boundary live | richer user-facing traceability later |
| Privacy/deletion | #324 recent-auth/same-account/fail-closed contract merged and Edge v6 source-aligned | safe provider-backed password/Google acceptance pending |
| Responsive/accessibility | broad automated coverage through P11/#324 | physical Android/iOS acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider acceptance proof |

## 6. MoneyFlow Trust current truth

Canonical sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled |
| Provider Sync | **evaluating** — database/schema/ACL and Edge source drift closed; provider-backed auth acceptance remains |
| P1 Secure | implementation merged + Edge v6 source-aligned; password/Google provider acceptance open |
| P2 Recover | blocked until P1 acceptance |
| P3 Prove | blocked by P2; physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

### Provider Sync evidence

- exact ten historical MoneyFlow migrations applied under repository versions; seven legitimate shared Atoryn history rows preserved;
- PR #326 free local union-history dry-run selected exactly the ten MoneyFlow migrations; actual linked-production CLI dry-run was not executed and remains an accepted limitation for that consumed DB checkpoint;
- audit ACL forward migration `20260809010648` is live exactly once and effective `service_role` access is SELECT-only for the reviewed privileges;
- #329 reconciled the audit provider evidence on `main@cfbff67171421d5f2ee70460b5e81edc59e8a6b1`;
- owner separately approved the Edge write with `Gô`;
- pre-write production `delete-account` was v5 ACTIVE with `verify_jwt=true` and stale source;
- post-write provider read-back shows **v6 ACTIVE**, `verify_jwt=true`, bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`;
- provider read-back contains `delete-account/index.ts` plus `_shared/account-deletion-recent-auth.ts`, the ten-minute `password|oauth` AMR evaluator and current audit/provenance/rules/reconciliation cleanup inventory;
- no real account deletion or financial-row mutation was used as rollout evidence;
- immediate Edge log query contained no runtime events, so it cannot stand in for authenticated-flow acceptance.

### Remaining Secure boundary

Do not say P1 Secure is accepted until production-safe password and supported OAuth/Google step-up/continuity paths are exercised and relevant provider logs are inspected. Source alignment is necessary but not sufficient.

## 7. UI-system migration closure truth

- P0–P11 are delivered and archived; B3.2/Fresh Blue remains selected.
- P11 exact head passed CI #2043, CodeQL/Secret #1149, 785 unit/static tests, Browser 94/94 and a 554-case cross-device matrix with 0 failed/0 flaky.
- Physical Android Chrome/iOS Safari were not executed. Issue #72 is closed `not_planned`; this is an accepted limitation, not pass evidence.

## 8. Reconciled issue status

| Item | Current status |
|---|---|
| #53 DB/import/reconciliation/rules | merged; relevant production schema aligned |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed |
| #172 product assessment | market-validation warnings useful; old global feature-freeze framing superseded |
| #174 provider controls | repository readiness/runbook merged; provider execution remains evidence-specific |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #324 | merged recent-auth implementation; Next.js side production-evidenced; Edge v6 now source-aligned; provider acceptance open |
| #325 | merged Provider Sync reconciliation/spec |
| #326 | closed unmerged; zero-cost local union-history dry-run evidence only |
| #327 | merged ten-file production execution evidence |
| #328 | merged audit ACL hardening; production migration live |
| #329 | merged audit ACL production evidence/current-memory reconciliation |

### Evidence boundaries

- provider behavior requires provider evidence;
- Vercel does not deploy Supabase migrations or Edge Functions;
- provider source read-back does not prove password/Google behavior;
- the free local union-history dry-run is not an actual linked-production dry-run;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass.

## 9. Open pull-request memory

Fresh-query GitHub before acting on unrelated historical PRs. Open PRs remain candidate evidence until merged. For bounded provenance, use the relevant record under `docs/research/pr-memory/YYYY/QN/` rather than treating old PR descriptions as current truth.

## 10. True gaps after this audit

### Secure/provider acceptance

- production `delete-account` source/version drift: closed at v6;
- safe password recent-auth provider acceptance: open;
- safe supported OAuth/Google recent-auth + expected-user continuity: open;
- stale/missing-continuity fail-closed provider evidence: open;
- post-acceptance Edge/Auth/API/Postgres log review: open.

### Public-beta portability

- complete versioned archive/restore is absent;
- P2 implementation remains blocked until P1 Secure acceptance.

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
- #296–#322: completed UI migration program/archive.
- #323: MoneyFlow Trust parent program.
- #324: recent-auth merged; Next.js side production-evidenced; production Edge now v6 with current source, acceptance still open.
- #325: Provider Sync reconciliation/spec.
- #326: closed unmerged migration-selection simulation evidence.
- #327: ten-file production database evidence.
- #328/#329: audit service-role read-only migration + production evidence.

## 12. Superseded-status register

Do not repeat these as current facts:

- Production still lacks the reviewed MoneyFlow migrations.
- Audit `service_role` still has broad non-read table privileges.
- Production `delete-account` is still v5.
- Production `delete-account` lacks the merged recent-auth helper/current tenant inventory.
- P1 Secure is accepted merely because Edge v6 is ACTIVE.
- Actual linked-production dry-run was executed or passed for the earlier ten-file rollout.
- The free local union-history dry-run is equivalent to an actual linked-production dry-run.
- A Git merge alone proves provider readiness.
- Physical Android/iOS acceptance was performed or passed.
- Retry-pass is equivalent to first-attempt pass.
