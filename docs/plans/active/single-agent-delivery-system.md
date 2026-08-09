# Single-agent AI delivery system

**Status:** evaluating
**Execution state:** evaluating
**Risk class:** 3
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #331
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Make one primary AI effective as MoneyFlow's technical project manager + implementer without giving it sole acceptance authority. Reduce duplicated project state, keep process proportional to risk, and make generic `Go` authorize exactly one recorded action.

## Authority references

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Delivery authority: `docs/engineering/AGENT_OPERATING_MODEL.md`
- Risk policy: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`
- Historical candidates studied: PR #315 and PR #317; neither is current authority.

## Current decision gate

- Gate ID: G2
- Next allowed action: obtain one independent fresh-context semantic review of PR #331 against this packet, the actual diff and exact-head evidence, then address any findings without merging
- Approval token: `Go`
- Consumes approval: yes
- After action: remain `evaluating` until review findings are resolved and a final exact-head run supports a separate owner merge gate

## Repository reconnaissance

### Current behavior

- MoneyFlow already had a deterministic lifecycle, role boundaries, permission scopes, repository-backed memory and risk-selected CI.
- `AGENT_OPERATING_MODEL.md` already allowed one agent to perform multiple roles sequentially, but did not make author/self-review correlation explicit enough for the user's one-AI operating mode.
- Project truth was repeated across current memory, parent plans, active packets and PR memories more than necessary.
- Recent PRs showed independent review catching author-blind wording/handoff defects after self-review.
- PR #315 and #317 contain useful control-contract and AC→task→evidence ideas but are stale against current MoneyFlow Trust and are not being merged wholesale.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md` | hot-memory router | keep below the existing line budget and point to durable rules |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | roles/state/permissions | add single-agent mode, authority ownership and scoped approvals |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | planning/review cost | make ceremony and independent review proportional to Class 0–3 risk |
| `docs/templates/FEATURE_WORK_PACKET.md` | full-packet contract | add risk, one decision gate, AC/task/evidence and evaluator fields |
| `scripts/agent-delivery-contract.mjs` | deterministic structure gate | Node standard library only; structure, not semantic judgment |
| `src/lib/rls-migrations.test.ts` | existing static security scanner | remove a proven SQL-comment false positive exposed by full verification |

### Existing tests and constraints

- `npm run test:ci-policy` is the existing delivery-policy test surface.
- Protected CodeQL and secret-history checks remain independent machine evidence.
- No new service, dependency, runtime agent framework, provider or hidden memory layer is introduced.
- Owner merge/provider/production-write authority remains unchanged.

### Open questions

- [x] Can one primary AI manage + implement? Yes, with explicit role transitions and independent Class 2/3 evaluation.
- [x] Should `Go` mean finish everything? No; one current gate only.
- [x] Should Class 0/1 inherit Class 3 ceremony? No.
- [x] Merge #315/#317 unchanged? No; port only useful concepts onto current main.
- [ ] Independent semantic review of the final #331 diff is still missing because the configured Codex review bot hit its usage limit.

## Research

### Research scope and source selection

Decision question: how should one primary coding AI retain autonomy while repository context, review independence and merge evidence remain trustworthy?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI — Harness engineering | first-party engineering practice | 2026-08-09 | short `AGENTS.md` as a map, structured repository docs as system of record, mechanically checkable knowledge | not MoneyFlow product authority |
| OpenAI — How OpenAI uses Codex | first-party workflow guidance | 2026-08-09 | issue-like tasks, persistent repo instructions, lightweight task routing | not MoneyFlow risk policy |
| GitHub Docs — pull-request reviews/protected branches | first-party platform docs | 2026-08-09 | review/conversation resolution is separable from author work | live repo rules still control |
| GitHub Docs — status checks | first-party platform docs | 2026-08-09 | machine evidence attaches to a concrete commit/check state | green checks do not prove semantics |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| agent swarm/orchestrator | explicit roles | extra cost, context duplication, maintenance | reject |
| one AI authors and self-accepts | cheapest | correlated blind spots | reject |
| duplicate status narratives everywhere | local convenience | stale contradictions and review churn | reject |
| repo-native single-agent mode + independent evidence | low cost, resumable, auditable | requires disciplined gates | select |
| merge #315/#317 unchanged | candidate implementation exists | stale baseline and too much bundled process | reject |

### Research decision

One primary AI may research, plan, implement and self-review, but Class 2/3 author-owned work needs an independent semantic signal before `ready_for_review`. Repository artifacts, not chat, are durable state. Current product/provider truth, active task truth and historical PR provenance have separate owners. Generic `Go` consumes one packet gate.

### Adoption review

No external dependency/service/framework is adopted. New executable code is Node standard-library CI tooling only, with zero shipped runtime/provider cost and Git-revert rollback.

## Specification

### Problem

The current workflow is safe but can waste time through duplicated status updates and can correlate author + evaluator mistakes when one AI does most work. Short owner commands can also become ambiguous across merge/deploy/provider checkpoints.

### User stories

- As owner, `Go` maps to one visible action.
- As primary AI, I can manage + implement without chat-only memory.
- As evaluator, I inspect specification + actual diff + evidence rather than an author summary.
- As a future session, I can locate global truth, active task truth and PR history without loading everything.

### Acceptance criteria

- [ ] AC1: policy explicitly supports sequential single-agent roles but forbids author-only Class 2/3 acceptance.
- [ ] AC2: current memory, active packet and PR memory have non-overlapping authority.
- [ ] AC3: Class 0–3 planning/evaluation cost stays risk-proportional.
- [ ] AC4: canonical full packet has exactly one scoped `Go` decision gate.
- [ ] AC5: deterministic tests validate gate structure, AC→task coverage, evidence targets and Class 2/3 independent evaluation before review readiness.
- [ ] AC6: no runtime, financial, database, provider or production behavior changes.
- [ ] AC7: #315/#317 remain historical candidate sources rather than a second current workflow.

### Required states

No product UI state changes. Delivery failures are fail-closed CI-policy errors with the exact malformed gate/task/criterion, while semantic acceptance remains reviewer/human responsibility.

### Financial and security constraints

No financial/RLS/Auth/provider behavior changes. A packet edit cannot grant itself owner-only merge/provider/production permissions.

### Out of scope

Runtime AI, agent swarms, automatic merge/deploy/provider writes, automatic product prioritization, and historical packet rewrites.

## Implementation plan

### Architecture fit

Extend existing `AGENTS.md`, operating-model, risk-policy, work-packet template and CI-policy ownership. Do not add a second orchestration or memory service.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | route single-agent/gate/memory rules within hot-memory budget | fresh sessions need concise entry guidance |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | single-agent mode + authority ownership + `Go` semantics | core responsibility contract |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | planning/evaluation budget by class | reduce ceremony without weakening Class 2/3 review |
| `docs/templates/FEATURE_WORK_PACKET.md` | risk/gate/AC/task/evaluator fields | canonical full-task state |
| `scripts/agent-delivery-contract.mjs` + test | structural fail-closed validation | machine-verifiable routing/evidence contract |
| `package.json` | register checker/tests in existing CI policy | no new workflow topology |
| `src/lib/rls-migrations.test.ts` | strip SQL comments before SECURITY DEFINER static scan | remove proven comment-only false positive |

### Data and migration impact

None. Historical/completed packets are grandfathered; the checker validates the canonical template and active packets changed by the current diff.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| self-review relabeled independent | Class 2/3 readiness fields + operating policy |
| `Go` chains merge → deploy → provider write | exactly one consumed decision gate |
| stale duplicated truth | artifact authority table |
| tiny task gets a full packet | explicit Class 0/1 process budget |
| structural checker becomes semantic AI judge | checker validates shape only; independent reviewer/human owns meaning |
| comments mentioning SECURITY DEFINER break static test | SQL comments stripped before executable scan + regression fixture |

### Verification plan

- `npm run check:knowledge`
- `npm run check:agent-delivery`
- `npm run test:ci-policy`
- lint + typecheck + unit/static RLS + production build selected by Class 3 CI
- browser smoke selected by the current CI classifier
- exact-head CodeQL + secret-history
- independent semantic PR review before a merge gate

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | reconcile current policy and #315/#317 | AC7 | none | current-main docs + PR evidence | done |
| T2 | focused first-party research | AC1, AC2, AC3 | T1 | OpenAI + GitHub docs | done |
| T3 | update policy/template authority model | AC1, AC2, AC3, AC4 | T2 | changed policy/template diff | done |
| T4 | implement structural checker, fixtures and false-positive regression | AC4, AC5, AC6 | T3 | #2132 policy/unit/static/build/browser evidence | done |
| T5 | obtain independent semantic review and resolve findings | AC1, AC2, AC3, AC4, AC5, AC6, AC7 | T4 | independent review artifact + final exact-head rerun | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | researcher | planner | specified | repo policy + #315/#317 + first-party sources | exact contract not implemented | select smallest current-main design |
| 2026-08-09 | planner | implementer | planned | this packet + AC/task plan | implementation unverified | implement bounded diff |
| 2026-08-09 | implementer | evaluator | evaluating | PR #331 head `4090b07e...`; CI #2132 / CodeQL #1228 / Secret #1228 green; 41/41 policy tests | Codex independent review unavailable due usage limit | obtain fresh-context independent review; no merge |

### Current permission boundary

- Granted scope: branch writes on `agent/single-agent-delivery-system` and read-only GitHub/web evidence.
- Forbidden writes: `main`, provider/production, branch protection/rulesets, secrets, financial/user data.
- Human approval required before: merge and any provider/production action.
- Stop condition: do not move to `ready_for_review` without an independent semantic evaluation artifact.

## Evaluation

### Independent evaluation

- Evaluator: blocked — configured Codex PR reviewer reported usage limit exhausted; a fresh-context independent reviewer is still required
- Implementer overlap: none preferred; same primary AI may not relabel this conversation's self-review as independent
- Inputs reviewed: pending — must include this specification, actual PR #331 diff and exact-head evidence
- Author summary treated as authority: no

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | operating-model single-agent + independent-evaluation rules | provisional pass; independent review pending |
| AC2 | durable authority ownership table + AGENTS routing | provisional pass; independent review pending |
| AC3 | risk-proportional Class 0–3 planning/evaluation budget | provisional pass; independent review pending |
| AC4 | canonical template + checker fixtures | pass |
| AC5 | CI #2132: `test:ci-policy` 41/41 pass, including 10 agent-delivery tests | pass |
| AC6 | PR file set/classification; no app migration/provider code; DB gate not applicable | pass |
| AC7 | packet/PR memory explicitly preserve #315/#317 as historical candidate sources | provisional pass; independent review pending |

### Research and adoption evidence

Selected first-party sources support repo-native context, issue-like tasks, independent review/checks and current-commit machine evidence. No external architecture or paid reviewer was adopted.

### Review findings

- Implementation self-evaluation found and fixed a terminal-section parser bug in the new checker.
- Full CI exposed an unrelated existing static-RLS false positive caused by a migration comment containing `SECURITY DEFINER`; the scanner now strips SQL comments and has a regression fixture instead of editing production history.
- The configured Codex PR reviewer could not provide semantic review because its usage limit is exhausted. This is an explicit blocker, not a pass.

### Remaining limitations

Structural checks cannot prove product/process judgment. A fresh-context independent semantic review is still required before owner merge consideration.

## Delivery record

- Branch: `agent/single-agent-delivery-system`
- PR: #331
- Current exact source head: `4090b07e1f9a8dbee109a83ede4d576d9cf1c708` before this evidence update
- CI: #2132 success on that source head; policy suite 41/41; static/build/unit/browser success; DB checks not applicable
- CodeQL: #1228 success
- Secret history: #1228 success
- Production deployment: not applicable
- Production flow verified: not applicable
- Merge: forbidden until independent review + final exact-head evidence + owner decision
