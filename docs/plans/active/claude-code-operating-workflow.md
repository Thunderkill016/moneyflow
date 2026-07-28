# Claude Code operating workflow

**Status:** evaluating  
**Owner:** human owner + implementing agent  
**Issue/PR:** pending  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has one explicit, repository-native Claude Code operating workflow that separates planning, implementation, evaluation, automated evidence and human approval. Claude Code receives concise project context, safe shared permissions, runtime safety hooks and an independent evaluator without gaining authority to redefine product requirements, edit on `main`, access secrets, merge or deploy production.

## Repository reconnaissance

### Current behavior

- `CLAUDE.md` already provides current project orientation and imports `AGENTS.md`.
- `.claude/settings.json` registers `SessionStart` and `PreToolUse`, but has no shared allow/deny permission policy and does not run the safety hook for `Read`.
- `scripts/hooks/session-start.sh` still reads `IDEA.md` instead of reporting current branch and active work packets.
- `scripts/hooks/pre-tool-safety.sh` blocks a few destructive commands but does not enforce branch-sensitive edits, autonomous merge/default-branch push or production deployment boundaries.
- `.claude/agents/evaluator.md` defines a basic independent reviewer but does not rank findings, distinguish missing evidence or provide a complete output contract.
- The repository has a general AI delivery workflow but no Claude Code-specific contract linking memory, permissions, hooks, task states and session-role separation.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `CLAUDE.md` | Automatically loaded Claude Code entrypoint | Keep current facts; add concise role/workflow guidance |
| `AGENTS.md` | Cross-agent product, architecture and verification rules | Reuse; do not duplicate |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | General planner/builder/evaluator lifecycle | Reuse as parent process |
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Claude-specific operating contract | Add |
| `.claude/settings.json` | Shared permissions and hook registration | Add safe allow/deny policy |
| `.claude/agents/evaluator.md` | Independent clean-context review role | Strengthen evidence contract |
| `scripts/hooks/session-start.sh` | Startup context | Replace stale `IDEA.md` state |
| `scripts/hooks/pre-tool-safety.sh` | Runtime hard safety boundary | Expand deterministic blocks |
| `README.md` | Source-of-truth index | Link new workflow |

### Existing tests and constraints

- No application runtime, financial calculation, database, auth, RLS or deployment configuration behavior changes.
- Required checks: JSON syntax, shell syntax, hook payload simulations and `npm run check:knowledge`.
- Manual check: start a fresh local Claude Code session and inspect the startup banner and `/permissions`.

### Similar implementation and recent history

- The planner/builder/evaluator roles already exist in `docs/engineering/AI_DELIVERY_WORKFLOW.md`.
- Closed PR #97 introduced the initial hook registration and evaluator. Its useful baseline is already on `main`; this packet evolves the current repository rather than reviving the stale branch.

### Open questions

- [ ] Confirm the installed Claude Code version accepts the shared permission schema.
- [ ] Confirm fake `PreToolUse` payloads visibly deny dangerous calls and allow benign calls.

## Research

### Questions researched

1. How Claude Code project memory and `CLAUDE.md` imports work.
2. How shared settings express permission allow/deny/default-mode rules.
3. How `PreToolUse` hooks can deny a call before normal permission evaluation.
4. How plan mode and clean subagent contexts support role separation.

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
| Revive closed PR #97 branch | Reuses branch | Diverged from current `main` and overwrites newer orientation | Rejected |
| New branch from current `main` | Clean review and current facts | Requires new PR | Selected |

### Research decision

Use a layered design: concise `CLAUDE.md`, authoritative workflow document, shared settings for safe commands/static denies, hooks for branch/path/runtime-sensitive policy, and a clean-context evaluator. Human approval remains required for requirements, merge and production changes.

## Specification

### Problem

Claude Code controls are fragmented across project memory, general AI workflow, settings, hooks and evaluator prose. The startup context is stale, shared permissions are absent and completion/evidence rules are not gathered in one Claude-specific contract. This increases scope drift, repetitive prompts, unsafe Git actions and self-approval risk.

### User stories

- As the owner, I can start Claude Code and see the branch, dirty state, active work packets and safety expectations.
- As the owner, I can allow routine read/check commands while deterministic destructive actions remain blocked.
- As a builder, I can follow one lifecycle from reconnaissance through delivery.
- As a reviewer, I can invoke an evaluator that grades actual evidence without editing code.

### Acceptance criteria

- [ ] `CLAUDE.md` preserves current project facts and points non-trivial work to the Claude workflow and active packet.
- [ ] `docs/engineering/CLAUDE_CODE_WORKFLOW.md` defines context layers, roles, classification, task states, permissions, hooks, verification and done criteria.
- [ ] `.claude/settings.json` is valid JSON with safe allows, destructive denies, `SessionStart` and `PreToolUse` for Bash/Edit/Write/Read.
- [ ] SessionStart reports branch, dirty paths, active packets, workflow and baseline gates; it no longer reads `IDEA.md`.
- [ ] PreToolUse blocks secret access, edits/history mutation on `main`, destructive Git commands, autonomous merge/default-branch push and production/remote Supabase changes.
- [ ] PreToolUse allows benign reads and verification commands.
- [ ] Evaluator has no edit/write tools, checks actual evidence, ranks P0–P3 and returns `Ready to merge` or `Not ready`.
- [ ] README links the Claude workflow.
- [ ] No product runtime behavior changes.

### Required states

- Loading: not applicable.
- Empty: SessionStart handles zero active packets.
- Populated: SessionStart handles multiple packets and limits output.
- Validation/error: malformed/empty hook input does not crash the session.
- Recovery/undo: denied calls do not modify state; the user can create a branch or perform an approved action.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: terminal output is plain text and concise.

### Financial and security constraints

- No financial, ledger, schema, RLS, auth or runtime-mode changes.
- VND and transfer invariants remain untouched.
- Local environment files, credentials and production-changing operations remain human-controlled.

### Out of scope

- Installing Claude Code locally.
- MCP or third-party agent infrastructure.
- Autonomous merge/deploy.
- Replacing `AGENTS.md` or the general AI workflow.
- Application refactoring or product changes.

## Implementation plan

### Architecture fit

`CLAUDE.md` remains the minimal session entrypoint. `AGENTS.md` and the AI delivery workflow remain parent authorities. The new document owns Claude-specific session conventions. Settings provide static policy; hooks provide dynamic branch/path policy; evaluator provides independent review.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Add operating workflow | Durable process contract |
| `CLAUDE.md` | Add workflow pointer and roles | Session-visible guidance without losing current facts |
| `.claude/settings.json` | Add permissions and Read hook | Safe automation and secret protection |
| `scripts/hooks/session-start.sh` | Report real repository state | Remove stale queue context |
| `scripts/hooks/pre-tool-safety.sh` | Expand safety decisions | Protect Git, secrets and production |
| `.claude/agents/evaluator.md` | Add procedure/severity/output | Prevent self-approval |
| `README.md` | Link workflow | Human/agent discovery |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: requires a current Claude Code version with permissions, hooks and project subagents.
- Rollback: revert documentation/settings/hook commits; no application data is affected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Permission schema rejected locally | JSON validation plus fresh session and `/permissions` |
| Hook blocks a safe action | Benign Read/Bash simulations |
| Hook misses secret aliases | Test `.env.local`, `.env.production` and `/secrets/` |
| Planning on `main` becomes impossible | Read/check commands remain allowed; only mutations denied |
| Documentation duplicates current orientation | Preserve current `CLAUDE.md` facts and link parent sources |

### Verification plan

- Static: `python3 -m json.tool .claude/settings.json`; `bash -n scripts/hooks/session-start.sh scripts/hooks/pre-tool-safety.sh`; `npm run check:knowledge`.
- Hook simulations: benign Read, force-push, Edit on `main`, secret Read and production deploy.
- Domain/database/browser: not applicable.
- Manual: fresh Claude Code session, startup output and `/permissions` inspection.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add authoritative workflow | none | Engineering document | done |
| T2 | Align `CLAUDE.md` and README | T1 | Source diff | done |
| T3 | Add shared permission policy | T1 | JSON validation | implemented; verification pending |
| T4 | Replace SessionStart state | T1 | Shell syntax/startup output | implemented; verification pending |
| T5 | Harden PreToolUse | T3 | Deny/allow simulations | implemented; verification pending |
| T6 | Strengthen evaluator | T1 | Source diff | done |
| T7 | Run checks and manual session test | T2–T6 | Command output | todo |
| T8 | Independent evaluation and PR review | T7 | Evaluator verdict | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Current orientation preserved | `CLAUDE.md` diff | pass by source inspection |
| Workflow defined | `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | pass by source inspection |
| Settings valid | Pending local/CI command | no evidence |
| SessionStart behavior | Source inspection; manual output pending | no evidence |
| Dangerous actions denied | Source inspection; simulations pending | no evidence |
| Benign calls allowed | Simulations pending | no evidence |
| Evaluator independent | Read/search/bash tools only; output contract present | pass by source inspection |
| README discovery | README diff | pass by source inspection |
| No runtime behavior change | Diff scope | pass by source inspection |

### Review findings

- Correctness: JSON, shell and hook simulations remain required.
- Security/ownership: source policy is stricter; runtime behavior must be verified.
- UI/UX/accessibility: not applicable.
- Maintainability: workflow references existing authorities rather than copying them wholesale.
- Scope compliance: documentation and Claude tooling only.

### Remaining limitations

- Connector edits do not prove local Claude Code compatibility.
- Manual startup and permission UI evidence must be supplied before merge.

## Delivery record

- Branch: `agent/claude-code-operating-workflow`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable to product runtime
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
