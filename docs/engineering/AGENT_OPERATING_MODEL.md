# Agent operating model

**Status:** active engineering contract
**Last reviewed:** 2026-08-23
**Owner:** `docs/engineering/AI_DELIVERY_WORKFLOW.md`

## Purpose

This document converts useful patterns from owner-selected AI and operations repositories into MoneyFlow's actual delivery model. It is a contract for how agents work on the repository. It is not a runtime AI architecture for the personal-finance product.

MoneyFlow does **not** install or embed the studied orchestration frameworks. The repository keeps its existing Next.js/Supabase modular monolith and applies only the smallest patterns that improve correctness, isolation, review and recovery. The repository-local agent harness is engineering infrastructure and is kept separate from the MoneyFlow product runtime.

## Applied source decisions

| Repository | Pattern applied to MoneyFlow | Explicitly not adopted |
|---|---|---|
| [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | Thin agent coordinator; capability Definition/Provider/Consumer seams; append-only reconstructable run state; fail-loud capability negotiation; holder-owned execution cleanup | Cordis/DeepSeek runtime dependency, dynamic self-modification/plugin installation, unrestricted agent swarms, product-runtime agent framework |
| [ruvnet/ruflo](https://github.com/ruvnet/ruflo), formerly Claude-Flow | Treat the coding model as one part of a harness; preserve task state, evidence, reusable workflow rules and bounded tool access | Agent swarm, daemon, hidden self-learning memory, vector database, federation, 98+ agents and broad plugin installation |
| [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | Separate deterministic **Flow** from optional role specialization; roles have responsibilities and artifacts | Autonomous Crews deciding product scope or delegating without repository contracts |
| [openai/swarm](https://github.com/openai/swarm) | Keep handoffs lightweight: current state, artifacts, open risks and next allowed action | Production dependency; Swarm is educational and superseded by the OpenAI Agents SDK |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | Isolate execution on a branch/worktree or sandbox and grant only task-required access | Full agent control plane, always-on autonomous team and unrestricted host filesystem access |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | Use explicit state transitions, interrupts, resumability and human approval points | Product-runtime agent graph, long-term conversational memory or LangGraph dependency |
| [microsoft/autogen](https://github.com/microsoft/autogen) | Keep layers and responsibilities distinct; tools remain explicit and inspectable | New adoption: AutoGen is in maintenance mode and recommends Microsoft Agent Framework for new systems |
| [getsentry/sentry](https://github.com/getsentry/sentry) | Define a privacy-safe trigger for production error tracing and issue grouping | Session replay or payload capture by default; immediate SDK adoption without measured need |
| [triggerdotdev/trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Define when durable jobs, retries, queues, schedules and human waitpoints become justified | Background-job platform before a real task exceeds current Vercel/Supabase capabilities |

## Deterministic delivery state machine

Every non-trivial task uses one current execution state. A state describes what evidence exists and what action is allowed next; it is not a progress estimate.

```text
discovery
  ↓
specified
  ↓
planned
  ↓
implementing
  ↓
evaluating
  ↓
ready_for_review
  ↓
merged
  ↓
deployed
  ↓
accepted
```

### States and transition evidence

| State | Required evidence | Next allowed transition |
|---|---|---|
| `discovery` | Repository reconnaissance, current behavior and unresolved question | `specified` after product/research uncertainty is bounded |
| `specified` | Acceptance criteria, constraints, required states and explicit non-goals | `planned` after architecture fit and risks are known |
| `planned` | Files/owners, task graph, test plan, rollout and rollback | `implementing` after scope is reviewable |
| `implementing` | Focused branch, task-level diffs and updated packet | `evaluating` when implementation claims are complete |
| `evaluating` | Independent spec review, counterexamples and required test evidence | `ready_for_review` when blockers are resolved |
| `ready_for_review` | PR, exact-head CI status, risks and production verification steps | `merged` only by the human owner or approved repository policy |
| `merged` | Merge commit and deployment target identified | `deployed` when the exact commit is live |
| `deployed` | Exact deployment and affected-flow smoke evidence | `accepted` after human/product acceptance |
| `accepted` | Owner acceptance and completed packet | Terminal state |

### Allowed backward transitions

A task may move backward when new evidence invalidates its current assumptions:

- `implementing → specified`: implementation reveals a wrong requirement.
- `evaluating → implementing`: evaluation finds a bounded implementation defect.
- `ready_for_review → planned`: the base branch or architecture changed materially.
- `deployed → implementing`: production verification exposes a regression and a rollback/fix begins.

The packet must record why the transition occurred. Agents must not silently redefine the state to preserve an appearance of progress.

## Responsibilities, not personas

Roles are responsibility boundaries. One agent may perform more than one role sequentially, but the evidence from each role remains separate.

| Role | Responsibility | Required artifact |
|---|---|---|
| Human owner | Product intent, risk decisions, merge and acceptance | Explicit decision or approval where required |
| Researcher | Internal reconnaissance and focused external evidence | Sources, applicability, rejected alternatives and uncertainty |
| Planner | Specification, architecture fit, task decomposition and verification design | Updated work packet before implementation |
| Implementer | Small scoped change on an isolated branch | Diff, tests and implementation notes |
| Evaluator | Check the diff against the packet and search for counterexamples | Acceptance matrix, findings and exact evidence |
| CI/production | Repeatable execution and operational signals | Logs, artifacts, deployment identity and smoke results |

An evaluator must read the specification and the diff. Reviewing only the implementer's summary is not evaluation.

## Handoff contract

A handoff is valid only when the receiving role can continue without reconstructing hidden chat context.

Every handoff records:

- **From / to:** responsibility boundary, not a fictional character.
- **Current execution state.**
- **Decision and scope:** what is fixed, what remains open and what is forbidden.
- **Artifacts:** work packet, files, branch, PR, tests, screenshots, logs or deployment.
- **Unverified claims:** anything not yet proven.
- **Risks and stop conditions.**
- **Next allowed action:** one bounded action or transition.

A message such as “continue from here” without artifacts is not a valid handoff.

## Permission scopes

Agents receive the smallest permission scope required for the current state.

| Scope | Allowed | Not allowed |
|---|---|---|
| `read_only` | Read code, issues, PRs, logs and provider metadata | Repository or provider writes |
| `branch_write` | Create/update one focused branch and PR | Push to `main`, merge, force-push or edit unrelated branches |
| `provider_read` | Inspect deployment, Auth/database metadata and logs | Change production configuration or data |
| `provider_write_approved` | One explicit, reversible provider action approved by the owner | Broad configuration changes, secret disclosure or combining unrelated provider changes |
| `production_data_write_approved` | A narrowly approved migration or synthetic/rollback-safe verification operation | Ad-hoc mutation of real financial data |

Provider or production-data writes require an explicit human decision and rollback plan. A task instruction to “finish everything” does not grant those permissions.

## Local harness execution contract

`scripts/agent-harness/` is the repository-local execution layer for owner-authorized coding agents. It consumes the permission model above; it does not define a broader one.

The harness is deliberately split into capability seams:

- `source/github`: discovers owner-authored `/agent <provider>` commands and writes concise status;
- `workspace/local`: proves local `origin/main` matches remote `main` and creates a fresh isolated non-main worktree;
- `permission/guarded`: removes GitHub token environment variables and installs the Git/GitHub allowlist guard;
- `agent/<provider>`: starts an implementation provider behind a common owned-run contract. `codex` is currently the built-in provider.

A provider name is not authority. Before an accepted run, the runtime requires explicit `isolatedWorkspace` and `guardedEnvironment` capabilities; unavailable, conflicting or under-capable providers fail loudly. The child process receives no merge/main/force-push/provider-write/production-data permission from provider registration.

Run lifecycle is append-only. `.agent-harness/runs/<command-id>.jsonl` records contiguous accepted facts and is projected into `unseen`, `interrupted`, `completed` or `failed`. The runtime does not maintain a second mutable v2 state file. A non-terminal accepted history blocks automatic replay because repository side effects before a crash are unknowable. Detailed model output stays in private ignored local logs rather than the run journal or repository memory.

Each agent provider returns a holder-owned handle with `result`, `cancel()` and `dispose()`. The harness owns that handle until settlement and waits for cleanup. Watch mode runs cycles serially rather than overlapping polling executions.

The legacy `.agent-dispatcher/state.json` file is read-only migration input. V2 migrates its known command identities before source dispatch: `completed`/`failed` become terminal journals and `running` becomes interrupted. Malformed legacy state blocks the cycle; migration does not delete the original file. The old executable dispatcher is not a second runtime after harness v2.

## Repository-backed memory

MoneyFlow uses repository artifacts as durable memory:

- permanent constraints: `AGENTS.md`, product principles and architecture;
- task state: active work packet;
- decisions: ADR/spec/research documents where needed;
- implementation: branch and pull request;
- evidence: tests, CI artifacts, screenshots and deployment records;
- completed learning: completed packet and current source-of-truth updates.

Do not create a hidden vector-memory system or copy private conversation history into the repository. Sensitive financial content, credentials, tokens and provider secrets never belong in agent memory artifacts. Local harness journals contain lifecycle metadata only and remain ignored local runtime state, not project knowledge.

## Stop and interrupt conditions

Stop implementation and return to the appropriate earlier state when:

- the product requirement is ambiguous or conflicts with a source of truth;
- repository reconnaissance contradicts the work packet;
- the required change crosses an unapproved architecture or provider boundary;
- a financial invariant cannot be proven;
- a tool requires broader permissions than the task justifies;
- tests are green but do not exercise the real owner/DOM/database path;
- a migration or provider action lacks rollback;
- the current branch/base no longer matches the reviewed plan;
- external research is stale, secondary-only or materially conflicting.

## Runtime operations adoption decisions

### Sentry

Sentry is **eligible**, not installed by default.

Adopt the official JavaScript/Next.js SDK when at least one is true:

- MoneyFlow enters external beta and Vercel logs are insufficient to connect client and server failures;
- the same production error recurs without a reliable reproduction path;
- release/error grouping and source-mapped stack traces would materially shorten diagnosis.

Before adoption, the work packet must specify:

- DSN ownership and environment separation;
- event scrubbing for email, notes, amounts, import contents, URLs/query strings and Supabase tokens;
- no session replay by default;
- sampling and cost limits;
- source-map upload security;
- disable/rollback path;
- a synthetic-error verification that contains no financial data.

### Trigger.dev

Trigger.dev is **deferred** until a concrete job needs one or more of:

- execution longer than the current serverless limit;
- durable retries/checkpointing across failures;
- explicit queue/concurrency control;
- a schedule whose run history and replay matter;
- a human approval waitpoint;
- heavy browser, Python or document processing that should not block a request.

Do not use Trigger.dev for ordinary CRUD, Supabase RPCs, short import parsing, UI notifications or tasks already handled reliably by Vercel/Supabase. Adoption must include idempotency, tenant ownership, payload minimization, environment separation, cost limits and cancellation/replay behavior.

## Success criteria

This model succeeds only when it makes delivery clearer and safer:

- fewer scope changes after implementation begins;
- handoffs continue from artifacts rather than chat reconstruction;
- permission boundaries prevent accidental production changes;
- evaluation finds missing evidence before merge;
- external tools are adopted only after a measured trigger;
- the product remains simpler than the orchestration systems used to build it.

More agents, more documents or more automation are not success metrics.