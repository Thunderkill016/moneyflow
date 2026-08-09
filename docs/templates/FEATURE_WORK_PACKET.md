# <Feature or fix name>

**Status:** discovery | specified | planned | implementing | evaluating | ready_for_review | merged | deployed | accepted
**Execution state:** discovery | specified | planned | implementing | evaluating | ready_for_review | merged | deployed | accepted
**Risk class:** 0 | 1 | 2 | 3
**Active role:** human_owner | researcher | planner | implementer | evaluator | ci_or_production
**Permission scope:** read_only | branch_write | provider_read | provider_write_approved | production_data_write_approved
**Owner:** <human or agent>
**Issue/PR:** <links or numbers>
**Last updated:** YYYY-MM-DD

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete. Use this full packet only when `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` requires it.

## Outcome

Describe the user-visible or system outcome in one paragraph. Do not describe implementation yet.

## Authority references

Link to current truth rather than copying it into this packet.

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Parent/program plan, when applicable: <path or not applicable>
- Feature-specific specification, when applicable: <path or not applicable>
- Historical PR memory needed for provenance: <specific record or not required>

Record only the task-relevant delta below. Do not turn the packet into a second project encyclopedia.

## Current decision gate

This is the **only** generic `Go` target for the packet. `Go` authorizes the one action below and is consumed when that action is performed. Afterward, establish the next gate before another privileged action.

- Gate ID: G1
- Next allowed action: <one bounded action>
- Approval token: `Go`
- Consumes approval: yes
- After action: <state/role to return to and what must be recorded before another action>

Explicit owner commands such as `merge`, `deploy Edge`, or `apply migration` authorize only the named action. They do not chain into later provider/deployment actions.

## Repository reconnaissance

### Current behavior

- What the product does now.
- How the behavior was verified.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `path` | | |

### Existing tests and constraints

- Related unit tests:
- Database/RLS tests:
- Browser tests:
- Product/architecture rules:

### Similar implementation and recent history

- Existing pattern to reuse:
- Relevant issue/PR/decision:

### Open questions

- [ ] Question that must be resolved before planning.

## Research

Complete this section when external behavior, current technology, standards, security or product practice affects the decision. Write `Not required` with a reason for purely internal/mechanical work.

### Research scope and source selection

- Decision question:
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` | `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` | not required
- Source budget: two to four focused sources by default; explain any exception.
- Expected decision or uncertainty to resolve:

### Questions researched

1.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| | | | | |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| | | | |

### Research decision

State the selected approach, rejected alternatives and remaining uncertainty. Separate observed facts, inference and product judgment. State explicitly which parts of the studied repositories or products do not apply to MoneyFlow.

### Adoption review

Complete this subsection when adding or materially changing a dependency, provider, service, tool, framework or architecture pattern. Otherwise write `Not applicable`.

- Observed problem:
- Existing or simpler alternatives considered:
- License/code-reuse compatibility:
- Secrets, user-data and privacy exposure:
- Runtime, bundle, deployment and operational cost:
- Owning boundary and maintenance responsibility:
- Migration and rollback:
- Verification plan:
- Removal condition if the expected benefit does not appear:

## Specification

### Problem

Who is affected, what fails today and why it matters.

### User stories

- As a ..., I can ..., so that ...

### Acceptance criteria

Use stable IDs for a full packet so planning and evaluation can refer to the same requirement.

- [ ] AC1: Observable outcome.
- [ ] AC2: Observable outcome.

### Required states

- Loading:
- Empty:
- Populated:
- Validation/error:
- Recovery/undo:
- Long data / large VND:
- Mobile/tablet/desktop:
- Accessibility:

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications:

### Out of scope

-

## Implementation plan

### Architecture fit

Explain which existing boundary owns the behavior and why. A repository or framework appearing in a reference map is not an architecture decision.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| | | |

### Data and migration impact

- Schema/migration:
- Backfill:
- Compatibility:
- Rollback:

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| | |

### Verification plan

- Static:
- Unit/domain:
- Database:
- Browser flow:
- Responsive/visual:
- Production/manual:

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | | AC1 | | | todo |

Rules:

- One task should produce a reviewable result.
- `Covers` names one or more known acceptance-criterion IDs, or `internal: <reason>` for engineering work that does not directly satisfy a product criterion.
- Every acceptance criterion should have a covering task before implementation is called planned.
- Every task names the evidence that will prove its result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.
- A task may advance only when the current execution state's evidence exists.

## Handoff record

Add one entry whenever responsibility changes or the task moves to another execution state. Do not rely on hidden chat context.

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | researcher | planner | specified | work packet + sources | | Create implementation plan |

### Current permission boundary

- Granted scope:
- Exact repositories/providers/resources:
- Forbidden writes:
- Human approval required before:
- Rollback or stop condition:

## Evaluation

### Independent evaluation

Required before `ready_for_review` for Class 2/3 author-owned changes.

- Evaluator: <human / independent PR reviewer / fresh-context evaluator / not required for Class 0/1>
- Implementer overlap: <none | same primary agent with fresh-context restriction | not applicable>
- Inputs reviewed: <specification/plan + actual diff + exact evidence>
- Author summary treated as authority: no

A self-review may be recorded separately, but must not be relabeled as the sole independent Class 2/3 acceptance signal.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | | pass/fail/pending |
| AC2 | | pass/fail/pending |

### Research and adoption evidence

- Selected sources still support the final implementation:
- Important source limitations remain respected:
- New tool/dependency/pattern passed the adoption review, or not applicable:

### Review findings

- Correctness:
- Security/ownership:
- UI/UX/accessibility:
- Maintainability/duplication:
- Scope compliance:

### Remaining limitations

-

## Delivery record

- Branch:
- PR:
- Squash commit:
- CI run:
- Production deployment:
- Production flow verified:
- Work packet moved to `docs/plans/completed/`:
