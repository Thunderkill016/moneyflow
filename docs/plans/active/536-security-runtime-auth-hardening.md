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

Required outcome:

1. ship a Next.js release patched for the 2026-08-25 Critical advisories;
2. identify and resolve or explicitly disposition every High/Critical dependency advisory in the exact shipped tree;
3. preserve Server Action authorization, RLS ownership, financial invariants and browser behavior;
4. enable Supabase leaked-password protection before public-beta acceptance when the owner authorizes the provider write;
5. verify repository, provider and deployment evidence independently rather than treating install/build success as security proof.

## Repository reconnaissance

### Current authority and sequencing

`docs/plans/PLAN_AUTHORITY.json` currently selects #527 production-load performance. #527 explicitly excludes Auth/provider configuration and security-provider changes from its scope.

An initial #537 candidate attempted to select #536 directly from #527. CI #3198 correctly rejected that transition: a PR may not swap one current executable packet directly for another. #527 must close to `current: null`; only a later selector from fresh `main` may activate #536. The selector change was reverted. This packet is therefore research/planning only until that lifecycle sequence completes.

### Runtime and dependency baseline

Current main evidence inspected 2026-09-02:

- `package.json` pins `next` 16.2.11 and `eslint-config-next` 16.2.12; Node engine is `>=22 <23`.
- Dependabot PR #524 proposes Next 16.2.11 -> 16.3.1 plus grouped React updates.
- CI installation output on the current dependency tree reports `1 high severity vulnerability`; the workflow does not print the exact advisory/path.
- CI already covers policy/static/unit/build/browser/auth/UI plus exact-head CodeQL and Gitleaks according to risk classification.
- the protected `main` ruleset requires `database`, `verify`, `e2e`, Gitleaks and CodeQL and has no bypass actor.

### Supabase baseline

Production audit 2026-09-02 established:

- 21/21 public application tables have RLS enabled;
- anonymous role has no CRUD on the audited application tables;
- sampled public views use `security_invoker=true`;
- all 36 authenticated-callable privileged RPCs found by systematic scan contain `auth.uid()` and use an empty function `search_path`;
- no cross-tenant P0 was found;
- Supabase Security Advisor reports leaked-password protection disabled.

The provider setting is a public-beta hardening gap, not evidence that current RLS is broken.

## Research evidence

Official upstream research performed 2026-09-02:

1. Next.js August 2026 Security Release — published 2026-08-25. Upstream directs users to Next.js 16.3.3 (Active LTS) or 15.5.24 (Maintenance LTS) for the two Critical issues disclosed in that release.
2. GHSA-p293-qw3h-jr36 — unauthenticated remote code execution on affected Windows-hosted servers; affected Next.js `>=16.0 <16.3.3`; patched in 16.3.3; no known workaround for affected Windows-hosted applications.
3. GHSA-2xp9-vwfh-vxw4 — unauthenticated remote code execution in Image Optimization when AVIF files are optimized; affected Next.js `<16.3.3`; patched in 16.3.3.

MoneyFlow must not downgrade these findings merely because the current Vercel deployment is not known to satisfy every exploit condition. The shipped dependency remains inside the upstream affected range and the product uses Next.js Image.

## Specification

### In scope after this packet becomes active authority

#### Runtime dependency patch

- upgrade `next` to 16.3.3 or a later vetted patched 16.3.x release available at implementation time;
- align `eslint-config-next` to the selected compatible release;
- regenerate the lockfile with the smallest dependency delta compatible with the security patch;
- separate required transitive movement from unrelated modernization;
- do not accept Dependabot #524's 16.3.1 target as the complete August security fix.

#### Dependency advisory triage

- run `npm audit --json` on the exact post-upgrade lockfile;
- record package, dependency path, advisory/GHSA/CVE, affected range, patched range and runtime/dev exposure for every High/Critical item;
- patch High/Critical findings when a compatible upstream fix exists;
- if an advisory cannot be removed, document exploitability, compensating control, owner acceptance and release impact instead of applying `npm audit fix --force` blindly.

#### Runtime/security regression verification

Verify at minimum:

- production build;
- Server Actions and authenticated routes;
- login/register/forgot-password/account deletion recent-auth flow;
- authenticated financial truth and tenant-boundary browser harness;
- Next Image behavior on public landing content;
- proxy/middleware/deployment configuration contracts;
- CSP/security headers if dependency behavior changes them;
- exact-head CodeQL and Gitleaks;
- policy-selected browser smoke and cross-device UI audit.

#### Supabase leaked-password protection

- confirm the current Supabase Auth setting through current provider evidence;
- identify the exact provider toggle/API and rollback before write;
- perform the provider change only after repository-side security verification and an owner-authorized decision;
- smoke login, registration, password reset and account-deletion reauthentication after the change;
- do not store passwords, breach-corpus data, auth tokens or provider secrets in repository evidence.

### Out of scope

- financial schema redesign;
- RLS rewrites without a reproduced defect;
- broad SECURITY DEFINER refactors when no tenant-boundary exploit is reproduced;
- provider connectivity/bank integration;
- product feature work;
- performance #527 implementation beyond guarding against regression;
- React upgrades not required by the selected Next security patch;
- broad dependency modernization;
- merge/deployment without owner decision.

### Invariants

**Financial**

- VND remains integer đồng.
- Transfers remain equal/opposite and neutral to income/expense.
- Security dependency work does not create an alternate financial mutation authority.
- Optimistic/browser state cannot override server financial truth.

**Ownership and Auth**

- authenticated financial writes remain tenant-scoped at the database boundary;
- no change may weaken RLS, Server Action authentication, recent-auth deletion checks, CAPTCHA or export/delete ownership;
- leaked-password protection is additive hardening, not a substitute for the existing controls.

**Delivery**

- no direct write to `main`;
- exact version/advisory evidence must come from the real post-change tree;
- no `npm audit fix --force` without reviewing its full dependency delta;
- no provider write without rollback and owner decision;
- no claim that production is patched until patched code is actually deployed by owner decision.

## Tasks

### Phase A — authority and exact baseline

1. Persist issue #536 and this packet.
2. Complete #527 to `current: null` under its own acceptance/lifecycle contract.
3. From fresh `main`, create a separate selector PR for #536.
4. After that selector merges, run `npm run plan:resolve` and `npm run agent:doctor -- --json` before implementation.
5. Reconfirm exact main dependency versions, official patched ranges and the current Supabase advisor state.

Exit: #536 is active current authority and implementation boundaries resolve without governance warnings.

### Phase B — dependency patch

1. Start a focused implementation branch from then-current `main`.
2. Upgrade Next to the vetted patched 16.3.x release and align `eslint-config-next`.
3. Regenerate lockfile with Node 22/repository package-manager semantics.
4. Inspect the lockfile diff and remove unrelated churn.
5. Run `npm audit --json`; classify every High/Critical result.
6. Apply only required, evidence-backed follow-up dependency changes.

Exit: exact dependency tree is patched for the August Critical Next.js advisories and has no unexplained High/Critical audit finding.

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

Require exact-head CodeQL and Gitleaks. Database gates run if policy selects them; no DB schema change is expected. Compare relevant #527 Lighthouse evidence before/after so the runtime security upgrade does not silently reintroduce a major critical-path regression; that comparison is a regression guard, not permission to optimize performance inside #536.

Exit: all required runtime/auth/browser/security gates pass on one exact head or failures are fixed without weakening tests.

### Phase D — provider hardening

1. Re-read Supabase Security Advisor and Auth configuration.
2. Record exact current state and rollback.
3. Perform leaked-password-protection change only through an available authorized provider surface and owner decision.
4. Re-run auth smoke flows.
5. Re-read Security Advisor and retain non-sensitive evidence that the actionable warning is resolved.

If connected tooling cannot mutate the setting, stop at a precise provider handoff; do not simulate the write or claim it happened.

### Phase E — closure

A completion PR may close #536 only when repository security patch and required provider evidence are complete. In the same closure PR:

- update `docs/research/CURRENT_PROJECT_MEMORY.md`;
- archive this packet according to repository lifecycle rules;
- set `PLAN_AUTHORITY.current` to null;
- record final PR memory with `- Lifecycle impact:`;
- leave follow-on work unselected.

## Evaluation

### Acceptance criteria — security patch

- [ ] exact shipped Next.js dependency is outside the affected range of GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4; minimum patched release for the 16.x line is 16.3.3;
- [ ] lockfile is reviewed for unintended broad churn;
- [ ] `npm audit --json` contains no unexplained High/Critical advisory;
- [ ] Server Action/auth/image/deployment behavior passes exact-head tests;
- [ ] CodeQL and Gitleaks pass exact head.

### Acceptance criteria — Auth provider

- [ ] Supabase leaked-password protection is enabled and verified before public-beta acceptance, or a documented provider/tooling limitation explicitly blocks release;
- [ ] login/register/reset/recent-auth smoke passes after provider change;
- [ ] RLS/tenant isolation remains unchanged or is independently reverified if provider behavior requires code changes.

### Acceptance criteria — delivery

- [ ] no merge/deploy/provider write is claimed without owner evidence;
- [ ] no security check is weakened to make CI green;
- [ ] current project memory records dependency/advisory/provider truth without secrets;
- [ ] lifecycle closure leaves zero current slice and selects no follow-on work.

### Rollback

If a patched Next.js release causes an unacceptable runtime regression, revert the candidate implementation branch/PR rather than treating a return to a known vulnerable version as a normal release. If emergency production rollback becomes unavoidable, the owner must treat the vulnerable runtime as a time-bounded security incident with explicit compensating controls.

Before enabling leaked-password protection, record the exact previous Supabase setting and smoke checks. If the provider setting causes an availability problem, the owner may restore it while #536 remains open and public-beta acceptance remains blocked.

### Stop conditions

Stop and return to owner/evaluator if:

- the selected Next patch requires a materially larger React/runtime migration;
- lockfile churn cannot be reduced to an auditable dependency change;
- a High/Critical advisory has no safe patch and exploitability cannot be bounded with evidence;
- auth behavior changes in a way that weakens tenant isolation or recent-auth guarantees;
- provider tooling does not expose a safe reversible leaked-password-protection write;
- exact-head browser/auth/financial tests fail and the only apparent path is weakening assertions;
- production deployment is required merely to prove repository correctness.

### Current evaluation state — 2026-09-02

- main runtime: Next 16.2.11 — blocked for public-beta acceptance by current upstream advisory range;
- official patched 16.x minimum for the August 2026 Critical advisories: 16.3.3;
- Dependabot #524 target: 16.3.1 — insufficient;
- CI install: one High severity audit finding — exact advisory not yet identified;
- Supabase: leaked-password protection disabled; core RLS/RPC scan did not reveal a cross-tenant P0;
- current executable authority: #527 performance; #536 remains unselected and therefore non-executable.

## Handoff

Until a future selector for #536 merges from fresh main after #527 closes, only research, documentation, review and authority preparation are allowed from this packet. Do not modify runtime dependencies or Supabase configuration merely because this packet exists.
