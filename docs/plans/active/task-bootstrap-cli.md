# Repository-owned task bootstrap CLI

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** human owner + coding agent  
**Issue/PR:** PR #315, branch `agent/task-bootstrap-cli`  
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A contributor or coding agent can start one bounded MoneyFlow task with one repository-owned command that produces the minimum relevant context, explicit risk-selected verification, current Git evidence and a ready-to-use agent prompt without scanning unrelated project history.

## Control contract

### State

- Location: repository-owned task policy in `AGENTS.md`, `docs/context/README.md`, `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`, the supplied active packet and local Git metadata
- Writer/owner: humans own policy and merge decisions; the CLI reads policy and Git state but does not mutate either
- Propagation: `task:brief` parses the current router and emits the selected context, packet, branch, head, changed files and verification plan for each new session

### Feedback

- Expected failing signal: focused contract tests must fail when a route drifts, Class 0 is rejected, Class 3 lacks a valid packet, paths escape the repository, required context disappears or a changed active packet omits its control contract
- Success signal: `npm run test:ci-policy` exits zero and `npm run task:brief` emits the expected route, safety errors and risk-proportional gates on the exact branch head
- Semantic evidence: a new agent session receives only the required MoneyFlow authority and affected boundary context, while unsafe startup states are blocked rather than merely described

### Removal impact

- What breaks if removed: task startup returns to manual context reconstruction, Class 3 packet ownership is no longer checked at entry and changed work packets can again omit state, semantic feedback, rollback and action-safety decisions
- Rollback: remove the additive npm command, CLI, focused tests, work-packet contract files and runbook changes; rerun `npm run test:ci-policy` to prove the prior policy surface is restored

### Action safety

- Permissions: branch-only repository tooling and documentation changes on `agent/task-bootstrap-cli`; no `main`, provider, database, production or user-data writes
- Reversibility: every change is additive or a bounded template/package edit and can be reverted without application or data migration
- Escalation: stop for merge, deployment, branch-protection, required-check, provider, database or production decisions, or when protected exact-head evidence is unavailable
- Failure containment: failure is limited to development task-start guidance and policy tests; application runtime, financial behavior, database, RLS and production remain untouched

## Repository reconnaissance

### Current behavior

- `AGENTS.md` owns procedural authority, financial invariants, permissions and Definition of Done.
- `docs/context/README.md` routes task boundaries to warm context and rejects preloading all PR history.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes and verification selection.
- `check:knowledge`, `ci:status` and `ci:watch` protect project memory and exact-head CI observation.
- Candidate PR #314 separately owns stale/unresponsive CI recovery.
- Before this PR, no command compiled route, explicit class, local Git state, packet ownership and agent startup instructions into one artifact.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | safety and authority | reuse; do not duplicate full policy |
| `docs/context/README.md` | task router | parse at runtime |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | class/gate authority | summarize conservatively |
| `docs/templates/FEATURE_WORK_PACKET.md` | durable task-state contract | add externally inspectable control fields |
| `scripts/watch-pr-ci.mjs` | CLI/test conventions | reuse style; do not duplicate CI monitoring |
| `package.json` | command and protected policy-test surface | add `task:brief` and focused contracts |

### Existing tests and constraints

- Related tests: Node built-in `node:test` under `scripts/*.test.mjs`.
- Database/RLS/browser: not applicable; no shipped runtime, data or UI behavior changes.
- Constraints: no new management layer, no direct `main`, no provider writes, no invented financial assumptions and no merge/deployment authorization.

### Similar implementation and recent history

- Reuse the pure-helper, explicit-exit-code pattern from `scripts/watch-pr-ci.mjs`.
- PR #302 owns exact-head monitoring; PR #311 owns the structured knowledge contract; PR #314 owns CI recovery only.

### Open questions

- [x] Infer risk from prompt or paths? No; risk remains explicit.
- [x] Create branches, packets or PRs? No; the tool remains read-only.
- [x] Require network access? No; it works from local repository state.
- [x] Add another workflow/tool surface for reliability? No; enforce the contract through the existing packet template and `test:ci-policy`.

## Research

### Research scope and source selection

- Decision question: What is the smallest mechanism that reduces AI coding startup friction and catches self-invisible agent failure modes without replacing MoneyFlow policy?
- Reference map consulted: not required; focused first-party and primary engineering sources directly addressed the decision.
- Source budget: the user-provided `DISTILLATION.md` plus focused OpenAI and test-driven-development primary guidance.
- Expected decision: choose between more prompt prose, a new orchestrator or machine-checkable repository contracts.

### Questions researched

1. Which AI failure modes must be externalized rather than solved by another instruction?
2. Which information belongs in every consequential work packet?
3. How can red-before-green and semantic evidence avoid ceremonial verification?
4. How can the change reuse the existing policy gate rather than add another workflow?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| User-provided `DISTILLATION.md` | project research synthesis | 2026-08-07 | state, feedback, removal impact, red-before-green, semantic reliability and action safety must live outside the model | underlying source claims vary in strength; adoption is limited to repository-checkable rules |
| OpenAI, “Introducing Codex” | first-party product/engineering guidance | 2026-08-07 | repository instructions, configured environments, reliable tests and clear documentation improve coding-agent work | does not choose MoneyFlow risk or permission scope |
| OpenAI, “How OpenAI uses Codex” | first-party workflow guidance | 2026-08-07 | issue-like task descriptions, persistent repository context and explicit paths/patterns improve task execution | organizational practice, not product authority |
| Martin Fowler, “Test Driven Development” | primary engineering practice | 2026-08-07 | red-green-refactor requires a failing test before accepting the implementation result | not every documentation/mechanical task needs a synthetic red test |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add more prose to `AGENTS.md` | simple | context rot and instruction attenuation; no executable failure | rejected |
| Add a new orchestration or evaluation service | broad automation | another management layer, credentials, maintenance and hidden state | rejected |
| Add a second standalone task tool | easy isolation | tool/context bloat on every session | rejected |
| Extend existing work packets and policy tests | visible, deterministic and repository-owned | changed packets must resolve the new fields | selected |

### Research decision

Keep `task:brief` as the single task-start command. Add one concise control contract to the existing work-packet template and a deterministic test that validates the template plus active packets changed by the branch. This converts advice into a failing repository contract without loading more context into every task.

Observed fact: AI can produce green mechanism checks while the real outcome remains wrong, and it cannot reliably self-diagnose this gap. Inference: work packets must separate deterministic success from semantic evidence. Product judgment: the contract is mandatory only for changed active packets, avoiding a mass rewrite of historical work.

### Adoption review

- Observed problem: task state, feedback quality and action boundaries can remain implicit or ceremonial.
- Simpler alternatives: prompt prose and checklists without a gate were rejected.
- License/code reuse: no external code copied; Node standard library only.
- Secrets/privacy: reads Markdown and local Git metadata only.
- Runtime/deployment cost: development-only; no application bundle or production effect.
- Owner: `docs/templates/FEATURE_WORK_PACKET.md` and `scripts/work-packet-contract*`.
- Migration/rollback: changed active packets adopt the contract incrementally; remove additive files and package entry to roll back.
- Verification: focused unit fixtures plus validation of the actual template and branch-changed active packets.
- Removal condition: remove if the fields become ceremonial and do not improve review or failure detection.

## Specification

### Problem

New agent sessions can begin with enough prose yet still lack explicit ownership of state, a real-path feedback signal, deletion/rollback understanding or bounded action permissions. A green build alone can therefore be mistaken for successful delivery.

### User stories

- As a contributor, I can generate a bounded task brief from task, boundary and class.
- As a reviewer, I can see where state lives, what must fail before the fix, what proves semantic success and how the change is undone.
- As the owner, I receive blocking errors for implementation on `main`, Class 3 work without a valid packet and changed active packets with unresolved control fields.

### Acceptance criteria

- [x] `npm run task:brief` emits Markdown, JSON and prompt output.
- [x] Route guidance is parsed from `docs/context/README.md`, not duplicated.
- [x] Branch, head, base comparison, dirty state and changed paths are inspected when Git is available.
- [x] `main` blocks by default; `--allow-main` is reconnaissance only.
- [x] Class 3 requires a repository-owned active packet.
- [x] The canonical work-packet template contains State, Feedback, Removal impact and Action safety.
- [x] Changed active packets fail policy tests when those fields are missing or unresolved.
- [x] The command and contract do not mutate providers, runtime, database or production.

### Required states

- Loading: synchronous local inspection.
- Empty: missing router, authority or template is an explicit error.
- Populated: Markdown, JSON or prompt output plus resolved packet contract.
- Validation/error: exit `2` for usage/configuration; exit `3` for blocked task state; policy test failure for invalid changed packets.
- Recovery/undo: correct branch/class/packet/contract and rerun; additive rollback.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: plain text; no color-only meaning.

### Financial and security constraints

- No financial data or advice is produced.
- Integer money, transfer, ownership and RLS behavior remain untouched.
- No runtime, database, provider or production access.

### Out of scope

Automatic risk classification, automatic code review, AI-as-judge acceptance, branch/packet/PR creation, CI recovery, provider writes, merge/deployment, MCP services and multi-agent orchestration.

## Implementation plan

### Architecture fit

The task-start command stays in `scripts/`; the durable task contract stays in the existing feature work-packet template; the existing `test:ci-policy` gate enforces both. GitHub Actions remains the source of protected evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/bootstrap-task-context.mjs` | local task-brief compiler | bounded startup context |
| `scripts/bootstrap-task-context.test.mjs` | task-start contracts | prevent route/gate/safety drift |
| `scripts/work-packet-contract.mjs` | validate template and changed active packets | externalize state/feedback/action decisions |
| `scripts/work-packet-contract.test.mjs` | focused fixtures and repository contract | make the rule fail deterministically |
| `docs/templates/FEATURE_WORK_PACKET.md` | add control contract | one visible source for future tasks |
| `package.json` | register commands/tests | reuse existing policy gate |
| `docs/operations/task-bootstrap.md` | runbook | usage, limits and rollback |
| `docs/research/pr-memory/2026/Q3/PR-315.md` | provenance | bounded handoff |

### Data and migration impact

- Schema/backfill: none.
- Compatibility: current Node ESM conventions.
- Rollback: remove additive scripts/tests and revert template/package/runbook edits.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| control fields become empty ceremony | reject missing, empty, TODO/TBD/unknown and angle-bracket placeholders in changed active packets |
| old packets all fail immediately | validate only active packets changed against the branch base |
| green build is treated as user success | require a separate `Semantic evidence` field |
| tests pass without exercising the fix | require `Expected failing signal`; allow explicit explanation when red-first is impossible |
| agent acts beyond authority | require permissions, reversibility, escalation and failure containment |
| new contract becomes another tool | register under existing `test:ci-policy`; no new workflow/service |
| overlap with PR #314 | no GitHub Actions mutation or recovery behavior |

### Verification plan

- Static/unit: `node --test scripts/bootstrap-task-context.test.mjs scripts/work-packet-contract.test.mjs`; `npm run test:ci-policy`.
- Database/browser/responsive/production: not applicable.
- Manual: valid and invalid packet fixtures, actual changed packet, real router, feature branch output and `main`/Class 3 blocking.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | audit current policy/tooling | none | repository reconnaissance | done |
| T2 | research agent context and reliability failures | T1 | focused source decision | done |
| T3 | implement task bootstrap CLI | T2 | branch script | done |
| T4 | harden branch, packet and path safety | T3 | focused contracts | done |
| T5 | externalize state/feedback/removal/action contract | T2 | template + checker | implementing |
| T6 | register final policy tests and update runbook/provenance | T5 | exact branch diff | todo |
| T7 | run protected exact-head checks | T6 | CI/CodeQL/secret evidence | blocked_provider |

Rules:

- One task produces a reviewable result.
- Parallel tasks do not edit overlapping ownership areas.
- New discoveries update this packet before scope changes.
- Research ends when it supports a decision.
- A task advances only when its evidence exists.
- A green mechanism check is not semantic evidence.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repository audit + focused sources | no branch evidence | plan bounded implementation |
| 2026-08-07 | planner | implementer | planned | acceptance, risks and adoption review | integration pending | implement on focused branch |
| 2026-08-07 | implementer | evaluator | evaluating | PR #315; CLI; runbook; focused tests | protected exact-head checks absent | harden local contracts only |
| 2026-08-07 | researcher | implementer | implementing | user `DISTILLATION.md` + official source cross-check | final contract tests not yet executed by CI | finish packet contract and record provider blocker |

### Current permission boundary

- Granted scope: branch-only tooling, tests and reviewed documentation.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, branch `agent/task-bootstrap-cli`, PR #315.
- Forbidden writes: `main`, provider/ruleset/required-check changes, production, database and user data.
- Human approval required before: merge, deployment or expanding into orchestration/automatic acceptance.
- Rollback or stop condition: stop if the contract requires another service, mass historical rewrites or protected-check bypasses.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| task parser/argument/gate contracts | isolated prototype tests | pass |
| feature-branch manifest and `main` safety | synthetic Git fixtures | pass |
| work-packet control contract | focused fixtures plus this actual packet | pending exact-head execution |
| protected exact-head checks | no workflow/check returned by provider | blocked |

### Research and adoption evidence

- The supplied distillation supports external state, deterministic feedback, semantic evidence and bounded action permissions.
- OpenAI guidance supports repository instructions and reliable tests; Fowler supports red-before-green as an observable record.
- No dependency, provider, runtime service or second workflow was added.

### Review findings

- Correctness: pure helper tests existed before the final control-contract hardening; exact-head execution is pending.
- Security/ownership: local read-only inspection and branch-only documentation/tooling writes.
- UI/accessibility: plain Markdown/JSON/prompt; no shipped UI.
- Maintainability: route rows are parsed from current policy; contract reuses the current packet and CI-policy surfaces.
- Scope: no CI recovery, runtime, database or provider work.

### Remaining limitations

- Boundary and class remain explicit by design.
- The packet contract proves fields are resolved, not that every claim is true; reviewers still inspect evidence.
- Exact-head repository verification is blocked until GitHub creates/approves workflow runs.

## Delivery record

- Branch: `agent/task-bootstrap-cli`
- PR: #315 (ready for review)
- Squash commit: pending owner decision
- CI run: blocked/provider run absent
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
