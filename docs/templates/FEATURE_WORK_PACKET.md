# <Feature or fix name>

**Status:** discovery | specified | planned | implementing | evaluating | ready_for_review | merged | deployed | accepted  
**Execution state:** discovery | specified | planned | implementing | evaluating | ready_for_review | merged | deployed | accepted  
**Active role:** human_owner | researcher | planner | implementer | evaluator | ci_or_production  
**Permission scope:** read_only | branch_write | provider_read | provider_write_approved | production_data_write_approved  
**Owner:** <human or agent>  
**Issue/PR:** <links or numbers>  
**Last updated:** YYYY-MM-DD

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

Describe the user-visible or system outcome in one paragraph. Do not describe implementation yet.

## Control contract

Answer these before implementation. They externalize what the model cannot reliably inspect in itself. The repository gate requires every field in a changed active packet to be resolved.

### State

- Location: <where the authoritative state lives>
- Writer/owner: <who or what may change it>
- Propagation: <how the rest of the system learns that it changed>

### Feedback

- Expected failing signal: <test/check/observation that must fail before the change when applicable>
- Success signal: <deterministic command, exit code or artifact that proves the mechanism works>
- Semantic evidence: <real user/system outcome beyond uptime, 200 OK or a green build>

### Removal impact

- What breaks if removed: <owned behavior, dependency or invariant that would fail>
- Rollback: <bounded undo path and the signal used to verify recovery>

### Action safety

- Permissions: <exact read/write/provider/production scope>
- Reversibility: <how writes are undone or why they are intentionally irreversible>
- Escalation: <condition that stops the agent and requires a human decision>
- Failure containment: <maximum affected boundary if the change or tool fails>

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
- A task may advance only when the current execution state's evidence exists.
- A green mechanism check is not semantic evidence; record the real path or user outcome separately.
- For a bug fix or new behavior, record the expected failing signal before accepting a green result, unless the packet explains why a red-first check is impossible.

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
