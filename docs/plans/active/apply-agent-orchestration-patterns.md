# Apply AI orchestration patterns without adding a runtime agent framework

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** AI agent; human owner controls merge and acceptance  
**Issue/PR:** #179  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow applies the useful engineering patterns from Ruflo/Claude-Flow, CrewAI, OpenAI Swarm, OpenHands, LangGraph, AutoGen, Sentry and Trigger.dev as enforceable delivery and operations boundaries. The repository gains an explicit state machine, evidence-based handoffs, least-privilege execution rules and clear adoption triggers for runtime observability/background jobs, without installing a multi-agent framework into the personal-finance application.

## Repository reconnaissance

### Current behavior

Before this branch:

- `docs/engineering/AI_DELIVERY_WORKFLOW.md` defined broad roles and a sequential lifecycle.
- Work packets offered broad status values but no allowed transitions, active responsibility, permission scope or handoff artifact.
- `scripts/check-project-knowledge.mjs` protected research markers but not orchestration/permission markers.
- MoneyFlow used Vercel runtime logs and Speed Insights, with no Sentry SDK.
- No current job proved a need for Trigger.dev.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Existing workflow owner | Extended, not replaced |
| `docs/templates/FEATURE_WORK_PACKET.md` | New task contract | Adds state, role, permission and handoff fields |
| `.github/pull_request_template.md` | Review handoff | Exposes operating evidence |
| `scripts/check-project-knowledge.mjs` | CI-enforced repository contract | Protects the new markers |
| `AGENTS.md` | Concise entrypoint | Adds one authoritative pointer |
| `package.json` | Dependency boundary | Unchanged |

### Existing tests and constraints

- `npm run check:knowledge` is the direct gate.
- Full CI also runs deployment, CSS, architecture, lint, typecheck, unit/static RLS, build, database and browser jobs.
- `AGENTS.md` must remain under 160 lines and must not become a new framework handbook.
- Autonomous agents may write only a focused branch/PR; no merge or provider write is granted.

### Similar implementation and recent history

- PR #177 added research and adoption contracts.
- PR #178 archived the completed reference work packets.
- PR #179 extends those contracts rather than creating a competing process.

### Open questions

- [x] Which owner-selected repository patterns are useful now?
- [x] Which patterns must be rejected or deferred?
- [x] How can the result be enforced without adding an agent runtime?

## Research

### Research scope and source selection

- Decision question: Which orchestration, sandbox, observability and durable-job patterns should MoneyFlow adopt now, defer or reject?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget exception: all eight repositories were explicitly selected by the owner.
- Expected decision: a bounded operating model and measurable adoption thresholds.

### Questions researched

1. What is the smallest useful orchestration model for MoneyFlow engineering?
2. How should responsibility and execution state be handed off?
3. What access should an autonomous agent receive?
4. When are Sentry and Trigger.dev justified?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `ruvnet/ruflo` | Primary repository | 2026-08-01 | Model + harness, workflows, hooks, memory and evidence concepts | Swarms, daemon, vector memory and broad plugins are excessive |
| `crewAIInc/crewAI` | Primary repository | 2026-08-01 | Deterministic Flows versus autonomous role-based Crews | Python runtime and autonomous crews are unnecessary |
| `openai/swarm` | Official educational repository | 2026-08-01 | Lightweight agents, tools and explicit handoffs | Superseded by Agents SDK; no production adoption |
| `OpenHands/OpenHands` | Primary repository | 2026-08-01 | Sandbox/backend isolation and explicit filesystem risk | Agent control plane is outside MoneyFlow scope |
| `langchain-ai/langgraph` | Primary repository | 2026-08-01 | Explicit durable state transitions, interrupts and human-in-loop | No product-runtime agent graph is approved |
| `microsoft/autogen` | Primary repository | 2026-08-01 | Layered agent interfaces and multi-agent experiments | In maintenance mode; not adopted for new work |
| `getsentry/sentry` | Primary repository | 2026-08-01 | Error grouping, tracing and debugging | Requires privacy, cost and beta-level need |
| `triggerdotdev/trigger.dev` | Primary repository | 2026-08-01 | Durable tasks, retries, queues, schedules and run traces | No current MoneyFlow task exceeds existing capabilities |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Install a full multi-agent framework | Ready-made orchestration | New stack, cost, hidden state and excess autonomy | Rejected |
| Add another reference document only | Low risk | Easy to ignore; does not change delivery | Rejected |
| Extend the current workflow with state/handoff/permission contracts and a CI gate | Fits architecture and is reviewable | Does not automate agents by itself | Selected |
| Install Sentry and Trigger.dev now | Visible tooling adoption | No measured need; privacy and operational cost | Deferred |

### Research decision

Apply concepts, not frameworks. MoneyFlow uses a deterministic engineering state machine, responsibility-based roles, explicit handoff records, least-privilege scopes and repository-backed memory/evidence. Multi-agent autonomy, hidden long-term memory and product-runtime agents remain out of scope.

Sentry is eligible after external beta or recurring incidents demonstrate that Vercel logs are insufficient. Trigger.dev is eligible only for a concrete long-running/durable task requiring retries, queues, schedules, waitpoints or execution beyond current limits.

### Adoption review

- Observed problem: reference repos were not translated into enforceable behavior.
- Simpler alternative: extend existing MoneyFlow workflow and knowledge gate.
- License/code-reuse compatibility: concepts only; no copied code or dependency.
- Secrets/user data: none.
- Runtime/deployment cost: none.
- Owning boundary: engineering documentation and `check:knowledge`.
- Migration/rollback: existing active packets are grandfathered; remove new file/markers to roll back.
- Removal condition: remove the added contract if it creates ceremony without improving handoff clarity or scope control after several real tasks.

## Specification

### Problem

Agents could move from research to implementation without a machine-checked state/handoff/permission contract. External repositories were named but had not changed how MoneyFlow work is actually delivered.

### User stories

- As the owner, I can see what evidence exists, what remains unverified and what action is allowed next.
- As an implementing/evaluating agent, I can continue from repository artifacts rather than reconstructing chat history.
- As a maintainer, I can tell why Sentry or Trigger.dev is or is not justified.

### Acceptance criteria

- [x] One authoritative operating model defines states, transitions, roles, handoffs, permissions and stop conditions.
- [x] The standard workflow and `AGENTS.md` point to and use that model.
- [x] New work packets expose execution state, active role, permission scope and handoff records.
- [x] PRs surface the same operating evidence.
- [x] The knowledge gate fails if these contracts disappear.
- [x] Sentry and Trigger.dev have explicit adoption triggers, privacy and rollback boundaries.
- [x] No runtime dependency, schema, RLS, UI or provider setting is changed.

### Required states

- Loading: not applicable.
- Empty: new non-trivial work starts in `discovery` with `read_only`.
- Populated: state and evidence are visible in packet/PR.
- Validation/error: missing markers fail `check:knowledge`; unsupported work returns to an earlier state.
- Recovery/undo: record a backward transition and preserve evidence.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: not applicable.

### Financial and security constraints

- No product financial behavior changes.
- No production credentials or user financial data in handoff/memory artifacts.
- Provider and production-data writes require explicit human approval and rollback.

### Out of scope

- Installing Ruflo, CrewAI, Swarm, OpenHands, LangGraph or AutoGen.
- Adding an AI product feature.
- Enabling Sentry, session replay or Trigger.dev.
- Changing database, RLS, UI, runtime or provider configuration.

## Implementation plan

### Architecture fit

`AI_DELIVERY_WORKFLOW.md` remains the workflow owner. `AGENT_OPERATING_MODEL.md` is its subordinate execution contract. Repository artifacts are durable memory; no control plane, vector memory or agent database is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/AGENT_OPERATING_MODEL.md` | Source decisions, state graph, roles, handoffs, permissions, stop conditions and runtime-tool triggers | Apply repo lessons |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Govern lifecycle by explicit states/handoffs | Operational use |
| `docs/templates/FEATURE_WORK_PACKET.md` | Add execution metadata and handoff record | New task contract |
| `.github/pull_request_template.md` | Add operating evidence | Review visibility |
| `AGENTS.md` | Add required pointer and rule | Agent discovery |
| `scripts/check-project-knowledge.mjs` | Require files and markers | CI enforcement |

### Data and migration impact

- Schema/migration: none.
- Backfill: current active packets are not forced to adopt new fields immediately.
- Compatibility: all new packets use the updated template.
- Rollback: delete the new model and revert markers.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Another unused document | Workflow, AGENTS, templates and CI all reference it |
| Fictional role ceremony | Roles are responsibilities with artifacts |
| State labels used as fake progress | State transitions require evidence and allow explicit backward movement |
| Framework list becomes product architecture | Adopt/defer/reject table and unchanged package/runtime |
| Broad agent access | Permission scopes and explicit provider-write approval |

### Verification plan

- Static: exact-head CI `check:knowledge`.
- Unit/domain: full CI remains a regression check; no domain change.
- Database: full CI remains a regression check; no database change.
- Browser/responsive: full CI remains a regression check; no UI change.
- Production/manual: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Write operating model | Research complete | New document | done |
| T2 | Wire workflow, AGENTS and templates | T1 | Six changed contract files | done |
| T3 | Extend knowledge gate | T2 | Marker assertions | done |
| T4 | Open PR and run exact-head CI | T3 | PR #179 / CI | in progress |
| T5 | Independent diff evaluation and owner review | T4 | PR review | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-01 | researcher/planner | implementer | planned | this packet + eight primary repos | No framework should be installed | Implement contract-only slice |
| 2026-08-01 | implementer | evaluator/CI | evaluating | branch, PR #179, seven changed files | Exact-head CI pending | Run/review CI and diff |

### Current permission boundary

- Granted scope: `branch_write` for `agent/apply-agent-orchestration-patterns` and PR #179.
- Exact resources: MoneyFlow repository; read-only inspection of selected public repositories.
- Forbidden writes: `main`, provider settings, production data, database migrations and other branches.
- Human approval required before: merge, provider write or any tool/dependency adoption.
- Rollback/stop condition: stop if exact-head knowledge gate fails or diff expands beyond contract/document files.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Operating model exists | `docs/engineering/AGENT_OPERATING_MODEL.md` | pass |
| Workflow/entrypoint use it | `AI_DELIVERY_WORKFLOW.md`, `AGENTS.md` | pass |
| Packet/PR carry handoff evidence | template and PR template | pass |
| Knowledge gate protects it | `scripts/check-project-knowledge.mjs` | pending CI |
| No dependency/runtime change | changed-file list excludes `package.json` and runtime | pass |

### Research and adoption evidence

- Selected sources support the final state, handoff, sandbox and adoption-trigger decisions.
- Source limitations remain explicit; no source is treated as approval to install its framework.
- No dependency/provider adoption occurs.

### Review findings

- Correctness: exact-head CI pending.
- Security/ownership: branch-only writes; no secrets/provider/data writes.
- UI/UX/accessibility: no UI change.
- Maintainability/duplication: extends existing workflow rather than adding a competing framework.
- Scope compliance: seven expected contract/document files only.

### Remaining limitations

- The model must be tested through real future tasks; documentation cannot prove multi-agent value.
- Sentry and Trigger.dev remain deferred until their explicit triggers occur.

## Delivery record

- Branch: `agent/apply-agent-orchestration-patterns`
- PR: #179
- Squash commit: pending
- CI run: exact-head run pending after this commit
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
