# Dependabot noise control on current main

**Status:** evaluating
**Execution state:** current-main replacement in progress
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** OpenAI agent
**Supersedes:** PR #197
**Last updated:** 2026-08-03

## Repository reconnaissance

- Baseline: `main@c00de284c9062d08d7ec590242fb3802970a034a`.
- PR #197 was created from `main@481d035c2f430b1addfa5f9b92cab3e03992b371` and is no longer mergeable.
- `.github/dependabot.yml` has not changed between that old base and current main.
- Current main still checks npm and GitHub Actions weekly, permits up to five npm plus three Actions version-update PRs, and requests custom `dependencies` and `security` labels.
- This replacement changes no dependency version, lockfile, workflow, runtime, database, provider setting or production data.

### Current GitHub behavior checked on 2026-08-03

Official GitHub documentation confirms:

- `schedule.interval: monthly` is supported;
- `open-pull-requests-limit` caps open version-update PRs;
- `groups` combines matching updates;
- group `update-types` supports `major`, `minor` and `patch`;
- `cooldown` delays version updates but does not delay security updates;
- Dependabot remains manually reviewable unless a separate auto-merge mechanism is configured.

Sources:

- https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates
- https://docs.github.com/en/enterprise-cloud@latest/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates

## Specification

### Outcome

Keep Dependabot enabled while reducing routine version-update noise and preserving manual review.

### Acceptance criteria

- npm and GitHub Actions version checks run monthly in `Asia/Ho_Chi_Minh`;
- at most two npm version-update PRs and one GitHub Actions version-update PR remain open;
- `next`, `react` and `react-dom` minor/patch updates are grouped together;
- other npm minor/patch updates are grouped together;
- all GitHub Actions updates are grouped together;
- npm releases observe explicit cooldown periods;
- security updates are not delayed by the cooldown configuration;
- custom labels are omitted so missing repository labels cannot invalidate generated PR metadata;
- commit messages keep the `deps` prefix;
- auto-merge remains absent;
- exact-head repository, CodeQL and secret-history gates pass.

### Explicitly unchanged

- Dependency versions and lockfiles.
- GitHub Actions workflow definitions.
- Application code, UI, database, RLS and financial behavior.
- Provider configuration, deployments and production data.

## Implementation plan

1. Recreate the still-valid `.github/dependabot.yml` change directly from current main.
2. Add a current-main work packet and bounded PR memory.
3. Open a replacement PR and close PR #197 unmerged as superseded.
4. Update canonical memory so only the replacement is treated as the active candidate.
5. Run exact-head CI, protected CodeQL and secret-history scanning.
6. Stop at ready-for-review for an explicit owner merge decision.

### Rollback

Revert the configuration commit to restore weekly ungrouped version checks. No application or data rollback is required.

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | Compare PR #197 base with current main | done | Dependabot config unchanged |
| T2 | Verify current GitHub Dependabot option support | done | official GitHub documentation |
| T3 | Apply grouped monthly configuration on a current-main branch | done | `.github/dependabot.yml` |
| T4 | Open replacement PR, add memory and close #197 unmerged | in progress | replacement delivery |
| T5 | Run exact-head CI, CodeQL and secret scan | pending | final head required |
| T6 | Owner merge decision | blocked | explicit owner instruction required |

## Evaluation

### Risks and controls

| Risk | Control |
|---|---|
| Security updates are delayed | GitHub documents that cooldown applies to version updates, not security updates |
| React runtime packages split across PRs | Dedicated first-match `web-runtime` group |
| Routine updates still flood the queue | Monthly cadence plus open-PR limits and broad minor/patch grouping |
| Major upgrades are silently accepted | No auto-merge; grouping does not authorize merge |
| Stale branch evidence is reused | Replacement starts at current main and requires fresh exact-head gates |
| Missing labels cause warnings | Remove custom label requests |

### Evidence boundary

Passing repository checks proves YAML/repository compatibility, not that GitHub has already executed a future monthly Dependabot run. Actual generated-PR behavior remains observable only after GitHub processes the merged configuration.

### Permission boundary

- Allowed: focused branch, Dependabot config, packet, PR memory and canonical candidate reconciliation.
- Forbidden: dependency upgrades, auto-merge, direct main writes, provider/deployment changes and merge without explicit owner instruction.
