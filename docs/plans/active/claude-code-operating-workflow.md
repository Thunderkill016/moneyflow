# Claude Code operating workflow

**Status:** implementing  
**Owner:** human owner + implementing agent  
**Issue/PR:** #107  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has one explicit, repository-native Claude Code operating workflow that separates planning, implementation, evaluation, automated evidence and human approval. Claude Code receives concise project context, safe shared permissions, runtime safety hooks, an independent evaluator and a repeatable repository contract that prevents the workflow from silently drifting.

## Repository reconnaissance

### Current behavior

- `CLAUDE.md` already provides current project orientation and imports `AGENTS.md`.
- `.claude/settings.json` registers `SessionStart` and `PreToolUse`, but the baseline had no shared allow/deny permission policy and did not protect every repository search/read tool.
- `scripts/hooks/session-start.sh` read `IDEA.md` instead of reporting current branch and active work packets.
- `scripts/hooks/pre-tool-safety.sh` blocked a few destructive commands but did not enforce branch-sensitive Edit/Write calls, autonomous merge/default-branch push or production deployment boundaries.
- `.claude/agents/evaluator.md` defined a basic independent reviewer but did not rank findings, distinguish missing evidence or provide a complete output contract.
- The repository had a general AI delivery workflow but no Claude Code-specific contract linking memory, permissions, hooks, task states and session-role separation.
- CI did not run any deterministic check of Claude settings, hook syntax or representative deny/allow decisions.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `CLAUDE.md` | Automatically loaded Claude Code entrypoint | Keep current facts; add concise role/workflow guidance |
| `AGENTS.md` | Cross-agent product, architecture and verification rules | Reuse; do not duplicate |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | General planner/builder/evaluator lifecycle | Reuse as parent process |
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Claude-specific operating contract | Add |
| `.claude/settings.json` | Shared permissions and hook registration | Add safe allow/deny policy and protect Read/Grep/Glob |
| `.claude/agents/evaluator.md` | Independent clean-context review role | Strengthen evidence contract |
| `scripts/hooks/session-start.sh` | Startup context | Replace stale `IDEA.md` state |
| `scripts/hooks/pre-tool-safety.sh` | Runtime hard safety boundary | Expand deterministic blocks |
| `scripts/check-claude-workflow.mjs` | Executable contract for the workflow | Add |
| `package.json` and CI | Local/CI entrypoints | Run the contract on every non-draft PR |
| `README.md` | Source-of-truth and command index | Link workflow and check |

### Existing tests and constraints

- No application runtime, financial calculation, database, auth, RLS or deployment configuration behavior changes.
- Required checks: JSON schema shape, shell syntax, hook payload simulations, `npm run check:claude-workflow` and `npm run check:knowledge`.
- Manual check: start a fresh local Claude Code session and inspect the startup banner and `/permissions`.

### Similar implementation and recent history

- The planner/builder/evaluator roles already exist in `docs/engineering/AI_DELIVERY_WORKFLOW.md`.
- Closed PR #97 introduced the initial hook registration and evaluator. Its useful baseline is already on `main`; this packet evolves the current repository rather than reviving the stale branch.
- Existing repository contracts (`check:knowledge`, `check:deployment-env`, `check:css-ownership`) establish the pattern for deterministic operating checks in CI.

### Open questions

- [ ] Confirm the installed Claude Code version accepts the shared permission schema and displays hook deny reasons.
- [x] Confirm representative `PreToolUse` payloads deny dangerous calls and allow benign calls in an isolated shell harness.
- [ ] Confirm the new repository-owned contract passes in normal CI.

## Research

### Questions researched

1. How Claude Code project memory and `CLAUDE.md` imports work.
2. How shared settings express permission allow/deny/default-mode rules.
3. How `PreToolUse` hooks can deny a call before normal permission evaluation.
4. How plan mode and clean subagent contexts support role separation.
5. Which deterministic parts of the workflow can be encoded in a repository check.

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Anthropic Claude Code memory documentation | 2026-07-28 | Root `CLAUDE.md` is shared project memory and may import repository files | MoneyFlow product truth still comes from repository authorities |
| Anthropic Claude Code IAM/permissions documentation | 2026-07-28 | Shared settings support allow/deny rules, default modes and deny precedence | Dynamic branch/path policy still needs hooks |
| Anthropic Claude Code CLI reference | 2026-07-28 | Plan mode and dangerous permission-bypass behavior | CLI options do not define product workflow |
| Anthropic Claude Code hooks documentation | 2026-07-28 | `PreToolUse` can decide permission at runtime | Hooks should enforce deterministic safety only |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Put the full workflow in `CLAUDE.md` | Always loaded | Bloated/stale context and duplicated truth | Rejected |
| Documentation only | Simple | Prompt compliance only; no hard boundary | Rejected |
| Hooks only | Deterministic blocks | No roles, states or evidence contract | Rejected |
| External/manual harness only | Fast initial evidence | Regressions are not caught in the repository | Rejected as final state |
| Repo-owned Node contract in CI | Repeatable, dependency-free, reviewable | Adds a small maintenance surface | Selected |
| Revive closed PR #97 branch | Reuses branch | Diverged from current `main` and overwrites newer orientation | Rejected |
| New branch from current `main` | Clean review and current facts | Requires new PR | Selected |

### Research decision

Use a layered design: concise `CLAUDE.md`, authoritative workflow document, shared settings for safe commands/static denies, hooks for branch/path/runtime-sensitive policy, a clean-context evaluator, and a dependency-free repository contract run locally and in CI. Human approval remains required for requirements, merge and production changes.

## Specification

### Problem

Claude Code controls are fragmented across project memory, general AI workflow, settings, hooks and evaluator prose. Without one operating contract and an executable check, the startup context, permission policy or evaluator behavior can drift while normal application tests remain green. This increases scope drift, repetitive prompts, unsafe Git actions and self-approval risk.

### User stories

- As the owner, I can start Claude Code and see the branch, dirty state, active work packets and safety expectations.
- As the owner, I can allow routine read/check commands while deterministic destructive actions remain blocked.
- As a builder, I can follow one lifecycle from reconnaissance through delivery.
- As a reviewer, I can invoke an evaluator that grades actual evidence without editing code.
- As a maintainer, I receive a CI failure when Claude settings or hooks no longer satisfy the repository contract.

### Acceptance criteria

- [x] `CLAUDE.md` preserves current project facts and points non-trivial work to the Claude workflow and active packet.
- [x] `docs/engineering/CLAUDE_CODE_WORKFLOW.md` defines context layers, roles, classification, task states, permissions, hooks, verification and done criteria.
- [x] `.claude/settings.json` is valid JSON with safe allows, destructive denies, `SessionStart` and `PreToolUse` for Bash/Edit/Write/Read/Grep/Glob.
- [x] SessionStart reports branch, dirty paths, active packets, workflow and baseline gates; it no longer reads `IDEA.md`.
- [x] PreToolUse blocks direct secret paths, Edit/Write and Git history mutation on `main`, destructive Git commands, autonomous merge/default-branch push and production/remote Supabase changes.
- [x] PreToolUse allows benign reads, searches and verification commands.
- [x] Evaluator has no edit/write tools, checks actual evidence, ranks P0–P3 and returns `Ready to merge` or `Not ready`.
- [x] README links the Claude workflow.
- [ ] `npm run check:claude-workflow` validates settings shape, hook syntax, SessionStart output and representative allow/deny behavior.
- [ ] Normal CI executes `npm run check:claude-workflow` before application verification.
- [x] No product runtime behavior changes.

### Required states

- Loading: not applicable.
- Empty: SessionStart handles zero active packets.
- Populated: SessionStart handles multiple packets and limits output.
- Validation/error: malformed/empty hook input does not crash the session; the contract reports clear failures.
- Recovery/undo: denied calls do not modify state; the user can create a branch or perform an approved action.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: terminal output is plain text and concise.

### Financial and security constraints

- No financial, ledger, schema, RLS, auth or runtime-mode changes.
- VND and transfer invariants remain untouched.
- Local environment files, credentials and production-changing operations remain human-controlled.
- The check uses only temporary local repositories and must never contact or mutate production services.

### Out of scope

- Installing Claude Code locally.
- MCP or third-party agent infrastructure.
- Autonomous merge/deploy.
- Replacing `AGENTS.md` or the general AI workflow.
- Application refactoring or product changes.
- Proving every possible shell-command obfuscation; hooks enforce known deterministic risks and permission prompts remain defense in depth.

## Implementation plan

### Architecture fit

`CLAUDE.md` remains the minimal session entrypoint. `AGENTS.md` and the AI delivery workflow remain parent authorities. The new document owns Claude-specific session conventions. Settings provide static policy; hooks provide dynamic branch/path policy; evaluator provides independent review; the Node contract executes deterministic invariants without adding a runtime dependency.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Add operating workflow | Durable process contract |
| `CLAUDE.md` | Add workflow pointer and roles | Session-visible guidance without losing current facts |
| `.claude/settings.json` | Add permissions and Read/Grep/Glob hook coverage | Safe automation and secret protection |
| `scripts/hooks/session-start.sh` | Report real repository state | Remove stale queue context |
| `scripts/hooks/pre-tool-safety.sh` | Expand safety decisions | Protect Git, secrets and production |
| `.claude/agents/evaluator.md` | Add procedure/severity/output | Prevent self-approval |
| `scripts/check-claude-workflow.mjs` | Validate settings/hooks in a temp repository | Repeatable evidence and regression prevention |
| `package.json` | Add `check:claude-workflow` | Stable local command |
| `.github/workflows/ci.yml` | Run the contract in `verify` | Prevent merge-time drift |
| `README.md` | Link workflow and check | Human/agent discovery |

### Data and migration impact

- Schema/migration/backfill: none.
- Runtime dependencies: none; the check uses Node built-ins and system Bash/Python/Git already required by the tooling.
- Compatibility: requires a current Claude Code version with permissions, hooks and project subagents.
- Rollback: revert documentation/settings/hook/check commits; no application data is affected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Permission schema rejected locally | JSON shape contract plus fresh session and `/permissions` |
| Hook blocks a safe action | Benign Read/Grep/Bash simulations |
| Hook misses secret aliases | Test `.env.local`, `.env.production`, `secrets` and `credentials` paths |
| Planning on `main` becomes impossible | Read/search/check commands remain allowed; only deterministic mutations denied |
| Contract mutates the real checkout | Copy hooks into a temporary initialized Git repository |
| Contract depends on network or production | Use only local Node, Git, Bash and Python processes |
| Documentation duplicates current orientation | Preserve current `CLAUDE.md` facts and link parent sources |

### Verification plan

- Static: `npm run check:claude-workflow`; `npm run check:knowledge`.
- Contract internals: JSON shape, `bash -n`, SessionStart on main, benign Read/Grep/test, secret Read/Grep/Glob, Edit on main, force-push, production deploy, malformed input and feature-branch Edit.
- Domain/database/browser: not applicable.
- Manual: fresh Claude Code session, startup output and `/permissions` inspection.
- CI: `verify` job runs the contract before lint/typecheck/test/build.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add authoritative workflow | none | Engineering document | done |
| T2 | Align `CLAUDE.md` and README | T1 | Source diff | done |
| T3 | Add shared permission policy | T1 | JSON parser and source review | done |
| T4 | Replace SessionStart state | T1 | Shell syntax and isolated output | done; local Claude session pending |
| T5 | Harden PreToolUse | T3 | Deny/allow shell simulations | done; local Claude UI pending |
| T6 | Strengthen evaluator | T1 | Source diff | done |
| T7 | Add repository-owned Claude workflow contract | T3–T5 | Local command output | implementing |
| T8 | Wire contract into package/README/CI | T7 | Diff and CI run | todo |
| T9 | Manual Claude session and independent evaluation | T7–T8 | `/permissions`, visible deny and evaluator verdict | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Current orientation preserved | `CLAUDE.md` diff | pass |
| Workflow defined | `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | pass |
| Settings valid | Isolated JSON validation of exact source | pass |
| Shell syntax valid | Isolated `bash -n` for both exact scripts | pass |
| SessionStart behavior | Isolated main-branch repository with active packet | pass |
| Dangerous actions denied | Secret Read/Grep/Glob, Edit on main, force-push and production deploy simulations | pass |
| Benign calls allowed | README Read, source Grep and `npm run test` simulations return no deny output | pass |
| Evaluator independent | Read/search/bash tools only; evidence and severity contract present | pass |
| README discovery | README diff | pass |
| Repository-owned contract | Not implemented yet | no evidence |
| CI contract | Not implemented yet | no evidence |
| No runtime behavior change | Current diff is documentation/Claude tooling only | pass |

### Review findings

- Correctness: isolated JSON, shell and hook simulations pass; repository-owned repeatable evidence is still being added.
- Security/ownership: deterministic dangerous calls are denied in the harness; no product data or RLS changes.
- UI/UX/accessibility: not applicable.
- Maintainability: workflow references existing authorities and will be protected by a focused contract.
- Scope compliance: documentation, developer tooling and CI only.

### Remaining limitations

- The isolated harness does not prove compatibility with the owner's installed Claude Code version.
- Fresh-session startup, `/permissions`, visible deny-reason behavior and evaluator review remain required before ready/merge.

## Delivery record

- Branch: `agent/claude-code-operating-workflow`
- PR: #107
- Squash commit: pending
- CI run: draft run #406 skipped by repository policy; passing non-draft run pending
- Production deployment: not applicable to product runtime
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
