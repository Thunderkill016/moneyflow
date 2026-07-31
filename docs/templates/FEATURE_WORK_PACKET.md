# <Feature or fix name>

**Status:** discovery | specified | planned | implementing | evaluating | completed  
**Owner:** <human or agent>  
**Issue/PR:** <links or numbers>  
**Last updated:** YYYY-MM-DD

## Outcome

Describe the user-visible or system outcome in one paragraph. Do not describe implementation yet.

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

- [ ] Observable outcome.
- [ ] Observable outcome.

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

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | | | | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| | | pass/fail |

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
