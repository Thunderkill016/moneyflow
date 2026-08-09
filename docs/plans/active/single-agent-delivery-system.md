# Single-agent AI delivery system

**Status:** implementing
**Execution state:** implementing
**Risk class:** 3
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** pending
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Make one primary AI effective as MoneyFlow's technical project manager + implementer without giving it sole acceptance authority. Reduce duplicated project state, keep process proportional to risk, and make generic `Go` authorize exactly one recorded action.

## Authority references

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Delivery authority: `docs/engineering/AGENT_OPERATING_MODEL.md`
- Risk policy: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`
- Historical candidates studied: PR #315 and PR #317; neither is current authority.

## Control contract

### State

- `CURRENT_PROJECT_MEMORY.md` owns merged/provider truth.
- This packet owns only this task's state, permissions, evidence gaps and next action.
- PR memory will own bounded historical provenance after the PR exists.

### Feedback

- Expected failure: delivery-contract tests reject ambiguous/missing gates, broken AC coverage or missing Class 2/3 independent evidence.
- Deterministic success: focused tests + `npm run test:ci-policy` + protected exact-head checks.
- Semantic success: a new session can continue from repo artifacts and `Go` cannot silently chain merge/deploy/provider writes.

### Removal impact

Removing the change restores author/self-review correlation, duplicated-state ambiguity and unscoped terse approvals. Rollback is one Git revert; no runtime/provider/data migration exists.

### Action safety

Branch-only policy/tooling work. No `main`, provider, production, user-data, branch-rule or secret write is authorized.

## Current decision gate

- Gate ID: G1
- Next allowed action: complete the bounded policy/tooling implementation, independently evaluate the actual diff, and open one focused PR for owner review
- Approval token: `Go`
- Consumes approval: yes
- After action: return to `evaluating`; establish a new gate before any merge, provider or deployment action

## Repository reconnaissance

### Current behavior

- MoneyFlow already has a state machine, role boundaries, permission scopes, repo-backed memory and risk-selected CI.
- `AGENT_OPERATING_MODEL.md` already permits one agent to perform multiple roles sequentially.
- Recent PRs proved independent review still catches author-blind contract errors after self-review.
- Current truth is repeated across current memory, parent/child packets and PR memories more than necessary.
- PR #315 prototypes task bootstrap/control contracts; PR #317 prototypes AC→task→evidence. They are stale relative to current MoneyFlow Trust and should not be merged wholesale.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md` | hot-memory router | keep concise, point to durable rules |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | roles/state/permissions | add single-agent and authority rules |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | process budget | align planning + independent review by class |
| `docs/templates/FEATURE_WORK_PACKET.md` | full-packet contract | add risk, gate and traceability surfaces |
| `scripts/agent-delivery-contract.mjs` | deterministic structure gate | small Node stdlib checker only |
| `package.json` | CI policy entrypoint | register focused checker/tests |

### Existing tests and constraints

- `npm run test:ci-policy` is the existing deterministic delivery-policy surface.
- Protected CodeQL/secret history remain separate evidence.
- No new service, dependency, runtime agent framework or hidden memory layer.

### Open questions

- [x] Can one AI manage + implement? Yes, with role transitions and independent Class 2/3 evaluation.
- [x] Should `Go` mean finish everything? No; one current gate only.
- [x] Should Class 0/1 inherit Class 3 ceremony? No.
- [x] Merge #315/#317 unchanged? No; port only proven concepts onto current main.

## Research

### Research scope and source selection

Decision question: how should one primary coding AI retain autonomy while repository context, review independence and merge evidence remain trustworthy?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI — Harness engineering | first-party engineering practice | 2026-08-09 | short `AGENTS.md` as map; structured repo docs as system of record; mechanically checkable knowledge | not MoneyFlow product authority |
| OpenAI — How OpenAI uses Codex | first-party workflow guidance | 2026-08-09 | issue-like tasks, persistent repo instructions, lightweight backlog | not MoneyFlow risk policy |
| GitHub Docs — pull-request reviews/protected branches | first-party platform docs | 2026-08-09 | review/conversation resolution is separable from author work | live repo rules still control |
| GitHub Docs — status checks | first-party platform docs | 2026-08-09 | machine evidence attaches to current commits/checks | green checks do not prove semantics |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| agent swarm/orchestrator | explicit roles | cost/context/process overhead | reject |
| one AI self-accepts | cheapest | correlated blind spots | reject |
| duplicate status everywhere | local convenience | stale contradictions | reject |
| repo-native single-agent + independent evidence | cheap, resumable, auditable | requires disciplined gates | select |
| merge #315/#317 unchanged | existing candidate code | stale/bundled process | reject |

### Research decision

One primary AI may research/plan/implement and self-review, but Class 2/3 acceptance needs an independent semantic signal. Repo artifacts, not chat, are durable state. Current product truth, task truth and historical provenance have separate owners. Generic `Go` consumes one packet gate.

### Adoption review

No external dependency/service/framework is adopted. New code is Node standard-library CI tooling only; zero shipped runtime/provider cost and Git-revert rollback.

## Specification

### Problem

The current workflow is safe but can waste time through duplicated status updates and can correlate author + evaluator mistakes when one AI does most work. Short owner commands can also become ambiguous across merge/deploy/provider checkpoints.

### User stories

- As owner, `Go` maps to one visible action.
- As primary AI, I can manage + implement without chat-only memory.
- As evaluator, I inspect spec + actual diff + evidence rather than the author summary.
- As a new session, I can locate global truth, active task truth and PR history without loading everything.

### Acceptance criteria

- [ ] AC1: policy explicitly supports sequential single-agent roles but forbids author-only Class 2/3 acceptance.
- [ ] AC2: current memory, active packet and PR memory have non-overlapping authority.
- [ ] AC3: Class 0–3 planning/evaluation cost stays risk-proportional.
- [ ] AC4: canonical full packet has exactly one scoped `Go` decision gate.
- [ ] AC5: deterministic tests validate gate structure, AC→task coverage, evidence targets and Class 2/3 independent evaluation before review readiness.
- [ ] AC6: no runtime, financial, database, provider or production behavior changes.
- [ ] AC7: #315/#317 remain historical candidate sources rather than a second current workflow.

### Required states

Not applicable to product UI. Delivery failure state is fail-closed CI-policy output with exact field/task/criterion errors.

### Financial and security constraints

No financial/RLS/Auth/provider behavior changes. A packet cannot grant itself owner-only permissions.

### Out of scope

Runtime AI, swarms, automatic merge/deploy/provider writes, global product prioritization, and historical packet rewrites.

## Implementation plan

### Architecture fit

Extend existing `AGENTS.md`, operating-model, risk-policy, packet-template and CI-policy ownership. Do not introduce a new management service or runtime layer.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | route single-agent/gate/memory rules | fresh sessions need hot guidance |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | role independence + authority ownership + `Go` semantics | core contract |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | process/review budget by class | reduce ceremony safely |
| `docs/templates/FEATURE_WORK_PACKET.md` | risk/gate/AC/task/evaluator fields | canonical task state |
| `scripts/agent-delivery-contract.mjs` + test | structural fail-closed validation | machine-verifiable contract |
| `package.json` | add checker/test to existing CI policy | no new workflow topology |

### Data and migration impact

None. Historical/completed packets are grandfathered; checker targets the canonical template and changed active packets.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| self-review relabeled independent | Class 2/3 readiness fields + policy |
| `Go` chains merge→deploy | one gate, consumed approval |
| stale duplicated truth | artifact authority table |
| tiny task gets full packet | explicit Class 0/1 budget |
| checker becomes semantic judge | structure only; reviewer/human owns meaning |

### Verification plan

- `node --check scripts/agent-delivery-contract.mjs`
- focused Node tests
- `npm run check:agent-delivery`
- `npm run test:ci-policy`
- exact-head CI/CodeQL/secret history
- independent PR review of actual diff

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | reconcile current policy and #315/#317 | AC7 | none | current-main docs + PR evidence | done |
| T2 | focused first-party research | AC1, AC2, AC3 | T1 | OpenAI + GitHub docs | done |
| T3 | update policy/template authority model | AC1, AC2, AC3, AC4 | T2 | changed policy/template diff | done |
| T4 | implement structural checker and fixtures | AC4, AC5, AC6 | T3 | checker + focused Node tests | in_progress |
| T5 | independent review + exact-head gates | AC1, AC2, AC3, AC4, AC5, AC6, AC7 | T4 | PR review + CI/CodeQL/secret history | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | researcher | planner | specified | repo policy + #315/#317 + first-party sources | exact contract not implemented | select smallest current-main design |
| 2026-08-09 | planner | implementer | planned | this packet + AC/task plan | tests not run | implement + test bounded diff |

### Current permission boundary

- Granted scope: branch_write on `agent/single-agent-delivery-system`.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, provider/production, branch protection/rulesets, secrets, financial/user data.
- Human approval required before: merge and any provider/production action.
- Stop condition: new service/framework, weakened owner authority, broad historical rewrite or inability to validate deterministically.

## Evaluation

### Independent evaluation

- Evaluator: pending independent PR review
- Implementer overlap: none preferred; fresh-context evaluator acceptable under policy
- Inputs reviewed: pending specification + actual diff + exact evidence
- Author summary treated as authority: no

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | policy diff | pending |
| AC2 | authority-ownership diff | pending |
| AC3 | risk-policy diff | pending |
| AC4 | template + checker | pending |
| AC5 | focused + CI-policy tests | pending |
| AC6 | changed-file review/classifier | pending |
| AC7 | PR history comparison | pending |

### Research and adoption evidence

Selected first-party sources support repo-native context, issue-like tasks, independent review/checks and current-head machine evidence; no external architecture was adopted.

### Review findings

Pending implementation completion and independent review.

### Remaining limitations

Structural checks cannot prove product judgment or semantic correctness; that is intentionally left to independent evaluation and the human owner.

## Delivery record

- Branch: `agent/single-agent-delivery-system`
- PR: pending
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending acceptance
