# CodeQL and repository-ruleset alignment

- **Execution state:** evaluating
- **Active role:** CI/security policy maintainer
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **Branch:** `ci/align-codeql-with-ruleset`
- **Base:** `main@923fc7b80ada67e548628ef2e85b0837780f9ed3`
- **Pull request:** #221
- **Decision date:** 2026-08-02

## Repository reconnaissance

The protected repository requires code-scanning results before merge. The CodeQL workflow previously classified documentation-only diffs as `codeql=false`, completed the stable job name successfully and skipped both CodeQL initialization and analysis.

Observed result on PR #218:

- `Analyze JavaScript and TypeScript` concluded success;
- `Initialize CodeQL` and `Analyze` were skipped;
- all named required checks were green;
- merge remained blocked with `Code scanning is waiting for results from CodeQL`.

The application/database/browser risk classifier was working as designed. The defect was the mismatch between a provider-side code-scanning rule and a workflow that allowed a successful shell without uploading analysis data.

## Research

### Decision question

How should MoneyFlow preserve risk-proportional application CI while satisfying the existing repository code-scanning rule without bypassing protection?

### Evidence

- GitHub's merge response explicitly required CodeQL results for the exact head or merge candidate.
- Workflow job steps confirmed that CodeQL analysis was skipped on a docs-only pull request.
- The connector exposes no repository-ruleset mutation tool in this environment.
- Required-check success alone did not satisfy the code-scanning rule.

### Limits

This packet does not claim that every documentation change has JavaScript risk. It records a provider compatibility requirement. Provider-side rules may later be intentionally changed by the owner, but the workflow and ruleset must remain aligned at all times.

## Specification

### Required behavior

- Every pull request targeting `main` must upload a real JavaScript/TypeScript CodeQL analysis.
- The stable check name remains `Analyze JavaScript and TypeScript`.
- Main pushes, scheduled runs and manual runs continue to analyze.
- Application verify, database and browser gates remain risk-proportional.
- CodeQL actions, permissions and pinning remain unchanged.
- No branch-protection or ruleset setting is bypassed.

### Acceptance criteria

- CodeQL `Initialize` and `Analyze` run on a documentation-only PR.
- The exact PR head has successful CodeQL, CI and secret-history workflows.
- A protected merge no longer reports missing CodeQL analysis after provider processing completes.
- Risk policy explicitly distinguishes application risk selection from provider-required security analysis.
- Rollback does not recreate the mismatch.

## Implementation plan

1. Remove the CodeQL skip path and conditional analysis from `.github/workflows/codeql.yml`.
2. Preserve the stable job name, pinned actions, permissions and build mode.
3. Update `RISK_PROPORTIONAL_DELIVERY.md` with the provider-rule exception and failure mode.
4. Record PR #221 in bounded project memory.
5. Run exact-head CI, real CodeQL analysis and secret scan.
6. Merge only after protected checks and code-scanning results are accepted.
7. Re-run blocked documentation PRs under the corrected workflow.

### Rollback

Rollback is allowed only after the owner intentionally removes or replaces the provider code-scanning requirement. Restoring conditional analysis while the rule remains active recreates permanently unmergeable documentation PRs.

## Tasks

- [x] Reproduce the false-green/missing-analysis state on PR #218.
- [x] Confirm `Initialize CodeQL` and `Analyze` were skipped.
- [x] Make protected CodeQL analysis unconditional.
- [x] Update risk-proportional delivery policy.
- [x] Add PR #221 memory record.
- [ ] Verify exact-head workflow steps.
- [ ] Verify protected merge acceptance.
- [ ] Archive this packet after merge and acceptance.

## Evaluation

### Scope review

Changed scope is limited to CodeQL workflow behavior, delivery policy documentation, this work packet and PR memory. No application runtime, financial logic, database, dependency, provider setting or production data changes.

### Verification

Required:

- project knowledge and CI classification;
- full CI gates selected because security workflow policy changes;
- real CodeQL initialization and analysis;
- secret-history scan;
- protected merge attempt after provider processing.

Database and browser jobs may run because CI/security policy changes fail safe; their success does not substitute for CodeQL analysis.

### Current decision boundary

PR #221 is candidate evidence until merge. The owner retains provider-ruleset authority. This branch changes repository workflow code only.

## Handoff record

- 2026-08-02: PR #218 exposed a stable-check false green and code-scanning merge deadlock.
- 2026-08-02: owner instructed the agent to resolve the blocked delivery flow.
- 2026-08-02: workflow and policy alignment implemented on PR #221.

### Current permission boundary

Branch, workflow and documentation writes only. No provider-ruleset mutation, dependency change, schema change or production mutation.
