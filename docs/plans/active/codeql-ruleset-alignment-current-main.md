# CodeQL and repository-ruleset alignment — current main

- **Execution state:** evaluating
- **Active role:** CI/security policy maintainer
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `ci/align-codeql-with-ruleset-current-main`
- **Base:** `main@52c1eac9197e16f5f7398bb25c20af4833de1993`
- **Pull request:** #230
- **Decision date:** 2026-08-02

## Repository reconnaissance

The repository ruleset requires uploaded CodeQL results for the exact pull-request head or merge candidate. The existing workflow could complete its stable job name while skipping both CodeQL initialization and analysis on documentation-only diffs.

This failure was reproduced twice:

- earlier documentation PRs reported a green CodeQL job but remained unmergeable;
- PR #229 reached green CI, CodeQL job and secret scan, then GitHub rejected merge because code scanning was still waiting for analysis on the merge candidate.

PR #221 implemented the correct workflow change and proved that `Initialize CodeQL` and `Analyze` both succeed. Its branch was based on an older `main`, and the ruleset required fresh merge-candidate checks after `main` advanced. This packet recreates the same bounded fix directly from current `main` rather than bypassing protection.

## Specification

- Every pull request targeting `main` uploads a real JavaScript/TypeScript CodeQL analysis.
- The stable check name remains `Analyze JavaScript and TypeScript`.
- Pinned actions, permissions, concurrency and build mode remain unchanged.
- Application, database and browser gates remain risk-proportional.
- No branch-protection or ruleset setting is modified.
- No runtime, financial, database, provider or production-data behavior changes.

## Acceptance criteria

- `Initialize CodeQL` and `Analyze` both run and succeed on the exact head.
- CI and secret-history workflows succeed on the exact head.
- The protected merge is accepted after GitHub processes the uploaded analysis.
- A documentation-only PR can subsequently rerun under the corrected workflow and merge without missing-analysis deadlock.

## Implementation plan

1. Remove the docs-only CodeQL skip path from `.github/workflows/codeql.yml`.
2. Keep the stable job name and pinned actions.
3. Document the provider-required exception in `RISK_PROPORTIONAL_DELIVERY.md`.
4. Record this current-main replacement PR in bounded memory.
5. Run exact-head CI, real CodeQL analysis and secret scan.
6. Merge only after required checks and provider code-scanning acceptance.
7. Retrigger PR #229 under the corrected workflow and merge it if all checks pass.

## Evaluation

### Scope

Four files only: CodeQL workflow, delivery policy, this packet and PR memory. No application runtime, dependency, financial logic, database, RLS, provider setting or production data change.

### Rollback

Rollback is allowed only if the owner intentionally removes or replaces the provider code-scanning requirement. Restoring conditional analysis while that rule remains active recreates unmergeable documentation PRs.

### Verification

- project knowledge and CI classification;
- fail-safe CI gates selected for workflow-policy change;
- real CodeQL initialization and analysis;
- secret-history scan;
- protected merge acceptance.

## Tasks

- [x] Reproduce the missing-analysis merge deadlock on PR #229.
- [x] Confirm PR #221's actual `Initialize CodeQL` and `Analyze` steps succeeded.
- [x] Recreate the same focused workflow/policy change from current `main`.
- [ ] Pass exact-head checks.
- [ ] Merge after owner instruction and provider acceptance.
- [ ] Retrigger and merge PR #229.
- [ ] Archive after acceptance.
