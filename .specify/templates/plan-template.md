# Implementation Plan: <feature name>

**Feature spec:** `specs/<feature-slug>/spec.md`
**Branch:** `<focused-branch>`
**Change class:** Class 0 | Class 1 | Class 2 | Class 3
**Work packet:** `docs/plans/active/<slug>.md` | not required because ...
**Status:** draft | planned | implementing | evaluated
**Last updated:** YYYY-MM-DD

> The plan maps an accepted specification to the current MoneyFlow repository. It MUST NOT silently change requirements or grant permissions.

## Technical Context

- Runtime/application stack:
- Affected subsystem:
- Existing owner boundary:
- Storage/data boundary:
- Authentication/authorization boundary:
- Existing tests:
- Supported runtime modes:
- Performance/accessibility constraints:
- Known limitations:

Unknown material facts MUST be marked `NEEDS CLARIFICATION` and resolved before implementation.

## Constitution Check

| Principle/constraint | Plan response | Gate |
|---|---|---|
| Trustworthy ledger semantics | | pass/fail |
| Ownership, isolation and recovery | | pass/fail/not applicable |
| Product-scope alignment | | pass/fail |
| Current evidence over generated prose | | pass/fail |
| Bounded slice and permissions | | pass/fail |
| Risk-proportional verification | | pass/fail |
| Work-packet coexistence | | pass/fail/not applicable |

A failed constitutional gate blocks implementation until the spec or plan changes.

## Repository Reconnaissance

### Current behavior

- What the product does now:
- How it was verified:

### Relevant areas

| Path/area | Current responsibility | Reuse/change/avoid | Evidence |
|---|---|---|---|
| `path` | | | |

### Existing patterns and recent decisions

- Pattern to reuse:
- Current memory/architecture reference:
- Relevant accepted issue/PR/decision:
- Historical material explicitly not treated as current truth:

## Architecture Fit

Explain why the existing boundary owns this behavior. Do not introduce a repository, service, framework or abstraction merely because it appears in research.

### Planned changes

| File/area | Change | Requirement/story | Reason |
|---|---|---|---|
| | | | |

### Intentionally unchanged

- Financial semantics:
- Database/RLS:
- Authentication/provider configuration:
- Unrelated UI/product areas:

## Research and Adoption Review

Write `Not required` with a reason when all decisions are established by current repository evidence.

- Decision question:
- Focused sources:
- What each source establishes:
- What does not apply to MoneyFlow:
- Selected approach:
- Rejected alternatives:

When adding or materially changing a dependency, provider, service, tool, framework, extension or preset, also record:

- observed problem and simpler alternatives;
- license/code-reuse compatibility;
- security, secrets, user-data and privacy exposure;
- runtime, bundle, deployment and maintenance cost;
- owning boundary;
- migration, rollback and removal condition;
- verification plan.

## Data, Migration and Compatibility

- Schema/migration:
- RLS/policies/grants:
- Existing-data compatibility:
- Backfill:
- Retry/idempotency:
- Runtime-mode compatibility:
- Rollback:

Use `Not applicable` with evidence where appropriate.

## Risk Analysis

| Risk or counterexample | Likelihood/impact | Prevention | Evidence/test | Stop condition |
|---|---|---|---|---|
| | | | | |

## Permission Boundary

- Allowed repositories/branches:
- Allowed paths:
- Forbidden paths or writes:
- Provider access:
- Production-data access:
- Human approval required before:
- Stop/escalation condition:

The active MoneyFlow work packet owns this section when one is required; copy only a concise reference here.

## Verification Plan

Select product-layer evidence from `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` based on realistic failure modes. The protected CodeQL workflow is required for every pull request and must upload a real analysis.

| Layer | Required? | Command/evidence | What it proves |
|---|---|---|---|
| Diff hygiene / project knowledge | yes | `npm run check:knowledge` | Repository-policy consistency |
| CI classification policy | yes | `npm run test:ci-policy` | Gate-selection contract |
| CodeQL analysis | yes | protected workflow with completed `Initialize CodeQL` and `Analyze` | Uploaded provider code-scanning result for the exact head |
| Secret history scan | yes | protected workflow | No discovered committed secret history in the selected scan |
| Deployment/config contract | | `npm run check:deployment-env` | |
| CSS ownership | | `npm run check:css-ownership` | |
| Architecture | | `npm run check:architecture` | |
| Lint/typecheck | | `npm run lint` / `npm run typecheck` | |
| Unit/domain | | `npm run test` | |
| Production build | | `npm run build` | |
| Database/RLS | | `npm run test:db` | |
| Browser flow | | `npm run test:e2e` | |
| Responsive/visual | | `npm run test:ui-audit:pr` | |
| Production/manual | | exact affected flow | |

State why each omitted product-layer gate is not applicable. A successful build does not prove database isolation, browser behavior, provider configuration or production behavior. A successful CodeQL job shell does not count when initialization or analysis was skipped.

## Delivery and Rollback

- Focused branch:
- Expected PR scope:
- Exact-head evidence required before ready-for-review:
- Human review required:
- Deployment/production verification:
- Rollback action:
- Work-packet archive condition:
- PR memory update:

## Generated Artifacts

- `research.md`:
- `data-model.md`:
- `contracts/`:
- `quickstart.md`:
- `tasks.md`:

Create only artifacts that materially reduce ambiguity. Do not duplicate repository-wide truth.
