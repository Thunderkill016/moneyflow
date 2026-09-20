# Repair required security workflows

**Status:** completed
**Execution state:** completed
**Active role:** human owner
**Permission scope:** branch_write
**Owner:** repository owner + OpenCode
**Issue/PR:** [PR #599](https://github.com/Thunderkill016/moneyflow/pull/599), follow-up required-check repair for PR #598
**Last updated:** 2026-09-19

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

The existing Gitleaks and CodeQL required checks complete their real security work instead of failing on unavailable provider features. Existing check identities, scan depth and fail-closed behavior remain unchanged.

## Repository reconnaissance

### Current behavior

- `Gitleaks all refs` checks out full history with `persist-credentials: false`, then an explicit `git fetch` fails because the private repository requires authentication.
- CodeQL scans all 648 JavaScript/TypeScript and GitHub Actions files and exports SARIF. Adding `actions: read` exposed the underlying terminal error: GitHub rejected code-scanning uploads while this repository was private without GitHub Code Security.
- Browser tests on PR #598 passed, but evidence upload failed because Actions artifact storage was full. With explicit owner approval, 1,986 API records marked expired (29,058,215,460 bytes) were permanently deleted; both unexpired artifacts were preserved.
- Scheduled runs on current `main` reproduce the Gitleaks and CodeQL failures, so neither failure was introduced by PR #598.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `.github/workflows/secret-history.yml` | Owns the required all-ref secret scan | Preserve scan command and read-only token; repair fetch authentication |
| `.github/workflows/codeql.yml` | Owns the required exact-head CodeQL analysis | Run real queries and upload SARIF with the supported public-repository capability |
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

- Decision question: What minimum configuration restores authenticated all-ref fetch and licensed, provider-enforced CodeQL analysis?
- Reference map consulted: not required; primary GitHub documentation and the pinned action documentation directly own this behavior.
- Source budget: four focused official sources.
- Expected decision or uncertainty to resolve: credential lifetime, least-privilege workflow permissions, CodeQL license eligibility and artifact deletion semantics.

### Questions researched

1. How does checkout authenticate later Git commands?
2. How should a workflow grant minimum `GITHUB_TOKEN` access?
3. May CodeQL run in automated CI for a private repository without a paid entitlement?
4. Is artifact deletion reversible, and does it reclaim Actions storage?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [Use GITHUB_TOKEN for authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication) | GitHub documentation | 2026-09-19 | Declare minimum permissions with the workflow `permissions` key | Does not diagnose this repository's logs |
| [actions/checkout README](https://github.com/actions/checkout/blob/main/README.md) | Official action documentation | 2026-09-19 | `fetch-depth: 0` fetches all history; persisted credentials enable later authenticated Git commands and are removed in cleanup | Documents current action behavior; this repo remains pinned to a reviewed commit |
| [GitHub CodeQL terms](https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md) | GitHub license terms | 2026-09-20 | Automated analysis of a private repository is excluded without a paid GitHub Advanced Security entitlement; public OSI-licensed codebases may be analyzed | Legal terms, not a technical capability probe |
| [Removing workflow artifacts](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/removing-workflow-artifacts) | GitHub documentation | 2026-09-19 | Deletion reclaims Actions storage and cannot be restored | Provider recalculation may be delayed |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Persist checkout credential with `contents: read` | Native, minimal and cleaned up by checkout | Credential remains available to later steps in this trusted workflow | Selected |
| Construct an authenticated remote/header manually | Can limit use to one command | More secret handling and shell complexity | Rejected |
| Remove the explicit all-ref fetch | Smaller workflow | Relies implicitly on checkout ref layout and weakens the explicit all-ref contract | Rejected |
| Grant CodeQL `actions: read` and retain upload | Resolves metadata access and preserves provider alert enforcement | Requires public visibility or paid Code Security | Selected after owner approved public visibility |
| Run CodeQL with `upload: never` | Executes pinned queries without provider storage | CodeQL terms exclude this private-repository CI use, SARIF is not retained, and findings do not fail the action by themselves | Rejected after audit |
| Make the repository public | Restores licensed analysis and provider alert storage without a paid entitlement | Makes source, history, issues and PRs public | Selected by owner after all-ref Gitleaks passed |
| Buy Code Security | Preserves private visibility and provider alerts | Billing change | Rejected by owner |
| Skip/no-op failed checks | Green shell | Defeats required security evidence | Rejected |

### Research decision

Use the built-in read-only `GITHUB_TOKEN` through checkout's supported credential persistence for Gitleaks. After the owner-approved visibility change, retain `actions: read` for action metadata and `security-events: write` for the pinned analyze action's SARIF upload. Preserve query execution, events and required identities. No third-party orchestration is applicable.

### Adoption review

Not applicable. No dependency, provider or service is being added; the change repairs permissions for pinned existing actions.

## Specification

### Problem

Contributors cannot obtain mergeable exact-head evidence because required security workflows fail on provider access after or before their scans, independent of the submitted code.

### User stories

- As a reviewer, I can rely on required Gitleaks and CodeQL checks to represent real completed scans.
- As a contributor, I can receive actionable security failures rather than unrelated authentication errors.

### Acceptance criteria

- [x] Gitleaks can authenticate its explicit fetch while retaining only `contents: read`.
- [x] CodeQL executes real exact-head queries, uploads SARIF and succeeds through public-repository code scanning.
- [x] Offline policy tests fail if either permission is removed.
- [x] Required check names, triggers and scan commands remain unchanged.
- [x] Exact-head provider runs complete successfully after the repair.

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
- Tokens remain least-privilege: Gitleaks `contents: read`; CodeQL `actions: read`, `contents: read`, `packages: read` and `security-events: write` for SARIF upload.
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
| `.github/workflows/codeql.yml` | Add metadata read and retain SARIF upload permission | Run pinned CodeQL queries within available public-repository capability |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Preserve the uploaded-analysis contract | Keep policy aligned with provider enforcement |
| `scripts/agent-policy.mjs` | Describe the real fail-closed exact-head analysis | Keep machine projection aligned with policy |
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
| CodeQL receives broader access than needed | Keep metadata/package/content access read-only and grant `security-events: write` only for upload |
| CodeQL becomes a no-op or local-only scan | Assert upload is not disabled and no `skip-queries: true`; preserve init/analyze identity guards |
| A successful shell replaces a real scan | Preserve action and scan steps plus required-identity tests |
| Artifact quota remains stale after cleanup | Wait for provider recalculation and require fresh exact-head browser evidence |

### Verification plan

- Static: `npm run check:workflow-pins`, `npm run check:knowledge`, `npm run typecheck`.
- Unit/domain: `npm run test:ci-policy`; no product unit behavior changed.
- Database: selected by fail-safe CI classification for workflow changes; no database truth changed.
- Browser flow: selected by fail-safe CI classification; browser commands must pass and artifacts must upload after quota recalculation.
- Responsive/visual: selected by fail-safe CI classification; no visual behavior changed.
- Production/manual: exact-head GitHub Gitleaks and uploaded CodeQL analysis; no deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Document diagnosis, research and permission boundary | Owner authorization | This packet | done |
| T2 | Add workflow permissions and regression tests | T1 | Focused diff + 191 local policy tests | done |
| T3 | Create PR memory and run local gates | T2 | Local gates and `PR-599.md` | done |
| T4 | Push and obtain exact-head provider evidence | T3 | Required checks | done |
| T5 | Owner reviews and merges dedicated repair | T4 | Merge decision | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-19 | human_owner | researcher | discovery | Approval to repair CI and clean artifacts | Exact repair not yet selected | Diagnose failures and inventory storage |
| 2026-09-19 | researcher | planner | specified | PR #598 logs, current-main scheduled failures, official sources | Provider recalculation timing | Define minimum repair and rollback |
| 2026-09-19 | planner | implementer | planned | This packet and explicit deletion approval | Exact-head provider behavior | Implement tests and workflow changes |
| 2026-09-20 | implementer | evaluator | evaluating | Workflow diff, regression test, local security/application/browser gates | Database and provider checks require GitHub runners | Create draft PR and verify exact head |
| 2026-09-20 | evaluator | human_owner | specified | Exact-head scan completed but SARIF upload was rejected; API and official docs confirm private code scanning is disabled | Choose billing/visibility change, local analysis or pause | Select truthful CodeQL model |
| 2026-09-20 | human_owner | implementer | implementing | Owner selected real local CodeQL analysis without upload | Exact-head behavior still unverified | Align workflow, policy and tests |
| 2026-09-20 | evaluator | human_owner | specified | Official CodeQL terms prohibit the selected automated private-repository use; local-only SARIF was neither retained nor finding-enforced | Choose public visibility, paid Code Security, OSS replacement or pause | Select a licensed security model |
| 2026-09-20 | human_owner | implementer | implementing | Owner selected public repository visibility; provider read-back reports `public`, secret scanning enabled and push protection enabled | Uploaded exact-head CodeQL still unverified | Restore SARIF upload contract and rerun exact-head checks |
| 2026-09-20 | evaluator | human_owner | review_ready | Head `e770aee56361bb260cdfee1e5b790bb6fc3f2727`; CodeQL run `35462743313`; Gitleaks run `35462743314`; CI run `35462743409`; provider reports zero CodeQL results across 87 rules and all evidence artifacts uploaded | Final evidence bookkeeping commit still needs exact-head checks | Review PR and decide merge after final head is green |

### Current permission boundary

- Granted scope: `branch_write` for `ci/repair-security-checks`; one completed provider action deleting exactly 1,986 artifacts marked expired.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, dedicated branch/PR, GitHub Actions artifact records.
- Forbidden writes: `main`, branch protection/rulesets, secrets, deployments and product/production data.
- Human approval required before: merge, any additional artifact deletion or provider configuration write. The one approved visibility change is complete.
- Rollback or stop condition: stop if the repair requires broader token access, altered required checks or skipped scans. Artifact deletion was irreversible; both unexpired records were preserved.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Minimum workflow permissions | Workflow diff plus 191 passing CI-policy tests | pass |
| Real exact-head scans | CodeQL `35462743313` and Gitleaks `35462743314` on `e770aee56361bb260cdfee1e5b790bb6fc3f2727` | pass |
| Artifact storage cleanup | Provider preserved the two original unexpired artifacts and accepted three new exact-head evidence uploads | pass |
| Browser and responsive evidence | CI `35462743409`; both browser suites, UI audit, three uploads and aggregate `e2e` passed | pass |

### Research and adoption evidence

- Selected sources still support the final implementation: yes; the implementation uses checkout's documented credential behavior and GitHub's least-privilege workflow permissions.
- Important source limitations remain respected: provider behavior requires exact-head verification.
- New tool/dependency/pattern passed the adoption review, or not applicable: not applicable.

### Review findings

- Correctness: local workflow contracts and the exact Gitleaks all-ref command pass.
- Security/ownership: Gitleaks permissions are read-only; CodeQL write access is limited to security-event upload; all-ref Gitleaks passed before public visibility was applied; no secret or product data was accessed.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: the existing policy test suite owns both new assertions; no new test helper or parser was added.
- Scope compliance: only the two failed workflows, their contract test and required provenance are changed.

### Remaining limitations

- GitHub's storage recalculation completed: the accepted CI run uploaded all three evidence artifacts, and the API reports five unexpired artifacts totaling 44,686,909 bytes.
- Local database verification was unavailable because Docker is absent; exact-head provider CI completed fresh reset, pgTAP and archive round trips successfully.
- The first local authenticated browser invocation nested `npx` inside a temporary `npx` environment, causing Lighthouse resolution to fail. The cause was reproduced directly; the complete suite passed with Node 22.23.2/npm 10.9.8 placed on `PATH`, matching setup-node rather than nested execution.

## Delivery record

- Branch: `ci/repair-security-checks`
- PR: [#599](https://github.com/Thunderkill016/moneyflow/pull/599) — merged 2026-09-19
- Squash commit: `bfbb1787`
- CI run: `35462743409` passed on `e770aee56361bb260cdfee1e5b790bb6fc3f2727`; CodeQL `35462743313` and Gitleaks `35462743314` passed. Local evidence is 1,334 unit tests, 191 policy tests, production build, 148 demo browser tests, 30 authenticated browser passes with one configured skip, 595 UI-audit passes with 141 configured skips, and Gitleaks over 3,837 commits.
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: this closeout
