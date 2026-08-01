# Apply AI orchestration patterns without adding a runtime agent framework

**Status:** implementing  
**Owner:** AI agent  
**Issue/PR:** pending  
**Last updated:** 2026-08-01

## Outcome

MoneyFlow will apply the useful engineering patterns from Ruflo/Claude-Flow, CrewAI, OpenAI Swarm, OpenHands, LangGraph, AutoGen, Sentry and Trigger.dev as enforceable delivery and operations boundaries. The repository will gain an explicit state machine, evidence-based handoffs, least-privilege execution rules and clear adoption triggers for runtime observability/background jobs, without installing a multi-agent framework into the personal-finance application.

## Repository reconnaissance

### Current behavior

- `docs/engineering/AI_DELIVERY_WORKFLOW.md` already defines human owner, implementing agent, evaluator and CI roles.
- Work packets already have broad statuses and research/adoption sections.
- `scripts/check-project-knowledge.mjs` enforces the presence of research references and required packet headings.
- The current workflow does not define allowed state transitions, a concrete handoff artifact or a permission scope.
- MoneyFlow has Vercel runtime logs and Speed Insights but no Sentry SDK.
- MoneyFlow has no background job that currently proves a need for Trigger.dev.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Current delivery owner | Extend, do not replace |
| `docs/templates/FEATURE_WORK_PACKET.md` | Task state and evidence | Add state/handoff contract |
| `scripts/check-project-knowledge.mjs` | Existing CI-enforced knowledge gate | Extend with new markers |
| `AGENTS.md` | Concise agent entrypoint | Link to operating model only |
| `package.json` | Runtime/tool dependencies | Do not add agent frameworks, Sentry or Trigger.dev in this slice |

### Existing tests and constraints

- Knowledge gate: `npm run check:knowledge`.
- Full CI exists for lint, typecheck, unit/static RLS, build, database and browser tests.
- `AGENTS.md` must remain concise and forbids creating a competing management layer.

### Similar implementation and recent history

- PR #177 established research and adoption contracts.
- PR #178 archived completed research work packets.
- This slice extends that system rather than adding another framework.

### Open questions

- [x] Which external patterns apply without importing their frameworks?
- [x] What must be enforceable rather than prose only?

## Research

### Research scope and source selection

- Decision question: Which orchestration, sandbox, observability and durable-job patterns should MoneyFlow adopt now, defer or reject?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`.
- Source budget exception: eight repositories were explicitly selected by the owner, so all eight were reviewed.
- Expected decision: a bounded operating model and adoption thresholds.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `ruvnet/ruflo` (formerly claude-flow) | Primary repository | 2026-08-01 | Harness, workflows, hooks, memory, swarms and evidence/observability concepts | 98+ agents, daemon, memory DB and broad plugins are excessive for MoneyFlow |
| `crewAIInc/crewAI` | Primary repository | 2026-08-01 | Separate deterministic Flows from autonomous role-based Crews | Python runtime and autonomous crews are not needed |
| `openai/swarm` | Official educational repository | 2026-08-01 | Minimal agents, tools and explicit handoffs | Replaced by Agents SDK; no production adoption |
| `OpenHands/OpenHands` | Primary repository | 2026-08-01 | Sandboxed execution, backend isolation and explicit filesystem risk | Self-hosted agent control plane is outside product scope |
| `langchain-ai/langgraph` | Primary repository | 2026-08-01 | Durable state transitions, interrupts and human-in-the-loop | Product runtime agents are not approved |
| `microsoft/autogen` | Primary repository | 2026-08-01 | Layered agent interfaces and multi-agent experiments | Repository is in maintenance mode; do not adopt |
| `getsentry/sentry` | Primary repository | 2026-08-01 | Error detection, tracing and debugging platform | SDK adoption needs privacy policy, DSN and beta-level need |
| `triggerdotdev/trigger.dev` | Primary repository | 2026-08-01 | Durable long tasks, retries, queues, schedules and run observability | Current MoneyFlow jobs do not exceed Vercel/Supabase capabilities |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Install a full multi-agent framework | Fast access to orchestration features | New runtime, Python stack, costs, hidden state and excessive autonomy | Reject |
| Add only documentation | Low implementation risk | Easy to ignore; repeats the previous failure | Reject |
| Extend the existing workflow with a state/handoff/permission contract and CI markers | Fits current architecture and becomes reviewable | Does not automate agents by itself | Select |
| Add Sentry and Trigger.dev immediately | Concrete dependencies | No measured need; privacy/operational cost | Defer behind explicit triggers |

### Research decision

Apply concepts, not frameworks. MoneyFlow will use a deterministic engineering state machine, explicit handoff records, least-privilege execution scopes and repository-backed memory/evidence. Multi-agent autonomy, hidden long-term memory and product-runtime agents remain out of scope. Sentry becomes eligible when external beta or recurring production incidents justify it. Trigger.dev becomes eligible only when a real task requires durable execution, retries/queues or duration beyond current serverless limits.

### Adoption review

No dependency/provider is added. This change modifies repository contracts only. Rollback is deletion of the new operating-model document and marker changes.

## Specification

### Problem

External repositories were listed but their most useful patterns were not translated into enforceable MoneyFlow behavior. Agents could still move from research to implementation without an explicit transition/handoff contract, and runtime tools lacked adoption thresholds.

### Acceptance criteria

- [ ] One authoritative agent operating model defines states, transitions, roles, handoffs, permission scopes and stop conditions.
- [ ] The standard workflow links to and uses that model.
- [ ] New work packets expose execution state, active role, permission scope and handoff record.
- [ ] The knowledge gate fails if these contracts disappear.
- [ ] Sentry and Trigger.dev have explicit adoption triggers and privacy/rollback boundaries.
- [ ] No runtime dependency is added.

### Required states

- Loading: not applicable.
- Empty: a new task starts in `discovery` with no implementation permission.
- Populated: each state records evidence and next allowed transition.
- Validation/error: invalid or unsupported transitions stop the task.
- Recovery/undo: return to the last evidence-backed state and update the work packet.
- Mobile/tablet/desktop: not applicable.
- Accessibility: not applicable.

### Financial and security constraints

- No product financial behavior changes.
- No production credentials or user data enter agent memory or handoff artifacts.
- Provider writes require explicit human approval.

### Out of scope

- Installing Ruflo, CrewAI, Swarm, OpenHands, LangGraph or AutoGen.
- Adding an AI feature to MoneyFlow.
- Enabling Sentry or Trigger.dev.
- Changing product code, database, RLS, UI or deployment provider settings.

## Implementation plan

### Architecture fit

The existing AI delivery workflow remains the owner. The new operating model is a subordinate contract that makes lifecycle transitions, handoffs and permissions explicit. Repository files remain the durable memory; no separate agent database or control plane is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/AGENT_OPERATING_MODEL.md` | Add authoritative state/handoff/permission model and runtime adoption decisions | Apply repository lessons concretely |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Link lifecycle to the state machine and handoff contract | Make existing workflow operational |
| `docs/templates/FEATURE_WORK_PACKET.md` | Add execution metadata and handoff record | Ensure every new task carries the contract |
| `AGENTS.md` | Add concise pointer | Agent discovery |
| `scripts/check-project-knowledge.mjs` | Require file and markers | CI enforcement |

### Data and migration impact

- Schema/migration: none.
- Backfill: existing active packets are not forced to adopt new metadata immediately.
- Compatibility: new packets use the new template.
- Rollback: remove the document and marker changes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| The model becomes another unused document | Knowledge gate requires markers in workflow/template |
| Agents treat roles as fictional personas | Roles are responsibilities with required artifacts, not personalities |
| State labels create ceremony without value | Each transition has observable evidence and stop conditions |
| Tool list grows into architecture | Explicit adopt/defer/reject table and no dependencies added |

### Verification plan

- Static: `npm run check:knowledge`.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Write agent operating model | Research complete | New document | in progress |
| T2 | Wire workflow/template/entrypoint | T1 | Diff review | todo |
| T3 | Extend knowledge gate | T2 | `npm run check:knowledge` | todo |
| T4 | Open PR and record CI | T3 | PR/CI | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Operating model exists | pending | pending |
| Workflow/template use it | pending | pending |
| Knowledge gate protects it | pending | pending |
| No dependency added | package diff | pending |

### Research and adoption evidence

- Selected sources support state, handoff, sandbox and adoption-boundary decisions.
- Source limitations remain explicit; no framework is treated as a dependency recommendation.
- No tool/dependency adoption occurs in this slice.

### Review findings

- Correctness: pending.
- Security/ownership: pending.
- Maintainability/duplication: pending.
- Scope compliance: pending.

### Remaining limitations

- This contract improves how agents work but does not prove that multiple agents improve delivery.
- Sentry and Trigger.dev remain deferred until their adoption conditions occur.

## Delivery record

- Branch: `agent/apply-agent-orchestration-patterns`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
