# Repository-owned task bootstrap CLI

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** human owner + coding agent  
**Issue/PR:** branch `agent/task-bootstrap-cli`; PR pending  
**Last updated:** 2026-08-07

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

A contributor or coding agent can start one bounded MoneyFlow task with a single repository-owned command that produces the minimum relevant context, explicit risk-selected verification, current branch/head evidence and a ready-to-use agent prompt without scanning unrelated project history.

## Repository reconnaissance

### Current behavior

- `AGENTS.md` defines the read order, authority, financial invariants, permission boundaries and Definition of Done.
- `docs/context/README.md` already routes each task boundary to warm context and explicitly rejects preloading all PR history.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes and verification selection.
- `docs/research/PROJECT_KNOWLEDGE_CONTRACT.json` and `check:knowledge` protect durable current-memory structure.
- `ci:status` and `ci:watch` already cover exact-head pull-request monitoring.
- PR #314 is separately implementing stale/unresponsive CI recovery and must not absorb general task-start scope.
- There is no current command that compiles task route, explicit class, local Git state, packet requirement and ready-to-use agent instructions into one bounded startup artifact.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | procedural authority and safety boundary | reuse; do not duplicate full policy |
| `docs/context/README.md` | project-owned domain router | parse at runtime |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | class and gate authority | summarize conservatively |
| `scripts/watch-pr-ci.mjs` | repository CLI and test style | reuse argument/error conventions; do not duplicate CI monitoring |
| `scripts/project-knowledge-contract.test.mjs` | existing project-knowledge test gate | load focused bootstrap tests |
| `package.json` | ergonomic command surface | add one task-start command |

### Existing tests and constraints

- Related unit tests: Node built-in `node:test` under `scripts/*.test.mjs`.
- Database/RLS tests: not applicable; no database or ownership behavior changes.
- Browser tests: not applicable; no shipped UI/runtime change.
- Product/architecture rules: no new management layer, one task/one scope, no direct `main`, no provider writes, no invented financial assumptions.

### Similar implementation and recent history

- Existing pattern to reuse: `scripts/watch-pr-ci.mjs` exports pure helpers, validates arguments, uses explicit exit codes and keeps GitHub/provider actions separate.
- Relevant issue/PR/decision: PR #302 added exact-head monitoring; PR #311 added the structured project-knowledge contract; PR #314 owns CI recovery only.

### Open questions

- [x] Should risk class be inferred from prompt/path? No; financial and operational meaning remains an explicit human/agent classification.
- [x] Should the tool create branches, packets or PRs? No; startup inspection stays read-only and does not become a second workflow manager.
- [x] Should it require network access? No; it must work from repository state alone.

## Research

### Research scope and source selection

- Decision question: What is the smallest tool that measurably reduces AI coding startup friction without replacing MoneyFlow's existing policy and evidence layers?
- Reference map consulted: `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` was not required because the selected sources directly address coding-agent context and engineering-productivity tooling.
- Source budget: four focused primary/first-party sources.
- Expected decision or uncertainty to resolve: context size, local/offline behavior, explicit state and whether to build a workflow orchestrator or a narrow compiler over existing project truth.

### Questions researched

1. What repository conditions make coding agents more reliable?
2. How should context be selected for long-running or multi-session agent work?
3. What kind of developer tool improves velocity without reducing verification?
4. Should the task-start command depend on live GitHub state?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI, “Introducing Codex” | first-party product/engineering guidance | 2026-08-07 | coding agents perform better with repository instructions, configured environments, reliable tests and clear documentation; task-phase internet may be unavailable | product guidance, not a MoneyFlow-specific delivery policy |
| Anthropic, “Effective context engineering for AI agents” | first-party agent engineering guidance | 2026-08-07 | agent quality depends on curating the smallest high-signal context from a larger evolving information set | does not define MoneyFlow's financial or permission boundaries |
| Anthropic, “Effective harnesses for long-running agents” | first-party agent harness guidance | 2026-08-07 | durable, inspectable state and structured continuation artifacts matter across long-running/multi-context work | MoneyFlow already owns packets and memory; no new harness framework is required |
| Google Engineering Productivity | first-party engineering productivity program | 2026-08-07 | developer tools and infrastructure should remove workflow friction while improving engineering effectiveness and product quality | describes organizational practice at Google scale, not a requirement to add a build platform |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Static prompt template | minimal implementation | drifts from router/policy; cannot inspect branch, dirty state or packet | rejected |
| Automatic class inference from prompt/diff | fewer arguments | unsafe around financial/data/security semantics; false confidence | rejected |
| MCP server or agent orchestration service | extensible and remotely callable | new management layer, dependency, credentials, operations and failure modes | rejected |
| Repository-owned pure Node CLI that compiles current policy | no dependency/network; testable; works for human and agent | must be kept aligned with route and class policy | selected |

### Research decision

Implement a local, dependency-free CLI that requires the user/agent to state the task boundary and risk class, parses the authoritative task router, inspects local Git state, requires an explicit existing packet for Class 3, and emits Markdown, JSON or prompt output.

Observed fact: MoneyFlow already has the necessary truth in repository documents and scripts. Inference: the highest-leverage missing layer is compilation and validation, not another knowledge store or orchestrator. Product judgment: explicit classification is preferable to automatic guessing because a filename or task sentence cannot prove financial, ownership or provider impact.

The selected external agent patterns do not override MoneyFlow's packet lifecycle, owner merge boundary, risk-selected gates or financial invariants.

### Adoption review

- Observed problem: repeated context selection and startup restatement consume agent turns and can load too much or too little project history.
- Existing or simpler alternatives considered: static prompt, manual checklist and extending CI monitoring.
- License/code-reuse compatibility: no external code copied; implementation uses Node standard library only.
- Secrets, user-data and privacy exposure: reads repository paths and local Git metadata only; no provider or user-financial data access.
- Runtime, bundle, deployment and operational cost: development-only CLI; no application bundle or production deployment effect.
- Owning boundary and maintenance responsibility: `scripts/` plus `docs/context/README.md` and risk policy.
- Migration and rollback: additive command; remove script, tests, npm entry, runbook and packet if abandoned.
- Verification plan: focused Node tests, project-knowledge/CI policy gate and exact-head protected checks.
- Removal condition if the expected benefit does not appear: remove if it becomes a stale duplicate of policy or creates more task-start maintenance than it saves.

## Specification

### Problem

A MoneyFlow task can begin with correct source-of-truth documents but still waste time and produce inconsistent startup context because every agent session manually reconstructs the same route, risk, branch, packet and gate information.

### User stories

- As a contributor, I can generate one bounded task brief from a task, boundary and risk class so that I start from the correct context without scanning unrelated history.
- As an agent operator, I can request prompt or JSON output so that the same project truth works across coding clients and automation.
- As the owner, I receive blocking errors when an agent attempts to start implementation on `main` or starts Class 3 work without a packet.

### Acceptance criteria

- [x] One npm command emits a Markdown task brief.
- [x] JSON and prompt-only formats are supported.
- [x] Domain loading/verification guidance is parsed from `docs/context/README.md`, not duplicated as a second router.
- [x] Branch, exact head, dirty state and changed paths are inspected when Git is available.
- [x] Starting on `main` blocks by default while `--allow-main` is limited to read-only reconnaissance.
- [x] Class 3 blocks without an explicit existing active packet.
- [x] The command does not infer risk class, mutate repository state, call providers, run CI, merge or deploy.
- [x] Focused tests cover argument, route, class, packet and main-branch behavior.
- [x] A runbook explains usage, safety, limits and rollback.

### Required states

- Loading: synchronous local inspection; no network wait state.
- Empty: missing context/router produces an explicit configuration error.
- Populated: Markdown, JSON or prompt output contains selected context and gates.
- Validation/error: exit `2` for usage/configuration failure; exit `3` for a blocked task state.
- Recovery/undo: create a branch or packet, correct the class/boundary and rerun; additive files are removable.
- Long data / large VND: not applicable; no financial data is read.
- Mobile/tablet/desktop: not applicable; CLI only.
- Accessibility: plain text/Markdown output; no color-only meaning.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain untouched.
- No ownership/RLS implications; no runtime or database access.

### Out of scope

- automatic risk classification;
- automatic packet, branch, issue or PR creation;
- GitHub Actions monitoring/recovery;
- provider writes, merge or deployment;
- a new project-memory store, MCP service or multi-agent framework.

## Implementation plan

### Architecture fit

The tool belongs in repository scripts because it compiles existing repository-owned instructions and local Git evidence. The context router remains the domain-loading authority, risk policy remains the gate authority, packets remain task-state authority and GitHub Actions remains protected-check authority.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/bootstrap-task-context.mjs` | add local task-brief compiler | implement bounded startup tool |
| `scripts/bootstrap-task-context.test.mjs` | add pure contract tests | prevent route/gate/safety regressions |
| `scripts/project-knowledge-contract.test.mjs` | load bootstrap tests in existing gate | keep the command under project-knowledge verification without changing CI topology |
| `package.json` | add `task:brief` | ergonomic use |
| `docs/operations/task-bootstrap.md` | add runbook | operating and rollback contract |
| `docs/research/pr-memory/2026/Q3/PR-<number>.md` | bounded provenance | repository PR-memory rule |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: Node standard library and current ESM script conventions.
- Rollback: delete the additive command surface and test import.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| CLI becomes a second stale router | parse the existing Markdown route table at runtime |
| automatic classification hides financial risk | require explicit `--class`; warn on commonly high-risk aliases |
| agent treats prompt output as authorization | embed owner/merge/provider safety boundary |
| Class 3 starts without durable state | block without `--packet` pointing to an existing file |
| tool is run from `main` | block by default; `--allow-main` explicitly says reconnaissance only |
| new tool overlaps CI recovery | no GitHub API/CLI actions; document relationship to #302/#314 |
| tests are not part of protected policy run | load the focused tests from the existing project-knowledge contract test |

### Verification plan

- Static: repository policy, lint as selected by CI.
- Unit/domain: `node --test scripts/bootstrap-task-context.test.mjs`; `npm run test:ci-policy`.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: run against a feature branch, verify JSON/prompt output and verify `main`/missing-packet exit `3`; no production deployment claim.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | inspect current policy/tooling and identify non-duplicative gap | none | reconnaissance above | done |
| T2 | research context and productivity patterns | T1 | four-source decision record | done |
| T3 | implement CLI and pure helpers | T2 | script on branch | done |
| T4 | add focused tests and isolated fixture validation | T3 | 5/5 local Node tests | done |
| T5 | connect command to project knowledge gate and package script | T4 | branch diff | implementing |
| T6 | add runbook, PR memory and draft PR | T5 | reviewed artifacts | todo |
| T7 | run exact-head protected verification and evaluate actual diff | T6 | CI/CodeQL/secret evidence | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repository audit + four focused sources | no exact-head branch evidence yet | finalize bounded implementation plan |
| 2026-08-07 | planner | implementer | planned | acceptance, risks and no-dependency decision | package/test integration pending | implement on focused branch |
| 2026-08-07 | implementer | evaluator | evaluating | CLI, 5/5 isolated tests, runbook draft | repository-wide policy/CI not run yet | finish integration, open draft PR and verify exact head |

### Current permission boundary

- Granted scope: branch-only repository tooling, tests, runbook, packet and bounded PR memory.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, branch `agent/task-bootstrap-cli`.
- Forbidden writes: `main`, provider settings, branch protection, required checks, production, database and user data.
- Human approval required before: merge, deployment or expanding the tool into workflow orchestration.
- Rollback or stop condition: stop if current policy already provides equivalent executable behavior, protected tests reveal policy conflict, or the tool requires a new service/dependency.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| pure parser/argument/gate contracts | isolated `node --test` result: 5 passed | pass |
| feature-branch manifest | synthetic Git fixture produced UI route, feature branch and 11 selected requirements | pass |
| main-branch safety | synthetic Git fixture exited `3` and emitted the blocking reason | pass |
| repository exact-head gates | pending draft PR | pending |

### Research and adoption evidence

- Selected sources still support a repository-instructed, small-context, durable and local tool.
- Important source limitation remains respected: external agent guidance does not choose MoneyFlow financial risk or authorize writes.
- New tool/dependency/pattern passed the adoption review: no dependency or service was added.

### Review findings

- Correctness: pure helper tests pass; actual repository route parsing remains to be exercised by protected CI/manual branch command.
- Security/ownership: local read-only inspection; no secrets/providers/user data.
- UI/UX/accessibility: plain Markdown/JSON/prompt; no visual surface.
- Maintainability/duplication: route rows are parsed from current policy; risk summaries remain intentionally small and testable.
- Scope compliance: no CI recovery, runtime, database or provider work.

### Remaining limitations

- Explicit class and boundary inputs are still required; this is a safety choice rather than full automation.
- The CLI does not validate whether a supplied Class 3 packet semantically matches the task; reviewer judgment remains required.
- Exact-head repository verification is pending.

## Delivery record

- Branch: `agent/task-bootstrap-cli`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
