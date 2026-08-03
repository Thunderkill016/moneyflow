# Issue 174 provider security runbook on current main

**Status:** evaluating  
**Execution state:** current-main replacement in progress  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** Thunderkill016 controls merge, provider writes, production verification and issue acceptance  
**Issue:** #174  
**PR:** #249  
**Supersedes:** PR #198  
**Baseline:** `main@48a02052473b44910ff5a46cf2c837bedab39b6f`  
**Last updated:** 2026-08-03

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Repository reconnaissance

- Issue #174 remains open and tracks provider configuration plus production verification that source code cannot prove.
- Repository-side CAPTCHA token plumbing, neutral Auth responses and password validation are already merged.
- `docs/configuration.md` defines the safe activation order but does not provide an owner-operated evidence and rollback procedure.
- PR #198 was based on `main@481d035c2f430b1addfa5f9b92cab3e03992b371` and is closed unmerged.
- The PR #198 runbook contained exact provider identifiers and concrete Firewall thresholds. Current issue #174 explicitly requires identifiers, hostnames, thresholds, request IDs and screenshots to remain in a private operational record.
- This replacement performs no Supabase, Cloudflare, Vercel, deployment, secret, database or production-data operation.

## Research

Primary sources rechecked on 2026-08-03:

- Supabase Auth CAPTCHA, password security, rate limits, redirect URLs and production checklist;
- Cloudflare Turnstile widget management, hostname rules, token validation and CSP;
- Vercel Firewall custom rules and rate limiting.

Current source-supported conclusions:

- Supabase CAPTCHA supports sign-in, sign-up and password reset and stores the CAPTCHA secret in Auth settings.
- Turnstile site keys are public; secret keys are private.
- Turnstile tokens expire after five minutes and are single-use.
- Turnstile hostnames omit schemes, ports, paths and wildcards.
- Supabase leaked-password protection is plan-dependent.
- Supabase Auth rate limits must be reviewed in provider state rather than copied blindly from documentation defaults.
- Vercel custom rules support Log, deny, challenge and rate-limit actions; rate-limit follow-up can be observed before enforcement.
- Vercel Firewall does not protect traffic that calls Supabase directly.

Official references are listed in the runbook itself.

## Specification

### Required outcome

Publish a Vietnamese, owner-operated, public-safe runbook for issue #174 that preserves the correct provider activation order, production probes, evidence redaction and rollback without exposing operational identifiers or defense thresholds.

### Acceptance criteria

- [x] The runbook uses placeholders instead of production hostname, project IDs, widget IDs and rule IDs.
- [x] Exact Firewall thresholds, windows and request IDs are assigned to a private operational record.
- [x] The runbook preserves the safe sequence: deploy widget first, enable Supabase enforcement second.
- [x] The Turnstile secret is never assigned to a public Vercel variable.
- [x] The runbook explains token expiry/single-use and reset behavior.
- [x] Supabase Auth, Cloudflare Turnstile and Vercel Firewall each have stop and rollback conditions.
- [x] Share Target probes cover 413, 415 and enforcement response without publishing exact production thresholds.
- [x] Android Share Target verification uses synthetic data.
- [x] Public completion evidence excludes identifiers, thresholds, user data and screenshots.
- [x] `docs/configuration.md` links to the runbook and states the private-record boundary.
- [x] PR #198 is closed unmerged after replacement provenance is recorded.
- [x] Canonical memory records the current replacement candidate and the just-merged Dependabot truth.
- [ ] Exact-head CI, CodeQL and secret-history scan pass.
- [ ] Human owner explicitly authorizes merge.

### Non-goals

- No provider write, deployment, secret rotation or production probe.
- No issue #174 closure.
- No application code, workflow, dependency, schema, RLS or financial-data change.
- No publication of exact provider IDs, hostnames, thresholds or request evidence.

## Implementation plan

1. Rebuild the runbook directly from current main using placeholders and a private-record model.
2. Link the runbook from `docs/configuration.md`.
3. Open current-main replacement PR #249 and add bounded PR memory.
4. Close PR #198 unmerged as superseded.
5. Reconcile canonical memory with merged PR #245 and provider-runbook candidate #249.
6. Run risk-proportional exact-head repository checks, protected CodeQL and secret-history scan.
7. Stop at ready-for-review; provider operations remain owner-controlled and separate.

### Rollback

Revert the documentation PR. No provider rollback is required because this task performs no provider write.

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | Inspect PR #198, issue #174 and current configuration contract | done | GitHub source review |
| T2 | Recheck official Supabase, Cloudflare and Vercel guidance | done | official provider documentation dated 2026-08-03 |
| T3 | Remove public identifiers and exact thresholds from the runbook design | done | placeholder/private-record model |
| T4 | Add current-main runbook and configuration link | done | documentation branch |
| T5 | Open replacement PR, add memory and close #198 unmerged | done | PR #249 open; PR #198 closed unmerged |
| T6 | Reconcile merged #245 lifecycle and canonical candidate state | done | completed packet, PR memory and canonical snapshot |
| T7 | Run exact-head CI, CodeQL and secret scan | pending | final head required |
| T8 | Owner merge decision | blocked | explicit owner instruction required |

## Evaluation

### Safety review

The evaluator must confirm:

1. No production hostname, provider project reference, widget ID, site key, rule ID, exact edge threshold, request ID or private screenshot is added.
2. No secret is requested or placed in a public environment variable.
3. CAPTCHA enforcement is enabled only after a successful production widget deployment.
4. Vercel Firewall is described as complementary to, not a replacement for, Supabase direct Auth controls.
5. Firewall rollout starts with observation and has rollback.
6. Probes are bounded and use synthetic data.
7. Documentation does not claim provider state, production deployment or issue completion.

### Verification target

- diff hygiene;
- project knowledge and CI-classification contracts;
- deployment configuration contract;
- lint, typecheck, unit/static-RLS tests and production build when selected by classifier;
- CodeQL with real Initialize/Analyze;
- secret-history scan;
- database and browser gates only if classifier identifies an affected boundary.

### Evidence boundary

Repository checks can prove document consistency and that no secret-shaped content entered the branch. They cannot prove dashboard values, widget publication, Firewall enforcement, email delivery or production Auth/Share Target behavior.

### Permission boundary

- Allowed: branch files, replacement PR, stale PR closure and canonical documentation reconciliation.
- Forbidden: direct main writes, provider changes, deployment, production probes using real data, issue closure and merge without explicit owner instruction.
