# #536 — Security runtime and authentication hardening

**Status:** selected active Class 3 slice on merged `main`
**Execution state:** repository implementation is Ready for review in PR #540; production runtime/database/Auth acceptance remains open
**Active role:** evaluator / owner handoff inside repository boundary; owner-controlled production writes remain gated
**Permission scope:** repository implementation, tests, documentation and read-only provider/database inspection are allowed under merged `PLAN_AUTHORITY.current`; merge/deploy, database/provider mutations and Supabase plan/Auth writes require the explicit owner decisions defined by this packet
**Owner:** human owner
**Issue:** #536
**Current implementation:** PR #540, branch `security/536-runtime-dependency-patch`
**Merged-main baseline:** `425af4508e547de28fb372eedbcb07ced226d522` (PR #539)
**Last updated:** 2026-09-03

## Outcome

Remove the release-blocking runtime and authentication security gaps discovered by the 2026-09-02 audit without weakening MoneyFlow's financial, tenant-isolation, recovery, accessibility or browser contracts.

Required outcome:

1. ship a Next.js release patched for the 2026-08-25 Critical advisories;
2. identify and resolve or explicitly disposition every High/Critical dependency advisory in the exact shipped tree;
3. preserve Server Action authorization, RLS ownership, integer-VND financial invariants and browser behavior;
4. classify current Supabase Security Advisor warnings against real RPC ownership tests rather than blindly refactoring privileged financial functions;
5. reconcile production migration/schema state with repository runtime contracts before #536 closure/public-beta acceptance, without blindly replaying or repairing migration history;
6. enable Supabase leaked-password protection before public-beta acceptance when the owner authorizes the provider write and the provider plan supports it;
7. verify repository, deployment, database and provider evidence independently rather than treating install/build success as release proof.

## Authority reconciliation

PR #538 completed #527 and left `docs/plans/PLAN_AUTHORITY.json.current` as `null`. PR #539 then merged from fresh `main` as `425af4508e547de28fb372eedbcb07ced226d522` and selected this packet as the single current executable slice. #536 is therefore active authority; the earlier selector-candidate state is historical.

Draft PR #537 remains historical planning evidence only. PR #540 is the focused Ready-for-review repository implementation candidate under this active packet. It does not grant itself authority to merge, deploy, mutate production database state or change Supabase plan/Auth configuration.

## Repository reconnaissance

### Runtime and dependency baseline

Merged `main` still pins:

- `next` 16.2.11;
- `eslint-config-next` 16.2.12;
- React / React DOM 19.2.4;
- Node engine `>=22 <23`.

The shipped framework therefore remains inside the official affected range for the August 2026 Critical Next.js advisories until the patched PR is owner-merged and production deployment is verified. Existing Dependabot PR #524 targets Next 16.3.1 and is not sufficient for the August release because the patched 16.x floor is 16.3.3.

PR #540 carries the vetted candidate Next 16.3.4 / `eslint-config-next` 16.3.4, keeps React 19.2.4, raises the Sharp override to 0.35.4, pins Browserslist 4.28.8, qs 6.16.0 and fast-uri 3.1.6, and adds dependency-floor guards. Exact-tree audit chronology matters: an initial High Browserslist finding was remediated; a later fresh audit then surfaced Moderate qs findings; the final candidate also pins fast-uri at the patched 3.x floor for the August 23 host-confusion/SSRF advisory set. The regenerated candidate tree reached audit-zero after those changes. Do not treat any earlier zero-audit snapshot as permanently authoritative.

### Supabase baseline

Read-only production evidence refreshed on 2026-09-03:

- project status is `ACTIVE_HEALTHY`;
- Security Advisor still reports `auth_leaked_password_protection` disabled;
- Security Advisor still reports `authenticated_security_definer_function_executable` WARN findings;
- all 36 authenticated-callable SECURITY DEFINER functions currently present live have `postgres` ownership, empty `search_path`, intended authenticated execute and no anon/PUBLIC execute;
- all 36 bodies reference `auth.uid()`, contain an explicit `authentication_required` guard and a direct tenant predicate tied to the authenticated user;
- zero of the 36 bodies show dynamic SQL, role/row-security switching, `service_role`, `auth.role()` or user-editable metadata trust patterns;
- repository cross-tenant/browser-role tests provide behavioral ownership and least-privilege evidence.

The current 36-function warning set is therefore classified as **intentional privileged authenticated API surface with tenant controls**, not a reproduced ownership defect. This is not a blanket waiver for future functions. Do **not** bulk-convert `SECURITY DEFINER` functions to `SECURITY INVOKER`, revoke authenticated execution, or move financial RPCs merely to silence the advisor. Any future privilege/function change still requires a reproduced or evidence-backed defect and corresponding migration/pgTAP/browser proof.

### Production migration/schema parity

Read-only production migration history ends at `20260812043219_remove_atoryn_from_moneyflow_project`. The repository contains 15 later migration versions:

1. `20260821014500_direct_csv_batch_atomic_approval`
2. `20260821062000_manual_import_reconciliation`
3. `20260821093500_deleted_source_reimport_precedence`
4. `20260821184500_source_observation_precedence`
5. `20260821190000_source_observation_guard_compat`
6. `20260821203000_import_batch_owner_preserving_fk`
7. `20260822094400_source_identity_consistency_preflight`
8. `20260822094500_source_lineage_lifecycle`
9. `20260822094600_source_lineage_archive_compat`
10. `20260822094700_source_lineage_archive_mode_guard`
11. `20260823124000_source_lifecycle_reconciliation_policy`
12. `20260823124500_source_lifecycle_reconciliation_lock_order`
13. `20260824083000_share_target_atomic_ingestion`
14. `20260824170000_share_target_rule_atomic_ingestion`
15. `20260825090000_direct_csv_rule_atomic_ingestion`

History absence alone is not the authority. A final read-only contract matrix mapped every migration to a surviving expected postcondition. All 14 durable postconditions are absent live: batch approval; later-source attachment; deleted-source restore; changed-source observation; approved-evidence guard; owner-preserving import-batch FK; source-lineage columns/replacement RPC; source-aware archive producer/restore; archive-mode updated-at owner guard; lifecycle review RPC and lock-order marker; both Share Target ingestion RPCs; and Direct CSV rule preparation.

The one migration without a durable schema marker is `20260822094400_source_identity_consistency_preflight`. Its actual data condition currently passes: production has 7 Inbox candidates, 6 approved, no source-ID candidates, and zero approved-candidate identity conflicts or candidate/provenance identity conflicts.

Repository SECURITY DEFINER contracts expect 43 privileged routines after later acquisition migrations; production exposes 36 in the corresponding authenticated-callable class. Authenticated Direct CSV/source-lineage code already calls several absent routines while Vercel production remains on `main@425af450...`.

The combined migration-history and 15-version contract evidence strongly supports **forward-applying all 15 migrations in timestamp order** after owner authorization, rather than migration-history repair. This drift predates #540. It blocks #536 closure/public-beta acceptance, but it must not be used to keep the known-vulnerable Next runtime unpatched merely to bundle an unrelated database write into #540.

## Research

1. **Next.js August 2026 Security Release** — official Next.js blog index, published 2026-08-25, directs the Active LTS line to Next.js 16.3.3 and Maintenance LTS to 15.5.24 for two Critical vulnerabilities. Source: https://nextjs.org/blog
2. **GHSA-p293-qw3h-jr36 / CVE-2026-75604** — official `vercel/next.js` advisory; affected Next.js `>=16.0 <16.3.3`, patched in 16.3.3. Source: https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
3. **GHSA-2xp9-vwfh-vxw4** — official `vercel/next.js` advisory; affected Next.js `<16.3.3`, patched in 16.3.3. Source: https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
4. **Supabase Password security / Management API** — official Supabase docs state leaked-password protection uses the HaveIBeenPwned Pwned Passwords API, is available on Pro and above, and exposes the Auth config field `password_hibp_enabled`. Sources: https://supabase.com/docs/guides/auth/password-security and https://supabase.com/docs/reference/api/v1-update-auth-service-config
5. **Supabase production migrations** — official deployment/CLI guidance states `migration list` compares local/remote history, `db push` applies migrations absent from remote history in order, `db push --dry-run` previews the pending list, and `migration repair` changes migration-history bookkeeping only. Sources: https://supabase.com/docs/guides/deployment/database-migrations, https://supabase.com/docs/guides/local-development/cli-workflows and https://supabase.com/docs/reference/cli/supabase-db-push
6. **Supabase backups** — official docs state Free projects do not receive automatic backups/PITR and recommend manual logical dumps. `supabase db dump` exports schema; `--data-only` exports data. Sources: https://supabase.com/docs/guides/platform/backups and https://supabase.com/docs/reference/cli/supabase-projects-create

Applicability limits:

- MoneyFlow's current Vercel runtime is not known to meet every exploit precondition for each upstream advisory, but the shipped framework version is still inside the upstream affected range, so the dependency remains release-blocking.
- Supabase leaked-password protection is plan-gated. The current organization reports plan `free`; if the owner does not authorize an eligible plan/provider change, public-beta acceptance remains blocked and the packet must record that limitation rather than simulate success.
- The Supabase advisor's SECURITY DEFINER warnings are broad static findings. Current live function source, ACLs and tenant tests support intentional privileged use; future/new functions still require classification.
- `db push --dry-run` previews which migrations would apply but does not execute/validate their SQL. Local fresh reset + pgTAP remains mandatory before a production push.
- Free-plan backup limitations mean database rollback cannot assume provider PITR. A private/off-repository logical schema + data backup is a hard pre-write condition for the planned production migration operation.

## Specification

### In scope under active authority

#### A. Runtime dependency patch

- select Next.js 16.3.3 or a later **vetted patched 16.3.x** release available at implementation time;
- align `eslint-config-next` to the selected compatible patch;
- preserve React 19.2.4 unless the selected Next patch demonstrably requires a React movement;
- regenerate the lockfile using repository Node/package-manager semantics;
- review the lockfile delta and remove unrelated modernization;
- do not accept Next 16.3.1 as the August Critical fix.

#### B. Exact dependency advisory triage

Run `npm audit --json` on the exact post-upgrade tree and record for every material result:

- package and dependency path;
- advisory / GHSA / CVE when provided;
- affected and patched ranges;
- runtime versus development exposure;
- fix selected or evidence-backed exception;
- release impact.

Do not run `npm audit fix --force` as a substitute for understanding the dependency delta.

#### C. Runtime/auth regression verification

Verify at minimum:

- production build;
- App Router Server Actions and authenticated routes;
- login, registration, forgot/reset password and account-deletion recent-auth flow;
- authenticated financial truth and tenant-boundary browser harness;
- Next Image behavior on public landing content;
- proxy/middleware/deployment configuration contracts;
- CSP/security headers if dependency behavior changes them;
- exact-head CodeQL and Gitleaks;
- policy-selected browser smoke and cross-device UI audit;
- a bounded #527 performance regression comparison so a security patch does not silently reintroduce a major critical-path cost.

#### D. Supabase advisor and production-schema triage

For the live `authenticated_security_definer_function_executable` warning class and production migration/schema drift:

1. enumerate the exact functions currently present/warned from provider evidence;
2. compare them to repository migrations/function source and existing pgTAP/browser ownership tests;
3. classify each warned function as intentionally privileged, over-granted, missing ownership validation, or unclear;
4. compare local/remote migration versions and concrete schema effects without assuming history alone is authoritative;
5. explicitly prove the state of later acquisition/recovery RPCs and related constraints before any production write;
6. change grants/execution mode/schema or migration history only when evidence shows a real defect or a required forward reconciliation with preserved financial authority;
7. add/strengthen tenant tests before any ownership-sensitive database change;
8. re-read Security Advisor and re-run production contract probes after any authorized database remediation.

The objective is to eliminate real exploitability and reconcile production runtime contracts, not to make a linter or migration list quiet by weakening the ledger API or rewriting history blindly.

#### E. Supabase leaked-password protection

- confirm current provider state immediately before write;
- confirm plan eligibility and exact Auth config surface;
- record rollback (`password_hibp_enabled` previous value) before the mutation;
- perform the provider write only after repository-side security verification and explicit owner authorization for that provider operation;
- smoke login, registration, password reset and account-deletion reauthentication after the change;
- re-read Security Advisor to verify the leaked-password warning is gone;
- never store passwords, breach-corpus values, auth tokens or provider secrets in repository evidence.

### Out of scope

- financial schema redesign unrelated to a reproduced security/parity defect;
- broad RLS or SECURITY DEFINER rewrites merely because the advisor is noisy;
- blind migration replay/history repair merely to make local and remote version lists look equal;
- provider connectivity/bank integration;
- product feature work;
- continued #527 optimization beyond regression guarding;
- React upgrades not required by the vetted Next patch;
- broad dependency modernization;
- public-beta approval before repository/deployment/database/provider acceptance is complete;
- merge, deployment or production/provider mutation without owner decision.

## Invariants

### Financial

- VND remains integer đồng.
- Transfers remain equal/opposite and neutral to income/expense.
- No dependency or database security work creates an alternate financial mutation authority.
- Browser/optimistic state cannot override server financial truth.

### Ownership and Auth

- authenticated financial writes remain tenant-scoped at the database boundary;
- no change may weaken RLS, Server Action authentication, recent-auth deletion checks, CAPTCHA, archive/export/delete ownership or account recovery;
- leaked-password protection is additive hardening, not a substitute for existing authorization controls;
- a SECURITY DEFINER warning cannot justify removing the explicit ownership checks that make the RPC safe.

### Delivery

- no direct write to `main`;
- exact version/advisory evidence comes from the real candidate tree;
- no production database/provider write before rollback + explicit owner authorization;
- no claim that production is patched until the patched tree is actually deployed and verified by owner decision;
- no claim of production acquisition/recovery parity from repository migrations alone;
- exact-head gates are not weakened to make the security change pass.

## Implementation plan

## Tasks

### Phase A — authority and exact baseline

1. [x] Persist issue #536.
2. [x] Complete #527 to `current: null` through merged PR #538.
3. [x] Re-read fresh `main`, current package versions, current provider advisor state and upstream advisories.
4. [x] Merge separate selector PR #539 from fresh `main` and select #536.
5. [x] After selector merge, run `npm run plan:resolve` then `npm run agent:doctor -- --json` before implementation.
6. [x] Reconfirm exact dependency versions and provider advisor state immediately before implementation.

Exit: satisfied. #536 is active current authority and implementation boundaries resolve without governance warnings.

### Phase B — dependency patch

1. [x] Start focused implementation branch/PR #540 from merged-main baseline.
2. [x] Upgrade to vetted patched Next 16.3.4 and align `eslint-config-next`.
3. [x] Regenerate lockfile with Node 22/repository npm semantics.
4. [x] Inspect/minimize lockfile churn.
5. [x] Run fresh exact-tree npm audit and classify findings.
6. [x] Apply only required evidence-backed dependency remediations, including Browserslist 4.28.8, qs 6.16.0 and fast-uri 3.1.6.

Exit: candidate tree is outside the August Critical Next ranges and the regenerated exact tree has no remaining audit finding. This is branch evidence until owner merge/deployment.

### Phase C — repository verification

Run policy-selected gates plus the security-specific set:

```text
npm run plan:resolve
npm run agent:doctor -- --json
npm run check:knowledge
npm run check:architecture
npm run check:deployment-env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:auth
npm run test:ui-audit:pr
npm audit --json
```

Require exact-head CodeQL and Gitleaks. Database reset/pgTAP becomes mandatory if Phase D changes database grants/functions/policies/migrations.

The patched runtime exposed a Share Target Strict Mode regression. Existing browser assertions caught it. Independent review then found an abandoned-RAF cleanup hazard in the first repair; commit `91a93c3e80474f37f52f90405a91190d36b093e4` restored cleanup symmetry without weakening the one-shot behavior.

PR head `90941c2b86f972f97d01fd197688d85a92aeb773` passed CI #3255 and duplicate Ready-for-review CI #3256, plus CodeQL #2290 and Secret history scan #2290. Any later branch commit must use the current PR head/check suite as final merge evidence.

Exit: repository behavior has full green evidence on `90941c2...`; current-head checks remain the merge authority after this evidence reconciliation.

### Phase D — Supabase advisor / production database reconciliation

1. [x] Re-read Security Advisor and live SECURITY DEFINER grants/search-path/auth.uid posture read-only.
2. [x] Complete function-by-function disposition of the current live warning set against source/ACL/tests: all 36 are intentional authenticated privileged tenant surfaces; no evidence-backed ownership defect found.
3. [x] Compare production migration history with repository migrations read-only and identify the Aug-21–25 parity gap.
4. [x] Confirm later privileged RPCs are absent live and map affected authenticated code paths.
5. [x] Reconcile the complete 15-version window at final schema-object/contract level: all 14 durable final postconditions absent; source-identity preflight currently passes.
6. [x] Prepare exact forward/rollback handoff: fresh local reset/pgTAP, fresh remote matrix, private logical schema+data backup, exact 15-file `db push --dry-run`, owner-authorized forward apply, post-write contract/tenant/browser/advisor verification; no history repair.
7. [ ] Perform database/history write only under explicit owner authorization.
8. [ ] Run fresh post-write pgTAP/tenant/browser/provider verification and re-read Security Advisor after the authorized database operation.

If tooling/evidence changes before authorization — migration list differs, contract matrix differs, preflight fails, backup cannot be created, or local reset/pgTAP fails — stop and return to owner; do not push or repair history.

### Phase E — Supabase Auth/provider hardening

1. [x] Re-read leaked-password setting and plan eligibility; current project remains disabled and organization reports `free`.
2. [ ] Record exact provider rollback immediately before any future write.
3. [ ] Perform leaked-password-protection plan/Auth change only under explicit owner authorization and eligible plan.
4. [ ] Run auth smoke flows and re-read Security Advisor.

If plan/tooling cannot safely perform the authorized write, leave the limitation as an explicit public-beta blocker; do not simulate it.

### Phase F — closure

A completion PR may close #536 only when repository security patch plus deployment, database and provider evidence are complete. In that same PR:

- update `docs/research/CURRENT_PROJECT_MEMORY.md`;
- archive this packet under `docs/plans/completed/`;
- set `PLAN_AUTHORITY.current` to `null`;
- record final PR memory with literal `- Lifecycle impact:`;
- leave follow-on work unselected.

## Evaluation

### Security patch

- [ ] exact shipped/production Next.js dependency is outside GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 affected ranges; minimum patched 16.x release is 16.3.3;
- [x] candidate lockfile contains no unexplained broad churn after exact-tree review;
- [x] candidate `npm audit --json` contains no unexplained High/Critical finding and later fresh findings were remediated;
- [x] repository runtime/auth/image/deployment/browser behavior passed the full exact-head verification set on `90941c2...`; current-head checks must still govern after any later evidence-only commit;
- [x] CodeQL and Gitleaks passed `90941c2...`; current-head checks remain the merge authority after later commits.

### Database / advisor

- [x] every current authenticated SECURITY DEFINER warning is evidence-classified;
- [x] no real ownership/grant defect was found in the current 36-function live set, so no privilege rewrite is justified;
- [x] currently present live warned functions have no anon/PUBLIC execute, retain intended authenticated execute, empty `search_path`, `postgres` ownership, `auth.uid()` references, explicit auth guards and tenant predicates, with no risky dynamic/role/metadata patterns detected;
- [x] production migration/schema state is reconciled read-only against all 15 later repository versions without blind replay/history repair;
- [ ] the confirmed-missing later schema/RPC contracts are restored live and verified after an authorized forward operation;
- [x] intentionally privileged RPCs retain explicit ownership checks and minimum caller privilege in current live evidence;
- [x] no public-beta security claim hides the remaining production-schema/provider gaps.

### Auth provider

- [ ] leaked-password protection is enabled and verified before public-beta acceptance, **or** the documented Free-plan limitation explicitly remains a release blocker;
- [ ] login/register/reset/recent-auth smoke passes after provider change;
- [ ] RLS/tenant isolation remains unchanged or is independently reverified if provider/database behavior changes.

### Delivery

- [x] no merge/deploy/database/provider write is claimed without owner evidence;
- [ ] production patched runtime is verified after owner merge/deploy;
- [x] no security check is weakened to make CI green;
- [x] current project memory records dependency/advisory/provider/database truth without secrets;
- [ ] lifecycle closure leaves zero current slice and selects no follow-on work.

## Rollback

If the patched Next release causes an unacceptable runtime regression, revert the candidate implementation branch/PR rather than treating a return to a known vulnerable version as a normal release. If an emergency production rollback becomes unavoidable, the owner must treat the vulnerable runtime as a time-bounded security incident with explicit compensating controls.

For the production database reconciliation, the prepared safety model is **backup + stop + forward-fix first**, not blind reverse history:

1. before write, require successful local fresh reset/pgTAP and a fresh remote 15-row contract/preflight read;
2. because MoneyFlow is on Supabase Free and automatic backups/PITR are unavailable, create logical schema and data dumps immediately before the operation and keep them private/off-repository;
3. require `supabase db push --dry-run` to list exactly the expected 15 migrations in timestamp order; dry-run does not validate SQL;
4. perform no write unless the owner explicitly authorizes the bounded operation;
5. after write, verify migration history, all final contract markers, tenant boundaries and affected browser flows before declaring parity;
6. if a bounded schema/privilege regression occurs without data corruption, prefer a forward corrective migration; do not use `migration repair` as rollback and do not restore known ownership defects;
7. reserve restoration from the pre-write logical backup for catastrophic integrity/availability recovery where forward correction is unsafe. Any restore is itself an owner-controlled production-data operation.

Before enabling leaked-password protection, record the exact previous provider setting. If the change causes an availability problem, the owner may restore that setting while #536 remains open and public-beta acceptance remains blocked.

## Stop conditions

Stop and return to owner/evaluator if:

- the selected Next patch requires a materially larger React/runtime migration;
- lockfile churn cannot be reduced to an auditable dependency change;
- a High/Critical advisory has no safe patch and exploitability cannot be bounded with evidence;
- a Supabase advisor warning cannot be reconciled with source/tests without changing financial authority;
- the production migration list or live contract matrix differs from the reconciled 15-version state before authorization;
- the source-identity preflight stops passing;
- a private pre-write logical backup cannot be created and checked;
- fresh local reset/pgTAP fails on the repository migration chain;
- auth behavior changes in a way that weakens tenant isolation or recent-auth guarantees;
- provider tooling does not expose a safe reversible leaked-password-protection write;
- exact-head browser/auth/financial tests fail and the only apparent path is weakening assertions;
- production deployment is required merely to prove repository correctness.

## Current evaluation state — 2026-09-03

- merged-main authority baseline: `425af4508e547de28fb372eedbcb07ced226d522` (PR #539);
- executable authority on merged main: #536 selected and active;
- production runtime: Next 16.2.11 — still inside official August 2026 Critical advisory affected ranges until #540 is owner-merged/deployed and verified;
- PR #540: Ready for review; candidate Next 16.3.4, eslint-config-next 16.3.4, React 19.2.4 unchanged, Sharp 0.35.4, Browserslist 4.28.8, qs 6.16.0 and fast-uri 3.1.6;
- candidate dependency audit: exact regenerated tree reached zero findings after evidence-backed remediation;
- Share Target: runtime patch regression reproduced by browser smoke and repaired; independent review restored RAF cleanup symmetry at `91a93c3...`;
- exact-head provenance: `90941c2...` passed CI #3255 and #3256, CodeQL #2290 and Secret history scan #2290; current-head checks govern after any later evidence commit;
- Supabase project: `ACTIVE_HEALTHY`;
- Supabase Auth: leaked-password protection disabled; organization plan reports `free`;
- live SECURITY DEFINER set: 36/36 current warnings dispositioned as intentional authenticated tenant-bound privileged API surfaces; no evidence-backed ownership defect found;
- production migration history ends at `20260812043219`; repository has 15 later versions through `20260825090000`;
- final 15-version contract matrix: 14 durable postconditions absent; source-identity preflight passes;
- prepared database direction: forward-apply all 15 in order after fresh local DB verification, private logical backup, exact dry-run list and explicit owner authorization; no migration-history repair;
- Vercel production is READY on `main@425af450...`; code calling several missing RPCs is deployed;
- no production database/provider/Auth/deployment write was performed by #540;
- #536 remains active until runtime deployment, database parity and provider acceptance are truthful.

## Handoff

After this evidence-only reconciliation, use the current PR head/check suite as final repository evidence. If green, #540 is ready for the owner's merge/deployment decision; the agent must not merge or deploy it.

The separate production database handoff is fully prepared but **not authorized**. Its next transition requires explicit owner approval for one bounded production operation: fresh local reset/pgTAP and remote preflight/read-back, private schema+data logical backup, exact 15-file dry run, forward `db push`, then immediate migration/contract/tenant/browser/advisor verification. Any deviation before the write is a stop condition.

Supabase leaked-password protection remains a separate owner/provider decision because the organization is Free. No database/history write, plan/Auth change, merge or deployment is authorized by this packet alone.
