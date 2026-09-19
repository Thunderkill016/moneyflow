# AI delivery workflow

MoneyFlow uses AI as an engineering multiplier inside a controlled delivery system. AI may explore, research, plan, implement and review, but it does not independently redefine product requirements or declare its own work complete.

## Operating contract

`docs/engineering/AGENT_OPERATING_MODEL.md` is the execution contract for this workflow. The local agent harness follows the same rule: architecture patterns may be adopted after review, while MoneyFlow keeps its own permission and evidence boundaries.

Every non-trivial work packet records one current execution state, active responsibility, granted permission scope, repository-backed artifacts/evidence, explicit handoffs, unverified claims and the next allowed action. **Hidden chat context is not a valid project artifact.**

Task authorization is not stored in a current-state manifest. The explicit owner request and relevant GitHub issue/PR define scope; a work packet describes that scope when required but does not grant permission by existing.

## Roles

- **Human owner:** defines/approves the problem, product/risk trade-offs, merge and acceptance.
- **Researcher/planner:** reads current repository truth first, researches bounded uncertainty and produces specification, architecture fit, tasks, risks and verification.
- **Implementer:** works on a focused branch, stays inside granted permission, makes a bounded change and records evidence.
- **Evaluator:** checks the actual diff against the specification and searches for counterexamples.
- **CI/production:** provides repeatable layer-specific evidence; it does not replace product judgment.

## Task classification

Tiny mechanical work may use an inline plan. Non-trivial product behavior, financial calculations, schema, multi-file UI, security, architecture, CI policy or performance work follows the change class in `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` and uses a full packet when required.

## Standard lifecycle

`discovery → specified → planned → implementing → evaluating → ready_for_review → merged → deployed → accepted`

States describe evidence, not percentage complete. A task may move backward when new evidence invalidates an assumption; record why rather than relabeling progress.

### 1. Repository reconnaissance — discovery

Inspect current product/architecture truth, affected code/tests/migrations, relevant issue/PR, recent similar implementations and production behavior when operational/UI evidence matters.

### 2. Research — discovery to specified

Research is required when behavior depends on current APIs, standards, finance practices, security guidance or unfamiliar technology.

Start from one explicit decision question. Consult the smallest relevant section of:

- `docs/research/REPOSITORY_REFERENCE_MAP.md` for finance-product and implementation behavior;
- `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` for delivery, architecture, testing, security and operations.

Select **two to four focused sources** by default. Prefer official documentation, standards, source code and primary evidence. Record date for changeable information, what each source establishes, limits/applicability, rejected alternatives and remaining uncertainty. Generated summaries are leads, not load-bearing evidence.

#### Tool, dependency and architecture adoption gate

Before adding a tool, dependency, provider, service, framework or architecture pattern, record:

1. observed problem and why simpler existing options are insufficient;
2. license/code-reuse compatibility;
3. secrets, user-data and privacy exposure;
4. runtime, bundle, deployment and operational cost;
5. owning boundary and maintenance responsibility;
6. verification, migration and rollback strategy;
7. removal condition if benefit does not appear.

Popularity or benchmark rank is not approval. **Sentry and Trigger.dev** remain subject to the explicit adoption triggers/privacy boundaries in `docs/engineering/AGENT_OPERATING_MODEL.md`.

### 3. Specification — specified

Define affected user/problem, critical flow, observable acceptance criteria, financial/security constraints, required states, accessibility/mobile/long-data behavior, out-of-scope behavior and completion evidence. Resolve or exclude material unknowns before implementation.

### 4. Implementation plan — planned

Map the specification to existing repository boundaries, reuse, data/migration impact, API/state transitions, rollback/compatibility, tests, risks and permission/approval points. Avoid speculative abstractions.

### 5. Tasks — planned

Split work into small reviewable checkpoints with expected result, exact area, dependency, evidence and status. Parallel tasks must not edit overlapping ownership areas.

### 6. Implementation — implementing

Use a focused branch/worktree or approved sandbox. Implement one bounded task at a time, keep diffs surgical, stay inside permission scope and return to `specified` if implementation reveals a wrong requirement.

### 7. Evaluation — evaluating

Evaluate against the specification and actual diff, not the implementer's summary. Check acceptance criteria, prohibited scope, research applicability, ownership/RLS, domain centralization, UI states, recovery, duplication, permissions and remaining unverified claims.

### 8. Verification and delivery — ready_for_review to accepted

Run risk-selected static/domain/database/browser/responsive gates and review generated artifacts. Every PR targeting `main` carries one bounded record at `docs/research/pr-memory/YYYY/QN/PR-<number>.md` with changed/verified/remaining status and production/provider evidence when available.

Only exact-head evidence supports `ready_for_review`. Merge is a human-owner or approved repository-policy transition. Production/provider writes require their own explicit approval and rollback; merge does not imply either.

Work packets may move from `docs/plans/active/` to `docs/plans/completed/` when their durable evidence is complete. This archive action is provenance only; it is not a task-selection state machine and it must not create routine cleanup work merely to flip a tracking bit.

## UI/UX-specific loop

For UI work: capture current behavior, inventory tokens/components, explore structural options, choose using product truth/mobile usability/financial honesty, implement the smallest slice, run responsive/a11y invariants, review phone/tablet/desktop/dark/long-data states and check a physical device before claiming device readiness.

## Local agent harness

The owner may opt in to the local harness after required authentication succeeds. `npm run agent:dispatch` runs one cycle; `npm run agent:dispatch:watch` runs serial cycles. The harness uses isolated exact-main workspaces, guarded Git/GitHub access, fail-loud capability negotiation, append-only local run journals and holder-owned execution cleanup.

By default it grants no merge, main-branch mutation, force-push, provider write, deployment or production-data authority. Detailed model output remains local/private. Any delivery mode must still satisfy exact-head checks, remote-main stability and the explicit permission model.

## Knowledge maintenance

Documentation is part of the system:

- `AGENTS.md` stays short and points to sources of truth.
- `ARCHITECTURE.md` changes only when product/runtime boundaries change.
- Product truth lives in `docs/product/PRINCIPLES.md` plus current code/tests.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns execution states, handoffs, permissions and runtime-tool adoption triggers.
- Research may be historical but must be labeled when superseded.
- Reference maps are indexes, not roadmaps or dependency manifests.
- Work packets describe scoped execution/evidence when explicitly tied to a task; completed packets preserve decisions.
- Important rules should migrate from prose into tests, scripts, schema constraints or lint checks when feasible.

Run `npm run check:knowledge` to catch missing operating documents, weakened research/agent-contract markers and selected stale product claims.
