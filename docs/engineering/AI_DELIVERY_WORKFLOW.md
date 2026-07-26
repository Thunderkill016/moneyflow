# AI delivery workflow

MoneyFlow uses AI as an engineering multiplier inside a controlled delivery system. AI may explore, research, plan, implement and review, but it does not independently redefine product requirements or declare its own work complete.

## Roles

### Human owner

- Defines or approves the problem and acceptable outcome.
- Resolves product trade-offs and risky assumptions.
- Reviews evidence, not only generated explanations.
- Decides whether a change is worth merging.

### Implementing agent

- Reads the repository and relevant history.
- Researches unresolved external questions.
- Writes the work packet before non-trivial implementation.
- Makes a focused change on a branch.
- Runs tests and records evidence.

### Evaluating agent or reviewer

- Checks the implementation against the specification.
- Searches for omitted edge cases, duplicated logic and unsafe assumptions.
- Reviews browser/screenshots for UI work.
- Does not expand scope while reviewing.

### CI and production systems

- Enforce repeatable contracts.
- Preserve failure diagnostics and browser evidence.
- Prove only what their layer covers; they do not replace product judgment.

## Task classification

### Tiny mechanical change

Examples: typo, broken link, one-line safe configuration correction.

Requirements:

- Read the affected file and its source of truth.
- State a short inline plan.
- Run proportionate checks.
- Use a focused branch and PR when the repository changes.

### Non-trivial change

Examples: product behavior, financial calculation, schema, multi-file feature, UI flow, security, architecture or performance work.

Requirements:

- Create a work packet from `docs/templates/FEATURE_WORK_PACKET.md`.
- Complete reconnaissance, research/specification, plan and tasks before implementation.
- Keep the packet updated when verified facts change.

## Standard lifecycle

### 1. Repository reconnaissance

The agent must inspect the current system before proposing a solution:

- product and architecture sources of truth;
- routes, components, domain modules and stores involved;
- existing tests and fixtures;
- relevant migrations, RLS policies and database tests;
- current issues, recent PRs and similar implementations;
- production behavior or screenshots when the task is UI/operational.

Output: a short map of relevant files, reusable code, current behavior and unresolved questions.

### 2. Research

Research is required when behavior depends on external products, current APIs, standards, finance practices, security guidance or unfamiliar technology.

Rules:

- Prefer official documentation and primary sources.
- Record publication/access date for changeable information.
- Separate observed facts from inference.
- Compare alternatives and explain why rejected options do not fit MoneyFlow.
- Never use competitor behavior as proof that a financial assumption is correct.

Output: decisions, sources, applicability, rejected alternatives and remaining uncertainty.

### 3. Specification

Define the outcome without prescribing code prematurely:

- problem and affected user;
- user stories and critical flow;
- functional acceptance criteria;
- financial/security constraints;
- loading, empty, populated, error and recovery states;
- mobile, accessibility and long-data requirements;
- out-of-scope behavior;
- measurable evidence required for completion.

Unknown product decisions must be resolved or explicitly excluded before implementation.

### 4. Implementation plan

The plan connects the specification to the existing architecture:

- files and boundaries affected;
- existing code to reuse;
- data model or migration impact;
- API and state transitions;
- rollout, rollback and compatibility;
- tests to add at each layer;
- risks and counterexamples;
- browser and production verification.

A plan should make it obvious why each file must change. Avoid speculative abstractions.

### 5. Tasks

Split work into small checkpoints that can be implemented and verified independently. Each task includes:

- expected result;
- exact area of the repository;
- test/evidence required;
- dependencies;
- status.

Parallel agents may only take tasks that do not edit overlapping ownership areas and have clear contracts.

### 6. Implementation

- Work on a focused branch or isolated worktree.
- Implement one task at a time.
- Prefer tests or counterexamples before changing financial/domain behavior.
- Keep diffs surgical; unrelated cleanup becomes separate work.
- When implementation reveals a wrong requirement, stop and update the specification instead of silently changing behavior.

### 7. Evaluation

Evaluate the result against the work packet, not against the implementing agent's summary.

Check:

- every acceptance criterion has evidence;
- no prohibited or out-of-scope behavior was introduced;
- domain rules remain centralized and tested;
- database ownership is enforced below the UI;
- UI uses existing tokens/components and works across supported states;
- error/recovery behavior is understandable;
- docs and repository map remain accurate.

### 8. Verification and delivery

Run the required static, domain, database, browser and responsive gates. Review generated artifacts. Open or update the PR with:

- problem and outcome;
- research/plan link;
- important decisions and risks;
- test results;
- screenshots or browser evidence;
- production verification instructions.

After squash merge and successful deployment, verify the exact affected production flow, then move the work packet from `docs/plans/active/` to `docs/plans/completed/`.

## UI/UX-specific loop

For UI work:

1. Capture the current screen and identify the user decision/action.
2. Inventory existing design tokens and reusable components.
3. Generate multiple structural directions with explicit trade-offs.
4. Select one using product truth, mobile usability, financial honesty and maintainability.
5. Implement the smallest production slice.
6. Run responsive/a11y invariants.
7. Review screenshots at phone, tablet, desktop, dark mode and long-data states.
8. Check at least one physical device before claiming device readiness.

AI-generated visual polish without a user problem, state model or evidence is not accepted work.

## Knowledge maintenance

Documentation is part of the system:

- `AGENTS.md` stays short and points to sources of truth.
- `ARCHITECTURE.md` changes only when boundaries change.
- Product truth lives in `docs/product/PRINCIPLES.md`.
- Research may be historical, but must be labeled when superseded.
- Active work packets describe current execution; completed packets preserve decisions.
- Important rules should migrate from prose into tests, scripts, schema constraints or lint checks when feasible.

Run `npm run check:knowledge` to catch missing operating documents and selected stale product claims.
