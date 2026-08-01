# Issue 174 provider security runbook

**Status:** active  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controls merge, provider writes, production verification, and acceptance  
**Issue:** #174  
**Branch:** `docs/issue-174-provider-runbook`  
**Base:** `main@481d035c2f430b1addfa5f9b92cab3e03992b371`  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Create a durable Vietnamese owner runbook that explains exactly how to finish issue #174 through Supabase Auth, Cloudflare Turnstile, Vercel environment configuration, Vercel Firewall, production probes, evidence capture, and rollback. This task documents provider operations; it does not execute them.

## Repository reconnaissance

- `docs/configuration.md` defines the configuration contract and safe CAPTCHA activation order but is not detailed enough for an owner unfamiliar with the three provider dashboards.
- PR #175 is merged and deployed with CAPTCHA disabled.
- The production origin is `https://mfvn.vercel.app`.
- Issue #174 remains open because provider state and production probes are not complete.
- Provider secrets and access tokens must not enter source, chat, issues, CI, browser bundles, or public environment variables.

## Research

Current primary sources reviewed on 2026-08-01:

- Supabase Auth CAPTCHA, password security, rate limits, redirect URLs, and production checklist;
- Cloudflare Turnstile widget creation, hostname management, client lifecycle, CSP, and token behavior;
- Vercel Firewall custom rules and rate limiting.

The sources establish that:

- Supabase accepts a CAPTCHA secret under Bot and Abuse Protection and expects the client token in Auth calls;
- the Turnstile site key is public while the secret is private;
- Turnstile hostnames must omit schemes, ports, paths, and wildcards;
- environment changes require a new Vercel deployment;
- Vercel rate-limit rules can be staged with Log before a blocking action;
- provider configuration must be independently verified because repository CI cannot prove dashboard state.

## Specification

### Acceptance criteria

- [x] The guide is written in Vietnamese for the human owner.
- [x] It identifies the exact MoneyFlow production origin and provider project IDs.
- [x] It gives ordered Supabase, Cloudflare, Vercel environment, and Firewall steps.
- [x] It keeps Supabase CAPTCHA enforcement off until the deployed widget produces tokens.
- [x] It prevents the Turnstile secret from entering Vercel public variables or the repository.
- [x] It includes stop conditions and rollback after each provider phase.
- [x] It provides conservative Firewall starting thresholds and requires Log-first observation.
- [x] It distinguishes Vercel edge protection from Supabase direct Auth protections.
- [x] It includes 413, 415, 429, Android Share Target, and Auth verification procedures.
- [x] It includes a redacted completion-evidence template for issue #174.
- [ ] `docs/configuration.md` links to the detailed runbook.
- [ ] Exact-head CI passes.
- [ ] Human owner reviews and authorizes merge.

### Non-goals

- No Supabase, Cloudflare, or Vercel setting is changed.
- No secret or access token is requested or stored.
- No dependency, source code, schema, financial data, deployment, or Firewall rule is changed.
- Issue #174 is not closed by documentation alone.

## Implementation plan

1. Add `docs/operations/provider-security-controls.vi.md`.
2. Add one link from `docs/configuration.md` to the owner runbook.
3. Keep this active packet synchronized with the PR and exact-head CI evidence.
4. Stop at `ready_for_review`; the human owner controls merge.

## Tasks

- [x] Inspect issue #174 and its current evidence.
- [x] Inspect the current configuration contract and completed CAPTCHA packet.
- [x] Verify current official provider guidance.
- [x] Draft the detailed Vietnamese owner runbook.
- [ ] Link the runbook from `docs/configuration.md`.
- [ ] Open a focused documentation PR.
- [ ] Run exact-head CI.
- [ ] Evaluate the final diff and move to `ready_for_review`.

## Evaluation

The evaluator must confirm:

1. The runbook never instructs the owner to put the Turnstile secret in a public Vercel variable.
2. Supabase enforcement is enabled only after a successful widget deployment and smoke.
3. Rate-limit rules are scoped by path and method, staged with Log, and include rollback.
4. Direct Supabase Auth abuse is not falsely claimed to be covered by Vercel Firewall.
5. The production probes use synthetic data and bounded request counts.
6. Completion evidence excludes secrets, user identifiers, real financial records, and unredacted emails/IPs.
7. Documentation claims match current repository behavior and official provider documentation.

## Verification

Required repository verification:

- project knowledge contract;
- deployment configuration contract;
- CSS and architecture contracts;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- fresh Supabase reset and pgTAP;
- browser smoke and cross-device audit.

No provider verification occurs in this documentation-only task.

## Rollback

Repository rollback is a normal revert of the documentation PR. No provider rollback is required because this task performs no provider writes.

The runbook itself documents provider-specific rollback for future owner operations:

1. disable Supabase CAPTCHA enforcement;
2. disable the Vercel public CAPTCHA flag and redeploy when needed;
3. disable or restore the previous Vercel Firewall configuration.

## Delivery state

- The Vietnamese runbook has been created on the focused branch.
- `docs/configuration.md` link, PR creation, CI, and independent evaluation remain pending.
- No provider, production, dependency, schema, or data change has occurred.
