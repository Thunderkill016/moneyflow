# Single-agent AI delivery system

**Status:** evaluating
**Execution state:** evaluating
**Risk class:** 3
**Workstream:** delivery-governance
**Packet role:** execution
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #331
**Last updated:** 2026-08-09

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

Make one primary AI effective as MoneyFlow's technical project manager + implementer without giving it sole acceptance authority. Reduce duplicated project state, keep process proportional to risk, and make generic `Go` authorize exactly one action in one uniquely resolved execution packet.

## Authority references

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Delivery authority: `docs/engineering/AGENT_OPERATING_MODEL.md`
- Risk policy: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`
- Independent review artifact: `docs/research/pr-memory/2026/Q3/PR-331.md`, section `Independent review — 2026-08-09`
- Historical candidates studied: PR #315 and PR #317; neither is current authority.

## Current decision gate

- Gate ID: G4
- Gate task: T7
- Action kind: review
- Next allowed action: obtain one fresh-context follow-up review of the remediated PR #331 diff
- Approval token: `Go`
- Consumes approval: yes
- After action: remain `evaluating`; resolve any new blocker under a new gate or establish a separate final verification/owner merge gate if the review passes

## Repository reconnaissance

### Current behavior

- MoneyFlow already has a deterministic lifecycle, role boundaries, permission scopes, repository-backed memory and risk-selected CI.
- One primary AI may research, plan and implement sequentially, but Class 2/3 author-owned work needs an independent semantic acceptance signal.
- MoneyFlow legitimately has concurrent active workstreams. The invalid assumption was one active packet globally, not concurrency itself.
- Provider Sync and recent-auth are both active evidence documents for the Secure workstream; they previously had no machine-readable distinction between execution authority and supporting evidence.
- PR #315 and #317 contain useful control-contract and AC→task→evidence ideas but are stale against current MoneyFlow Trust and are not being merged wholesale.
- The first #331 implementation reached machine-green state, then an independent fresh-context review requested changes on four safety properties.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `AGENTS.md` | hot-memory router | resolve generic `Go` to one execution packet/workstream |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | roles/state/permissions | define execution/supporting packet authority and independent proof |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | planning/review cost | keep ceremony proportional to Class 0–3 |
| `docs/templates/FEATURE_WORK_PACKET.md` | full-packet contract | add workstream, packet role, gate task/action kind and review identity/artifact |
| `scripts/agent-delivery-contract.mjs` | deterministic structure gate | enforce obvious compound gates, review separation and execution-packet uniqueness |
| `src/lib/rls-migrations.test.ts` | existing static security scanner | replace unsafe regex stripping with quote-aware lexical sanitization |
| Secure active packets | real concurrency case | Provider Sync/recent-auth become supporting; one Secure execution packet owns `Go` |

### Existing tests and constraints

- `npm run test:ci-policy` is the existing delivery-policy test surface.
- Protected CodeQL and secret-history checks remain independent machine evidence.
- No new service, dependency, runtime agent framework, provider or hidden memory layer is introduced.
- Owner merge/provider/production-write authority remains unchanged.
- PostgreSQL lexical rules distinguish comments from quoted and dollar-quoted string content; security scanning must not remove executable SQL because comment markers occur inside a literal.

### Open questions

- [x] Can one primary AI manage + implement? Yes, with responsibility transitions and independent Class 2/3 evaluation.
- [x] Should `Go` mean finish everything? No; one uniquely resolved execution-packet gate only.
- [x] Can multiple workstreams remain active? Yes; at most one execution packet per workstream/session.
- [x] Should supporting/provider/history packets also be `Go` targets? No.
- [x] Merge #315/#317 unchanged? No; port only useful concepts onto current main.
- [x] Did an independent review occur? Yes; fresh-context review requested changes and is recorded in PR memory.
- [ ] Does a follow-up independent review accept the remediated diff?

## Research

### Research scope and source selection

Decision question: how should one primary coding AI retain autonomy while repository context, review independence and merge evidence remain trustworthy, and how should the static PostgreSQL security scan distinguish executable SQL from comments/literals?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI — Harness engineering | first-party engineering practice | 2026-08-09 | short `AGENTS.md` as map, structured repository docs as system of record, mechanically checkable knowledge | not MoneyFlow product authority |
| OpenAI — How OpenAI uses Codex | first-party workflow guidance | 2026-08-09 | issue-like tasks, persistent repo instructions, lightweight task routing | not MoneyFlow risk policy |
| GitHub Docs — pull-request reviews/status checks | first-party platform docs | 2026-08-09 | semantic review is distinct from current-commit machine checks | live repo policy still controls |
| PostgreSQL current docs — Lexical Structure | first-party database docs | 2026-08-09 | `--`, nested `/* */`, single strings and dollar-quoted strings have distinct lexical rules | narrow static scanner still is not a full SQL parser |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| one global active packet | simple slogan | false for real concurrent workstreams; bare `Go` ambiguity | reject |
| workstream-scoped execution packet | concurrency + unique terse approval target | requires explicit packet role | select |
| author self-acceptance | cheapest | correlated blind spots | reject |
| free-form independent-review prose only | flexible | placeholder/overlap bypass | reject |
| explicit review identity + artifact + overlap | machine-checkable structural evidence | cannot prove honesty/semantic quality alone | select |
| regex SQL comment stripping | tiny | quote/dollar false negatives | reject |
| narrow lexical sanitizer | handles relevant PostgreSQL lexical states without dependency | still not a full SQL parser | select |
| external SQL parser dependency | more complete | dependency/maintenance cost for a narrow static test | defer |

### Research decision

Use one execution packet per workstream/session, not one active packet globally. Generic `Go` is invalid until workstream + execution packet are uniquely resolved. Class 2/3 final packets must record distinct implementer/evaluator identities, no overlap and a concrete review artifact. The SQL security scan uses a narrow lexical state machine aligned to PostgreSQL comment/string/dollar-quote rules rather than regex deletion.

### Adoption review

No external dependency/service/framework is adopted. New executable code remains Node/TypeScript standard-library test/policy tooling only, with zero shipped runtime/provider cost and Git-revert rollback.

## Specification

### Problem

The initial #331 direction was sound but its first implementation could still let a compound `Go` chain review→remediation, let unresolved/self-evaluation prose structurally pass, misrepresent concurrent active work as one global packet, and hide executable SQL in the static security scan when comment markers appeared inside literals.

### User stories

- As owner, bare `Go` maps to one action in one uniquely resolved execution packet.
- As primary AI, I can manage + implement without chat-only memory or global-workstream serialization.
- As evaluator, independent review has a distinct identity/provenance and durable artifact.
- As a future session, I can distinguish current product/provider truth, execution authority, supporting evidence and historical PR provenance.
- As security reviewer, comment-like text inside SQL literals cannot hide executable `SECURITY DEFINER` declarations from the static scan.

### Acceptance criteria

- [ ] AC1: policy supports sequential single-agent roles but prevents author-only Class 2/3 acceptance with distinct evaluator identity/provenance and durable review artifact.
- [ ] AC2: current memory, execution packet, supporting/parent packets and PR memory have non-overlapping authority; multiple workstreams may coexist with at most one execution packet per workstream.
- [x] AC3: Class 0–3 planning/evaluation cost stays risk-proportional.
- [ ] AC4: canonical execution packet has exactly one scoped `Go` gate bound to one task/action kind; obvious compound actions fail closed and bare `Go` requires unique workstream/packet resolution.
- [ ] AC5: deterministic tests validate gate structure, AC→task coverage, evidence targets, execution-packet uniqueness and Class 2/3 independent-evaluation identity/artifact/overlap before review readiness.
- [ ] AC6: no runtime, financial, database, provider or production behavior changes; the static-RLS remediation does not create lexical false negatives for comment markers inside strings/dollar bodies.
- [x] AC7: #315/#317 remain historical candidate sources rather than a second current workflow.

### Required states

No product UI state changes. Delivery failures are fail-closed CI-policy errors with exact malformed gate/task/criterion/review identity. Semantic acceptance remains independent-review/human responsibility.

### Financial and security constraints

No financial/RLS/Auth/provider behavior changes. A packet edit cannot grant itself owner-only merge/provider/production permissions. SQL static-scan changes affect tests only and must not edit historical migrations.

### Out of scope

Runtime AI, agent swarms, automatic merge/deploy/provider writes, automatic product prioritization, mass historical packet rewrites and adoption of a general SQL parser dependency.

## Implementation plan

### Architecture fit

Extend existing repository policy, packet metadata and CI-policy ownership. Reclassify only currently relevant Trust packets needed to prove concurrent workstream semantics; do not create a second orchestration/memory service.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` | execution packet per workstream/session; bare-`Go` resolution | remove global active-packet ambiguity |
| `AGENT_OPERATING_MODEL.md` | execution/supporting roles, review identity/artifact, gate task/action kind | core contract |
| `FEATURE_WORK_PACKET.md` | canonical fields for new contract | durable task authority |
| `agent-delivery-contract.mjs` + tests | enforce structural invariants and negative cases | close reviewed bypasses |
| `rls-migrations.test.ts` | PostgreSQL-aware lexical sanitizer | avoid regex false negatives |
| Provider Sync + recent-auth packets | mark supporting under `moneyflow-trust-secure` | remove duplicate terse-approval authority |
| `moneyflow-trust-secure-acceptance.md` | unique Secure execution packet | real concurrent-workstream proof |
| PR memory/this packet | persist independent findings/remediation | resumable evidence |

### Data and migration impact

None. No schema, migration, provider config, runtime application or production-data behavior changes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| `review then fix` under one `Go` | compound-action negative test + separate gates |
| `blocked — reviewer unavailable` passes placeholder check | prefixed-placeholder negative test |
| evaluator equals implementer | identity comparison negative test |
| overlap claims same author/session | overlap must equal `none` |
| review exists only in chat summary | concrete review-artifact field + PR memory artifact |
| two execution packets in same workstream | repository-wide uniqueness validation |
| supporting packet exposes generic `Go` | supporting-gate negative test |
| `--` inside SQL string hides later declaration | lexical regression test |
| fake `SECURITY DEFINER` in dollar body creates match | dollar-body regression test |
| checker becomes semantic judge | structural/chaining heuristics only; follow-up evaluator owns semantics |

### Verification plan

- `npm run check:knowledge`
- `npm run check:agent-delivery`
- `npm run test:ci-policy`
- lint + typecheck + unit/static RLS + production build selected by Class 3 CI
- browser smoke selected by current CI classifier
- exact-head CodeQL + secret-history
- follow-up fresh-context independent semantic review before `ready_for_review`

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | reconcile current policy and #315/#317 | AC7 | none | current-main docs + PR evidence | done |
| T2 | focused first-party research | AC1, AC2, AC3 | T1 | OpenAI + GitHub docs | done |
| T3 | implement initial policy/template/checker | AC1, AC2, AC3, AC4, AC5 | T2 | pre-review #331 diff | done |
| T4 | obtain initial machine evidence | AC6 | T3 | `97b176...`; CI #2134 / CodeQL #1230 / Secret #1230 | done |
| T5 | obtain independent fresh-context semantic review | AC1, AC2, AC4, AC5, AC6 | T4 | PR memory independent-review section | done |
| T6 | apply four accepted review remediations | AC1, AC2, AC4, AC5, AC6 | T5 | remediated policy/checker/SQL scanner + Secure packet migration | done |
| T7 | obtain follow-up independent review of remediated diff | AC1, AC2, AC4, AC5, AC6 | T6 | fresh-context review artifact + verdict | todo |
| T8 | prove final exact-head gates | AC1, AC2, AC3, AC4, AC5, AC6, AC7 | T6 | CI/CodeQL/Secret + selected shards | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | researcher | planner | specified | repo policy + #315/#317 + first-party sources | exact contract not implemented | select smallest current-main design |
| 2026-08-09 | planner | implementer | planned | packet + AC/task plan | implementation unverified | implement bounded diff |
| 2026-08-09 | implementer | evaluator | evaluating | `97b176...`; CI #2134 / CodeQL/Secret #1230 green | independent review missing | obtain fresh-context review only |
| 2026-08-09 | independent evaluator | implementer | implementing | PR memory: REQUEST CHANGES with four blockers | remediations unverified | apply reviewed remediation scope |
| 2026-08-09 | implementer | evaluator | evaluating | remediated branch diff | follow-up review + final exact-head evidence pending | obtain follow-up independent review only |

### Current permission boundary

- Granted scope: branch writes on `agent/single-agent-delivery-system` and read-only GitHub/web evidence.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, provider/production, branch protection/rulesets, secrets, financial/user data.
- Human approval required before: merge and any provider/production action.
- Stop condition: do not move to `ready_for_review` without follow-up independent semantic acceptance and final exact-head evidence.

## Evaluation

### Independent evaluation

- Implementer: primary MoneyFlow #331 implementation session
- Evaluator: fresh-context ChatGPT review session supplied by owner on 2026-08-09
- Implementer overlap: none
- Review artifact: `docs/research/pr-memory/2026/Q3/PR-331.md` — `Independent review — 2026-08-09`
- Inputs reviewed: specification + actual PR #331 diff + exact-head CI evidence
- Author summary treated as authority: no

The recorded review verdict is REQUEST CHANGES, not acceptance. A follow-up review of the remediated diff is still required before `ready_for_review`.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | explicit implementer/evaluator/artifact/overlap contract + negative tests | pending follow-up review |
| AC2 | workstream-scoped execution/supporting model + migrated Secure packets | pending follow-up review |
| AC3 | risk-proportional Class 0–3 policy retained | pass |
| AC4 | gate task/action kind + compound-action rejection + unique target policy | pending exact-head/follow-up review |
| AC5 | expanded delivery-contract negative tests + repo-wide execution uniqueness | pending exact-head/follow-up review |
| AC6 | quote-aware PostgreSQL lexical sanitizer + regression tests; no runtime/provider diff | pending exact-head/follow-up review |
| AC7 | #315/#317 remain historical candidate sources | pass |

### Research and adoption evidence

Selected first-party sources support repo-native context, independent review/current-commit checks and PostgreSQL lexical distinctions. No external architecture, parser dependency or paid reviewer was adopted.

### Review findings

Initial fresh-context review found four blockers: compound `Go`, independent-evaluation structural bypass, global active-packet ambiguity, and regex SQL stripping false-negative risk. All four have bounded branch remediations; follow-up review is pending.

### Remaining limitations

Structural checks cannot prove honest identity claims or semantic judgment. Independent evaluator/human review remains required. The SQL lexical sanitizer is intentionally narrow and is not represented as a full PostgreSQL parser.

## Delivery record

- Branch: `agent/single-agent-delivery-system`
- PR: #331, draft
- Pre-remediation reviewed head: `97b176943655a111d8fd2619e56c6ba4e8419eab`
- Pre-remediation CI: #2134 success; CodeQL #1230 success; Secret history #1230 success
- Remediation exact head: pending final branch read-back after evidence updates
- Final CI/CodeQL/Secret: pending current remediation head
- Production deployment: not applicable
- Production flow verified: not applicable
- Merge: forbidden until follow-up independent review + final exact-head evidence + owner decision
