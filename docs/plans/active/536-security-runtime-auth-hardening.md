# #536 — Security runtime and authentication hardening

**Status:** candidate
**Execution state:** evaluating
**Active role:** planner / evaluator until authority selection merges
**Permission scope:** documentation/research only until selected as `PLAN_AUTHORITY.current`; implementation/provider writes require the selected Class 3 packet and owner decision
**Owner:** human owner
**Issue:** #536
**Branch:** `plan/536-security-release-interruption`
**Last updated:** 2026-09-02

## Outcome

Remove the public-beta security blockers discovered by the 2026-09-02 whole-project audit without weakening MoneyFlow's financial, tenant-isolation, recovery or browser contracts.

This is an operational security interruption, not a product-feature expansion.

Required outcome:

1. ship a Next.js release patched for the 2026-08-25 Critical advisories;
2. identify and resolve or explicitly disposition every High/Critical dependency advisory in the exact shipped tree;
3. preserve Server Action authorization, RLS ownership, financial invariants and browser behavior;
4. enable Supabase leaked-password protection before public-beta acceptance when the owner authorizes the provider write;
5. verify repository, provider and deployment evidence independently rather than treating an install/build success as security proof.

## Why this interrupts normal sequencing

`docs/plans/PLAN_AUTHORITY.json` currently selects #527 production-load performance. #527 explicitly excludes Auth/provider configuration and security-provider changes from its scope.

The 2026-09-02 audit found a newer upstream security condition:

- repository `package.json` pins `next` 16.2.11;
- Next.js published its August 2026 Security Release on 2026-08-25 and directs Active LTS users to 16.3.3;
- GHSA-p293-qw3h-jr36 affects Next.js `>=16.0 <16.3.3` and is patched in 16.3.3;
- GHSA-2xp9-vwfh-vxw4 affects Next.js `<16.3.3` and is patched in 16.3.3;
- current Dependabot PR #524 proposes only Next 16.3.1 and therefore cannot be accepted as the complete security patch;
- current CI installation output reports `1 high severity vulnerability`, but the exact advisory/path is not printed by the existing workflow and must not be guessed;
- Supabase Security Advisor reports leaked-password protection disabled.

A Critical upstream runtime advisory is release-blocking even when one exploit condition is environment-specific. MoneyFlow is a financial-data application, so public-beta acceptance must depend on the patched runtime rather than on an assumption that today's deployment topology prevents exploitation.

## Research evidence

### Official Next.js sources

Researched 2026-09-02:

1. Next.js August 2026 Security Release — published 2026-08-25. Upstream directs users to Next.js 16.3.3 (Active LTS) or 15.5.24 (Maintenance LTS) to address two Critical vulnerabilities.
2. GHSA-p293-qw3h-jr36 — unauthenticated remote code execution on affected Windows-hosted servers; affected Next.js `>=16.0 <16.3.3`; patched in 16.3.3; no known workaround for affected Windows-hosted applications.
3. GHSA-2xp9-vwfh-vxw4 — unauthenticated remote code execution in Image Optimization when AVIF files are optimized; affected Next.js `<16.3.3`; patched in 16.3.3.

Do not downgrade either finding merely because Vercel's present Linux hosting may remove one exploit condition. The dependency is still inside the upstream affected range and the application uses Next.js Image.

### Repository evidence

Current main evidence inspected 2026-09-02:

- `package.json`: `next` 16.2.11; `eslint-config-next` 16.2.12; Node engine `>=22 <23`.
- Dependabot PR #524: Next 16.2.11 -> 16.3.1 plus grouped React updates; this target predates the 16.3.3 security release.
- CI #3194 / #3195 installation output on the current dependency tree: `1 high severity vulnerability`.
- existing CI runs policy/static/unit/build/browser/auth/UI/CodeQL/Gitleaks based on risk classification.
- main ruleset requires `database`, `verify`, `e2e`, Gitleaks and CodeQL before merge, with no bypass actors.

### Supabase evidence

Production audit 2026-09-02 established:

- 21/21 public application tables have RLS enabled;
- anonymous role has no CRUD on the audited application tables;
- sampled public views use `security_invoker=true`;
- all 36 authenticated-callable privileged RPCs found by systematic scan contain `auth.uid()` and use an empty function `search_path`;
- no cross-tenant P0 was found;
- Supabase Security Advisor reports leaked-password protection disabled.

The provider setting is therefore a hardening gap, not evidence that current RLS is broken.

## Scope

### In scope after this packet becomes active authority

#### Runtime dependency patch

- upgrade `next` to 16.3.3 or a later vetted patched 16.3.x release available at implementation time;
- align `eslint-config-next` to the selected compatible release;
- update the lockfile with the smallest dependency delta compatible with the security patch;
- separate required transitive movement from unrelated dependency upgrades;
- do not accept Dependabot #524's 16.3.1 target as sufficient.

#### Dependency advisory triage

- run `npm audit --json` on the exact post-upgrade lockfile;
- record package, dependency path, advisory/GHSA/CVE, affected range, patched range and runtime/dev exposure for every High/Critical item;
- patch High/Critical findings when an upstream fix is available and compatible;
- if an advisory cannot be removed, document exploitability, compensating control, owner acceptance and release impact rather than using `npm audit fix --force` blindly.

#### Runtime/security regression verification

Verify at minimum:

- production build;
- Server Actions and authenticated routes;
- login/register/forgot-password/account deletion recent-auth flow;
- authenticated financial truth and tenant-boundary browser harness;
- Next Image behavior on public landing content;
- proxy/middleware/deployment configuration contracts;
- CSP and security headers if dependency behavior changes them;
- CodeQL and Gitleaks exact head;
- browser smoke and cross-device UI audit selected by policy.

#### Supabase leaked-password protection

- confirm the current Supabase Auth setting through current provider evidence;
- identify the exact provider toggle/API and rollback before write;
- owner-authorized provider change only after repository-side security patch verification is green;
- smoke login, registration, password reset and account-deletion reauthentication after the change;
- do not store passwords, breach corpus data, auth tokens or provider secrets in repository evidence.

### Out of scope

- financial schema redesign;
- RLS rewrites without a reproduced defect;
- broad SECURITY DEFINER refactors when no tenant-boundary exploit is reproduced;
- provider connectivity/bank integration;
- product feature work;
- performance #527 implementation beyond preserving its already-measured behavior;
- React upgrades not required for the selected Next security patch;
- broad dependency modernization;
- deployment/merge without owner decision.

## Invariants

### Financial

- VND remains integer đồng.
- Transfers remain equal/opposite and neutral to income/expense.
- Security dependency work does not create an alternate financial mutation authority.
- Optimistic/browser state cannot override server financial truth.

### Ownership and Auth

- every authenticated financial write remains scoped to `auth.uid()` / tenant ownership at the database boundary;
- no change may weaken RLS, Server Action authentication, recent-auth deletion checks, CAPTCHA or export/delete ownership;
- leaked-password protection is additive hardening, not a replacement for CAPTCHA, session controls or recent authentication.

### Delivery

- no direct write to `main`;
- exact version and advisory evidence must come from the real post-change tree;
- no `npm audit fix --force` without reviewing its complete dependency delta;
- no provider write until the owner has an explicit rollback and smoke plan;
- no claim that production is patched until the patched code is actually deployed by owner decision.

## Implementation plan

### Phase A — authority and exact baseline

1. Persist this packet and issue #536 evidence.
2. Select this packet as `PLAN_AUTHORITY.current` only through a dedicated owner-reviewed selector PR.
3. After selection merges, run `npm run plan:resolve` and `npm run agent:doctor -- --json` before implementation.
4. Record exact main dependency versions and fresh upstream security advisory ranges.
5. Record current Supabase leaked-password advisor state read-only.

Exit: #536 is active current authority and all implementation boundaries resolve without governance warnings.

### Phase B — dependency patch

1. Start a fresh focused implementation branch from the then-current `main`.
2. Upgrade Next to the vetted patched 16.3.x release; align `eslint-config-next`.
3. Regenerate lockfile using Node 22 / repository package manager semantics.
4. Inspect the lockfile diff; remove unrelated churn.
5. Run `npm audit --json`; classify every High/Critical result.
6. Apply only required safe follow-up dependency changes.

Exit: exact dependency tree is patched for the August Critical Next.js advisories and contains no unexplained High/Critical audit finding.

### Phase C — repository verification

Run the policy-selected gates plus the security-specific set:

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

Also require exact-head CodeQL and Gitleaks. Database gates run if classifier selects them; no DB schema change is expected.

Compare relevant #527 Lighthouse evidence before/after so a security runtime upgrade does not silently reintroduce a major critical-path regression. This is a regression guard, not permission to optimize performance inside #536.

Exit: all required security/runtime/auth/browser gates pass on one exact head, or failures have been resolved without weakening the tests.

### Phase D — provider hardening

1. Re-read Supabase Security Advisor and Auth configuration.
2. Record exact current state and rollback.
3. Perform leaked-password-protection change only through an available authorized provider surface and owner decision.
4. Re-run auth smoke flows.
5. Re-read Security Advisor and retain non-sensitive evidence that the actionable warning is resolved.

If the connected tooling cannot mutate this setting, stop at a precise owner/provider handoff; do not simulate the write or claim it happened.

### Phase E — closure

A completion PR may close #536 only when repository security patch and required provider evidence are complete. In the same closure PR:

- update `docs/research/CURRENT_PROJECT_MEMORY.md`;
- archive this packet according to repository lifecycle rules;
- set `PLAN_AUTHORITY.current` to null;
- record final PR memory with `- Lifecycle impact:`;
- leave #527 unselected for a later explicit resume selector rather than silently restoring it in the same closure PR.

## Acceptance criteria

### Security patch

- [ ] exact shipped Next.js dependency is outside the affected range of GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 (minimum patched release 16.3.3 for the 16.x line);
- [ ] exact lockfile reviewed for unintended broad churn;
- [ ] `npm audit --json` contains no unexplained High/Critical advisory;
- [ ] Server Action/auth/image/deployment behavior passes exact-head tests;
- [ ] CodeQL and Gitleaks pass exact head.

### Auth provider

- [ ] Supabase leaked-password protection is enabled and verified before public-beta acceptance, or a documented tooling/provider limitation explicitly blocks release;
- [ ] login/register/reset/recent-auth smoke passes after provider change;
- [ ] RLS/tenant isolation remains unchanged or independently verified if provider behavior requires code changes.

### Delivery

- [ ] no merge/deploy/provider write is claimed without owner evidence;
- [ ] no security check is weakened to make CI green;
- [ ] current project memory records the dependency/advisory/provider truth without secrets;
- [ ] lifecycle closure leaves zero current slice; #527 resume requires a separate selector.

## Rollback

### Dependency rollback

If the patched Next.js release causes an unacceptable runtime regression:

- do **not** deploy the vulnerable prior version as a normal rollback if production can instead stay on the currently deployed artifact while a compatible patched release is selected;
- revert only the candidate implementation branch/PR changes while the owner keeps the last known production deployment;
- if an emergency production rollback is unavoidable, owner must treat the known vulnerable runtime as a release incident with explicit time-bounded acceptance and compensating controls.

### Provider rollback

Before enabling leaked-password protection, record the exact previous Supabase setting and the smoke checks. If the setting causes a provider-level availability problem, owner may restore that setting while #536 remains open and public-beta acceptance remains blocked.

## Stop conditions

Stop and return to owner/evaluator if:

- the selected Next patch requires a React/runtime migration materially larger than a bounded security update;
- lockfile churn cannot be reduced to an auditable dependency change;
- a High/Critical advisory has no safe patch and exploitability cannot be bounded with evidence;
- auth behavior changes in a way that weakens tenant isolation or recent-auth guarantees;
- provider tooling does not expose a safe reversible leaked-password-protection write;
- exact-head browser/auth/financial tests fail and the only apparent path is weakening their assertions;
- production deployment is required merely to prove repository correctness.

## Evidence record

### 2026-09-02 audit

- main runtime: Next 16.2.11.
- official patched 16.x minimum for the August 2026 Critical advisories: 16.3.3.
- Dependabot #524 target: 16.3.1, insufficient.
- CI install: one High severity audit finding, exact advisory not yet identified.
- Supabase: leaked-password protection disabled; core RLS/RPC scan did not reveal a cross-tenant P0.
- current executable authority: #527 performance; #536 is not executable until a selector PR merges.

## Handoff

Until selection merges, the only allowed work from this packet is research, documentation, review and authority preparation. Do not modify runtime dependencies or Supabase configuration merely because this packet exists.
