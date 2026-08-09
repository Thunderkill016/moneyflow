# Single-agent AI delivery system

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** pending
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

MoneyFlow can be managed and implemented primarily by one AI agent without giving that agent unchecked acceptance authority. The repository keeps one durable current-state authority, one task execution packet, independent evaluation evidence, risk-proportional process cost and one unambiguous next action at every approval checkpoint.

## Control contract

### State

- Location: current merged/provider product truth lives in `docs/research/CURRENT_PROJECT_MEMORY.md`; current task execution truth lives in this active packet; immutable bounded provenance lives in the PR memory record.
- Writer/owner: scoped agents may update the active packet and branch; current project memory changes only when merged/provider truth materially changes; the human owner owns product intent, merge, acceptance and risky provider/production decisions.
- Propagation: state transitions update the active packet first; a merged/provider truth change then updates current memory; PR memory records the bounded historical evidence without becoming current authority.

### Feedback

- Expected failing signal: policy-contract tests reject missing/ambiguous decision gates, duplicate current-state authority or an author-only Class 2/3 evaluation claim.
- Success signal: focused delivery-contract tests plus `npm run test:ci-policy` and exact-head protected checks pass.
- Semantic evidence: a fresh task can be continued from repository artifacts without reconstructing hidden chat context, and a short owner command such as `Go` authorizes exactly one recorded action rather than a chain of later actions.

### Removal impact

- What breaks if removed: one AI can again accumulate author/reviewer authority, project status can drift across duplicated documents, and terse owner approvals can become ambiguous across merge/deploy/provider boundaries.
- Rollback: revert this bounded policy/tooling PR, rerun the prior CI-policy suite and retain the existing state machine, permission scopes and human merge/provider-write boundaries.

### Action safety

- Permissions: branch-only repository policy/tooling/docs changes; read-only GitHub/web research.
- Reversibility: all changes are Git-revertible and do not alter product runtime, database, provider configuration or production data.
- Escalation: stop for merge, branch/ruleset changes, provider writes, production data changes, or any attempt to make AI self-review the sole Class 2/3 acceptance signal.
- Failure containment: a defect can block or misroute engineering workflow only; it cannot change financial behavior or production state.

## Current decision gate

- Next allowed action: finish implementation and independent evaluation on this branch, then open one focused PR for owner review.
- Approval token: `Go`
- Consumes approval: yes
- After action: return to `evaluating`; any later merge/provider/deploy action requires a newly recorded gate or an explicit action named by the owner.

## Repository reconnaissance

### Current behavior

- `AGENTS.md` already routes context and requires risk-proportional delivery.
- `AGENT_OPERATING_MODEL.md` already permits one agent to perform multiple roles sequentially while requiring evidence to stay separate.
- `AI_DELIVERY_WORKFLOW.md` already says AI may research, plan, implement and review but cannot redefine requirements or declare itself complete.
- `RISK_PROPORTIONAL_DELIVERY.md` already separates Class 0–3 planning and verification cost.
- Current project truth is nevertheless repeated across current memory, parent plans, active phase packets and PR memory, creating stale wording and review churn.
- Recent PRs showed independent review catching author-blind contract errors after self-review, including goal-allocation wording and active-role handoff mismatches.
- Open PR #315 contains a useful task-bootstrap/control-contract prototype; stacked PR #317 contains useful AC→task→evidence traceability. Both predate the current MoneyFlow Trust baseline and must not be merged unchanged.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md` | hot-memory entrypoint | keep concise; point to durable rules |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | role/state/permission authority | add single-agent mode and authority ownership |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | lifecycle and planning policy | add risk-based paperwork/review budget |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Class 0–3 verification | align independent evaluation requirements |
| `docs/templates/FEATURE_WORK_PACKET.md` | canonical non-trivial task artifact | add current decision gate and traceability surface |
| `scripts/agent-delivery-contract.mjs` | deterministic policy owner | add small fail-closed gate, not an orchestrator |
| old PR #315/#317 | prior candidate ideas | selectively port concepts, not stale branches wholesale |

### Existing tests and constraints

- Existing CI policy tests run under `npm run test:ci-policy`.
- Protected CodeQL and secret-history evidence remain independent provider checks.
- No runtime agent framework, vector memory, new service or dependency is justified.
- Owner merge/provider-write checkpoints remain mandatory.

### Open questions

- [x] Can one AI research/plan/implement/evaluate? Yes, sequentially, with evidence separation and independent evaluation for consequential work.
- [x] Should current truth be copied into every packet? No; use references and delta-specific evidence.
- [x] Should `Go` mean “finish everything”? No; it consumes only the single recorded next action.
- [x] Should Class 0/1 work require full packets? No; process cost remains risk-proportional.
- [x] Should #315/#317 be merged unchanged? No; current-main implementation should port only proven useful concepts.

## Research

### Research scope and source selection

- Decision question: what repository harness gives one coding AI enough context and autonomy without making it its own acceptance authority or turning documentation into process overhead?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` plus current repository policy.
- Source budget: current OpenAI Codex engineering guidance and current GitHub pull-request/status-check documentation.
- Expected decision: preserve repo-native context and machine-verifiable evidence while keeping human/independent review at consequential boundaries.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI, “Harness engineering: leveraging Codex in an agent-first world” | first-party engineering practice | 2026-08-09 | short `AGENTS.md` as map; structured repository docs as system of record; mechanically checkable knowledge | OpenAI repository structure is guidance, not MoneyFlow product authority |
| OpenAI, “How OpenAI uses Codex” | first-party workflow guidance | 2026-08-09 | issue-like task prompts, persistent `AGENTS.md`, lightweight task queue | does not define MoneyFlow risk or merge policy |
| GitHub Docs, pull-request reviews/protected branches | first-party platform docs | 2026-08-09 | reviews/conversation resolution are separable from author work and can be merge conditions | actual repository rules still require live inspection |
| GitHub Docs, status checks | first-party platform docs | 2026-08-09 | checks attach machine evidence to commits; latest required checks matter for merge readiness | green checks do not prove product semantics by themselves |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add another agent framework/swarms | role separation by construction | cost, context duplication, orchestration overhead | reject |
| Let one AI author and self-accept | cheapest | correlated blind spots and false confidence | reject |
| Keep duplicating full status narratives | locally convenient | stale contradictions and review churn | reject |
| Repo-native single-agent mode + independent evidence | low cost, auditable, resumable | requires disciplined gates | select |
| Merge old #315/#317 unchanged | already implemented candidate code | stale baseline and too much bundled process | reject |

### Research decision

Use one primary AI as technical project manager + implementer, but keep role transitions explicit. Current product/provider truth has one authority, task execution has one active packet, and PR memory is historical provenance. Class 2/3 author work must receive an independent evaluation signal before owner merge. `Go` is a scoped approval token for exactly one current decision gate and is consumed after the action.

### Adoption review

- Observed problem: duplicated state, self-review correlation and ambiguous terse approvals cause avoidable review/coordination overhead.
- Existing or simpler alternatives considered: prose-only guidance and old #315/#317 candidates; prose alone is not fail-closed, old candidates are stale.
- License/code-reuse compatibility: no external code copied; selected ideas are implemented with repository-owned Markdown/Node standard library.
- Secrets, user-data and privacy exposure: repository metadata only; no financial user content or credentials.
- Runtime, bundle, deployment and operational cost: CI/development only; zero shipped runtime dependency.
- Owning boundary and maintenance responsibility: engineering policy + CI policy tests.
- Migration and rollback: incremental for future/changed packets; Git revert only.
- Verification plan: focused parser tests, full CI-policy tests, exact-head CI/CodeQL/secret history, independent PR review.
- Removal condition if the expected benefit does not appear: simplify/remove deterministic fields if they become ceremonial and stop catching routing/evidence defects.

## Specification

### Problem

Using one AI as both project manager and coder is cost-efficient but can fail when durable state is duplicated, the same model evaluates its own summary instead of the diff, small tasks inherit Class 3 ceremony, or a short owner command ambiguously spans multiple actions.

### User stories

- As the owner, I can say `Go` and know exactly one pre-recorded action is authorized.
- As the primary AI, I can manage and implement MoneyFlow without reconstructing project state from chat.
- As an evaluator, I can review specification, diff and evidence independently of the implementer summary.
- As a future session, I can determine current product truth, current task state and historical provenance from three non-overlapping artifact types.

### Acceptance criteria

- [ ] AC1: repository policy explicitly supports one AI performing multiple roles sequentially but forbids author-only Class 2/3 acceptance.
- [ ] AC2: current memory, active packet and PR memory have non-overlapping authority responsibilities.
- [ ] AC3: planning/review ceremony remains proportional to Class 0–3 risk.
- [ ] AC4: the canonical full packet exposes exactly one current decision gate and documents `Go` as one-action, consumed approval.
- [ ] AC5: deterministic tests reject missing/ambiguous template decision-gate structure and keep the rule inside existing `test:ci-policy`.
- [ ] AC6: no runtime, financial, database, provider or production behavior changes.
- [ ] AC7: old #315/#317 are documented as candidate sources, not silently treated as current authority or blindly merged.

### Financial and security constraints

- Financial semantics, RLS, Auth and production provider state are untouched.
- No AI may grant itself merge/provider/production permissions through a packet edit.
- Owner approval remains mandatory where current policy requires it.

### Out of scope

- Runtime AI inside MoneyFlow.
- Agent swarms or persistent orchestration service.
- Automatic product prioritization without owner policy.
- Automatic merge/deployment/provider writes.
- Rewriting every historical packet.

## Implementation plan

### Architecture fit

Extend existing policy and CI-policy ownership. `AGENTS.md` remains navigation, engineering docs remain durable policy, the packet remains task state, and one small Node checker validates only structural decision-gate invariants.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/AGENT_OPERATING_MODEL.md` | single-agent mode, authority split, approval-token semantics | remove role/self-review ambiguity |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | risk-based planning/review budget | reduce ceremony while preserving high-risk rigor |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | independent evaluation by class | align verification policy |
| `docs/templates/FEATURE_WORK_PACKET.md` | decision gate + AC/task/evidence guidance | one reusable full-packet contract |
| `scripts/agent-delivery-contract.mjs` | structural validator | make gate fail closed |
| `scripts/agent-delivery-contract.test.mjs` | focused fixtures | prevent policy drift |
| `package.json` | register focused test in `test:ci-policy` | reuse existing CI surface |
| this packet + PR memory | task execution/provenance | durable handoff |

### Data and migration impact

- Schema/migration: none.
- Backfill: none; historical packets remain historical.
- Compatibility: changed/new full packets adopt the decision gate; old completed packets are not rewritten.
- Rollback: revert the policy/tooling PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| one AI marks its own Class 3 work accepted | policy requires independent evaluation + owner decision |
| `Go` accidentally means merge + deploy + provider write | approval consumes one recorded next action only |
| packet copies all provider/product truth and goes stale | authority split requires references/deltas |
| tiny docs fix creates a full packet | Class 0/1 paperwork budget remains explicit |
| deterministic parser becomes semantic AI judge | parser validates structure only; evaluator/human owns meaning |
| old #315/#317 create two workflow systems | selected ideas ported into current owner surfaces; no second orchestrator |

### Verification plan

- Static: `node --check scripts/agent-delivery-contract.mjs`.
- Unit/domain: focused Node fixtures + `npm run test:ci-policy`.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: not applicable; protected CI/CodeQL/secret-history plus independent PR review.

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | reconcile current policy and old #315/#317 candidates | AC7 | none | current-main docs + PR diffs | done |
| T2 | research current OpenAI/GitHub harness/review guidance | AC1, AC2, AC3 | T1 | first-party sources | done |
| T3 | update policy/template authority model | AC1, AC2, AC3, AC4 | T2 | focused diff + knowledge contract | in_progress |
| T4 | add deterministic decision-gate validator/tests | AC4, AC5, AC6 | T3 | focused tests + CI-policy suite | todo |
| T5 | independent review and exact-head protected gates | AC1, AC2, AC3, AC4, AC5, AC6, AC7 | T4 | PR review + CI/CodeQL/secret history | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | researcher | planner | specified | current policy, #315/#317 comparison, first-party research | exact structural contract not implemented | select smallest current-main design |
| 2026-08-09 | planner | implementer | planned | this packet + AC/task plan | CI contract not yet changed | implement bounded policy/tooling diff |

### Current permission boundary

- Granted scope: branch writes only on `agent/single-agent-delivery-system` plus GitHub/web reads.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`; official public engineering/docs sources.
- Forbidden writes: `main`, provider configuration, Supabase/Vercel production, branch rules, secrets and user data.
- Human approval required before: merge or any provider/production action.
- Rollback or stop condition: stop if implementation requires a new service/framework, weakens owner merge/provider authority or creates broad historical rewrites.

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

### Review findings

- Correctness: pending implementation.
- Security/ownership: branch-only policy/tooling; no provider/data write.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: design intentionally removes duplicated authority instead of adding another management layer.
- Scope compliance: pending final diff review.

### Remaining limitations

- Structural checks cannot prove product judgment or semantic correctness; independent evaluation remains necessary.

## Delivery record

- Branch: `agent/single-agent-delivery-system`
- PR: pending
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending acceptance
