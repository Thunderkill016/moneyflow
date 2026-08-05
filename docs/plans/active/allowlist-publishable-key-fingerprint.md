# Allowlist one browser-safe Supabase publishable-key fingerprint

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** PR #295
**Last updated:** 2026-08-05

## Outcome

Restore the repository-wide all-ref Gitleaks gate by recording one reviewed false-positive fingerprint for a browser-safe Supabase publishable key in an isolated, unmerged Penpot bridge prototype, without disabling the detector, broadening an allowlist or exposing any secret value.

## Repository reconnaissance

### Current behavior

- `.github/workflows/secret-history.yml` fetches every branch and tag and runs Gitleaks with `--log-opts="--all"`.
- Draft PR #292 introduced a client-side `sb_publishable_…` value in `tools/atoryn-design-plugin-v08/ui.html`.
- The all-ref scan now fails every unrelated PR on that historical fingerprint.
- The root `.gitleaksignore` already records reviewed, fingerprint-specific false positives, including browser-safe Supabase publishable keys.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `.github/workflows/secret-history.yml` | protected all-ref security gate | do not weaken or edit |
| `.gitleaksignore` | existing reviewed false-positive mechanism | append one exact fingerprint |
| PR #292 / `atoryn-design-plugin-v08` | source ref of the finding | remain isolated and unmerged |
| PR #293/#294 | unrelated PRs blocked by all-ref scan | rerun after this policy candidate is accepted |

### Existing tests and constraints

- Security/CI policy is Class 3.
- Broad path/rule allowlists are forbidden by the existing file comment and project safety model.
- Provider writes, key rotation, branch history rewriting and merge are not authorized.

## Research

### Decision question

Is an `sb_publishable_…` key a secret requiring revocation, or a browser-safe public identifier that can receive a narrowly reviewed Gitleaks fingerprint exception?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits |
|---|---|---|---|---|
| Supabase, “Understanding API keys” | official documentation | 2026-08-05 | publishable keys are low-privilege and safe in web pages, apps, GitHub Actions, CLIs and source code; secret keys bypass RLS and must remain backend-only | safety still depends on correct RLS and least-privilege grants |
| Supabase, “Migrating to publishable and secret API keys” | official documentation | 2026-08-05 | `sb_publishable_…` replaces client-side anon usage; `sb_secret_…` is the server-side elevated type | does not authorize unrelated provider changes |
| Gitleaks canonical README | official upstream repository | 2026-08-05 | one finding can be ignored by adding its exact fingerprint to `.gitleaksignore` | fingerprint exceptions require human review and should remain narrow |

### Alternatives considered

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Disable `generic-api-key` | immediate green | hides real generic-key leaks repo-wide | reject |
| Allowlist plugin path | simple | hides future real secrets in that file | reject |
| Rewrite/delete published branch history | removes ref reachability | destructive, unavailable through current safe connector and violates branch-history policy without owner authorization | reject |
| Rotate publishable key | possible operational cleanup | not required for a public key; provider write not authorized | reject |
| Add one exact fingerprint | matches existing repository pattern and upstream Gitleaks mechanism | must be justified and reviewed | select |

### Research decision

Treat this finding as a reviewed false positive because the detected value is explicitly a Supabase publishable key, not a secret/service-role key. Add exactly one fingerprint to the existing ignore file. Do not include the key value in documentation, comments or PR text.

### Adoption review

Not a new dependency or service. This uses the repository's existing Gitleaks exception mechanism.

## Specification

### Acceptance criteria

- [x] Exactly one fingerprint is added.
- [x] No key value is added to the change.
- [x] No detector, workflow, rule or path allowlist changes.
- [x] Secret history scan passes on the exact candidate.
- [ ] CI policy and CodeQL pass on the final exact head.
- [ ] Independent review confirms the fingerprint maps to a publishable, not secret, key.

### Security constraints

- Never repeat or reveal the detected key value.
- Never classify `sb_secret_…` or `service_role` values as safe.
- This exception does not prove the Penpot bridge authorization model or RLS policies are secure.
- Provider writes and history rewrites require separate owner authorization.

### Out of scope

- Merging or deploying PR #292.
- Modifying Supabase settings, keys, RLS or Edge Functions.
- Broad Gitleaks policy changes.
- UI implementation.

## Implementation plan

### Planned changes

| File | Change | Reason |
|---|---|---|
| `.gitleaksignore` | append one exact fingerprint under a browser-safe Supabase comment | unblock all-ref scan without weakening detection |
| this packet | document Class 3 decision and rollback | required security governance |
| numbered PR memory | record exact scope and evidence | repository memory contract |

### Rollback

Remove the single fingerprint entry. No runtime or provider rollback exists because no runtime/provider behavior changes.

### Verification plan

- Inspect exact diff for one fingerprint only.
- Run project knowledge and CI policy checks.
- Require protected Secret history scan and CodeQL on exact head.
- Do not claim provider or RLS verification.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Verify finding type from official Supabase docs | source notes | done |
| T2 | Confirm existing fingerprint-specific policy | `.gitleaksignore` | done |
| T3 | Add one exact fingerprint | diff | done |
| T4 | Open PR and create numbered memory | PR #295 | done |
| T5 | Evaluate exact-head protected checks | workflow runs/logs | evaluating |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | implementer | evaluator | evaluating | official docs + one-line policy diff | final exact-head policy rerun pending | inspect protected checks and owner review |

### Current permission boundary

- Granted: branch writes in `Thunderkill016/moneyflow`.
- Forbidden: merge, force-push/history rewrite, provider writes, key rotation, deployment and production data.
- Human approval required before: merge or any Supabase operation.
- Stop condition: any evidence that the finding is a secret/service-role key rather than a publishable key.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| one exact fingerprint | compare diff | pass |
| no secret value in diff | review | pass |
| Secret history scan | run 30982496100 | pass on prior exact head; final rerun pending |
| CodeQL | run 30982496125 | pass on prior exact head; final rerun pending |

### Remaining limitations

- The isolated prototype still contains a browser-safe public key in its historical source.
- This exception says nothing about whether PR #292 should merge.
- RLS and Edge Function authorization were not audited in this task.

## Delivery record

- Branch: `security/allowlist-publishable-key-fingerprint`
- PR: #295
- CI: final exact-head rerun pending
- Merge: not authorized
- Provider changes: none
