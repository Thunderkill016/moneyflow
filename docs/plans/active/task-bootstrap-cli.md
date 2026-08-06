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

A contributor or coding agent can start one bounded MoneyFlow task with one repository-owned command that produces the minimum relevant context, explicit risk-selected verification, current branch/head evidence and a ready-to-use agent prompt without scanning unrelated project history.

## Repository reconnaissance

### Current behavior

- `AGENTS.md` owns procedural authority, financial invariants, permissions and Definition of Done.
- `docs/context/README.md` already routes task boundaries to warm context and rejects preloading all PR history.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes and verification selection.
- `check:knowledge`, `ci:status` and `ci:watch` already protect project memory and exact-head CI observation.
- Candidate PR #314 separately owns stale/unresponsive CI recovery.
- No merged command currently compiles task route, explicit class, local Git state, packet requirement and agent startup instructions into one artifact.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `AGENTS.md` | safety and authority | reuse; do not duplicate full policy |
| `docs/context/README.md` | task router | parse at runtime |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | class/gate authority | summarize conservatively |
| `scripts/watch-pr-ci.mjs` | CLI/test conventions | reuse style; do not duplicate CI monitoring |
| `scripts/project-knowledge-contract.test.mjs` | existing knowledge gate | load focused bootstrap tests |
| `package.json` | command surface | add `task:brief` |

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
- [x] Require network access? No; it must work from local repository state.

## Research

### Research scope and source selection

- Decision question: What is the smallest tool that reduces AI coding startup friction without replacing MoneyFlow policy and evidence layers?
- Reference map consulted: not required; four direct first-party sources were sufficient.
- Source budget: four focused sources.
- Expected decision: choose between a narrow local compiler, a static prompt, automatic classification or a new orchestration service.

### Questions researched

1. What repository conditions improve coding-agent reliability?
2. How should context be selected across agent sessions?
3. What developer tooling improves velocity without reducing verification?
4. Should startup depend on live provider access?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| OpenAI, “Introducing Codex” | first-party product/engineering guidance | 2026-08-07 | repository instructions, configured environments, reliable tests and clear docs improve coding-agent work; task-phase internet may be unavailable | does not define MoneyFlow risk or permissions |
| Anthropic, “Effective context engineering for AI agents” | first-party agent engineering guidance | 2026-08-07 | curate the smallest high-signal context from a larger evolving information set | not a MoneyFlow delivery policy |
| Anthropic, “Effective harnesses for long-running agents” | first-party harness guidance | 2026-08-07 | durable, inspectable task state matters across long-running/multi-context work | MoneyFlow already owns packets and memory |
| Google Engineering Productivity | first-party engineering-productivity guidance | 2026-08-07 | developer tools should remove workflow friction while improving effectiveness and quality | Google-scale practice does not require a new platform here |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Static prompt | trivial | drifts; no Git or packet checks | rejected |
| Automatic class inference | fewer inputs | unsafe false confidence around financial/data/security meaning | rejected |
| MCP/orchestration service | extensible | new dependency, credentials, operations and management layer | rejected |
| Pure Node compiler over existing policy | local, testable, no dependency/network | requires policy alignment | selected |

### Research decision

Implement a dependency-free local CLI that requires task, boundary and risk class; parses the authoritative router; inspects Git state; requires an existing packet for Class 3; and emits Markdown, JSON or prompt output.

Observed fact: MoneyFlow already contains the required truth. Inference: compilation and validation are the missing layer, not another knowledge store. Product judgment: explicit classification is safer than guessing because filenames and prompts cannot prove financial, ownership or provider impact.

### Adoption review

- Observed problem: repeated startup reconstruction wastes agent turns and can load too much or too little context.
- Simpler alternatives: manual checklist and static prompt were rejected for drift and missing state checks.
- License/code reuse: no external code copied; Node standard library only.
- Secrets/privacy: reads repository paths and local Git metadata only.
- Runtime/deployment cost: development-only; no application bundle or production effect.
- Owner: repository `scripts/` plus context/risk policy.
- Migration/rollback: additive; delete script, tests, npm entry and runbook.
- Verification: focused Node tests, project-knowledge/CI policy and protected exact-head checks.
- Removal condition: remove if it becomes stale policy duplication or costs more maintenance than it saves.

## Specification

### Problem

Each new MoneyFlow agent session manually reconstructs the same route, risk, branch, packet and gate context, causing repeated work and inconsistent startup quality.

### User stories

- As a contributor, I can generate a bounded task brief from task, boundary and class.
- As an agent operator, I can emit prompt or JSON output for different clients.
- As the owner, I receive blocking errors for implementation on `main` or Class 3 work without a packet.

### Acceptance criteria

- [x] `npm run task:brief` emits Markdown.
- [x] JSON and prompt modes exist.
- [x] Route guidance is parsed from `docs/context/README.md`, not duplicated.
- [x] Branch, head, dirty state and changed paths are inspected when Git is available.
- [x] `main` blocks by default; `--allow-main` is reconnaissance only.
- [x] Class 3 requires an explicit existing packet.
- [x] No risk inference, repository mutation, CI rerun, provider call, merge or deploy.
- [x] Focused tests and runbook exist.

### Required states

- Loading: synchronous local inspection.
- Empty: missing router/context is an explicit error.
- Populated: Markdown, JSON or prompt output.
- Validation/error: exit `2` for usage/configuration; exit `3` for blocked task state.
- Recovery/undo: fix branch/class/packet and rerun; additive rollback.
- Long data/large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: plain text; no color-only meaning.

### Financial and security constraints

- No financial data or advice is produced.
- Integer money, transfer, ownership and RLS behavior remain untouched.
- No runtime, database, provider or production access.

### Out of scope

Automatic classification, branch/packet/PR creation, CI monitoring/recovery, provider writes, merge/deployment, MCP services and multi-agent orchestration.

## Implementation plan

### Architecture fit

The command belongs in `scripts/` because it compiles repository-owned instructions and local Git evidence. The router, risk policy, packets and GitHub Actions remain their existing authorities.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `scripts/bootstrap-task-context.mjs` | add task-brief compiler | bounded startup tool |
| `scripts/bootstrap-task-context.test.mjs` | add contracts | prevent safety/route drift |
| `scripts/project-knowledge-contract.test.mjs` | load new tests | use existing knowledge gate without CI-topology changes |
| `package.json` | add `task:brief` | ergonomic command |
| `docs/operations/task-bootstrap.md` | runbook | usage, limits and rollback |
| `docs/research/pr-memory/2026/Q3/PR-315.md` | provenance | PR-memory rule |

### Data and migration impact

- Schema/backfill: none.
- Compatibility: current Node ESM conventions.
- Rollback: remove additive command surface and test import.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| second stale router | parse existing Markdown route table |
| hidden financial risk | explicit class; high-risk-boundary warnings |
| prompt mistaken for authorization | embed owner/provider/merge boundary |
| Class 3 without durable state | block without existing packet |
| implementation from `main` | block by default |
| overlap with #314 | no GitHub/CI action; document separate ownership |
| tests not protected | import through existing project-knowledge test |

### Verification plan

- Static/unit: `node --test scripts/bootstrap-task-context.test.mjs`; `npm run test:ci-policy`; selected CI policy/lint checks.
- Database/browser/responsive/production: not applicable.
- Manual: real repository router, feature branch output, `main` block and Class 3 packet block.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | audit current policy/tooling | none | reconnaissance | done |
| T2 | research agent context/tooling | T1 | four-source decision | done |
| T3 | implement CLI | T2 | branch script | done |
| T4 | add isolated tests | T3 | 5/5 passed | done |
| T5 | integrate npm/knowledge gate | T4 | branch diff | done |
| T6 | add runbook, PR memory and draft PR | T5 | PR #315 | done |
| T7 | run exact-head checks and evaluate diff | T6 | CI/CodeQL/secret evidence | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-07 | researcher | planner | specified | repository audit + four sources | no branch evidence | plan bounded implementation |
| 2026-08-07 | planner | implementer | planned | acceptance/risks/adoption review | integration pending | implement on focused branch |
| 2026-08-07 | implementer | evaluator | evaluating | PR #315; CLI; runbook; PR memory; 5/5 isolated tests | protected exact-head checks pending | evaluate diff and CI only |

### Current permission boundary

- Granted: branch-only tooling, tests and reviewed documentation.
- Repository: `Thunderkill016/moneyflow`, branch `agent/task-bootstrap-cli`, PR #315.
- Forbidden: `main`, provider/ruleset/required-check changes, production, database and user data.
- Human approval required before merge, deployment or orchestration expansion.
- Stop if protected tests reveal policy conflict or a new dependency/service becomes necessary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| pure parser/argument/gate contracts | isolated Node tests: 5 passed | pass |
| feature-branch manifest | synthetic Git fixture | pass |
| main-branch safety | synthetic fixture exited `3` with reason | pass |
| bounded PR/provenance | PR #315 + PR memory | pass |
| repository exact-head checks | pending | pending |

### Research and adoption evidence

- Sources still support repository instructions, small context, durable state and developer tooling.
- External guidance does not choose MoneyFlow risk or authorize writes.
- No dependency, provider or service was added.

### Review findings

- Correctness: pure tests pass; real-router/protected checks pending.
- Security/ownership: local read-only inspection only.
- UI/accessibility: plain Markdown/JSON/prompt; no shipped UI.
- Maintainability: route rows are parsed from current policy.
- Scope: no CI recovery, runtime, database or provider work.

### Remaining limitations

- Boundary and class remain explicit by design.
- Packet existence is checked, not semantic task-to-packet matching.
- Exact-head repository verification is pending.

## Delivery record

- Branch: `agent/task-bootstrap-cli`
- PR: #315 (draft)
- Squash commit: pending owner decision
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending owner acceptance
