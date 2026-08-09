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

Make one primary AI effective as MoneyFlow's technical project manager + implementer without giving it sole Class 2/3 acceptance authority. Keep project state repository-backed, process proportional to risk, and generic `Go` scoped to exactly one action in one uniquely resolved execution packet.

## Authority references

- Current merged/provider truth: `docs/research/CURRENT_PROJECT_MEMORY.md`
- Delivery authority: `docs/engineering/AGENT_OPERATING_MODEL.md`
- Risk policy: `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`
- Independent review history: `docs/research/pr-memory/2026/Q3/PR-331.md`
- Historical candidate sources: PR #315 and PR #317 only; neither is current authority.

## Current decision gate

- Gate ID: G6
- Gate task: T9
- Action kind: review
- Next allowed action: obtain one fresh-context review limited to the three round-2 remediations on PR #331
- Approval token: `Go`
- Consumes approval: yes
- After action: remain evaluating; if the review passes, establish a separate verification gate before mark-ready or merge

## Repository reconnaissance

### Current behavior

- MoneyFlow already has deterministic delivery states, permission scopes, risk-selected CI and repo-backed memory.
- One primary AI may research, plan and implement sequentially, but author self-review is not sole Class 2/3 acceptance.
- MoneyFlow legitimately has concurrent workstreams; the execution authority is one `Packet role: execution` per workstream/session, while supporting/program packets may coexist without generic `Go` authority.
- Secure workstream migration now has Provider Sync and recent-auth as supporting packets and `moneyflow-trust-secure-acceptance.md` as the sole Secure execution packet.
- Two fresh-context reviews of #331 have returned REQUEST CHANGES. Round 1 found four blockers; round 2 confirmed the architecture remediation and narrowed remaining issues to three structural/lexer defects.

### Relevant repository areas

| Area | Why it matters | Current decision |
|---|---|---|
| `AGENTS.md` | hot-memory router | route terse approvals through unique execution packet/workstream |
| `docs/engineering/AGENT_OPERATING_MODEL.md` | responsibility/authority contract | keep author and independent evaluator distinct |
| `docs/templates/FEATURE_WORK_PACKET.md` | canonical packet shape | workstream, packet role, gate task/action kind, independent review fields |
| `scripts/agent-delivery-contract.mjs` | deterministic policy checker | reject gate/review structural bypasses |
| `scripts/agent-delivery-contract.test.mjs` | regression fixtures | prove bypasses fail closed |
| `src/lib/rls-migrations.test.ts` | static SECURITY DEFINER scan | preserve PostgreSQL lexical semantics before keyword folding |
| Trust Secure active packets | real concurrent-workstream case | one execution authority, supporting evidence separated |

### Existing tests and constraints

- `npm run test:ci-policy` is the delivery-policy surface.
- Static RLS tests run under the existing unit/static shard.
- CodeQL and secret-history remain independent protected checks.
- Draft PR CI may classify successfully while skipping full Class-3 shards; skipped work is not final evidence.
- No runtime app, database schema, provider configuration or production-data behavior changes are in scope.

### Open questions

- [x] Can multiple workstreams remain active? Yes.
- [x] Can supporting packets expose bare `Go`? No.
- [x] Did round-1 workstream ambiguity resolve? Yes.
- [x] Did round-2 identify remaining concrete blockers? Yes: mixed-case dollar tags, review sentinels, and gate continuation/comma chaining.
- [ ] Does a third fresh-context review accept those three remediations without finding a new blocker?

## Research

### Research scope and source selection

Decision question: how should the repository enforce terse approval scope, independent review evidence and PostgreSQL-aware static scanning without adding a new orchestration framework or parser dependency?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI — Harness engineering | first-party engineering practice | 2026-08-09 | short agent instructions + structured repository system of record | not MoneyFlow product authority |
| GitHub Docs — PR reviews/status checks | first-party platform docs | 2026-08-09 | semantic review and current-commit machine evidence are distinct | repository policy still controls merge |
| PostgreSQL current docs — Lexical Structure | first-party database docs | 2026-08-09 | comments, quoted strings and dollar-quoted strings are lexical constructs; dollar tags are case-sensitive | narrow scanner is not a complete SQL parser |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| one global active packet | simple | false under concurrent workstreams | reject |
| one execution packet per workstream/session | unique terse-approval authority | requires explicit metadata | select |
| free-form reviewer prose only | flexible | sentinel/self-review bypasses | reject |
| explicit implementer/evaluator/artifact/overlap | deterministic structure | cannot prove honesty alone | select |
| regex SQL stripping | tiny | literal/comment false negatives | reject |
| raw-case lexical sanitizer then keyword folding | preserves dollar-tag semantics | narrow, test-only lexer | select |
| external SQL parser | broader coverage | dependency/maintenance cost | defer |

### Research decision

Keep the repo-native model. Generic `Go` must resolve to one execution packet and one task/action kind. Class 2/3 final acceptance needs a distinct evaluator and concrete review artifact. For SECURITY DEFINER static scanning, lex raw PostgreSQL text first and lower-case only the remaining executable SQL because dollar-quote tags are case-sensitive.

### Adoption review

No external dependency, provider, service or runtime framework is added. All changes are repository policy/test tooling with Git-revert rollback.

## Specification

### Problem

The original single-agent workflow direction was sound, but deterministic enforcement had bypasses. Round 1 exposed compound approvals, review identity gaps, global packet ambiguity and unsafe SQL regex stripping. Round 2 confirmed the first remediation but found three remaining bypasses: mixed-case dollar-tag corruption caused by lowercasing before lexing, unresolved review sentinels such as `N/A`, and compound gate actions hidden after commas or continuation lines.

### User stories

- As owner, bare `Go` cannot silently authorize multiple actions.
- As evaluator, unresolved or self-authored review evidence cannot structurally pass as independent acceptance.
- As a concurrent workstream, my execution packet is unique without forcing unrelated workstreams to close.
- As security reviewer, PostgreSQL lexical case and literal boundaries cannot hide a real SECURITY DEFINER declaration.

### Acceptance criteria

- [ ] AC1: single-agent policy allows sequential responsibilities but final Class 2/3 acceptance requires distinct implementer/evaluator identity, no overlap and durable review evidence.
- [ ] AC2: current memory, execution packets, supporting/parent packets and PR memory have non-overlapping authority; at most one execution packet exists per workstream/session.
- [x] AC3: Class 0–3 planning/evaluation cost remains risk-proportional.
- [ ] AC4: an execution packet has one scoped `Go` gate bound to one task/action kind; comma chaining, continuation-line hiding and other obvious compound actions fail closed.
- [ ] AC5: deterministic tests cover gate structure, AC→task evidence, execution uniqueness, review sentinels, evaluator separation, overlap and concrete review artifacts.
- [ ] AC6: no runtime/financial/database/provider/production behavior changes; SECURITY DEFINER scanning preserves raw PostgreSQL dollar-tag case before keyword folding and has mixed-case regression coverage.
- [x] AC7: #315/#317 remain historical candidates only.

### Required states

No product UI state changes. Policy violations fail closed with exact checker errors. Draft CI skips are recorded as not-final rather than pass evidence.

### Financial and security constraints

- No financial or tenant-ownership behavior changes.
- No historical migration edits.
- No provider/production writes.
- Packet edits cannot grant merge/provider/production permissions.
- Static scanner remains test-only and must not be described as a full SQL parser.

### Out of scope

Runtime AI orchestration, agent swarms, automatic merge/deploy, provider mutation, mass historical packet rewrites and a general SQL parser dependency.

## Implementation plan

### Architecture fit

Extend existing repository governance and tests. Do not add a second project-management layer. Treat current memory as merged/provider truth, execution packets as workstream task authority, supporting packets as evidence, and PR memory as provenance.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `AGENTS.md` / operating model | workstream-scoped execution authority | remove global packet ambiguity |
| packet template | gate task/action kind + review identity/artifact | canonical authority fields |
| delivery checker/tests | reject compound/continuation/sentinel/identity bypasses | deterministic fail-closed enforcement |
| static RLS scanner/tests | lex raw case, then fold executable SQL | preserve case-sensitive dollar tags |
| Trust Secure packets | execution/supporting classification | prove concurrency model on real active work |
| packet + PR memory | persist two review rounds/remediation | resumable evidence |

### Data and migration impact

None.

### Risks and counterexamples

| Risk/counterexample | Prevention/test |
|---|---|
| `review then fix` | compound-action negative test |
| `review PR, fix blockers` | comma verb-chain negative test |
| continuation line adds second action | continuation lines rejected in gate section |
| evaluator/review artifact says `N/A`/`none` | sentinel placeholder negative tests |
| evaluator equals implementer | normalized identity comparison |
| duplicate execution packet in workstream | repo-wide active execution uniqueness check |
| `$TAG$` becomes `$tag$` before lexing | raw lexer + mixed-case regression fixture |
| literal contains `--` or `/* */` | quote-aware lexical fixtures |

### Verification plan

1. fresh-context round-3 review of only the three round-2 remediations;
2. if accepted, mark PR ready to trigger full Class-3 CI;
3. require exact-head policy/unit/static/build/browser + CodeQL + secret-history evidence;
4. reconcile final packet/PR memory;
5. only then establish a separate owner merge gate.

## Tasks

| ID | Task | Covers | Dependency | Evidence | Status |
|---|---|---|---|---|---|
| T1 | reconcile current governance and #315/#317 | AC7 | none | current-main docs + history | done |
| T2 | focused first-party research | AC1, AC2, AC3, AC6 | T1 | OpenAI/GitHub/PostgreSQL docs | done |
| T3 | implement initial governance/checker | AC1, AC2, AC4, AC5 | T2 | pre-review #331 diff | done |
| T4 | capture initial full machine evidence | AC6 | T3 | head `97b176...`, CI #2134, CodeQL/Secret #1230 | done |
| T5 | independent review round 1 | AC1, AC2, AC4, AC5, AC6 | T4 | PR memory round-1 artifact | done |
| T6 | apply round-1 remediation | AC1, AC2, AC4, AC5, AC6 | T5 | workstream/review/lexer changes | done |
| T7 | independent review round 2 | AC1, AC2, AC4, AC5, AC6 | T6 | PR memory round-2 artifact | done |
| T8 | apply three round-2 remediations | AC4, AC5, AC6 | T7 | raw-case lexer + sentinel + gate parser tests | done |
| T9 | independent review round 3 limited to T8 | AC4, AC5, AC6 | T8 | fresh-context review artifact | todo |
| T10 | full exact-head Class-3 verification | AC1, AC2, AC3, AC4, AC5, AC6, AC7 | T9 | protected CI/CodeQL/Secret + selected shards | blocked |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-09 | implementer | independent evaluator | evaluating | initial diff + full machine evidence | semantic review missing | review only |
| 2026-08-09 | evaluator round 1 | implementer | implementing | REQUEST CHANGES, four blockers | remediation required | fix four blockers |
| 2026-08-09 | implementer | evaluator round 2 | evaluating | remediated diff | follow-up review required | review only |
| 2026-08-09 | evaluator round 2 | implementer | implementing | REQUEST CHANGES, three blockers | remediation required | fix three blockers |
| 2026-08-09 | implementer | evaluator round 3 | evaluating | T8 branch remediation + PR memory | round-3 verdict absent | review only |

### Current permission boundary

- Allowed: branch writes on `agent/single-agent-delivery-system`, PR/docs updates, read-only GitHub/web evidence.
- Forbidden: `main`, merge, provider/production writes, branch protection/rulesets, secrets, user/financial data.
- Human approval remains required for merge and every provider/production checkpoint.
- Stop condition: do not mark ready until T9 independent review passes.

## Evaluation

### Independent evaluation

- Implementer: primary MoneyFlow PR #331 implementation session
- Evaluator: fresh-context ChatGPT round-2 reviewer supplied by owner
- Implementer overlap: none
- Review artifact: `docs/research/pr-memory/2026/Q3/PR-331.md` — Independent review round 2
- Inputs reviewed: specification + actual PR #331 diff + exact evidence
- Author summary treated as authority: no

Latest verdict is REQUEST CHANGES. T8 addresses the three round-2 blockers; a new independent round-3 verdict is required before ready-for-review.

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| AC1 | independent identity/artifact/overlap policy + tests | pending final review/CI |
| AC2 | execution/supporting model + Secure migration | pending final review/CI |
| AC3 | risk policy unchanged | pass |
| AC4 | continuation rejection + comma/then/arrow/action-kind gates | pending round-3 review |
| AC5 | sentinel/identity/artifact/uniqueness negative tests | pending round-3 review |
| AC6 | raw-case PostgreSQL lexer + mixed-case dollar-tag regression | pending round-3 review |
| AC7 | #315/#317 historical only | pass |

### Research and adoption evidence

PostgreSQL current lexical documentation explicitly requires the same case-sensitive dollar tag to close a dollar-quoted string. That supports lexing raw SQL before any keyword case-folding. No new dependency is adopted.

### Review findings

- Round 1: four blockers; remediated.
- Round 2: workstream architecture accepted; three remaining blockers found in dollar-tag case handling, review sentinels and compound gate parsing.
- Round 2 remediations are implemented on branch and await focused round-3 review.

### Remaining limitations

Structural tooling cannot prove honesty or semantic judgment. The SQL sanitizer is deliberately narrow. Full Class-3 machine evidence must be rerun after mark-ready because draft CI skips do not count as final verification.

## Delivery record

- Branch: `agent/single-agent-delivery-system`
- PR: #331, open + draft
- Last fully verified pre-remediation head: `97b176943655a111d8fd2619e56c6ba4e8419eab`
- Initial full evidence: CI #2134, CodeQL #1230, Secret history #1230
- Current remediation head: resolve fresh from PR before round-3 review
- Production deployment: not applicable
- Merge: not authorized
