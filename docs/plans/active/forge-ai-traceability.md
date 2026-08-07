# Forge-derived AI traceability contract

**Status:** planned
**Execution state:** planned
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** human owner + implementing agent
**Issue/PR:** stacked on PR #315; follow-up PR pending
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is a Class 3 CI/policy-contract change because it changes repository gates that decide when agent work may advance.

## Outcome

MoneyFlow work packets gain a deterministic requirement-to-task-to-evidence traceability contract so an AI agent cannot make a packet look complete while silently leaving an acceptance criterion uncovered, inventing a task with no requirement relationship, or reaching review without criterion-specific evidence.

## Control contract

### State

- Location: acceptance criteria, task mappings and acceptance evidence inside the active work packet; `scripts/work-packet-contract.mjs` owns deterministic validation
- Writer/owner: human owner and scoped coding agents may update work-packet content; repository code owns IDs, mappings and transition validation
- Propagation: `npm run check:work-packets` runs directly and through `npm run test:ci-policy`, so invalid changed active packets fail before review

### Feedback

- Expected failing signal: focused fixtures must fail when an AC is uncovered, a task references an unknown AC, an internal task lacks a reason, task evidence is empty, or a ready-for-review packet lacks criterion-specific acceptance evidence
- Success signal: focused traceability tests and the full `test:ci-policy` gate exit zero on the exact branch head
- Semantic evidence: every planned acceptance criterion in a changed packet can be followed forward to at least one implementation task and evidence record, while every task either serves a known criterion or explicitly documents why it is internal delivery work

### Removal impact

- What breaks if removed: work packets can again contain disconnected acceptance criteria, tasks and green mechanism evidence without a machine-detectable gap
- Rollback: revert the traceability parser/tests/template/runbook additions, rerun `npm run test:ci-policy`, and retain PR #315's external reliability contract unchanged

### Action safety

- Permissions: branch-only repository tooling, tests and documentation on `agent/forge-ai-traceability`; no `main`, provider, database, production or user-data writes
- Reversibility: additive parser/test/documentation changes plus bounded template edits are Git-revertible and do not migrate runtime state
- Escalation: stop for merge, provider/ruleset changes, broad workflow redesign, runtime AI adoption or any requirement to rewrite all historical packets
- Failure containment: a defect can block changed work packets or CI policy evaluation but cannot alter MoneyFlow runtime, financial data, RLS or production behavior

## Repository reconnaissance

### Current behavior

- MoneyFlow already treats AI as an engineering multiplier, not an acceptance authority.
- `AGENT_OPERATING_MODEL.md` externalizes state, handoffs, permissions and repository-backed memory.
- `RISK_PROPORTIONAL_DELIVERY.md` already selects expensive verification according to risk.
- PR #315 adds deterministic work-packet control fields, fail-closed packet discovery and task bootstrap without another agent framework.
- The work-packet template currently has acceptance criteria, a Tasks table with an Evidence column, and an Evaluation acceptance-evidence table, but there is no machine-readable relationship among those three surfaces.
- As a result, an agent can structurally satisfy each section while one acceptance criterion has no task or no criterion-specific review evidence.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `scripts/work-packet-contract.mjs` | existing deterministic packet gate from PR #315 | extend; do not add another checker |
| `scripts/work-packet-contract.test.mjs` | focused fail-closed fixtures | extend with red traceability cases |
| `docs/templates/FEATURE_WORK_PACKET.md` | canonical task/spec/evidence schema | add AC IDs and `Covers` mapping |
| `docs/operations/task-bootstrap.md` | agent startup/runbook | document traceability semantics |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | owner workflow | no broad rewrite; current philosophy already matches Forge |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | state/evidence authority | reuse; no runtime AI architecture |

### Existing tests and constraints

- `test:ci-policy` already owns the packet gate; no new workflow is needed.
- Historical/completed packets must not be mass rewritten.
- Discovery/specified packets are allowed to be incomplete; task traceability becomes mandatory only once execution state reaches `planned`.
- `ready_for_review` and later states require criterion-specific acceptance evidence.
- No automatic AI-based grading or semantic judging is allowed.

### Similar implementation and recent history

- PR #315 externalizes model-invisible state/feedback/removal/action safety.
- Forge's product design independently reaches the same AI/deterministic boundary and adds one useful missing rule: `requirement → task → evidence` to prevent spec drift.
- GitHub Spec Kit's current workflow includes cross-artifact `analyze` and codebase-to-spec `converge` phases; MoneyFlow should adopt the deterministic consistency idea, not the CLI/framework.

### Open questions

- [x] Add Spec Kit dependency? No; reuse MoneyFlow's existing Markdown packet and checker.
- [x] Let AI decide whether mappings are sufficient? No; IDs and coverage are deterministic.
- [x] Require full traceability during discovery/specification? No; enforce from `planned` onward.
- [x] Force every delivery task to map to a product AC? No; allow `internal: <reason>` for research, CI, documentation or enabling tasks.
- [x] Rewrite historical packets? No; changed active packets adopt incrementally.

## Research

### Research scope and source selection

- Decision question: which AI-delivery ideas from `atoryn-forge-web` materially improve MoneyFlow without importing Forge's product/runtime architecture?
- Reference map consulted: internal cross-project study plus focused primary documentation.
- Source budget: Forge product/agent docs, GitHub Spec Kit official docs, Microsoft requirements-traceability guidance.
- Expected decision or uncertainty to resolve: select one repository-checkable pattern that closes a real MoneyFlow gap.

### Questions researched

1. Which Forge principles are already present in MoneyFlow?
2. Which Forge AI-control idea is absent and measurable?
3. Can that idea reuse the PR #315 packet gate instead of adding tooling?
4. What lifecycle point should fail closed without slowing early discovery?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `Thunderkill016/atoryn-forge-web/AGENTS.md` | owner project authority | 2026-08-07 | AI creates content; deterministic code owns schema/gates; completion requires observable evidence | Forge is a different product and does not control MoneyFlow architecture |
| `Thunderkill016/atoryn-forge-web/docs/PRODUCT.md` §10.4 | owner product research/design | 2026-08-07 | explicit `requirement → task → evidence` linkage prevents spec drift | node canvas, Runner and Forge runtime are not adopted |
| GitHub Spec Kit current docs | first-party methodology/tool docs | 2026-08-07 | `analyze` checks cross-artifact gaps and `converge` checks codebase against spec before completion | MoneyFlow does not need the Spec Kit CLI/dependency |
| Microsoft requirements traceability guidance | first-party engineering platform guidance | 2026-08-07 | requirements linked to tests/code/results provide readiness and quality traceability | Azure DevOps implementation details are not adopted |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Import Spec Kit | rich workflow | duplicate system, dependency and context overhead | rejected |
| Add another AI reviewer/judge | flexible semantic analysis | model can repeat implementation blind spots | rejected |
| Add a second standalone traceability tool | isolated | unnecessary tool/context surface | rejected |
| Extend PR #315 work-packet checker with IDs/mappings | deterministic, incremental, no runtime cost | packets changed after planning need small schema update | selected |
| Do nothing | zero overhead | known structural gap remains invisible | rejected |

### Research decision

Adopt only Forge's deterministic traceability idea. MoneyFlow keeps its existing lifecycle, risk model, work packet and CI gate. Acceptance criteria receive stable `AC#` IDs; planned tasks must name the AC IDs they cover or record `internal: <reason>`; every AC must be covered; task evidence must be non-empty; and `ready_for_review` or later packets must contain one acceptance-evidence row per AC. AI may write the prose and propose mappings, but code validates consistency.

Do not adopt Forge Runner, provider capability architecture, node canvas, agent runtime, WebSocket relay, AI credential model, deployment product loop or override UX. Those solve Forge's product problem, not MoneyFlow's personal-finance delivery problem.

### Adoption review

- Observed problem: acceptance criteria, tasks and evidence can each look complete while remaining disconnected.
- Existing or simpler alternatives considered: reviewer checklist only; rejected because the gap is structurally machine-checkable.
- License/code-reuse compatibility: no external code copied; only the cross-project idea is reimplemented with Node standard library.
- Secrets, user-data and privacy exposure: Markdown/Git metadata only; no credentials or financial user content added.
- Runtime, bundle, deployment and operational cost: development/CI only; no shipped runtime effect.
- Owning boundary and maintenance responsibility: existing work-packet checker and template.
- Migration and rollback: incremental for changed active packets; Git revert only.
- Verification plan: red/green parser fixtures, repository packet gate, exact-head CI/CodeQL/secret history.
- Removal condition if the expected benefit does not appear: remove if mappings become ceremonial and do not detect uncovered criteria or review gaps in real work.

## Specification

### Problem

MoneyFlow agents can currently write acceptance criteria, tasks and evidence in separate sections without a deterministic relationship. This allows spec drift or incomplete delivery to remain hidden until a human notices it manually.

### User stories

- As an owner, I can see which task implements each acceptance criterion.
- As an evaluator, I can detect an uncovered criterion before review.
- As an agent, I can mark non-product delivery work as internal with a reason instead of inventing a fake requirement mapping.
- As CI, I can reject ready-for-review packets whose acceptance evidence does not cover every criterion.

### Acceptance criteria

- [ ] AC1: Planned-or-later changed active packets require unique `AC#` identifiers on acceptance criteria.
- [ ] AC2: Every acceptance criterion is covered by at least one task, and every AC reference in a task resolves to a defined criterion.
- [ ] AC3: Every planned task either names one or more AC IDs in `Covers` or records `internal: <reason>`.
- [ ] AC4: Every planned task has a non-empty evidence field.
- [ ] AC5: `ready_for_review` and later packets contain criterion-specific acceptance-evidence rows covering every AC.
- [ ] AC6: Discovery/specified packets and the canonical template remain usable without forcing premature task/evidence completion.
- [ ] AC7: Historical/completed packets are not mass rewritten; only changed active packets are gated.
- [ ] AC8: The change reuses `check:work-packets`/`test:ci-policy` with no new dependency, workflow, agent framework or runtime behavior.

### Required states

- Loading: not applicable; local Markdown parse.
- Empty: missing required sections/table at planned-or-later fails with a precise message.
- Populated: valid AC IDs, task coverage and evidence pass.
- Validation/error: duplicate/unknown/uncovered ACs, unresolved internal reasons or missing evidence fail closed.
- Recovery/undo: fix packet mapping and rerun; or revert bounded checker/template change.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: plain Markdown output; no color-only meaning.

### Financial and security constraints

- No financial semantics or user data change.
- Integer VND and transfer invariants remain untouched.
- No RLS/database/provider/production writes.

### Out of scope

- Runtime AI in MoneyFlow.
- Model scoring or AI-as-judge acceptance.
- Forge Runner, Spec Kit dependency or new agent framework.
- Requirement management UI, node canvas or Kanban.
- Historical packet migration.

## Implementation plan

### Architecture fit

Extend the existing PR #315 work-packet parser. This keeps the AI/deterministic boundary in one repository owner and lets the current policy gate enforce traceability without a new service or workflow.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/work-packet-contract.mjs` | parse execution state, AC IDs, Tasks mapping and acceptance-evidence coverage | deterministic traceability |
| `scripts/work-packet-contract.test.mjs` | red/green fixtures for forward/backward coverage and lifecycle gates | prevent ceremonial schema |
| `docs/templates/FEATURE_WORK_PACKET.md` | AC IDs + `Covers` column + criterion-specific evidence rows | canonical authoring contract |
| `docs/operations/task-bootstrap.md` | explain mapping and lifecycle enforcement | usable agent guidance |
| `docs/research/FORGE_AI_ADOPTION_2026-08.md` | record adopted/rejected cross-project knowledge | durable provenance |
| `docs/research/pr-memory/2026/Q3/PR-<pending>.md` | final handoff after PR exists | repository memory |

### Data and migration impact

- Schema/migration: none.
- Backfill: none for historical/completed packets.
- Compatibility: active packets changed after `planned` must adopt IDs/mappings.
- Rollback: revert follow-up PR; PR #315 remains independently valid.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| task invents unknown `AC99` | reject unknown references |
| AC exists but no task implements it | reject uncovered criterion |
| internal CI/research task forced into fake AC | allow `internal: <reason>` only with non-empty reason |
| task says it covers AC but has no proof target | require Evidence cell |
| early discovery blocked before tasks exist | state-gate traceability from `planned` onward |
| packet reaches review with only task-level generic evidence | require AC-specific acceptance-evidence coverage at `ready_for_review`+ |
| duplicate criterion IDs create ambiguous mapping | reject duplicates |
| AI writes convincing prose but mapping is wrong | deterministic parser validates only structural truth; human still evaluates semantic correctness |

### Verification plan

- Static: `node --check scripts/work-packet-contract.mjs`.
- Unit/domain: focused `node --test scripts/work-packet-contract.test.mjs` plus full `npm run test:ci-policy`.
- Database: not applicable to behavior; CI policy classification may still enforce repository-required shell.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable; exact-head protected CI/CodeQL/secret history only.

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | Extract and compare Forge AI-delivery principles | internal: research provenance | none | Forge authority docs + focused primary cross-check | done |
| T2 | Write red traceability fixtures | AC1, AC2, AC3, AC4, AC5, AC6 | T1 | focused tests fail before parser support | in_progress |
| T3 | Implement deterministic traceability parser | AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8 | T2 | focused tests pass | todo |
| T4 | Update canonical template/runbook/adoption record | AC6, AC7, AC8 | T3 | repository packet check passes | todo |
| T5 | Independent review and exact-head protected gates | AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8 | T4 | CI/CodeQL/secret evidence | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.
- A task may advance only when the current execution state's evidence exists.
- A green mechanism check is not semantic evidence; record the real path or user outcome separately.
- For a bug fix or new behavior, record the expected failing signal before accepting a green result, unless the packet explains why a red-first check is impossible.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | Forge `AGENTS.md`/`PRODUCT.md`, Spec Kit docs, Microsoft traceability guidance | exact packet schema not yet implemented | define minimal mapping contract |
| 2026-08-07 | planner | implementer | planned | this packet + AC/task design | parser/tests not written | commit red fixtures before parser support |

### Current permission boundary

- Granted scope: branch-only tooling/tests/docs on `agent/forge-ai-traceability`.
- Exact repositories/providers/resources: read `Thunderkill016/atoryn-forge-web`; write only `Thunderkill016/moneyflow` follow-up branch.
- Forbidden writes: MoneyFlow `main`, Forge repo, provider settings, production, database and user data.
- Human approval required before: merge, deployment, expanding this into runtime AI/orchestration.
- Rollback or stop condition: stop if traceability requires a new service/framework or mass historical migration.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | pending | pending |
| AC2 | pending | pending |
| AC3 | pending | pending |
| AC4 | pending | pending |
| AC5 | pending | pending |
| AC6 | pending | pending |
| AC7 | pending | pending |
| AC8 | pending | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending final review.
- Important source limitations remain respected: Forge product/runtime architecture is explicitly excluded.
- New tool/dependency/pattern passed the adoption review: no dependency/tool added; deterministic schema change only.

### Review findings

- Correctness: pending implementation.
- Security/ownership: branch-only policy work; no runtime/provider/data writes.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: reuses PR #315 checker; no second workflow/tool.
- Scope compliance: pending final diff review.

### Remaining limitations

- Structural traceability cannot prove an AC is semantically correct; evaluator/human review remains required.

## Delivery record

- Branch: `agent/forge-ai-traceability`
- PR: pending stacked follow-up to PR #315
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
