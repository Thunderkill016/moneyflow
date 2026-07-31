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

Start from one explicit decision question. Consult the smallest relevant section of:

- `docs/research/REPOSITORY_REFERENCE_MAP.md` for finance-product and implementation behavior;
- `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` for AI delivery, research, product direction, code quality, architecture, testing, security and operations.

Select **two to four focused sources by default**. More sources require a reason in the work packet; fewer are acceptable when one authoritative primary source fully answers a narrow question.

Rules:

- Prefer official documentation, standards, source code and primary evidence.
- Record publication or access date for changeable information.
- State what each source establishes, its authority type and where it does not apply.
- Separate observed facts from inference and product judgment.
- Compare alternatives and explain why rejected options do not fit MoneyFlow.
- Never use competitor behavior as proof that a financial assumption is correct.
- A repository appearing in a reference map is permission to study it, not approval to copy code, add a dependency or adopt its architecture.
- Generated research summaries are leads; verify load-bearing claims against the underlying source.

Output: decisions, sources, applicability, rejected alternatives and remaining uncertainty.

#### Tool, dependency and architecture adoption gate

Before adding a tool, dependency, provider, service, framework or architecture pattern, the work packet must record:

1. the observed problem it solves;
2. why existing code or a simpler alternative is insufficient;
3. license and code-reuse compatibility;
4. secrets, user-data and privacy exposure;
5. runtime, bundle, deployment and operational cost;
6. the owning boundary and maintenance responsibility;
7. verification, migration and rollback strategy;
8. the removal condition if the expected benefit does not appear.

Popularity, benchmark rank, AI capability or use by a larger repository is not sufficient evidence.

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
- research claims remain supported and applicable to the final design;
- adopted tools or patterns passed the stated license, security, ownership and rollback gate;
- domain rules remain centralized and tested;
- database ownership is enforced below the UI;
- UI uses existing tokens/components and works across supported states;
- error/recovery behavior is understandable;
- docs and repository map remain accurate.

### 8. Verification and delivery

Run the required static, domain, database, browser and responsive gates. Review generated artifacts. Open or update the PR with:

- problem and outcome;
- research/plan link;
- selected sources, applicability and rejected scope;
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
- The two repository reference maps are maintained indexes, not roadmaps or dependency manifests.
- Active work packets describe current execution; completed packets preserve decisions.
- Important rules should migrate from prose into tests, scripts, schema constraints or lint checks when feasible.

Run `npm run check:knowledge` to catch missing operating documents, weakened research-contract markers and selected stale product claims.
