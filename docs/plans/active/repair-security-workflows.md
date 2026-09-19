# Repair required security workflows

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** repository owner + OpenCode  
**Issue/PR:** follow-up required-check repair for PR #598  
**Last updated:** 2026-09-19

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

The existing Gitleaks and CodeQL required checks complete their real security work on private-repository pull requests instead of failing after authentication or provider-metadata access errors. Existing check identities, scan depth and fail-closed behavior remain unchanged.

## Repository reconnaissance

### Current behavior

- `Gitleaks all refs` checks out full history with `persist-credentials: false`, then an explicit `git fetch` fails because the private repository requires authentication.
- CodeQL scans all 648 JavaScript/TypeScript files and exports SARIF, then its action receives `403 Resource not accessible by integration` while reading the workflow run because the workflow does not grant `actions: read`.
- Browser tests on PR #598 passed, but evidence upload failed because Actions artifact storage was full. With explicit owner approval, 1,986 API records marked expired (29,058,215,460 bytes) were permanently deleted; both unexpired artifacts were preserved.
- Scheduled runs on current `main` reproduce the Gitleaks and CodeQL failures, so neither failure was introduced by PR #598.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `.github/workflows/secret-history.yml` | Owns the required all-ref secret scan | Preserve scan command and read-only token; repair fetch authentication |
| `.github/workflows/codeql.yml` | Owns the required exact-head CodeQL analysis | Add only workflow-run read access |
| `scripts/agent-policy.test.mjs` | Guards required security-check contracts offline | Add regression assertions for both required permissions |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Defines Class 3 and stable required checks | Do not change policy or check identities |

### Existing tests and constraints

- `npm run test:ci-policy` verifies workflow pins, required check identities and PR triggers.
- `npm run check:workflow-pins` verifies immutable action references.
- CI/security workflow changes are Class 3, require a full packet, exact-head checks and owner review.
- Required security scans cannot report not-applicable.

### Similar implementation and recent history

- `actions/checkout` already receives `contents: read`; its default persisted credential is designed for later authenticated Git commands and is removed in post-job cleanup.
- Existing provider-check guards in `scripts/agent-policy.test.mjs` are the owning regression suite.

### Open questions

- [x] Confirm whether the failures are scan findings or workflow/provider failures.
- [x] Confirm the least permissions required for each failing operation.
- [x] Obtain explicit owner approval before artifact deletion and workflow repair.

## Research

### Research scope and source selection

- Decision question: What minimum token access restores authenticated all-ref fetch and CodeQL analysis without weakening either check?
- Reference map consulted: not required; primary GitHub documentation and the pinned action documentation directly own this behavior.
- Source budget: three focused official sources.
- Expected decision or uncertainty to resolve: credential lifetime, least-privilege workflow permissions and artifact deletion semantics.

### Questions researched

1. How does checkout authenticate later Git commands?
2. How should a workflow grant minimum `GITHUB_TOKEN` access?
3. Is artifact deletion reversible, and does it reclaim Actions storage?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [Use GITHUB_TOKEN for authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication) | GitHub documentation | 2026-09-19 | Declare minimum permissions with the workflow `permissions` key | Does not diagnose this repository's logs |
| [actions/checkout README](https://github.com/actions/checkout/blob/main/README.md) | Official action documentation | 2026-09-19 | `fetch-depth: 0` fetches all history; persisted credentials enable later authenticated Git commands and are removed in cleanup | Documents current action behavior; this repo remains pinned to a reviewed commit |
| [Removing workflow artifacts](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/removing-workflow-artifacts) | GitHub documentation | 2026-09-19 | Deletion reclaims Actions storage and cannot be restored | Provider recalculation may be delayed |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Persist checkout credential with `contents: read` | Native, minimal and cleaned up by checkout | Credential remains available to later steps in this trusted workflow | Selected |
| Construct an authenticated remote/header manually | Can limit use to one command | More secret handling and shell complexity | Rejected |
| Remove the explicit all-ref fetch | Smaller workflow | Relies implicitly on checkout ref layout and weakens the explicit all-ref contract | Rejected |
| Grant CodeQL `actions: read` | Narrow access matching the failed read endpoint | Adds workflow-run metadata visibility | Selected |
| Skip/no-op failed checks | Green shell | Defeats required security evidence | Rejected |

### Research decision

Use the built-in read-only `GITHUB_TOKEN` through checkout's supported credential persistence for Gitleaks, and add only `actions: read` for CodeQL. Preserve the scans, events, required identities and existing `security-events: write`. No third-party orchestration or broader provider permission is applicable.

### Adoption review

Not applicable. No dependency, provider or service is being added; the change repairs permissions for pinned existing actions.

## Specification

### Problem

Contributors cannot obtain mergeable exact-head evidence because required security workflows fail on provider access after or before their scans, independent of the submitted code.

### User stories

- As a reviewer, I can rely on required Gitleaks and CodeQL checks to represent real completed scans.
- As a contributor, I can receive actionable security failures rather than unrelated authentication errors.

### Acceptance criteria

- [ ] Gitleaks can authenticate its explicit fetch while retaining only `contents: read`.
- [ ] CodeQL can read required workflow-run metadata and upload real exact-head analysis.
- [ ] Offline policy tests fail if either permission is removed.
- [ ] Required check names, triggers and scan commands remain unchanged.
- [ ] Exact-head provider runs complete successfully after the repair.

### Required states

- Loading: not applicable.
- Empty: a repository with no findings still runs both real scans.
- Populated: findings remain provider-reported and blocking.
- Validation/error: authentication or action failures remain red, not swallowed.
- Recovery/undo: revert the focused workflow/test commit.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: not applicable.

### Financial and security constraints

- No product, ledger, schema, RLS or production-data behavior changes.
- Tokens remain least-privilege: Gitleaks `contents: read`; CodeQL `actions: read`, `contents: read`, `packages: read`, `security-events: write`.
- No secret value is logged or committed.

### Out of scope

- Changing branch protection, rulesets, required identities or repository-wide default token permissions.
- Weakening, skipping or replacing either security scan.
- Changing browser-test selection or artifact evidence policy.

## Implementation plan

### Architecture fit

GitHub workflow files own provider execution permissions; the existing agent-policy suite owns offline drift prevention. No runtime application boundary should change.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `.github/workflows/secret-history.yml` | Persist checkout credentials explicitly | Authenticate the existing private-repository all-ref fetch |
| `.github/workflows/codeql.yml` | Add `actions: read` | Allow the pinned CodeQL action to read workflow-run metadata |
| `scripts/agent-policy.test.mjs` | Assert both permission contracts | Prevent recurrence |
| This packet and PR memory | Record scope, permission and evidence | Required Class 3 provenance |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: GitHub-hosted Actions only.
- Rollback: revert the workflow and test commit; this restores the previous failures and does not affect product data.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Gitleaks token gains write access | Keep workflow-level permission at `contents: read` and assert it |
| Credential is disabled again | Assert explicit `persist-credentials: true` adjacent to full-history checkout |
| CodeQL receives broader access than needed | Add only `actions: read`; preserve existing explicit permissions |
| A successful shell replaces a real scan | Preserve action and scan steps plus required-identity tests |
| Artifact quota remains stale after cleanup | Wait for provider recalculation and require fresh exact-head browser evidence |

### Verification plan

- Static: `npm run check:workflow-pins`, `npm run check:knowledge`, `npm run typecheck`.
- Unit/domain: `npm run test:ci-policy`; no product unit behavior changed.
- Database: selected by fail-safe CI classification for workflow changes; no database truth changed.
- Browser flow: selected by fail-safe CI classification; browser commands must pass and artifacts must upload after quota recalculation.
- Responsive/visual: selected by fail-safe CI classification; no visual behavior changed.
- Production/manual: exact-head GitHub Gitleaks and CodeQL runs; no deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Document diagnosis, research and permission boundary | Owner authorization | This packet | done |
| T2 | Add workflow permissions and regression tests | T1 | Focused diff + 191 local policy tests | done |
| T3 | Create PR memory and run local gates | T2 | Local gates passed; PR memory awaits PR number | in_progress |
| T4 | Push and obtain exact-head provider evidence | T3 | Required checks | todo |
| T5 | Owner reviews and merges dedicated repair | T4 | Merge decision | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-19 | human_owner | researcher | discovery | Approval to repair CI and clean artifacts | Exact repair not yet selected | Diagnose failures and inventory storage |
| 2026-09-19 | researcher | planner | specified | PR #598 logs, current-main scheduled failures, official sources | Provider recalculation timing | Define minimum repair and rollback |
| 2026-09-19 | planner | implementer | planned | This packet and explicit deletion approval | Exact-head provider behavior | Implement tests and workflow changes |
| 2026-09-20 | implementer | evaluator | evaluating | Workflow diff, regression test, local security/application/browser gates | Database and provider checks require GitHub runners | Create draft PR and verify exact head |

### Current permission boundary

- Granted scope: `branch_write` for `ci/repair-security-checks`; one completed provider action deleting exactly 1,986 artifacts marked expired.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, dedicated branch/PR, GitHub Actions artifact records.
- Forbidden writes: `main`, branch protection/rulesets, secrets, deployments and product/production data.
- Human approval required before: merge, any additional artifact deletion or provider configuration write.
- Rollback or stop condition: stop if the repair requires broader token access, altered required checks or skipped scans. Artifact deletion was irreversible; both unexpired records were preserved.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Minimum workflow permissions | Workflow diff plus 191 passing CI-policy tests | pass |
| Real exact-head scans | Pending provider runs | pending |
| Artifact storage cleanup | Provider API reports two retained unexpired artifacts | pass |

### Research and adoption evidence

- Selected sources still support the final implementation: yes; the implementation uses checkout's documented credential behavior and GitHub's least-privilege workflow permissions.
- Important source limitations remain respected: provider behavior requires exact-head verification.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: local workflow contracts and the exact Gitleaks all-ref command pass.
- Security/ownership: permissions remain read-only except the existing required SARIF upload; no secret or product data was accessed.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: the existing policy test suite owns both new assertions; no new test helper or parser was added.
- Scope compliance: only the two failed workflows, their contract test and required provenance are changed.

### Remaining limitations

- GitHub may take 6-12 hours to recalculate artifact usage after deletion.
- Local database verification was unavailable because Docker is absent; the fail-safe CI classifier will run it on GitHub.
- The first local authenticated browser invocation nested `npx` inside a temporary `npx` environment, causing Lighthouse resolution to fail. The cause was reproduced directly; the complete suite passed with Node 22.23.2/npm 10.9.8 placed on `PATH`, matching setup-node rather than nested execution.

## Delivery record

- Branch: `ci/repair-security-checks`
- PR: pending
- Squash commit: pending owner action
- CI run: pending; local evidence is 1,334 unit tests, 191 policy tests, production build, 148 demo browser tests, 30 authenticated browser passes with one configured skip, 595 UI-audit passes with 141 configured skips, and Gitleaks over 3,837 commits
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending completion
