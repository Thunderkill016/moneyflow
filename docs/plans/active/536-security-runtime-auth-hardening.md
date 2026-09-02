# #536 — Security runtime and authentication hardening

**Status:** selection candidate from fresh `main`
**Execution state:** planned; implementation remains blocked until the selector PR is owner-merged
**Active role:** planner / evaluator until authority selection merges
**Permission scope:** repository planning/research only; runtime dependency changes and provider writes require merged `PLAN_AUTHORITY.current` plus owner decisions required by this packet
**Owner:** human owner
**Issue:** #536
**Branch:** `plan/536-activate-security-hardening`
**Fresh-main baseline:** `aa82d47f70d48e1383140d5daa06be443cb08e5b` (PR #538)
**Last updated:** 2026-09-02

## Outcome

Remove the release-blocking runtime and authentication security gaps discovered by the 2026-09-02 audit without weakening MoneyFlow's financial, tenant-isolation, recovery, accessibility or browser contracts.

Required outcome:

1. ship a Next.js release patched for the 2026-08-25 Critical advisories;
2. identify and resolve or explicitly disposition every High/Critical dependency advisory in the exact shipped tree;
3. preserve Server Action authorization, RLS ownership, integer-VND financial invariants and browser behavior;
4. classify current Supabase Security Advisor warnings against real RPC ownership tests rather than blindly refactoring privileged financial functions;
5. enable Supabase leaked-password protection before public-beta acceptance when the owner authorizes the provider write and the provider plan supports it;
6. verify repository, provider and deployment evidence independently rather than treating install/build success as security proof.

## Fresh-main reconciliation

PR #538 merged #527 and left `docs/plans/PLAN_AUTHORITY.json.current` as `null`. That lifecycle condition is now satisfied. #536 may therefore be selected by a separate authority PR from fresh `main`; it must not be activated by mutating the old #537 draft branch or by combining implementation with the selector.

Draft PR #537 remains useful historical planning evidence only. It was based on pre-#538 `main`, and its first attempt to swap #527 directly to #536 was correctly rejected by CI. This fresh selector carries the packet forward without carrying that invalid authority transition.

## Repository reconnaissance

### Runtime and dependency baseline

Fresh `main` still pins:

- `next` 16.2.11;
- `eslint-config-next` 16.2.12;
- React / React DOM 19.2.4;
- Node engine `>=22 <23`.

The package tree therefore remains inside the official affected range for the August 2026 Critical Next.js advisories. Existing Dependabot PR #524 targets Next 16.3.1 and is not sufficient for the August release because the patched 16.x floor is 16.3.3.

Prior CI installation output reported one High severity npm finding without exposing the exact advisory/path. Do not guess it. The implementation phase must regenerate the exact candidate tree and run `npm audit --json` before deciding what additional dependency movement is required.

### Supabase baseline

Read-only production evidence on 2026-09-02 remains:

- project status is healthy;
- the earlier systematic database/RPC audit found 21/21 audited public application tables with RLS enabled, no audited anonymous CRUD, and no reproduced cross-tenant P0;
- the earlier privileged-RPC scan found authenticated-callable financial/security-definer functions guarded by `auth.uid()` and empty `search_path`.

A fresh Supabase Security Advisor read on 2026-09-02 currently reports:

- `auth_leaked_password_protection`: leaked-password protection disabled;
- multiple `authenticated_security_definer_function_executable` WARN findings for authenticated-callable public RPCs, including core ledger/planning/reconciliation/import/archive functions.

Those new advisor warnings are security debt that must be evaluated, but they are not by themselves proof that the functions are exploitable. Many are intentionally authenticated RPC authorities. #536 must compare each warning class against function source, grants, `auth.uid()` checks, `search_path`, tenant tests and caller expectations before changing execution mode or grants.

Do **not** bulk-convert `SECURITY DEFINER` functions to `SECURITY INVOKER`, revoke authenticated execution, or move financial RPCs merely to silence the advisor. Any database change requires a reproduced or evidence-backed ownership defect and the corresponding migration/pgTAP/browser proof.

## Research

1. **Next.js August 2026 Security Release** — official Next.js blog index, published 2026-08-25, directs the Active LTS line to Next.js 16.3.3 and Maintenance LTS to 15.5.24 for two Critical vulnerabilities. Source: https://nextjs.org/blog
2. **GHSA-p293-qw3h-jr36 / CVE-2026-75604** — official `vercel/next.js` advisory; affected Next.js `>=16.0 <16.3.3`, patched in 16.3.3; unauthenticated RCE on affected Windows-hosted applications. Source: https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
3. **GHSA-2xp9-vwfh-vxw4** — official `vercel/next.js` advisory; affected Next.js `<16.3.3`, patched in 16.3.3; Critical RCE in Image Optimization when AVIF is optimized through the affected underlying library. Source: https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
4. **Supabase Password security / Management API** — official Supabase docs state leaked-password protection uses the HaveIBeenPwned Pwned Passwords API, is available on Pro and above, and exposes the Auth config field `password_hibp_enabled`. Sources: https://supabase.com/docs/guides/auth/password-security and https://supabase.com/docs/reference/api/v1-update-auth-service-config

Applicability limits:

- MoneyFlow's current Vercel runtime is not known to meet the Windows-host exploit preconditions for GHSA-p293-qw3h-jr36, but the shipped framework version is still inside the upstream affected range, so the dependency remains release-blocking.
- MoneyFlow uses Next Image; do not assume the AVIF exploit path is reachable without evidence, but the framework patch is still required.
- Supabase leaked-password protection is plan-gated. If the project is not on Pro+ or the available connected surface cannot safely perform the reversible write, public-beta acceptance remains blocked and the packet must record that provider limitation rather than simulate success.
- The Supabase advisor's `SECURITY DEFINER` warnings are broad static findings. Existing ownership checks and tenant tests outrank the warning wording when deciding whether a function is intentionally privileged or defective.

## Specification

### In scope after this packet becomes active authority

#### A. Runtime dependency patch

- select Next.js 16.3.3 or a later **vetted patched 16.3.x** release available at implementation time;
- align `eslint-config-next` to the selected compatible patch;
- preserve React 19.2.4 unless the selected Next patch demonstrably requires a React movement;
- regenerate the lockfile using repository Node/package-manager semantics;
- review the lockfile delta and remove unrelated modernization;
- do not accept Next 16.3.1 as the August Critical fix.

#### B. Exact dependency advisory triage

Run `npm audit --json` on the exact post-upgrade tree and record for every High/Critical result:

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

#### D. Supabase advisor triage

For the live `authenticated_security_definer_function_executable` warning class:

1. enumerate the exact warned functions from current provider evidence;
2. compare them to repository migrations/function source and existing pgTAP/browser ownership tests;
3. classify each as intentionally privileged, over-granted, missing ownership validation, or unclear;
4. change grants/execution mode/schema only when evidence shows a real defect or a safer equivalent with preserved financial authority;
5. add/strengthen tenant tests before any ownership-sensitive database change;
6. re-read Security Advisor after any database remediation.

The objective is to eliminate real exploitability and unexplained warnings, not to make a linter quiet by weakening the ledger API.

#### E. Supabase leaked-password protection

- confirm current provider state immediately before write;
- confirm plan eligibility and exact Auth config surface;
- record rollback (`password_hibp_enabled` previous value) before the mutation;
- perform the provider write only after repository-side security verification and explicit owner authorization for that provider operation;
- smoke login, registration, password reset and account-deletion reauthentication after the change;
- re-read Security Advisor to verify the leaked-password warning is gone;
- never store passwords, breach-corpus values, auth tokens or provider secrets in repository evidence.

### Out of scope

- financial schema redesign unrelated to a reproduced security defect;
- broad RLS or `SECURITY DEFINER` rewrites merely because the advisor is noisy;
- provider connectivity/bank integration;
- product feature work;
- continued #527 optimization beyond regression guarding;
- React upgrades not required by the vetted Next patch;
- broad dependency modernization;
- public-beta approval before repository/provider acceptance is complete;
- merge, deployment or provider mutation without owner decision.

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
- no provider write before rollback + owner authorization;
- no claim that production is patched until the patched tree is actually deployed by owner decision;
- exact-head gates are not weakened to make the security change pass.

## Implementation plan

## Tasks

### Phase A — authority and exact baseline

1. [x] Persist issue #536.
2. [x] Complete #527 to `current: null` through merged PR #538.
3. [x] Re-read fresh `main`, current package versions, current provider advisor state and upstream advisories.
4. [ ] Merge a separate selector PR from fresh `main` that adds this packet and selects #536.
5. [ ] After selector merge, run `npm run plan:resolve` then `npm run agent:doctor -- --json` before implementation.
6. [ ] Reconfirm exact dependency versions and provider advisor state immediately before implementation.

Exit: #536 is active current authority and implementation boundaries resolve without governance warnings.

### Phase B — dependency patch

1. Start a focused implementation branch from then-current `main`.
2. Upgrade to the vetted patched Next 16.3.x release and align `eslint-config-next`.
3. Regenerate lockfile with Node 22/repository package-manager semantics.
4. Inspect and minimize lockfile churn.
5. Run `npm audit --json`; classify every High/Critical finding.
6. Apply only required, evidence-backed follow-up dependency changes.

Exit: the exact candidate tree is outside the August Critical affected ranges and has no unexplained High/Critical audit finding.

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

Require exact-head CodeQL and Gitleaks. Database reset/pgTAP becomes mandatory if Phase D changes database grants/functions/policies.

Exit: all applicable runtime/auth/browser/security gates pass on one exact head without weakened assertions.

### Phase D — Supabase advisor remediation / provider hardening

1. Re-read Security Advisor.
2. Triage current authenticated `SECURITY DEFINER` warnings against repository source/tests; fix only real defects.
3. Re-read Auth leaked-password setting and plan eligibility.
4. Record exact rollback.
5. Perform leaked-password-protection write only under explicit owner authorization.
6. Run auth smoke flows and re-read Security Advisor.

If tooling cannot safely perform an authorized write, stop at a precise provider handoff; do not simulate it.

### Phase E — closure

A completion PR may close #536 only when repository security patch and required provider evidence are complete. In that same PR:

- update `docs/research/CURRENT_PROJECT_MEMORY.md`;
- archive this packet under `docs/plans/completed/`;
- set `PLAN_AUTHORITY.current` to `null`;
- record final PR memory with literal `- Lifecycle impact:`;
- leave follow-on work unselected.

## Evaluation

### Security patch

- [ ] exact shipped Next.js dependency is outside GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 affected ranges; minimum patched 16.x release is 16.3.3;
- [ ] lockfile contains no unexplained broad churn;
- [ ] `npm audit --json` contains no unexplained High/Critical finding;
- [ ] Server Action/auth/image/deployment behavior passes exact-head verification;
- [ ] CodeQL and Gitleaks pass exact head.

### Database / advisor

- [ ] every current authenticated `SECURITY DEFINER` warning class is evidence-classified;
- [ ] any real ownership/grant defect is fixed with database/tenant regression proof;
- [ ] intentionally privileged RPCs retain explicit ownership checks and only the minimum caller privilege needed;
- [ ] no public-beta security claim hides unexplained provider security warnings.

### Auth provider

- [ ] leaked-password protection is enabled and verified before public-beta acceptance, **or** a documented plan/tooling limitation explicitly blocks release;
- [ ] login/register/reset/recent-auth smoke passes after provider change;
- [ ] RLS/tenant isolation remains unchanged or is independently reverified if provider/database behavior changes.

### Delivery

- [ ] no merge/deploy/provider write is claimed without owner evidence;
- [ ] no security check is weakened to make CI green;
- [ ] current project memory records dependency/advisory/provider truth without secrets;
- [ ] lifecycle closure leaves zero current slice and selects no follow-on work.

## Rollback

If the patched Next release causes an unacceptable runtime regression, revert the candidate implementation branch/PR rather than treating a return to a known vulnerable version as a normal release. If an emergency production rollback becomes unavoidable, the owner must treat the vulnerable runtime as a time-bounded security incident with explicit compensating controls.

For any database/grant remediation, preserve a forward/reverse migration plan and validate tenant ownership before and after. Do not rollback to a proven ownership defect merely to restore old tests.

Before enabling leaked-password protection, record the exact previous provider setting. If the change causes an availability problem, the owner may restore that setting while #536 remains open and public-beta acceptance remains blocked.

## Stop conditions

Stop and return to owner/evaluator if:

- the selected Next patch requires a materially larger React/runtime migration;
- lockfile churn cannot be reduced to an auditable dependency change;
- a High/Critical advisory has no safe patch and exploitability cannot be bounded with evidence;
- a Supabase advisor warning cannot be reconciled with source/tests without changing financial authority;
- auth behavior changes in a way that weakens tenant isolation or recent-auth guarantees;
- provider tooling does not expose a safe reversible leaked-password-protection write;
- exact-head browser/auth/financial tests fail and the only apparent path is weakening assertions;
- production deployment is required merely to prove repository correctness.

## Current evaluation state — 2026-09-02

- fresh main: `aa82d47f70d48e1383140d5daa06be443cb08e5b`;
- executable authority on merged main: `current: null`;
- runtime: Next 16.2.11 — inside current official August 2026 Critical advisory affected ranges;
- patched 16.x minimum: 16.3.3;
- known Dependabot #524 target: 16.3.1 — insufficient for this release blocker;
- prior CI install: one High severity npm finding — exact advisory still requires candidate-tree `npm audit --json`;
- Supabase: leaked-password protection disabled;
- Supabase Security Advisor: multiple authenticated `SECURITY DEFINER` WARN findings now visible and requiring evidence-based triage;
- prior database/RPC audit: no reproduced cross-tenant P0 and privileged RPCs were observed with `auth.uid()` + empty `search_path` protections;
- #536 remains non-executable until this selector PR is owner-merged.

## Handoff

Until the fresh-main selector merges, only research, documentation, review and authority preparation are allowed from this packet. Do not modify runtime dependencies, database authority or Supabase Auth configuration merely because this packet exists.
