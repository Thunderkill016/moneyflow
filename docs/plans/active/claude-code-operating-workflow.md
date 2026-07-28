# Claude Code operating workflow

**Status:** evaluating  
**Owner:** human owner + implementing agent  
**Issue/PR:** #107  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has one repository-native Claude Code operating workflow that separates planning, implementation, independent evaluation, automated evidence and human approval. Claude receives concise project context, shared permissions, runtime safety hooks, an evaluator and a repeatable CI contract without gaining authority to redefine requirements, edit on `main`, access secrets, merge or deploy production.

## Repository reconnaissance

### Current behavior

Before this change:

- `CLAUDE.md` contained useful current project orientation but no Claude-specific role lifecycle.
- `.claude/settings.json` registered hooks but had no shared allow/deny policy.
- `SessionStart` read the stale `IDEA.md` queue instead of current branch and work packets.
- `PreToolUse` blocked only a small set of dangerous calls and did not cover every read/search tool.
- The evaluator lacked severity, evidence mapping and a strict verdict contract.
- CI did not check Claude settings, hook syntax or representative allow/deny behavior.

### Relevant repository areas

| Area | Responsibility in this change |
|---|---|
| `CLAUDE.md` | Concise session entrypoint and role guardrails |
| `AGENTS.md` | Existing cross-agent product, architecture and delivery law |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Parent planner/builder/evaluator lifecycle |
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Claude-specific operating contract |
| `.claude/settings.json` | Shared permissions and hook registration |
| `.claude/agents/evaluator.md` | Independent clean-context evaluation role |
| `scripts/hooks/session-start.sh` | Startup repository state |
| `scripts/hooks/pre-tool-safety.sh` | Dynamic branch/path/command safety |
| `scripts/check-claude-workflow.mjs` | Executable workflow contract |
| `package.json`, README and CI | Stable local and merge-time entrypoints |

### Existing tests and constraints

- No application runtime, financial calculation, database, auth, RLS or deployment behavior may change.
- The executable contract must use only local Node, Bash, Python and Git; it must not contact production.
- A real installed-Claude session remains necessary to verify the visible `/permissions` UI and hook deny message.

### Similar implementation and recent history

- The parent role model already exists in `docs/engineering/AI_DELIVERY_WORKFLOW.md`.
- Closed PR #97 introduced the initial hook/evaluator baseline now present on `main`.
- Existing `check:knowledge`, deployment and CSS checks establish the repository-contract pattern reused here.

### Open questions

- [ ] Confirm the owner's installed Claude Code accepts the settings and shows the deny reason in its UI.
- [x] Confirm deterministic settings, hook and evaluator invariants in a repo-owned contract.
- [x] Confirm normal CI remains green after adding the workflow contract.

## Research

### Questions researched

1. How Claude Code loads project memory and `CLAUDE.md` imports.
2. How shared allow, deny and default permission rules work.
3. How `PreToolUse` participates in runtime permission decisions.
4. How plan mode and clean subagent contexts support role separation.
5. Which deterministic workflow rules can be enforced in CI.

### Sources

| Source | Date accessed | Establishes | Limits |
|---|---|---|---|
| Anthropic Claude Code memory documentation | 2026-07-28 | Project `CLAUDE.md` and imports | MoneyFlow truth still comes from repository authorities |
| Anthropic permissions/IAM documentation | 2026-07-28 | Allow/deny/default mode, read/edit patterns and hook ordering | Local installed-version compatibility needs manual verification |
| Anthropic CLI reference | 2026-07-28 | Plan mode and dangerous bypass flag | CLI options do not define product workflow |
| Anthropic hooks documentation | 2026-07-28 | Runtime deny decisions | Hooks enforce deterministic safety, not product judgment |

### Alternatives considered

| Option | Decision |
|---|---|
| Put the full workflow in `CLAUDE.md` | Rejected: bloated and stale context |
| Documentation only | Rejected: no hard or repeatable enforcement |
| Hooks only | Rejected: no roles, states or evidence contract |
| External/manual harness only | Rejected as final state: regressions would not block CI |
| Repo-owned Node contract in CI | Selected: dependency-free and repeatable |
| Revive the diverged PR #97 branch | Rejected: current `main` already had newer orientation |

### Research decision

Use layered controls: concise project memory, an authoritative workflow, static permissions, dynamic hooks, a clean-context evaluator and a repository-owned CI contract. Requirements, merge and production changes remain human-controlled.

## Specification

### Problem

Claude controls were fragmented across memory, general workflow, settings, hooks and evaluator prose. Without a single operating contract and executable check, safety or completion behavior could drift while application tests stayed green.

### User stories

- As the owner, I see current branch, dirty state, active packets and safety expectations when Claude starts.
- As the owner, routine read/check work proceeds while deterministic destructive actions are denied.
- As a builder, I follow one lifecycle from reconnaissance through delivery.
- As a reviewer, I invoke an evaluator that checks actual evidence without editing code.
- As a maintainer, CI fails when Claude settings or hooks violate the repository contract.

### Acceptance criteria

- [x] `CLAUDE.md` preserves current facts and points non-trivial work to the Claude workflow and active packet.
- [x] The workflow defines context layers, roles, task classification, task states, permissions, hooks, verification and definition of done.
- [x] Shared settings contain safe allows, destructive denies and hook coverage for Bash/Edit/Write/Read/Grep/Glob.
- [x] SessionStart reports branch, dirty paths, active packets, workflow and baseline gates without using `IDEA.md`.
- [x] PreToolUse blocks direct secret paths, edits/history mutation on `main`, destructive Git, autonomous merge/default-branch push and production/remote Supabase changes.
- [x] PreToolUse allows benign read/search/check work and Edit on a focused feature branch.
- [x] The evaluator cannot edit, maps evidence, ranks P0–P3 and returns `Ready to merge` or `Not ready`.
- [x] README links the workflow and lists `npm run check:claude-workflow`.
- [x] `npm run check:claude-workflow` checks settings shape, hook syntax, SessionStart and representative allow/deny behavior in a temporary Git repository.
- [x] Normal CI executes the Claude contract before application verification.
- [x] No product runtime behavior changes.

### Required states

- Empty: SessionStart handles zero active packets.
- Populated: SessionStart lists active packets and bounds output.
- Validation/error: malformed hook JSON does not crash the session; the contract emits actionable failures.
- Recovery: denied calls leave repository state unchanged and explain the required human/branch action.
- UI/responsive/financial states: not applicable to this developer-tooling change.

### Financial and security constraints

- No finance, ledger, schema, RLS, auth or runtime-mode changes.
- VND and transfer invariants remain untouched.
- Local environment files, credential directories and production-changing operations remain human-controlled.
- The contract uses only temporary local resources and never contacts production.

### Out of scope

- Installing Claude Code on the owner's machine.
- MCP or third-party orchestration.
- Autonomous merge/deploy.
- Replacing `AGENTS.md` or the general AI workflow.
- Application refactoring.
- Proving every possible shell obfuscation; hooks and normal permission prompts remain defense in depth.

## Implementation plan

### Architecture fit

`CLAUDE.md` stays the minimal entrypoint. `AGENTS.md` and the general delivery workflow remain parent authorities. Settings own static policy, hooks own dynamic branch/path policy, evaluator owns independent review, and the Node contract owns deterministic regression checks.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Add operating workflow | Durable process contract |
| `CLAUDE.md` | Add role/workflow guidance | Session-visible controls without losing current facts |
| `.claude/settings.json` | Add permissions and read/search hook coverage | Safe routine work and secret protection |
| SessionStart and PreToolUse scripts | Replace stale context and harden safety | Dynamic repository-aware control |
| Evaluator agent | Add evidence/severity/verdict contract | Prevent self-approval |
| `scripts/check-claude-workflow.mjs` | Test the workflow in a temporary Git repo | Repeatable regression evidence |
| package/README/CI | Expose and enforce the contract | Local and merge-time gate |

### Data and migration impact

- Schema, backfill and runtime dependencies: none.
- Compatibility: current Claude Code with project settings, hooks and subagents.
- Rollback: revert documentation/tooling commits; application data is unaffected.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Settings rejected by installed Claude | Manual fresh-session and `/permissions` gate |
| Hook blocks safe work | Contract covers benign Read/Grep/Glob/Bash and feature-branch Edit |
| Hook misses common secrets | Contract covers `.env`, `secrets`, credentials and shell access |
| Test mutates checkout or production | It copies hooks into a temporary initialized repository |
| Workflow drifts later | CI runs the contract on every ready PR and `main` push |

### Verification plan

- `npm run check:knowledge`
- `npm run check:claude-workflow`
- deployment and CSS contracts
- lint, typecheck, unit/static-RLS and production build
- fresh Supabase reset + pgTAP
- expense browser smoke and responsive audit
- manual fresh Claude session, `/permissions`, visible deny reason and evaluator invocation

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Add workflow and preserve current orientation | Source diff | done |
| T2 | Add shared permissions and harden hooks | Contract + source review | done |
| T3 | Strengthen evaluator | Source review | done |
| T4 | Add repo-owned contract and package command | CI step `Claude Code operating contract` | done |
| T5 | Wire README, SessionStart and CI | CI run #416 | done |
| T6 | Run complete repository CI | Run `30336245441` | done |
| T7 | Verify installed Claude and run evaluator in a clean local context | Manual evidence | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Workflow, entrypoint and README | Actual diff | pass |
| Settings and hook syntax/behavior | `Claude Code operating contract` in CI #416 | pass |
| Knowledge/deployment/CSS contracts | CI #416 `verify` | pass |
| Lint, typecheck, unit/static-RLS, build | CI #416 `verify` | pass |
| Fresh local database and pgTAP | CI #416 `database` | pass |
| Expense smoke and responsive/WebKit audit | CI #416 `e2e` | pass |
| No product runtime changes | Changed-file scope | pass |
| Installed Claude UI behavior | Not available from GitHub/CI | no evidence |
| Clean-context evaluator verdict | Pending local invocation | no evidence |

### Review findings

- Correctness: all automated repository gates pass.
- Security/ownership: settings/hooks are covered by deterministic tests; no product data or RLS changes.
- UI/UX/accessibility: application baseline browser matrix remains green; no UI files changed.
- Maintainability: deterministic workflow rules now have a focused executable contract.
- Scope compliance: documentation, developer tooling and CI only.

### Remaining limitations

- CI cannot prove the owner's installed Claude Code renders `/permissions` and hook deny reasons as expected.
- The evaluator subagent must still be invoked from a fresh local Claude session before owner acceptance.

## Delivery record

- Branch: `agent/claude-code-operating-workflow`
- PR: #107
- Squash commit: pending
- CI run: #416 / `30336245441` — complete success
- Production deployment: not applicable to application runtime
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending merge and manual acceptance
