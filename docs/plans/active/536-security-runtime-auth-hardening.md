# #536 — Security runtime and authentication hardening

**Status:** selected active Class 3 slice on merged `main`
**Execution state:** repository implementation in draft PR #540; production/provider/database acceptance remains open
**Active role:** implementer / evaluator inside repository boundary; owner-controlled production writes remain gated
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

Draft PR #537 remains historical planning evidence only. PR #540 is the focused repository implementation candidate under this active packet. It does not grant itself authority to merge, deploy, mutate production database state or change Supabase plan/Auth configuration.

## Repository reconnaissance

### Runtime and dependency baseline

Merged `main` still pins:

- `next` 16.2.11;
- `eslint-config-next` 16.2.12;
- React / React DOM 19.2.4;
- Node engine `>=22 <23`.

The shipped framework therefore remains inside the official affected range for the August 2026 Critical Next.js advisories until the patched PR is owner-merged and production deployment is verified. Existing Dependabot PR #524 targets Next 16.3.1 and is not sufficient for the August release because the patched 16.x floor is 16.3.3.

PR #540 currently carries the vetted candidate Next 16.3.4 / `eslint-config-next` 16.3.4, keeps React 19.2.4, raises the Sharp override to 0.35.4, pins Browserslist 4.28.8 and qs 6.16.0, and adds dependency-floor guards. Exact-tree audit chronology matters: an initial High Browserslist finding was remediated; a later fresh audit then surfaced newly published Moderate qs findings, which were also remediated. The regenerated candidate tree reached audit-zero after those changes. Do not treat any earlier zero-audit snapshot as permanently authoritative.

### Supabase baseline

Read-only production evidence refreshed on 2026-09-03:

- project status is `ACTIVE_HEALTHY`;
- Security Advisor still reports `auth_leaked_password_protection` disabled;
- Security Advisor still reports `authenticated_security_definer_function_executable` WARN findings;
- the 36 authenticated-callable SECURITY DEFINER functions currently present live have `postgres` ownership, empty `search_path`, intended authenticated execute, no anon/PUBLIC execute, and each body references `auth.uid()`;
- representative high-risk functions and the explicit `p_user_id` reconciliation case bind effects/reads to the authenticated caller;
- repository cross-tenant/browser-role tests provide additional ownership evidence.

Those advisor warnings are security debt that must be evaluated, but they are not by themselves proof that the functions are exploitable. Do **not** bulk-convert `SECURITY DEFINER` functions to `SECURITY INVOKER`, revoke authenticated execution, or move financial RPCs merely to silence the advisor. Any privilege/function change requires a reproduced or evidence-backed defect and corresponding migration/pgTAP/browser proof.

### Production migration/schema parity

Read-only production migration history currently ends at `20260812043219_remove_atoryn_from_moneyflow_project`. The repository contains 15 later migration versions from `20260821014500_direct_csv_batch_atomic_approval` through `20260825090000_direct_csv_rule_atomic_ingestion`.

Migration-history absence alone does not prove every later schema effect is absent because manual changes or history drift are possible. Concrete live probes do prove seven later privileged RPCs are absent:

1. `approve_inbox_candidates_batch(uuid,jsonb)`
2. `attach_inbox_candidate_to_existing_transaction(uuid,uuid)`
3. `restore_deleted_imported_transaction_from_candidate(uuid,uuid)`
4. `record_changed_source_observation_from_candidate(uuid,uuid)`
5. `record_source_replacement_observation_from_candidate(uuid,uuid)`
6. `review_source_lifecycle_observation_from_candidate(uuid,uuid)`
7. `prepare_direct_csv_candidates_with_rules(jsonb,jsonb)`

Repository SECURITY DEFINER contracts expect 43 privileged routines after later acquisition migrations; production currently exposes 36 in the corresponding authenticated-callable class. Authenticated Direct CSV code already calls `prepare_direct_csv_candidates_with_rules` and `approve_inbox_candidates_batch`, while source-lineage actions call several other absent routines. Vercel production is READY on `main@425af450...`, so code containing these calls is already deployed.

This drift predates #540. It blocks #536 closure/public-beta acceptance and any claim that production acquisition/recovery matches repository truth, but it must not be used to keep the known-vulnerable Next runtime unpatched merely to bundle an unrelated database write into #540.

## Research

1. **Next.js August 2026 Security Release** — official Next.js blog index, published 2026-08-25, directs the Active LTS line to Next.js 16.3.3 and Maintenance LTS to 15.5.24 for two Critical vulnerabilities. Source: https://nextjs.org/blog
2. **GHSA-p293-qw3h-jr36 / CVE-2026-75604** — official `vercel/next.js` advisory; affected Next.js `>=16.0 <16.3.3`, patched in 16.3.3; unauthenticated RCE on affected Windows-hosted applications. Source: https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
3. **GHSA-2xp9-vwfh-vxw4** — official `vercel/next.js` advisory; affected Next.js `<16.3.3`, patched in 16.3.3; Critical RCE in Image Optimization when AVIF is optimized through the affected underlying library. Source: https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
4. **Supabase Password security / Management API** — official Supabase docs state leaked-password protection uses the HaveIBeenPwned Pwned Passwords API, is available on Pro and above, and exposes the Auth config field `password_hibp_enabled`. Sources: https://supabase.com/docs/guides/auth/password-security and https://supabase.com/docs/reference/api/v1-update-auth-service-config
5. **Supabase production migrations** — official deployment/CLI guidance uses migration-state reconciliation and `supabase db push` to apply local migrations to a linked remote database; `migration repair` changes migration-history bookkeeping and is not a substitute for inspecting actual schema state. Sources: https://supabase.com/docs/guides/deployment/managing-environments and https://supabase.com/docs/reference/cli/supabase-db-push

Applicability limits:

- MoneyFlow's current Vercel runtime is not known to meet the Windows-host exploit preconditions for GHSA-p293-qw3h-jr36, but the shipped framework version is still inside the upstream affected range, so the dependency remains release-blocking.
- MoneyFlow uses Next Image; do not assume the AVIF exploit path is reachable without evidence, but the framework patch is still required.
- Supabase leaked-password protection is plan-gated. The current organization reports plan `free`; if the owner does not authorize an eligible plan/provider change, public-beta acceptance remains blocked and the packet must record that limitation rather than simulate success.
- The Supabase advisor's `SECURITY DEFINER` warnings are broad static findings. Existing ownership checks and tenant tests outrank warning wording when deciding whether a function is intentionally privileged or defective.
- Production migration-history drift cannot be repaired safely from history rows alone. Reconcile concrete schema/runtime contracts before any `db push`, migration replay or history repair.

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
- broad RLS or `SECURITY DEFINER` rewrites merely because the advisor is noisy;
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
- a `SECURITY DEFINER` warning cannot justify removing the explicit ownership checks that make the RPC safe.

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
6. [x] Apply only required evidence-backed dependency remediations, including Browserslist 4.28.8 and qs 6.16.0.

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

The patched runtime exposed a Share Target Strict Mode regression. Existing browser assertions caught it. Independent review then found an abandoned-RAF cleanup hazard in the first repair; commit `91a93c3e80474f37f52f90405a91190d36b093e4` restored cleanup symmetry without weakening the one-shot behavior. Final exact-head gates must run again after all packet/memory reconciliation commits.

Exit: all applicable runtime/auth/browser/security gates pass on one exact head without weakened assertions.

### Phase D — Supabase advisor / production database reconciliation

1. [x] Re-read Security Advisor and live SECURITY DEFINER grants/search-path/auth.uid posture read-only.
2. [ ] Complete function-by-function disposition of unclear advisor surfaces against source/tests; fix only real defects.
3. [x] Compare production migration history with repository migrations read-only and identify the Aug-21–25 parity gap.
4. [x] Confirm at least seven later privileged RPCs are absent live and map affected authenticated code paths.
5. [ ] Reconcile the remaining 15-version window at schema-object/contract level; do not infer unapplied state from history alone.
6. [ ] Prepare exact forward/rollback plan for any required database or migration-history correction.
7. [ ] Perform database/history write only under explicit owner authorization.
8. [ ] Run fresh pgTAP/tenant/browser/provider verification and re-read Security Advisor after any authorized write.

If tooling/evidence cannot safely reconcile the production state, stop at a precise owner handoff; do not simulate parity with history edits.

### Phase E — Supabase Auth/provider hardening

1. [x] Re-read leaked-password setting and plan eligibility; current project remains disabled and organization reports `free`.
2. [ ] Record exact rollback immediately before any future write.
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
- [ ] Server Action/auth/image/deployment behavior passes final exact-head verification after all memory/packet commits;
- [ ] CodeQL and Gitleaks pass final exact head.

### Database / advisor

- [ ] every current authenticated `SECURITY DEFINER` warning class is evidence-classified;
- [ ] any real ownership/grant defect is fixed with database/tenant regression proof;
- [x] currently present live warned functions have no anon/PUBLIC execute, retain intended authenticated execute, empty `search_path`, `postgres` ownership and `auth.uid()` references;
- [ ] production migration/schema state is reconciled against all 15 later repository versions without blind replay/history repair;
- [ ] the seven confirmed-missing privileged RPC contracts and any other later schema effects are restored or explicitly dispositioned with live verification;
- [ ] intentionally privileged RPCs retain explicit ownership checks and only the minimum caller privilege needed;
- [ ] no public-beta security claim hides unexplained provider or production-schema gaps.

### Auth provider

- [ ] leaked-password protection is enabled and verified before public-beta acceptance, **or** a documented plan/tooling limitation explicitly blocks release;
- [ ] login/register/reset/recent-auth smoke passes after provider change;
- [ ] RLS/tenant isolation remains unchanged or is independently reverified if provider/database behavior changes.

### Delivery

- [ ] no merge/deploy/database/provider write is claimed without owner evidence;
- [ ] production patched runtime is verified after owner merge/deploy;
- [ ] no security check is weakened to make CI green;
- [x] current project memory records dependency/advisory/provider/database truth without secrets;
- [ ] lifecycle closure leaves zero current slice and selects no follow-on work.

## Rollback

If the patched Next release causes an unacceptable runtime regression, revert the candidate implementation branch/PR rather than treating a return to a known vulnerable version as a normal release. If an emergency production rollback becomes unavoidable, the owner must treat the vulnerable runtime as a time-bounded security incident with explicit compensating controls.

For any database/grant/migration remediation, preserve a forward/reverse migration plan and validate tenant ownership plus the affected acquisition/recovery contracts before and after. Do not use `migration repair` merely to make version history look aligned, and do not rollback to a proven ownership/runtime-contract defect merely to restore old tests.

Before enabling leaked-password protection, record the exact previous provider setting. If the change causes an availability problem, the owner may restore that setting while #536 remains open and public-beta acceptance remains blocked.

## Stop conditions

Stop and return to owner/evaluator if:

- the selected Next patch requires a materially larger React/runtime migration;
- lockfile churn cannot be reduced to an auditable dependency change;
- a High/Critical advisory has no safe patch and exploitability cannot be bounded with evidence;
- a Supabase advisor warning cannot be reconciled with source/tests without changing financial authority;
- production migration history/schema cannot be reconciled safely enough to define an auditable forward/rollback change;
- auth behavior changes in a way that weakens tenant isolation or recent-auth guarantees;
- provider tooling does not expose a safe reversible leaked-password-protection write;
- exact-head browser/auth/financial tests fail and the only apparent path is weakening assertions;
- production deployment is required merely to prove repository correctness.

## Current evaluation state — 2026-09-03

- merged-main authority baseline: `425af4508e547de28fb372eedbcb07ced226d522` (PR #539);
- executable authority on merged main: #536 selected and active;
- production runtime: Next 16.2.11 — still inside current official August 2026 Critical advisory affected ranges until #540 is owner-merged/deployed and verified;
- PR #540 candidate: Next 16.3.4, eslint-config-next 16.3.4, React 19.2.4 unchanged, Sharp 0.35.4, Browserslist 4.28.8, qs 6.16.0;
- candidate dependency audit: exact regenerated tree reached zero findings after chronological Browserslist/qs remediation;
- Share Target: runtime patch regression reproduced by browser smoke and repaired; independent review restored RAF cleanup symmetry at `91a93c3...`;
- Supabase project: `ACTIVE_HEALTHY`;
- Supabase Auth: leaked-password protection disabled; organization plan reports `free`;
- live SECURITY DEFINER set: 36 authenticated-callable functions with no anon/PUBLIC execute, authenticated execute, `postgres` ownership, empty `search_path` and `auth.uid()` references;
- repository SECURITY DEFINER contract after later acquisition migrations: 43;
- production migration history ends at `20260812043219`; repository has 15 later versions through `20260825090000`;
- seven later privileged RPCs required by authenticated acquisition/recovery flows are confirmed absent live;
- Vercel production is READY on `main@425af450...`; code calling several missing RPCs is deployed, while low-volume logs show no matching error cluster;
- no production database/provider/Auth/deployment write was performed by #540;
- #536 remains active until runtime deployment, database parity, advisor disposition and provider acceptance are truthful.

## Handoff

Current legal action is to finish PR #540 final exact-head repository verification, then hand the patched runtime to the owner for merge/deployment decision without bundling a production database mutation into that PR. In parallel, continue **read-only** production migration/schema reconciliation and prepare a separate auditable database forward/rollback plan. Any database/history write, Supabase plan/Auth change, merge or deployment still requires the explicit owner boundary defined above.
