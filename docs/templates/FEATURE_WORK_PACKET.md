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

### Questions researched

1. 

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| | | | |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| | | | |

### Research decision

State the selected approach, rejected alternatives and remaining uncertainty. Separate facts from inference.

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

Explain which existing boundary owns the behavior and why.

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

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| | | pass/fail |

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
