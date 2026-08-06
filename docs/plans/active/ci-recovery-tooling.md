# Exact-head CI recovery tooling

**Status:** planned  
**Execution state:** planned  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner + implementing agent  
**Issue/PR:** pending draft PR  
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow contributors and coding agents can recover a stuck GitHub Actions run from one repository command without changing product code, creating no-op commits, bypassing required checks or losing exact-head guarantees.

## Repository reconnaissance

### Current behavior

- `scripts/watch-pr-ci.mjs` can read and watch pull-request checks, reject stale-head evidence and print failed exact-head logs.
- The current tooling cannot cancel an unresponsive workflow, force-cancel a zombie run, dispatch a clean manual CI run or verify that the replacement run still targets the original head.
- PR #309 exposed the gap when CI run #1933 remained queued/running after independent jobs were cancelled and the available connector lacked force-cancel/workflow-dispatch actions.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/watch-pr-ci.mjs` | Existing exact-head monitoring contract and CLI style | Reuse behavior and terminology; do not overload monitoring with recovery writes |
| `scripts/watch-pr-ci.test.mjs` | Existing pure helper-test pattern | Reuse test structure |
| `.github/workflows/ci.yml` | Supports `workflow_dispatch`; manual runs force the complete suite | Read only; do not change workflow policy in this slice |
| `docs/operations/ci-observability.md` | Current operator runbook | Extend with recovery procedure and safety rules |
| `package.json` | Repository command surface | Add one `ci:recover` command and its tests |

### Existing tests and constraints

- Related unit tests: `scripts/watch-pr-ci.test.mjs`, `scripts/ci-retry-graph.test.mjs`, CI classifier tests.
- Database/RLS tests: not applicable; no database behavior changes.
- Browser tests: not applicable to the tool itself; manual CI dispatch still executes full repository gates.
- Product/architecture rules: scripts own repeatable repository automation; Class 3 CI-policy tooling requires a packet, rollback and owner review.

### Similar implementation and recent history

- Existing pattern to reuse: `scripts/watch-pr-ci.mjs` resolves a PR, records exact head, invokes `gh`, watches checks and rejects a moved head.
- Relevant history: PR #302 introduced exact-head monitoring but intentionally stopped at observation and diagnostics.

### Open questions

- [x] Can GitHub CLI force-cancel an unresponsive run? Yes: current `gh run cancel` supports `--force`.
- [x] Can a clean run target the same branch head without a new commit? Yes: `gh workflow run <workflow> --ref <branch>` creates a `workflow_dispatch` run.
- [x] How is replacement evidence kept exact? Filter runs by commit SHA, remember prior run IDs and re-read the PR head after completion.

## Research

### Research scope and source selection

- Decision question: what is the smallest official GitHub-supported recovery flow for a stuck exact-head Actions run?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus focused official GitHub documentation.
- Source budget: four primary GitHub/GitHub CLI references.
- Expected decision or uncertainty to resolve: cancel/force-cancel semantics, manual dispatch by ref, rerun/watch behavior and concurrency limits.

### Questions researched

1. Which official command force-cancels a workflow run that ignores normal cancellation?
2. How can CI be dispatched against the existing branch without changing code?
3. How should the tool identify and watch the correct exact-head run?
4. When should the tool avoid cancellation and return a pending result instead?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| GitHub CLI `gh run cancel` manual | Official CLI documentation | 2026-08-07 | `gh run cancel <run-id> --force` is supported | Requires authenticated `gh` with Actions write permission |
| GitHub CLI `gh workflow run` manual | Official CLI documentation | 2026-08-07 | `workflow_dispatch` can run a workflow at a specified branch/tag through `--ref` | Workflow must already support `workflow_dispatch` |
| GitHub CLI run list/watch/rerun manuals | Official CLI documentation | 2026-08-07 | Runs can be filtered by commit, watched with exit status and rerun with dependencies | A rerun preserves the original event SHA/ref and is not always usable while a run is still active |
| GitHub Actions workflow-run and concurrency docs | Official platform documentation | 2026-08-07 | Force-cancel is reserved for unresponsive cancellation; concurrency may replace pending/in-progress runs in one group | Provider scheduling failures remain outside repository control |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep manual UI instructions only | No code change | Slow, inconsistent, hidden session knowledge, easy to select wrong run/ref | Rejected |
| Create no-op commits to retrigger CI | Works through normal PR synchronization | Pollutes history and violates repository guidance | Rejected |
| Modify CI concurrency policy now | Could reduce some future collisions | Changes required-check behavior and does not recover an already stuck record | Rejected for this bounded slice |
| Add a dedicated `gh` recovery script | Official primitives, auditable, testable, exact-head aware, no runtime dependency | Requires authenticated local/agent GitHub CLI | Selected |

### Research decision

Add a standalone recovery command beside the existing monitoring command. It will resolve the PR and exact head, inspect exact-head runs, avoid cancelling a fresh active run unless explicitly forced, force-cancel a stale/unresponsive run, dispatch `ci.yml` on the unchanged head branch, discover the replacement exact-head run, watch it and reject the result if the PR head moves.

### Adoption review

- Observed problem: current automation can observe but cannot recover stuck GitHub Actions runs.
- Existing or simpler alternatives considered: UI instructions, no-op commits, connector retries and concurrency changes; none provide repeatable exact-head recovery.
- License/code-reuse compatibility: no copied third-party code and no new dependency; only documented GitHub CLI commands.
- Secrets, user-data and privacy exposure: no financial/user data; relies on existing authenticated `gh` credentials and never prints tokens.
- Runtime, bundle, deployment and operational cost: development-only Node script; no application bundle or provider service.
- Owning boundary and maintenance responsibility: `scripts/` and `docs/operations/`.
- Migration and rollback: additive command; rollback removes the script, tests, package command and runbook section.
- Verification plan: pure unit tests, project knowledge/CI policy checks and exact-head PR workflows.
- Removal condition if the expected benefit does not appear: remove if GitHub CLI/API behavior makes safe exact-head recovery impossible or the command causes incorrect run cancellation.

## Specification

### Problem

An agent or contributor can identify a stuck CI run but currently cannot recover it reproducibly. Manual retries may target the wrong run, create unnecessary commits, or report evidence for a stale head.

### User stories

- As a contributor, I can recover a stale CI run with one command so that I do not create no-op commits.
- As an agent, I can prove the replacement run targets the same head before reporting success.
- As an owner, I can preview recovery actions with dry-run mode before any Actions write.

### Acceptance criteria

- [ ] Resolve PR number/URL, repository, branch and exact head through `gh pr view`.
- [ ] List and select only runs whose `headSha` matches the recorded exact head.
- [ ] Return pending without writes when the newest active run is younger than the configured stale threshold.
- [ ] Support explicit recovery through `--force` and safe preview through `--dry-run`.
- [ ] Force-cancel an eligible active run using official GitHub CLI behavior.
- [ ] Dispatch the configured workflow against the same branch with no commit change.
- [ ] Discover a new exact-head run that was not present before dispatch.
- [ ] Watch the replacement run with non-zero failure status and reject completion if the PR head moved.
- [ ] Unit-test parsing, run selection, staleness and recovery planning without network access.
- [ ] Document operator commands, permissions, exit codes and rollback.

### Required states

- Loading: command prints resolved PR, branch and exact head before writes.
- Empty: no prior exact-head run dispatches a clean run.
- Populated: successful latest exact-head run exits without redundant dispatch.
- Validation/error: invalid flags, missing repo, missing `gh`, unauthorized writes and malformed JSON exit clearly.
- Recovery/undo: `--dry-run`; cancellation does not change code; a failed replacement remains inspectable through existing monitoring tooling.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: CLI output is text-first and does not rely on color.

### Financial and security constraints

- No product, financial, database, Auth, RLS, provider configuration or production-data behavior changes.
- Never print credentials or environment secrets.
- Never merge, push to `main`, alter branch protection or bypass required checks.

### Out of scope

- Automatic merge or deployment.
- Changes to workflow concurrency, required check names, permissions or repository rulesets.
- Recovery for non-GitHub CI providers.
- Background daemon or persistent agent service.

## Implementation plan

### Architecture fit

The behavior belongs in `scripts/` because it is repeatable repository automation. It composes the existing GitHub CLI and existing CI workflow; it does not create a new framework or modify the application runtime.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/recover-pr-ci.mjs` | Add exact-head recovery CLI and exported pure decision helpers | Own operational recovery behavior |
| `scripts/recover-pr-ci.test.mjs` | Test argument parsing, selection, staleness and plan decisions | Prevent unsafe cancellation/dispatch regressions |
| `package.json` | Add `ci:recover`; include tests in `test:ci-policy` | Discoverable repository command and protected contract |
| `docs/operations/ci-observability.md` | Add recovery workflow, safety model and examples | Durable operational handoff |
| `docs/research/pr-memory/2026/Q3/PR-<number>.md` | Record bounded provenance after draft PR exists | Satisfy PR memory policy |
| this packet | Track state, permissions, evidence and rollback | Class 3 governance |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: requires a current GitHub CLI; force-cancel falls back to the official REST endpoint through `gh api` when needed.
- Rollback: remove the additive command and documentation.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Cancels a healthy run that is merely waiting briefly | Configurable stale threshold; require `--force` to override |
| Dispatches against a moved branch | Record head before writes and verify it before/after dispatch/watch |
| Selects an old run for another SHA | Filter and validate `headSha` exactly |
| Treats an existing run as the replacement | Record prior run IDs and require a new ID after dispatch |
| Hides a failed replacement | `gh run watch --exit-status`; existing failed-log extraction remains available |
| Leaks credentials | Never read or print token values; delegate auth to `gh` |

### Verification plan

- Static: `npm run check:knowledge`, `npm run test:ci-policy`, lint and typecheck through CI classification.
- Unit/domain: Node tests for pure recovery helpers.
- Database: not applicable.
- Browser flow: not applicable to the script; manual workflow dispatch runs the complete suite.
- Responsive/visual: not applicable.
- Production/manual: dry-run against an open PR; real cancellation only on an explicitly stale/unresponsive run.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record research, specification and rollback in packet | reconnaissance + official docs | this packet | done |
| T2 | Implement recovery command and pure decision helpers | T1 | script diff | todo |
| T3 | Add unit contracts and npm command | T2 | `test:ci-policy` | todo |
| T4 | Extend CI observability runbook | T2 | docs review | todo |
| T5 | Open/update PR, add bounded PR memory and run exact-head gates | T2–T4 | PR + workflow evidence | todo |
| T6 | Independent evaluation against acceptance matrix | T5 | evaluation section | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repository reconnaissance + official GitHub sources | final CLI ergonomics not yet implemented | Create focused implementation plan |
| 2026-08-07 | planner | implementer | planned | this packet, branch `chore/ci-recovery-tooling` | unit tests and exact-head CI pending | Implement T2–T4 |

### Current permission boundary

- Granted scope: write only `chore/ci-recovery-tooling` and its PR.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; GitHub metadata/actions read during verification.
- Forbidden writes: `main`, product runtime, production/provider configuration, branch protection, required checks, production data and unrelated PR branches.
- Human approval required before: merge, deployment or provider/ruleset changes.
- Rollback or stop condition: stop if exact-head identity cannot be guaranteed or recovery requires broader credentials than existing `gh` Actions write permission.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Exact-head safe recovery command | pending | pending |
| Pure unit coverage | pending | pending |
| Durable runbook | pending | pending |
| Required exact-head checks | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending implementation review.
- Important source limitations remain respected: pending.
- New tool/dependency/pattern passed the adoption review, or not applicable: no dependency planned.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- UI/UX/accessibility: CLI only; pending text-output review.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- GitHub service outages and provider scheduler defects cannot be fixed by repository code; the tool only applies official cancellation/dispatch recovery.

## Delivery record

- Branch: `chore/ci-recovery-tooling`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending acceptance
