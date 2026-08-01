# AI delivery workflow

MoneyFlow uses AI as an engineering multiplier inside a controlled delivery system. AI may explore, research, plan, implement and review, but it does not independently redefine product requirements or declare its own work complete.

## Operating contract

`docs/engineering/AGENT_OPERATING_MODEL.md` is the execution contract for this workflow. It applies the useful patterns from Ruflo/Claude-Flow, CrewAI, OpenAI Swarm, OpenHands, LangGraph and AutoGen without adding those frameworks to the MoneyFlow runtime.

Every non-trivial work packet records:

- one current execution state;
- the active responsibility/role;
- the granted permission scope;
- repository-backed artifacts and evidence;
- an explicit handoff when responsibility or state changes;
- unverified claims, stop conditions and the next allowed action.

State transitions describe evidence, not percentage complete. Hidden chat context is not a valid project artifact.

## Roles

### Human owner

- Defines or approves the problem and acceptable outcome.
- Resolves product trade-offs and risky assumptions.
- Reviews evidence, not only generated explanations.
- Decides whether a change is worth merging.

### Researcher and planner

- Read current repository truth before external research.
- State the exact unresolved decision.
- Select focused sources and record their limits.
- Produce the specification, architecture fit, tasks, risks and verification plan before implementation.

### Implementing agent

- Reads the repository and relevant history.
- Researches unresolved external questions when acting as researcher.
- Writes or updates the work packet before non-trivial implementation.
- Makes a focused change on an isolated branch or worktree.
- Stays inside the granted permission scope.
- Runs tests and records evidence.

### Evaluating agent or reviewer

- Checks the implementation against the specification and actual diff.
- Searches for omitted edge cases, duplicated logic and unsafe assumptions.
- Reviews browser/screenshots for UI work.
- Records findings and unverified claims rather than expanding scope while reviewing.

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
- Start in `discovery` with `read_only` unless a narrower or broader scope is explicitly justified.
- Complete reconnaissance, research/specification, plan and tasks before implementation.
- Keep the packet updated when verified facts change.
- Advance states only with the evidence defined in `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Standard lifecycle

The lifecycle maps to the operating states:

```text
discovery → specified → planned → implementing → evaluating
→ ready_for_review → merged → deployed → accepted
```

A task may move backward when new evidence invalidates an assumption. Record the reason and preserve the prior evidence; never silently relabel progress.

### 1. Repository reconnaissance — `discovery`

The agent must inspect the current system before proposing a solution:

- product and architecture sources of truth;
- routes, components, domain modules and stores involved;
- existing tests and fixtures;
- relevant migrations, RLS policies and database tests;
- current issues, recent PRs and similar implementations;
- production behavior or screenshots when the task is UI/operational.

Output: a short map of relevant files, reusable code, current behavior and unresolved questions.

Handoff requirement: the planner receives repository paths, verified behavior, open questions and any forbidden boundaries.

### 2. Research — `discovery` to `specified`

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

Sentry and Trigger.dev follow the explicit adoption triggers and privacy boundaries in `docs/engineering/AGENT_OPERATING_MODEL.md`; neither is a default dependency.

### 3. Specification — `specified`

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

### 4. Implementation plan — `planned`

The plan connects the specification to the existing architecture:

- files and boundaries affected;
- existing code to reuse;
- data model or migration impact;
- API and state transitions;
- rollout, rollback and compatibility;
- tests to add at each layer;
- risks and counterexamples;
- browser and production verification;
- required permission scope and approval points.

A plan should make it obvious why each file must change. Avoid speculative abstractions.

Handoff requirement: implementation begins only after the packet identifies the exact branch, files, permissions, acceptance criteria and stop conditions.

### 5. Tasks — `planned`

Split work into small checkpoints that can be implemented and verified independently. Each task includes:

- expected result;
- exact area of the repository;
- test/evidence required;
- dependencies;
- status.

Parallel agents may only take tasks that do not edit overlapping ownership areas and have clear contracts. Role names are responsibility boundaries, not fictional personas.

### 6. Implementation — `implementing`

- Work on a focused branch, isolated worktree or approved sandbox.
- Implement one task at a time.
- Prefer tests or counterexamples before changing financial/domain behavior.
- Keep diffs surgical; unrelated cleanup becomes separate work.
- Stay inside the recorded permission scope; repository access does not imply provider or production-data write permission.
- When implementation reveals a wrong requirement, stop and move back to `specified` instead of silently changing behavior.

### 7. Evaluation — `evaluating`

Evaluate the result against the work packet and actual diff, not against the implementing agent's summary.

Check:

- every acceptance criterion has evidence;
- no prohibited or out-of-scope behavior was introduced;
- research claims remain supported and applicable to the final design;
- adopted tools or patterns passed the stated license, security, ownership and rollback gate;
- domain rules remain centralized and tested;
- database ownership is enforced below the UI;
- UI uses existing tokens/components and works across supported states;
- error/recovery behavior is understandable;
- docs and repository map remain accurate;
- permissions used were no broader than required;
- the final handoff lists unverified claims and the next allowed transition.

A review that reads only the PR summary is incomplete.

### 8. Verification and delivery — `ready_for_review` to `accepted`

Run the required static, domain, database, browser and responsive gates. Review generated artifacts. Open or update the PR with:

- problem and outcome;
- research/plan link;
- selected sources, applicability and rejected scope;
- current execution state, permission scope and last handoff;
- important decisions and risks;
- test results;
- screenshots or browser evidence;
- production verification instructions.

Only exact-head evidence supports `ready_for_review`. Merge is a human-owner or approved repository-policy transition. After squash merge and successful deployment, verify the exact affected production flow, then move the work packet from `docs/plans/active/` to `docs/plans/completed/` after acceptance.

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
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns execution states, handoffs, permissions and runtime-tool adoption triggers.
- Research may be historical, but must be labeled when superseded.
- The two repository reference maps are maintained indexes, not roadmaps or dependency manifests.
- Active work packets describe current execution; completed packets preserve decisions.
- Important rules should migrate from prose into tests, scripts, schema constraints or lint checks when feasible.

Run `npm run check:knowledge` to catch missing operating documents, weakened research/agent-contract markers and selected stale product claims.
