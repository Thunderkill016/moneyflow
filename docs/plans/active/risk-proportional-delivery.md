# Risk-proportional CI and delivery policy

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** OpenAI agent for Thunderkill016  
**Issue/PR:** branch `agent/risk-proportional-ci`  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow keeps strict controls for financial, database, authentication and production-risk changes while documentation, database-only, domain-only and UI changes stop paying for unrelated CI gates. Required check names remain stable so existing merge protection is not silently weakened.

## Repository reconnaissance

### Current behavior

- Every non-draft PR starts `verify`, `database` and `e2e` regardless of changed paths.
- `e2e` installs Chromium and WebKit, runs the baseline browser suite and a 13-project cross-device audit even for database-only changes.
- CodeQL runs on every pull request even when no JavaScript, TypeScript, dependency or workflow security surface changed.
- Documentation describes nearly every non-trivial change as requiring a full work packet and all gates.
- PR #211 demonstrates the mismatch: a migration/index-only change triggered application build, browser smoke and the full responsive audit.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `.github/workflows/ci.yml` | Owns required `verify`, `database` and `e2e` checks | Keep names; select heavy steps inside jobs |
| `.github/workflows/codeql.yml` | Owns required JavaScript/TypeScript security analysis | Keep job identity; skip analysis internally when not applicable |
| `playwright.config.ts` | Chromium baseline browser flow | Run for runtime application changes |
| `playwright.audit.config.ts` | 13-project responsive/cross-browser audit | Run only for visual/layout/audit changes |
| `scripts/` | Repository-owned contracts | Add classifier and tests without a third-party action |
| `AGENTS.md`, `README.md` | Entry-point delivery rules | Point to one risk-proportional source of truth |

### Existing tests and constraints

- Related unit tests: current Node unit suite plus new classifier contract tests.
- Database/RLS tests: fresh Supabase reset and 15 pgTAP files.
- Browser tests: baseline Playwright suite plus `e2e/audit` cross-device projects.
- Product/architecture rules: each verification layer proves a different boundary; autonomous agents cannot change branch protection or merge.

### Similar implementation and recent history

- Next.js uses a `changes` job and conditions expensive jobs on outputs such as `docs-only`.
- Supabase uses a changed-path filter inside workflows before installing dependencies or running Studio e2e/docs jobs.
- PR #207 showed that database/deployment skew needs strict database and production controls; this policy preserves those controls when the affected boundary changes.

### Open questions

- [x] How can required check names remain stable while expensive work is skipped? Keep workflows/jobs present and condition individual steps.
- [x] Which changes must fail safe to full verification? CI policy changes, main pushes, manual runs and unknown/empty diffs.

## Research

### Research scope and source selection

- Decision question: How should a small Next.js/Supabase finance project reduce CI latency without weakening required checks or high-risk financial/data controls?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus current primary repository/docs sources.
- Source budget: five sources because the decision required one platform constraint, two real-repository patterns and two engineering-review principles.
- Expected decision or uncertainty to resolve: whether to use workflow path filters, in-workflow classification, labels, or unconditional full CI.

### Questions researched

1. What happens to required checks when an entire GitHub Actions workflow is skipped by path filters?
2. How do large repositories avoid running every expensive job for documentation or unrelated subsystem changes?
3. What review standard balances code health with forward progress?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs | Official GitHub documentation | 2026-08-02 | A workflow skipped by path/branch filters can leave required checks pending and block merge | Does not prescribe MoneyFlow's path taxonomy |
| https://github.com/vercel/next.js/blob/canary/.github/workflows/build_and_test.yml | Production open-source repository | 2026-08-02 | Next.js computes changed areas and conditions expensive jobs, including docs-only handling | Monorepo scale and matrix complexity are not copied |
| https://github.com/supabase/supabase/blob/master/.github/workflows/studio-e2e-test.yml | Production open-source repository | 2026-08-02 | Supabase filters relevant paths before dependency installation and Studio e2e work | MoneyFlow avoids adding `dorny/paths-filter`; it owns a small classifier script |
| https://google.github.io/eng-practices/review/reviewer/standard.html | Engineering practice guide | 2026-08-02 | Review should favor safe improvements over unattainable perfection | Human-review guidance, not a CI implementation |
| https://google.github.io/eng-practices/review/developer/small-cls.html | Engineering practice guide | 2026-08-02 | Small changes review, merge and roll back faster and are less likely to introduce bugs | No fixed line-count threshold is adopted |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep unconditional full CI | Simple and maximally conservative | Unrelated latency, flaky-gate repair, branch drift and wasted compute | Rejected |
| Top-level `paths` / `paths-ignore` | Very small YAML diff | Required checks can remain pending and block merge | Rejected |
| PR labels manually select gates | Flexible | Human/agent can mislabel; safety depends on manual metadata | Rejected as primary mechanism |
| Third-party changed-path action | Mature matching syntax | Adds supply-chain dependency and adoption overhead | Rejected for this small repo |
| Repository-owned classifier + stable jobs | Testable, explicit, no dependency, preserves check names | Path taxonomy must be maintained | Selected |

### Research decision

Observed facts support in-workflow classification rather than skipping required workflows. MoneyFlow will preserve required check identities, run only relevant heavy steps on pull requests, and force complete verification on `main` and manual runs. It adopts the changed-area pattern from Next.js/Supabase but not their monorepo matrices, third-party path-filter dependency or organizational complexity.

### Adoption review

- Observed problem: unrelated database, browser and security jobs materially delay small PRs and create opportunities for flaky unrelated failures.
- Existing or simpler alternatives considered: unconditional CI, top-level path filters and labels.
- License/code-reuse compatibility: no copied source code and no new dependency; repository-owned implementation.
- Secrets, user-data and privacy exposure: none; classifier reads repository paths only.
- Runtime, bundle, deployment and operational cost: no product-runtime cost; small CI classify job.
- Owning boundary and maintenance responsibility: `scripts/classify-ci-changes.mjs` and CI workflows.
- Migration and rollback: single focused PR; restore unconditional workflow steps to roll back.
- Verification plan: classifier unit tests, exact-head CI self-test (workflow changes force every gate), PR inspection and post-merge main run.
- Removal condition if the expected benefit does not appear: revert if escaped defects rise or classifier maintenance exceeds saved CI/review time.

## Specification

### Problem

The owner and coding agents wait for database, browser and responsive checks that often cannot detect defects in the actual diff. The process also requires full planning artifacts too broadly, shifting work from product iteration to process maintenance.

### User stories

- As the owner, I can merge low-risk improvements after relevant checks finish, so that MoneyFlow develops faster without hiding meaningful risk.
- As an agent, I receive explicit gate selection from repository code, so that I do not weaken checks ad hoc.
- As a reviewer, I still see stable required check names and explicit “not required” results.

### Acceptance criteria

- [ ] Documentation-only PRs run knowledge/classifier contracts without `npm ci`, database or browser work.
- [ ] Pure database PRs run lightweight repository contracts and database tests but not unrelated application install/build or browser/UI audit.
- [ ] Domain runtime PRs run full verify, browser smoke and CodeQL but not UI audit unless a visual surface changes.
- [ ] UI PRs run full verify, browser smoke and responsive audit.
- [ ] CI-policy changes, main pushes and manual runs execute every gate.
- [ ] Existing check names remain `verify`, `database`, `e2e` and `Analyze JavaScript and TypeScript`.
- [ ] No branch-protection, required-check setting, workflow permission or `CODEOWNERS` change is made.
- [ ] Documentation defines when inline plans, concise PR plans and full work packets apply.

### Required states

- Loading: not applicable.
- Empty: empty/unknown diff fails safe to a full run.
- Populated: selected outputs and reason appear in the Actions summary.
- Validation/error: classifier contract tests cover representative paths.
- Recovery/undo: revert workflow and policy commit.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: only selected for actual UI changes.
- Accessibility: audit remains required for relevant UI changes.

### Financial and security constraints

- No financial product behavior or data changes.
- Database/RLS gates remain mandatory for database boundary changes.
- Auth, financial semantics and production writes remain Class 3 with owner review.

### Out of scope

- Changing branch protection or required checks in GitHub settings.
- Enabling auto-merge.
- Replacing Playwright, Supabase, CodeQL or secret scanning.
- Optimizing individual test runtime beyond gate selection.

## Implementation plan

### Architecture fit

CI selection belongs to repository automation under `scripts/` and `.github/workflows/`. Policy belongs under `docs/engineering/`. No product-runtime dependency or architectural layer is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/classify-ci-changes.mjs` | Classify changed paths and emit stable outputs | Central testable policy |
| `scripts/classify-ci-changes.test.mjs` | Test representative change classes and fail-safe behavior | Prevent silent weakening |
| `.github/workflows/ci.yml` | Add classify job; condition heavy steps while preserving job names | Reduce PR latency safely |
| `.github/workflows/codeql.yml` | Condition analysis inside the existing job | Avoid irrelevant scans without pending required checks |
| `package.json` | Add classifier contract command | Repeatable local/CI verification |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Define risk classes, artifacts and gates | Durable source of truth |
| `AGENTS.md`, `README.md` | Point entry workflow to risk-proportional policy | Remove blanket requirements |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: required job/check names are retained.
- Rollback: restore previous workflows and entry-point wording.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| A relevant path is misclassified low risk | Unknown executable changes still receive full verify; representative tests; main/manual full run |
| Required checks disappear or stay pending | Workflows and jobs always start; only internal steps are conditional |
| Database behavior changes outside pure migration/test paths | Broad `supabase/**` still selects database; only migrations/tests/seed/roles qualify for the application-verify exemption |
| UI regression from a non-component runtime change | All `src/**` changes receive baseline browser smoke; shared visual paths receive full audit |
| Classifier itself weakens its own checks | Classifier and CI workflow changes force every gate |
| Policy becomes another bureaucracy layer | One short decision table; no labels, external action or new management framework |

### Verification plan

- Static: parse workflow YAML; run classifier tests; exact-head knowledge/deployment/architecture/lint/typecheck/build.
- Unit/domain: existing suite plus classifier tests.
- Database: forced because CI workflow/classifier changes.
- Browser flow: forced because CI workflow/classifier changes.
- Responsive/visual: forced because CI workflow/classifier changes, to self-test the full path.
- Production/manual: after owner merge, verify the `main` push runs all gates; no product route deployment claim required.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record research and risk policy | reconnaissance | policy + source table | done |
| T2 | Implement and test path classifier | T1 | Node test suite | done |
| T3 | Refactor CI and CodeQL with stable job names | T2 | YAML parse + exact-head Actions | in_progress |
| T4 | Update entry-point delivery rules | T1 | knowledge contract | in_progress |
| T5 | Evaluate representative path classes and final diff | T2-T4 | acceptance matrix | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | planner | specified | current workflows, PR #211 evidence, five primary sources | exact required-check settings are provider-side and not modified | Plan stable-job implementation |
| 2026-08-02 | planner | implementer | planned | this packet, classifier taxonomy, rollback | exact-head Actions not run yet | Implement branch and open PR |

### Current permission boundary

- Granted scope: `branch_write` for one CI/governance branch and PR.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch `agent/risk-proportional-ci`.
- Forbidden writes: `main`, merge, branch protection, required-check settings, `CODEOWNERS`, provider/production data.
- Human approval required before: merge and any GitHub settings change.
- Rollback or stop condition: if stable check identity cannot be preserved, stop rather than weakening protection.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Classifier path behavior | `node --test scripts/classify-ci-changes.test.mjs` | pass locally in isolated draft |
| Workflow syntax | YAML parse of `ci.yml` and `codeql.yml` | pass locally in isolated draft |
| Exact-head required checks | GitHub Actions on PR | pending |

### Research and adoption evidence

- Selected sources support changed-area selection and stable in-workflow checks.
- GitHub's pending-check limitation is explicitly respected.
- No new action, dependency, provider or product-runtime pattern is adopted.

### Review findings

- Correctness: pending exact-head CI.
- Security/ownership: high-risk gates preserved; no provider writes.
- UI/UX/accessibility: UI audit selection remains conservative.
- Maintainability/duplication: one classifier owns path taxonomy for CI and CodeQL.
- Scope compliance: no product, database or branch-protection changes.

### Remaining limitations

- Path ownership can evolve; new top-level executable areas must update classifier tests.
- This change reduces unnecessary gates but does not optimize the runtime of gates that remain selected.

## Delivery record

- Branch: `agent/risk-proportional-ci`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable to product behavior; verify main-branch full CI after merge
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
