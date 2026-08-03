# Selective CI retry gates

**Status:** candidate
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**PR:** #267
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns CI job topology only. It does not authorize product, database, provider, deployment or production-data changes.

## Outcome

For one unchanged commit SHA, GitHub's **Re-run failed jobs** operation reruns only failed CI shards and their dependent summary jobs. Previously successful or intentionally skipped shards remain untouched. A new commit still receives fresh risk-proportional verification because its code and SHA differ.

## Repository reconnaissance

- `.github/workflows/ci.yml` already classifies changed paths and cancels stale in-progress runs.
- The previous `verify` job contained policy, static quality, tests and build as steps in one job; one late failure forced every earlier step to run again.
- The previous `e2e` job contained browser smoke and the cross-device audit in one job; one suite failure repeated both suites and browser installation.
- Required check identities are `verify`, `database` and `e2e`; changing those names could break branch protection.
- CodeQL and secret-history scanning are separate workflows and already have one independently retryable job each.

## Research

Selected authoritative sources:

- GitHub Docs, `Re-running workflows and jobs`: failed-job reruns are supported for an existing workflow run and retain the original commit context.
- GitHub REST Docs, `Re-run failed jobs from a workflow run`: the failed-job endpoint reruns failed jobs and their dependent jobs.
- GitHub Docs, `Using jobs in a workflow`: downstream jobs normally skip after a failed dependency; `always()` allows a stable summary job to evaluate dependency results.

No dependency, action, provider or external service is adopted.

### Adoption review

Not applicable. The implementation uses existing GitHub Actions primitives, existing pinned actions and Bash result aggregation.

## Specification

### Retry topology

- Keep `classify`, `verify`, `database` and `e2e` stable.
- Split application verification into `verify_policy`, `verify_static`, `verify_tests` and `verify_build`.
- Make `verify` a lightweight `always()` summary that fails when a selected shard is not successful.
- Split `browser_smoke` and `ui_audit` into independent jobs.
- Make `e2e` a lightweight `always()` summary that accepts unselected skipped shards and requires selected shards to succeed.
- Add `github.run_attempt` to retry-sensitive artifact names so a rerun cannot collide with an immutable artifact from a prior attempt.

### Safety boundaries

- Preserve path-based gate selection and draft-PR behavior.
- Preserve all existing commands, pinned actions, environment values and database cleanup behavior.
- Preserve CodeQL and secret-history requirements.
- Do not automatically retry deterministic failures; the owner or evaluator chooses **Re-run failed jobs**.
- Do not reuse results across different commit SHAs.

## Implementation plan

1. Create a current-main branch.
2. Refactor `ci.yml` into independently retryable job shards.
3. Preserve stable required-check summaries.
4. Add a repository contract test for the job graph and retry-safe artifact names.
5. Run the workflow change through every CI gate because the classifier treats workflow changes as full-risk verification.
6. Confirm a failed-job rerun on the same SHA does not rerun successful shards.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | create branch from current `main` | `ci/selective-retry-gates` rebased to `cdbc0579` | done |
| T2 | split verification job | `.github/workflows/ci.yml` | implemented |
| T3 | split browser suites | `.github/workflows/ci.yml` | implemented |
| T4 | preserve stable summary checks | `verify`, `e2e` | implemented |
| T5 | add retry-graph contract | `scripts/ci-retry-graph.test.mjs` | implemented |
| T6 | open PR and add bounded PR memory | PR #267 | in progress |
| T7 | run exact-head CI, CodeQL and secret scan | workflow evidence | pending |
| T8 | prove selective rerun behavior | failed-job rerun evidence | pending |
| T9 | owner merge decision | explicit instruction | pending |

## Evaluation

### Local structural validation

- The authored workflow parses as YAML.
- The retry-graph Node test passes against the authored workflow.
- Stable summary jobs contain no heavyweight application or Playwright commands.

### Pending evaluation

Repository Actions must validate the syntax and runtime graph on GitHub-hosted runners. A controlled failed-job rerun is still required to prove that successful shards are retained by GitHub for the same workflow run and commit SHA.

## Risks and defenses

| Risk | Defense |
|---|---|
| branch protection loses required checks | retain job IDs `verify`, `database` and `e2e` |
| skipped optional shards make the summary fail | summary checks classifier outputs and accepts unselected shards |
| failed dependency hides the final required check | summaries use `always()` and report dependency results explicitly |
| rerun artifact name collides | include `github.run_attempt` |
| first-run minutes increase from more installs | split only major expensive boundaries; keep static commands grouped and use existing npm cache |
| stale success reused after code changes | reuse applies only to reruns of the same workflow run/SHA |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit optimization request | job graph not verified on GitHub | author focused branch and PR |
| 2026-08-04 | implementer | evaluator | candidate | workflow refactor and contract test | exact-head and selective-rerun proof pending | evaluate PR #267 Actions |

## Permission boundary

Granted: focused branch writes, workflow/test documentation, PR metadata and CI inspection.

Forbidden without separate owner instruction: merge, deployment, provider changes, production schema/data writes and production acceptance claims.
