# MoneyFlow — current project memory

- **Status:** active implementation-status authority
- **Audit date:** 2026-08-12
- **Current main audited:** `5d53a3f40a36e76a3807e32ce85c0cefb408333c` for repository code; the 2026-08-12 production deployment, hosted backup acceptance and P2 acceptance recorded below post-date that head and were evidenced directly against the provider and the closure PR, not by re-auditing main
- **Owner direction:** MoneyFlow is a released functional MVP; the active hardening program is **MoneyFlow Trust**
- **Active trust program:** `docs/plans/active/public-beta-trust.md`
- **Completed Provider Sync packet:** `docs/plans/completed/2026-08-11-moneyflow-trust-provider-sync.md`
- **Completed Recover packet:** `docs/plans/completed/2026-08-12-moneyflow-trust-recover.md`
- **Completed Secure packet:** `docs/plans/completed/2026-08-11-account-deletion-recent-auth.md`
- **MoneyFlow Trust current phase:** Provider Sync, P1 Secure and **P2 Recover are accepted**; **P3 Prove is the active phase**. P2 shipped the contract, validator, producer, atomic restore, file ingress and the `/settings/backup` surface; both migrations are deployed to production; hosted backup acceptance passed and hosted restore is an owner-accepted named limitation
- **Supabase production is now MoneyFlow-only:** the Atoryn subsystem was removed by production migration `20260812043219_remove_atoryn_from_moneyflow_project` (7 `atoryn_*` tables, 11 `atoryn_cloud_*` functions, and its own history rows), and the five Atoryn Edge Functions were deleted on 2026-08-12. Only `delete-account` remains. That cleanup migration stays in history as evidence of removal, not as an active Atoryn subsystem
- **Supabase production migration/schema:** reviewed MoneyFlow migrations are applied; five had been retimestamped in the repository relative to production and were restored to the production canonical versions (`20260726004445`, `20260726011134`, `20260801084523`, `20260801084534`, `20260801084604`) — proven byte-identical after normalization, so the rename changed no behaviour
- **Migration history is fully aligned:** the owner-approved repair recorded `20260715001400_split_expense` and `20260715001500_account_currency_on_create` as applied. It touched the history table only — it did **not** execute those migrations' SQL bodies, and independent post-write checks confirmed the 19 MoneyFlow table counts, the live `create_split_expense` and `create_financial_account` definitions and `transaction_feed` were all unchanged
- **Recover schema is DEPLOYED to production (2026-08-12T06:41:39–06:41:43Z):** Approval A was consumed to apply exactly `20260812000000_export_user_archive` and `20260812010000_restore_user_archive` via `supabase db push --linked --include-all`. `--include-all` was required because the cleanup migration `20260812043219` carries a later timestamp. Migration history is now **41/41 aligned, zero local-only, zero remote-only**, and the follow-up dry-run reports *"Remote database is up to date"*
- **Deployment data safety:** aggregate row counts immediately before and after were **228 both times** across the same 19 financial relations, with the two new R7 tables appearing empty. The deployment created schema only
- **Live production read-back:** `export_user_archive`, `restore_user_archive`, `remove_archive_restore_batch`, `archive_timestamp` and `validate_archive_for_restore` all exist and return `42501 permission denied` to the anon key (a non-existent function returns `PGRST202`, confirming the probe distinguishes). `archive_restore_batches` and `archive_restore_rows` deny anon SELECT and INSERT, matching `financial_transactions`
- **Hosted backup acceptance PASSED (Mission 17D, 2026-08-12):** the owner downloaded a backup from hosted `/settings/backup` after the R6 deployment, and its exact raw bytes were fed to the shipped `ingestArchiveBytes` (R8) which ran the shipped `validateMoneyFlowArchive` (R5): **R8 PASS, R5 PASS with zero contract violations**. Artifact `sha256 f2fb8228…`, 63216 bytes, `produced_at 2026-08-12T07:40:43Z`, archive version 1, 19 dispositions (18 restorable + 1 non-replayable history), 189 archived rows. No credential or tenant-authority key was present and the profile carried no source id. `capability_missing` is therefore gone in production
- **Backup acceptance artifact note:** the mission brief quoted an earlier download (`c339dc2b…`); the file supplied hashed `f2fb8228…` at the identical 63216 bytes. That is the expected signature of a *second* export — `archive_id` is a fixed-width uuid and `produced_at` a fixed-format timestamp, so an unchanged ledger re-exports to the same length with different bytes. The owner confirmed the newer artifact supersedes. The private archive was never committed and was handled only outside the repository
- **Hosted RESTORE was never executed (Mission 17E, 2026-08-12):** P2 was accepted with this as a named limitation. Two archives were handled; the blocker was the *source*, not the target. The only populated archive (`f2fb8228…`, from the owner's still-live primary account) was securely deleted at the end of 17D under the privacy boundary and would have been refused anyway by `restore_archive_id_conflict`, since ids are preserved and are globally unique. The designated *target* — a disposable bootstrap account, `sha256 749cb4fb…` inner / `570d0e26…` ZIP, 3560 bytes, 13 rows — was verified eligible read-only through the shipped R8/R5 path (R8 PASS, R5 PASS, bootstrap-only: profile 1, categories 11, accounts 1, all other collections 0). The target was **never** substituted as the source. Proving the hosted path needs a disposable source account that can be purged after export
- **Read-back limitation:** there is no arbitrary read-only SQL path from this environment (no `psql`, no stored DB password), so SECURITY DEFINER/INVOKER posture, `search_path` settings, RLS policy bodies, indexes and constraints were **not** read from the live catalog. They are evidenced by CI pgTAP running these exact migrations against a real Postgres, not by production introspection. Supabase Postgres logs also remain unreachable from this CLI version
- **Missions 17B–17E are complete:** 17C deployed the Recover schema, 17D passed hosted **backup** acceptance, and 17E closed P2 with hosted **restore** recorded as an owner-accepted limitation rather than a pass. No hosted restore has ever been executed
- **Mission 17B is complete:** the Supabase project is MoneyFlow-only, Atoryn Edge Functions and database subsystem are removed, the cleanup migration is mirrored, retimestamps are reconciled and history is aligned. at the time 17B closed, P2 Recover was not yet accepted; the migrations were deployed later by 17C, hosted backup acceptance passed in 17D, and 17E accepted the phase with the hosted-restore limitation
- **Agent harness policy authority (2026-08-12, #355):** `scripts/agent-policy.mjs` is the single machine-readable projection of the delivery rules; `scripts/classify-ci-changes.mjs` remains sole authority for path → CI gate selection and exports its shared matchers so nothing restates one; `npm run agent:doctor [--json]` consumes both and holds no policy of its own. It answers risk class, local gates, capabilities, exact-head provider checks, owner-approval boundary and evidence type. Five approval boundaries are **modelled and none granted** — the emitted decision is deep-frozen. Provider-check drift fails a gate offline (declared contexts must still be real pull-request jobs), and `--verify-provider-checks` does an opt-in read-only ruleset comparison; a failed lookup reports unchecked, never agreement. Required contexts are **five**, not four: `verify`, `database`, `e2e`, `Gitleaks all refs`, `Analyze JavaScript and TypeScript`
- **Migration authority rule:** a migration's version is its identity once production has run it. `check:migrations` pins every version, filename and a **raw-byte SHA-256 content hash**, so a retimestamp, a post-hoc edit or a byte-identical duplicate fails a gate instead of forking history. Raw bytes rather than a normalization: lowercasing or comment-stripping before hashing would also fold string literals, hiding a real behaviour change
- **Supabase production audit boundary:** RLS enabled; `authenticated` SELECT retained; `service_role` SELECT-only for the reviewed table privileges
- **Supabase production Edge:** `delete-account` v6 `ACTIVE`, `verify_jwt=true`, current recent-auth helper + tenant cleanup inventory read back; provider bundle SHA-256 `56bdec4f7b0d5a97b077fed18ad00fc5c97d0e0fd2d4ff4df764368ac21bdb80`
- **Vercel production:** deployment `dpl_Ha9j2HWPx4PfrpjLc1jpfcPgFvNi` is `READY` and identifies exact Git SHA `18836e2ebdc63711113f248826b00cd541a0a530`
- **Secure provider acceptance:** password PASS provider-backed; Google/OAuth same-account continuity PASS provider-backed; missing continuity PASS fail-closed; relevant Auth/API/Postgres/Edge/Vercel logs reviewed with no acceptance-blocking cluster for accepted flows
- **Secure accepted limitation:** stale-AMR and real account-mismatch provider-level destructive/identity-risk probes were not executed; on 2026-08-11 the owner explicitly accepted deterministic fail-closed tests/source evidence for those two cases instead
- **Secure deterministic evidence:** 35/35 recent-auth assertions pass on exact `main@18836e2`; only `password`/`oauth` count; `token_refresh` does not extend deletion authority; missing/malformed/unsupported/future/stale AMR fail closed before tenant purge
- **Provider Sync historical limitation:** earlier ten-file DB checkpoint did not execute an actual linked-production CLI dry-run; owner accepted the free local union-history simulation + fresh live history substitution for that consumed checkpoint only
- **Presentation ownership:** #337 introduced the code→CSS ownership gate and fixed onboarding; #339 registered semantic theme utilities and layered button/link resets; #340 fixed password UX + confirm registration + shared dropdown owner; shrink-only baseline is **313** with no additions from #340
- **UI migration:** P0–P11 merged/archived; physical Android/iOS were not executed and remain explicit limitations
- **Primary public-beta blockers now:** physical-phone/seven-day proof → observed trust-depth improvements → final release decision
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

A Git merge is not a provider deployment. Provider source read-back is not authenticated-flow acceptance. Local/browser tests do not manufacture production provider evidence. Owner-accepted limitations are recorded as limitations, never rewritten as executed pass evidence.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| **Merged implementation** | Exists on current `main` with repository evidence |
| **Provider aligned** | Required live provider state matches the reviewed repository contract for the named boundary |
| **Implemented + production evidenced** | Merged path is verified through every required production/provider boundary for the named claim |
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
- Account deletion requires recent interactive `password` or `oauth` AMR before tenant purge; token refresh does not extend deletion authority.

## 5. Current capability inventory

| Capability | Current truth | Remaining distinction |
|---|---|---|
| Authentication/demo | email/password, Google OAuth, recovery/reset, CAPTCHA and deletion step-up merged; password reveal/registration confirmation fixed in #340 | broader auth hardening only if new evidence requires it |
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
| Privacy/deletion | recent-auth/same-account/fail-closed contract merged, Edge v6 source-aligned, password + Google production acceptance completed | stale/mismatch provider probes retained as accepted limitation |
| Responsive/accessibility | broad automated coverage through #340 | physical Android/iOS acceptance not executed |
| CI/security | risk-selected CI, CodeQL, secret scan, DB/browser harnesses | hosted-runner success is not provider acceptance proof |

## 6. MoneyFlow Trust current truth

Canonical sequence:

> **Provider Sync → Secure acceptance → Recover → Prove → Improve → Release**

| Phase/checkpoint | Current state |
|---|---|
| P0 Baseline | repository/Vercel/Supabase truth reconciled |
| Provider Sync | **accepted/completed** |
| P1 Secure | **accepted/completed** with explicit stale/mismatch provider-test limitation |
| P2 Recover | **accepted/completed** (2026-08-12) with a named hosted-restore limitation: id preservation refuses a restore while the source account is live, so the hosted half is proven for export only and the full round trip rests on pgTAP against a real Postgres |
| P3 Prove | **active** — physical-phone core ledger + seven-day sanitized self-use |
| P4 Improve | evidence-selected Ledger Trust depth after P3 |
| P5 Release | final owner public-beta decision with explicit limitations |

### Secure/provider acceptance evidence

Production-safe password flow on 2026-08-11:

- ordinary password authentication succeeded;
- deletion reauthentication performed a second successful password authentication;
- both resolved to the same provider identity;
- server-side user verification succeeded;
- browser returned to `/settings/delete-account`;
- no destructive `delete-account` Edge invocation was observed.

Production-safe Google flow on 2026-08-11:

- ordinary Google PKCE login succeeded;
- deletion reauthentication initiated OAuth with `next=/settings/delete-account` and `reauth=1` continuity state;
- second Google PKCE authentication succeeded;
- ordinary login and reauthentication resolved to the same provider identity;
- server-side user verification succeeded after callback;
- browser returned to `/settings/delete-account`;
- no destructive `delete-account` Edge invocation was observed.

Fail-closed evidence:

- missing continuity state returned to ordinary login/recovery rather than authorizing deletion;
- invalid non-credential callback code followed the same safe recovery path;
- `reauth=1` without the deletion next path did not activate the deletion continuity branch;
- unauthenticated delete-account access preserved the intended login-next route;
- 35/35 deterministic assertions on exact `18836e2` prove unsupported/refresh/missing/future/stale AMR cannot grant deletion authority.

Accepted limitation:

- stale-AMR through the potentially destructive server-action boundary and real account mismatch with a second identity were not executed in production;
- owner explicitly accepted this limitation on 2026-08-11 instead of requiring destructive or identity-risk production testing.

Logs:

- Auth/API/Postgres/Edge/Vercel were inspected around the accepted flow windows;
- no acceptance-blocking error cluster was found for those flows;
- Supabase Edge logs contained no `delete-account` invocation during acceptance;
- ordinary application POST traffic is not confused with destructive Edge execution.

### Provider Sync evidence

- exact reviewed MoneyFlow migrations applied under repository versions; the Atoryn subsystem has since been removed and the project is MoneyFlow-only;
- audit ACL forward migration `20260809010648` live exactly once and effective `service_role` access SELECT-only for reviewed privileges;
- owner separately approved the Edge write;
- production `delete-account` upgraded from stale v5 to current v6;
- v6 read-back retains `verify_jwt=true` and current helper/inventory;
- no real account deletion or financial-row mutation used as rollout/acceptance evidence.

Historical accepted DB limitation remains: no actual linked-production CLI dry-run for the earlier ten-file checkpoint.

## 7. Presentation/UI ownership current truth

- P0–P11 UI migration is delivered and archived; B3.2/Fresh Blue remains selected.
- #337 introduced `check:code-css-ownership`, gave onboarding a local CSS owner and made the baseline history-relative/shrink-only.
- #339 registered the shadcn semantic theme namespace in the Tailwind-owned stylesheet and moved button/link color resets into `@layer base` so utilities can win; measured primary-button contrast recovered to 5.93:1 light / 6.48:1 dark.
- #340 added shared password reveal controls, server-authoritative registration password confirmation and a shared DropdownMenu presentation owner.
- #340 ownership baseline shrank 319 → **313**, `baselineAdded: 0`.
- Transaction amount readability regression was not reproduced after #339; browser regression evidence now covers light/dark.
- Physical Android Chrome/iOS Safari P11 acceptance was not executed. This remains an accepted limitation, not pass evidence.

## 8. Reconciled issue status

| Item | Current status |
|---|---|
| #53 DB/import/reconciliation/rules | merged; relevant production schema aligned |
| #72 UI audit | closed `not_planned`; physical Android/iOS not executed |
| #316 | closed/superseded historical recent-auth candidate; replaced by #324 |
| #323 | MoneyFlow Trust parent merged; active program continues |
| #324 | merged recent-auth implementation; production/provider behavior now accepted under completed Secure packet |
| #325–#329 | Provider Sync reconciliation/DB/ACL evidence completed and archived |
| #337 | merged presentation ownership gate + onboarding owner |
| #339 | merged semantic theme ownership/cascade fix |
| #340 | merged Auth/shared-UI regression closure; deployed exact SHA `18836e2...` |

### Evidence boundaries

- provider behavior requires provider evidence;
- Vercel does not deploy Supabase migrations or Edge Functions;
- provider source read-back does not by itself prove password/Google behavior;
- automated browser success does not prove physical-device acceptance;
- retry-pass is not equivalent to first-attempt pass;
- owner-accepted limitation is not equivalent to executed pass evidence.

## 9. Open pull-request memory

Fresh-query GitHub before acting on unrelated historical PRs. Open PRs remain candidate evidence until merged. For bounded provenance, use the relevant record under `docs/research/pr-memory/YYYY/QN/` rather than treating old PR descriptions as current truth.

PR #341 merged on 2026-08-11 and closed the Secure/Provider Sync acceptance described in this snapshot; current `main` is `a6aaa7d832f518e9ce7d2eafbfa4b64ec2728f8f`. Its required CodeQL check had stalled as `in_progress` after the workflow itself reported success; re-running the same run for the same head produced a fresh check-run that finalized `success`, so no ruleset or protection was bypassed.

## 10. True gaps after this audit

### P2 Recover / portability

- archive v1 contract exists in `src/lib/archive/`: nineteen-table inventory anchored to `purge_user_tenant_data`, source-neutral row shapes carrying no ownership, and a pure fail-closed validator with a test-enforced drift check;
- owner decisions are settled: restore targets `auth.uid()` while archives stay portable across MoneyFlow account identity; restore v1 is empty-only with a measured signup-bootstrap exception; historical audit events are non-replayable;
- an authenticated archive producer exists — `public.export_user_archive()`, SECURITY INVOKER so RLS enforces tenant isolation, covering 19/19 dispositions and proven by 40 pgTAP assertions plus a database→archive→validator round trip; the date-range CSV/JSON export remains a separate reporting artifact covering 2 of 19 tables, not a backup;
- both archive migrations — `20260812000000_export_user_archive.sql` then `20260812010000_restore_user_archive.sql` — are **applied to production Supabase** (2026-08-12, Approval A);
- an atomic restore exists — `restore_user_archive()`, SECURITY DEFINER because fifteen tenant tables deny INSERT to authenticated, empty/bootstrap-only, advisory-locked per tenant, with batch attribution and a pristine-only removal;
- a strict archive file-ingress boundary exists — size-bounded, fatal UTF-8, duplicate-member-safe before `JSON.parse`, then the R5 validator — and the CI round trips run the producer's raw bytes through it;
- a Backup & Restore surface exists at `/settings/backup`, separate from the `/settings/export` report; both archive calls go through server actions, and the transport ceiling is ~4 MB (~5,000 transactions) because of the server-action and platform request caps;
- the surface is **live** now that both archive migrations are deployed; before deployment an absent function was reported as a capability gap rather than an error, and that fail-closed path remains for any future capability gap;
- restore must re-assert transfer balance, split exactness and per-kind entry sign/category-kind itself, because those live only in the write RPCs and a bulk insert bypasses them;
- restore attribution is built, but as a side table rather than a column on tenant rows: `archive_restore_batches` plus `archive_restore_rows (batch_id, table_name, row_id, row_hash)`, with `remove_archive_restore_batch` removing only rows still byte-identical to what the restore wrote. There is no `restore_batch_id` column on any tenant table — do not go looking for one;
- duplicate-restore detection is built on that persistent metadata and raises `archive_already_restored`; the pure validator still cannot prove it alone;
- raw-file ingress is implemented, including the duplicate-member-name protection R5 could not claim;
- pgTAP now covers the archive producer boundary and remains mandatory for the restore slice;
- archive must exclude credentials, JWTs, secrets and private infrastructure metadata.

### P3 Prove

- **active phase.** No physical-phone core-ledger acceptance under the Trust program and no seven consecutive days of sanitized owner self-use accepted;
- the checklist now exists: `docs/plans/active/moneyflow-trust-prove.md` specifies 17 scenarios (PP-01–PP-17), a three-tier device matrix, P0/P1/finding severity with a retry rule, and the seven-day Day-0 rules. It is **preparation, not evidence** — no scenario has been run and day 1 does not exist;
- `npm run check:prove-evidence` validates an evidence file's completeness and scans it for money amounts, emails, identifiers and tokens before they can enter Git; it cannot inspect a screenshot, and the owner remains the last check on one;
- older `docs/REAL_USE_READINESS_CONTRACT.md` R6/R7 mark a mobile path and a seven-day waiver as accepted (2026-07-27/29). Those record what was accepted **then**, on an emulated viewport and a pre-log build; they do **not** satisfy PBT-AC12/AC13. The P3 packet records the reconciliation.

### Product depth after Trust evidence

- richer account closing/reconciliation matching;
- split-line correction and user-facing mutation-audit depth;
- budget rollover/flex, recurring history/matching, goal funding history;
- report account/type dimensions/deeper drill-down;
- broader deterministic rule conditions/actions without unreviewed auto-posting.

## 11. Next allowed action

Begin **P3 Prove**. P2 Recover is accepted and archived at
`docs/plans/completed/2026-08-12-moneyflow-trust-recover.md`; do not reopen it and
do not re-specify the archive contract.

P3 needs, in order:

- a physical-phone core-ledger acceptance checklist covering record, balances and
  where-money-went on a real device;
- that checklist executed with recorded evidence;
- seven consecutive days of sanitized owner self-use with no data loss and no
  manual database repair;
- reconciled memory/evidence and the owner's public-beta decision with its
  explicit accepted limitations.

Carried into P3 as a known gap, not a task to redo: hosted restore has never been
executed against a live account. Proving it needs a disposable source account whose
rows can be purged, because id preservation refuses a restore while the source is
live. That is an optional future exercise, not a P3 blocker.

Provider writes, destructive deletion and production financial-data mutation are
not authorized merely because P2 is accepted. Approval B (one hosted restore into a
disposable test account) was granted in Mission 17E and **not consumed**; it does
not carry forward.

## 12. Superseded-status register

Do not repeat these as current facts:

- Production still lacks the reviewed MoneyFlow migrations.
- Audit `service_role` still has broad non-read table privileges.
- Production `delete-account` is still v5.
- Production `delete-account` lacks the merged recent-auth helper/current tenant inventory.
- P1 Secure remains blocked on password provider acceptance.
- P1 Secure remains blocked on Google/OAuth same-account continuity.
- Supabase logs are unavailable because the local CLI lacks a `logs` command.
- Production Vercel SHA for #340 is unverifiable.
- Stale-AMR/account-mismatch production probes passed; they were not executed and are accepted limitations.
- Actual linked-production dry-run was executed or passed for the earlier ten-file rollout.
- Physical Android/iOS acceptance was performed or passed.
- P2 Recover is open, in progress, unaccepted, or the next phase to start.
- The Recover packet is active at `docs/plans/active/moneyflow-trust-recover.md`.
- The two archive migrations are merged but not applied to production.
- A complete restorable archive does not exist, or MoneyFlow's only export is the date-range CSV/JSON report.
- Restore lacks batch identity, or a `restore_batch_id` column exists on tenant tables.
- The Supabase project is shared with Atoryn.
- Hosted restore acceptance is the one gap blocking P2 — P2 is accepted with that limitation named.
- A hosted restore was executed, or Approval B was consumed.
