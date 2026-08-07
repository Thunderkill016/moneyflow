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

- Expected failing signal: focused contract tests must fail when a route drifts, Class 0 is rejected, Class 3 lacks a valid packet, paths escape the repository, required context disappears, a changed active packet omits its control contract or stale local `main` would make already-merged files appear task-owned
- Success signal: `npm run test:ci-policy` exits zero and `npm run task:brief` emits the expected route, fetched-main base truth, safety errors and risk-proportional gates on the exact branch head
- Semantic evidence: a new agent session receives only the required MoneyFlow authority and affected boundary context, while unsafe or stale startup states are surfaced rather than silently described as current truth

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
- PR #314 separately owns stale/unresponsive CI recovery and reached green exact-head evidence through independent review; PR #315 does not duplicate that recovery surface.
- Before this PR, no command compiled route, explicit class, local Git state, packet ownership and agent startup instructions into one artifact.
- Independent review after `main` advanced found that both task and packet base selection preferred a potentially stale local `main` over the fetched `origin/main`. A synthetic repository reproduced the false-positive scope: comparison against stale local `main` included an already-merged active packet, while `origin/main` correctly left only the feature change.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | safety and authority | reuse; do not duplicate full policy |
| `docs/context/README.md` | task router | parse at runtime |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | class/gate authority | summarize conservatively |
| `docs/templates/FEATURE_WORK_PACKET.md` | durable task-state contract | add externally inspectable control fields |
| `scripts/watch-pr-ci.mjs` | CLI/test conventions | reuse style; do not duplicate CI monitoring |
| `scripts/base-truth-contract.test.mjs` | cross-tool stale-main regression | ensure task brief and packet gate share merged-truth semantics |
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
- [x] Which `main` ref owns default merged-truth comparison? Prefer fetched `origin/main` when available and fall back to local `main`; an explicitly supplied packet `--base` remains exact.

## Research

### Research scope and source selection

- Decision question: What is the smallest mechanism that reduces AI coding startup friction and catches self-invisible agent failure modes without replacing MoneyFlow policy?
- Reference map consulted: not required; focused first-party and primary engineering sources directly addressed the decision.
- Source budget: the user-provided `DISTILLATION.md` plus focused OpenAI, Git and test-driven-development primary guidance.
- Expected decision: choose between more prompt prose, a new orchestrator or machine-checkable repository contracts.

### Questions researched

1. Which AI failure modes must be externalized rather than solved by another instruction?
2. Which information belongs in every consequential work packet?
3. How can red-before-green and semantic evidence avoid ceremonial verification?
4. How can the change reuse the existing policy gate rather than add another workflow?
5. Which locally available Git ref should represent fetched merged `main` truth when local `main` and `origin/main` diverge?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| User-provided `DISTILLATION.md` | project research synthesis | 2026-08-07 | state, feedback, removal impact, red-before-green, semantic reliability and action safety must live outside the model | underlying source claims vary in strength; adoption is limited to repository-checkable rules |
| OpenAI, “Introducing Codex” | first-party product/engineering guidance | 2026-08-07 | repository instructions, configured environments, reliable tests and clear documentation improve coding-agent work | does not choose MoneyFlow risk or permission scope |
| OpenAI, “How OpenAI uses Codex” | first-party workflow guidance | 2026-08-07 | issue-like task descriptions, persistent repository context and explicit paths/patterns improve task execution | organizational practice, not product authority |
| Git, “Remote Branches” | official Git documentation | 2026-08-07 | local branches do not automatically synchronize; remote-tracking refs such as `origin/main` move when fetch updates remote state | `origin/main` is only as fresh as the latest fetch; this tool intentionally does not perform network fetches |
| Martin Fowler, “Test Driven Development” | primary engineering practice | 2026-08-07 | red-green-refactor requires a failing test before accepting the implementation result | not every documentation/mechanical task needs a synthetic red test |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Add more prose to `AGENTS.md` | simple | context rot and instruction attenuation; no executable failure | rejected |
| Add a new orchestration or evaluation service | broad automation | another management layer, credentials, maintenance and hidden state | rejected |
| Add a second standalone task tool | easy isolation | tool/context bloat on every session | rejected |
| Extend existing work packets and policy tests | visible, deterministic and repository-owned | changed packets must resolve the new fields | selected |
| Always prefer local `main` | works in a freshly synchronized checkout | stale local branch can reclassify already-merged files as feature changes | rejected |
| Fetch from the network inside `task:brief` | freshest remote state | adds network/auth latency and makes local startup non-deterministic | rejected |
| Prefer existing `origin/main`, fallback local `main` | uses fetched merged truth without network mutation | remote-tracking ref can itself be stale before fetch | selected; the emitted base ref makes this visible |

### Research decision

Keep `task:brief` as the single task-start command. Add one concise control contract to the existing work-packet template and a deterministic test that validates the template plus active packets changed by the branch. This converts advice into a failing repository contract without loading more context into every task.

Observed fact: AI can produce green mechanism checks while the real outcome remains wrong, and it cannot reliably self-diagnose this gap. Inference: work packets must separate deterministic success from semantic evidence. Product judgment: the contract is mandatory only for changed active packets, avoiding a mass rewrite of historical work.

For default Git comparison, use the fetched remote-tracking `origin/main` when present and fall back to local `main`. An explicitly supplied packet base remains exact rather than being silently rewritten. The tool remains network-free; operators who require server-fresh truth must fetch before running it, and the emitted `baseRef` makes the chosen reference auditable.

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

New agent sessions can begin with enough prose yet still lack explicit ownership of state, a real-path feedback signal, deletion/rollback understanding or bounded action permissions. A green build alone can therefore be mistaken for successful delivery. Local Git state can also become stale enough to misclassify already-merged files as task changes unless the selected base is explicit and testable.

### User stories

- As a contributor, I can generate a bounded task brief from task, boundary and class.
- As a reviewer, I can see where state lives, what must fail before the fix, what proves semantic success and how the change is undone.
- As the owner, I receive blocking errors for implementation on `main`, Class 3 work without a valid packet and changed active packets with unresolved control fields.
- As an agent, I can see which base ref produced the changed-file scope and avoid stale-local-main false positives when a fetched `origin/main` exists.

### Acceptance criteria

- [x] `npm run task:brief` emits Markdown, JSON and prompt output.
- [x] Route guidance is parsed from `docs/context/README.md`, not duplicated.
- [x] Branch, head, base comparison, dirty state and changed paths are inspected when Git is available.
- [x] Default `main` comparison prefers fetched `origin/main` and falls back to local `main`; explicit packet base remains exact.
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

Automatic risk classification, automatic code review, AI-as-judge acceptance, branch/packet/PR creation, CI recovery, provider writes, merge/deployment, MCP services, multi-agent orchestration and implicit network fetching during task bootstrap.

## Implementation plan

### Architecture fit

The task-start command stays in `scripts/`; the durable task contract stays in the existing feature work-packet template; the existing `test:ci-policy` gate enforces both. GitHub Actions remains the source of protected evidence.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/bootstrap-task-context.mjs` | local task-brief compiler + fetched-main base selection | bounded startup context and current merged scope |
| `scripts/bootstrap-task-context.test.mjs` | task-start contracts | prevent route/gate/safety drift |
| `scripts/work-packet-contract.mjs` | validate template/changed packets + fetched-main default | externalize decisions without stale scope |
| `scripts/work-packet-contract.test.mjs` | focused fixtures and repository contract | make the rule fail deterministically |
| `scripts/base-truth-contract.test.mjs` | cross-tool stale-local-main fixture | prevent already-merged files from reappearing as task-owned |
| `docs/templates/FEATURE_WORK_PACKET.md` | add control contract | one visible source for future tasks |
| `package.json` | register commands/tests | reuse existing policy gate |
| `docs/operations/task-bootstrap.md` | runbook | usage, limits and rollback |
| `docs/research/pr-memory/2026/Q3/PR-315.md` | provenance | bounded handoff |

### Data and migration impact

- Schema/backfill: none.
- Compatibility: current Node ESM conventions and local Git refs.
- Rollback: remove additive scripts/tests and revert template/package/runbook edits.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| control fields become empty ceremony | reject missing, empty, TODO/TBD/unknown and angle-bracket placeholders in changed active packets |
| contract headings or fields appear in the wrong section or more than once | require one owned control section and reject duplicate headings/fields |
| Git scope cannot be proven | fail closed instead of reporting zero changed packets |
| stale local `main` includes already-merged files in task scope | prefer fetched `origin/main`; cross-tool synthetic divergence regression |
| `origin/main` itself is stale | no hidden network fetch; expose selected base and require caller fetch when server-fresh truth is needed |
| explicit packet base is silently rewritten | explicit `--base` remains exact and regression-tested |
| local packet changes are not committed yet | include staged, unstaged and untracked active packet paths |
| old packets all fail immediately | validate only active packets changed against the branch base |
| green build is treated as user success | require a separate `Semantic evidence` field and reject copied success evidence |
| tests pass without exercising the fix | require `Expected failing signal`; allow explicit explanation when red-first is impossible |
| agent acts beyond authority | require permissions, reversibility, escalation and failure containment |
| new contract becomes another tool | register under existing `test:ci-policy`; no new workflow/service |
| overlap with PR #314 | no GitHub Actions mutation or recovery behavior |

### Verification plan

- Static/unit: `node --test scripts/bootstrap-task-context.test.mjs scripts/work-packet-contract.test.mjs scripts/base-truth-contract.test.mjs`; `npm run test:ci-policy`; `npm run check:work-packets`.
- Database/browser/responsive/production: not applicable.
- Manual: valid/invalid packet fixtures, stale-local-main/fetched-main synthetic repository, actual changed packet, real router, feature branch output and `main`/Class 3 blocking.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | audit current policy/tooling | none | repository reconnaissance | done |
| T2 | research agent context and reliability failures | T1 | focused source decision | done |
| T3 | implement task bootstrap CLI | T2 | branch script | done |
| T4 | harden branch, packet and path safety | T3 | focused contracts | done |
| T5 | externalize state/feedback/removal/action contract | T2 | template + fail-closed checker | done |
| T6 | register final policy tests and update runbook/provenance | T5 | focused contracts + branch records | done |
| T7 | run protected exact-head checks and fix observed failures | T6 | CI/CodeQL/secret evidence | in_progress |
| T8 | independent merged-base truth review | T6 | red synthetic Git fixture + cross-tool regression | evaluating |

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
| 2026-08-07 | researcher | implementer | implementing | user `DISTILLATION.md` + official source cross-check | final contract hardening pending | finish fail-closed contract |
| 2026-08-07 | implementer | evaluator | evaluating | 14/14 work-packet contracts; actual packet fixture; fail-closed scope | exact-head provider evidence pending | inspect exact-head failures only |
| 2026-08-07 | evaluator | implementer | evaluating | synthetic stale-local-main fixture reproduced false task scope; Git remote-tracking docs cross-check | cross-tool regression pending CI | prefer fetched `origin/main` without network fetch |
| 2026-08-07 | implementer | evaluator | evaluating | base selection fixes + `base-truth-contract.test.mjs`; Actions now running | exact-head policy/static/test/build/security still pending | fix only observed failures |

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
| work-packet control contract | 14/14 isolated contracts; actual PR packet passed; invalid semantic evidence exited `1` | pass locally |
| stale-local-main scope | red synthetic repository showed already-merged packet false positive; new cross-tool regression added | pending exact-head CI |
| protected exact-head checks | CI #1953/CodeQL #1063/secret-history #1063 started after provider recovery | in_progress |

### Research and adoption evidence

- The supplied distillation supports external state, deterministic feedback, semantic evidence and bounded action permissions.
- OpenAI guidance supports repository instructions and reliable tests; Fowler supports red-before-green as an observable record.
- Git documents that local and remote-tracking branches can diverge and that fetch updates `origin/main`; this supports preferring fetched merged truth when available.
- Official `actions/checkout` guidance confirms `fetch-depth: 0` provides all branch/tag history required by the fail-closed protected gate.
- No dependency, provider, runtime service or second workflow was added.

### Review findings

- Correctness: work-packet hardening passed focused local contracts; independent review found and fixed stale-local-main scope selection before final acceptance.
- Security/ownership: local read-only inspection and branch-only documentation/tooling writes.
- UI/accessibility: plain Markdown/JSON/prompt; no shipped UI.
- Maintainability: route rows are parsed from current policy; contract reuses the current packet and CI-policy surfaces; one cross-tool test owns the shared base-truth invariant without introducing another runtime module.
- Scope: no CI recovery, runtime, database or provider work.

### Remaining limitations

- Boundary and class remain explicit by design.
- The packet contract proves fields are resolved, structurally owned and non-duplicated, not that every claim is true; reviewers still inspect evidence.
- `origin/main` reflects the latest local fetch rather than making a network request; callers who require server-fresh truth must fetch first.
- Exact-head repository verification must finish on the live final SHA before acceptance.

## Delivery record

- Branch: `agent/task-bootstrap-cli`
- PR: #315 (ready for review)
- Squash commit: pending owner decision
- CI run: exact-head refresh in progress
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
