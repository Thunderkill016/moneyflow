# Claude Code operating workflow

**Status:** evaluating  
**Owner:** human owner + implementing agent  
**Issue/PR:** PR #97  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has one explicit, repository-native Claude Code operating workflow that separates planning, implementation, evaluation, automated evidence and human approval. Claude Code receives concise project context, safe default permissions, runtime safety hooks and an independent evaluator without gaining authority to redefine product requirements, edit on `main`, access secrets, merge or deploy production.

## Repository reconnaissance

### Current behavior

- Root `CLAUDE.md` imported only `AGENTS.md` and did not state Claude-specific role separation or completion rules.
- PR #97 registered existing `SessionStart` and `PreToolUse` hook scripts plus an evaluator subagent.
- The registered session hook still announced a "Grok VIP session", read `IDEA.md` and pointed to a stale runtime document instead of current MoneyFlow work packets.
- The safety hook blocked several destructive commands but described itself as a Grok hook, did not block writes on `main`, did not block merges/production deployment and did not inspect `Read` tool access.
- `.claude/settings.json` registered hooks but had no shared allow/deny permission policy.
- The repository had a general AI delivery workflow but no Claude Code-specific operating contract linking memory, permissions, hooks, task states, builder/evaluator separation and evidence.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `CLAUDE.md` | Automatically loaded Claude Code project entrypoint | Keep concise; point to authoritative workflow |
| `AGENTS.md` | Cross-agent product, architecture and verification rules | Reuse; do not duplicate its encyclopedia |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | General planner/builder/evaluator lifecycle | Reuse as parent process |
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Claude-specific operating contract | Add |
| `.claude/settings.json` | Shared project permissions and hook registration | Add safe allow/deny rules |
| `.claude/agents/evaluator.md` | Independent clean-context review role | Align with the operating contract |
| `scripts/hooks/session-start.sh` | Startup context injected into each Claude session | Replace Grok/IDEA context |
| `scripts/hooks/pre-tool-safety.sh` | Runtime hard safety boundary | Expand deterministic blocks |
| `README.md` | Human source-of-truth index | Link the new workflow |

### Existing tests and constraints

- Related unit tests: no runtime application behavior changes.
- Database/RLS tests: not applicable; no schema, policy or ownership changes.
- Browser tests: not applicable; no user-facing runtime UI changes.
- Product/architecture rules: do not change finance behavior, auth, RLS, runtime mode or deployment configuration.
- Repository checks: JSON syntax, shell syntax, hook payload simulations and `npm run check:knowledge` are required.

### Similar implementation and recent history

- Existing pattern to reuse: planner/builder/evaluator roles in `docs/engineering/AI_DELIVERY_WORKFLOW.md`.
- Relevant issue/PR/decision: PR #97 introduced hook registration and the first evaluator; this packet expands that same focused PR rather than creating a competing implementation.

### Open questions

- [ ] Confirm a fresh local Claude Code session accepts the permission schema and displays the new `SessionStart` output.
- [ ] Confirm fake `PreToolUse` payloads visibly deny force-push, writes on `main`, secret reads and production deployment while allowing benign reads/checks.

## Research

### Questions researched

1. How Claude Code project memory and `CLAUDE.md` imports are loaded.
2. How shared settings express permission `allow`, `deny` and `defaultMode` rules.
3. How `PreToolUse` hooks can deny a tool call before normal permission evaluation.
4. How plan mode and separate subagent contexts support planner/builder/evaluator separation.

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Anthropic Claude Code memory documentation | 2026-07-28 | Root `CLAUDE.md` is project memory and may import repository files | Product instructions still come from MoneyFlow sources |
| Anthropic Claude Code IAM/permissions documentation | 2026-07-28 | Shared settings support allow/deny rules, default modes and deny-over-allow precedence | Runtime hooks remain necessary for branch/path-sensitive policy |
| Anthropic Claude Code CLI reference | 2026-07-28 | `--permission-mode plan`, resume/continue and dangerous bypass flags | CLI options do not define MoneyFlow delivery policy |
| Anthropic Claude Code hook documentation | 2026-07-28 | `PreToolUse` can make runtime permission decisions | Hook shell patterns should enforce only deterministic safety rules |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Put the entire workflow in `CLAUDE.md` | Always loaded | Large stale context, duplicates repository truth | Rejected |
| Documentation only | Simple | No hard safety boundary; prompt compliance only | Rejected |
| Hooks only | Enforces deterministic blocks | Does not define roles, task states or evidence | Rejected |
| Separate new PR | Clean history | Duplicates/conflicts with existing PR #97 | Rejected |
| Extend PR #97 with docs, permissions, hooks and evaluator | One coherent Claude Code operating slice | Requires careful re-review of a larger PR | Selected |

### Research decision

Use a layered design: concise `CLAUDE.md` entrypoint, authoritative workflow document, shared settings for safe commands and static denies, hooks for branch/path/runtime-sensitive safety, and an evaluator subagent for independent evidence review. Keep human approval for requirements, merge and production deployment.

## Specification

### Problem

MoneyFlow has a strong general AI delivery process but Claude Code-specific controls are fragmented. The first hook registration still exposes stale Grok context, permissions are not documented or shared, and there is no single contract explaining task states, session separation and evidence. This makes Claude behavior dependent on chat prompts and increases the chance of scope drift, unsafe Git actions or self-approval.

### User stories

- As the MoneyFlow owner, I can start Claude Code and immediately see the current branch, dirty state, active work packets and safety expectations.
- As the MoneyFlow owner, I can allow routine read/check commands while deterministic destructive actions remain blocked.
- As an implementing agent, I can follow one authoritative lifecycle from reconnaissance through production verification.
- As a reviewer, I can invoke a clean-context evaluator that grades actual acceptance evidence without editing code.

### Acceptance criteria

- [ ] `CLAUDE.md` remains concise and points non-trivial work to the Claude Code workflow and active work packet.
- [ ] `docs/engineering/CLAUDE_CODE_WORKFLOW.md` defines context layers, roles, task classification, task states, permissions, hooks, verification and definition of done.
- [ ] `.claude/settings.json` is valid JSON and registers safe allow rules, destructive deny rules, `SessionStart` and `PreToolUse`.
- [ ] SessionStart contains no Grok/IDEA runtime language and reports branch, dirty paths, active packets, workflow and baseline gates.
- [ ] PreToolUse blocks secret access, edits on `main`, destructive Git history/worktree commands, autonomous merge/default-branch push, production deployment and remote Supabase mutation.
- [ ] PreToolUse allows benign reads and verification commands.
- [ ] The evaluator has no edit/write tools, checks actual diff and gates, ranks findings P0–P3 and returns only `Ready to merge` or `Not ready`.
- [ ] README lists the Claude Code workflow as a source of truth.
- [ ] No application runtime, financial, database, auth, RLS or deployment configuration behavior changes.

### Required states

- Loading: not applicable.
- Empty: SessionStart handles zero active work packets.
- Populated: SessionStart handles multiple active work packets and truncates the display safely.
- Validation/error: malformed or empty hook input is parsed as an empty event without failing the session.
- Recovery/undo: denied tool calls do not modify repository state; the human can create a branch or use an approved action.
- Long data / large VND: not applicable.
- Mobile/tablet/desktop: not applicable.
- Accessibility: terminal output remains plain text and concise.

### Financial and security constraints

- No financial calculations or transaction semantics change.
- Integer VND and transfer invariants remain intact.
- No schema, RLS or ownership behavior changes.
- Local environment files, credentials and production-changing commands remain human-controlled.

### Out of scope

- Installing or configuring Claude Code on the owner's machine.
- Creating MCP servers or external automation.
- Autonomous PR merge or production deployment.
- Replacing `AGENTS.md` or the general AI delivery workflow.
- Refactoring application code or changing product behavior.

## Implementation plan

### Architecture fit

`CLAUDE.md` remains the minimal Claude-specific entrypoint. General repository law stays in `AGENTS.md` and the AI delivery process. The new workflow owns Claude Code runtime/session conventions. Shared permissions provide static policy; hooks provide dynamic branch/path policy; the evaluator provides independent review.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | Add authoritative operating workflow | Make the process explicit and durable |
| `CLAUDE.md` | Add concise runtime contract | Ensure every Claude session sees role/safety rules |
| `.claude/settings.json` | Add permissions and extend hook matcher | Reduce prompts safely and protect dangerous calls |
| `scripts/hooks/session-start.sh` | Replace stale Grok context | Show actual MFVN operating state |
| `scripts/hooks/pre-tool-safety.sh` | Expand deterministic safety blocks | Enforce branch, secret, Git and production boundaries |
| `.claude/agents/evaluator.md` | Add evidence procedure and severity | Prevent implementing agent self-approval |
| `README.md` | Link workflow | Make it discoverable to humans and agents |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: requires a current Claude Code version supporting shared permissions, hooks and project subagents.
- Rollback: revert the documentation/settings/hook commits; no application data is affected.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Permission rule syntax is not accepted locally | Validate with fresh Claude Code session and `/permissions` |
| Hook blocks a legitimate safe action | Simulate benign Read/Bash events and keep rules limited to deterministic risks |
| Hook fails open on malformed JSON | Parser returns empty values and exits successfully |
| Hook fails to protect a secret path alias | Test `.env.local`, `.env.production` and `/secrets/` variants |
| Main-branch protection blocks planning | Only Edit/Write and history mutation are denied; read/check commands remain available |
| Workflow duplicates `AGENTS.md` | Keep `CLAUDE.md` concise and reference existing authorities |

### Verification plan

- Static: `python3 -m json.tool .claude/settings.json`; `bash -n scripts/hooks/session-start.sh scripts/hooks/pre-tool-safety.sh`; `npm run check:knowledge`.
- Unit/domain: not applicable.
- Database: not applicable.
- Browser flow: not applicable.
- Responsive/visual: not applicable.
- Production/manual: open a fresh Claude Code session, inspect `/permissions`, verify SessionStart output and simulate denied/allowed tool calls.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add authoritative Claude Code workflow | none | New engineering document | done |
| T2 | Align `CLAUDE.md` and README discovery | T1 | Concise entrypoint and source link | implementing |
| T3 | Add shared permission policy | T1 | Valid settings JSON | done |
| T4 | Replace Grok SessionStart context | T1 | Shell source and manual startup output | done; manual evidence pending |
| T5 | Harden PreToolUse safety | T3 | Shell simulations for deny/allow cases | done; local evidence pending |
| T6 | Align independent evaluator | T1 | Evaluator source review | done |
| T7 | Run local checks and manual Claude verification | T2–T6 | Command output and session evidence | todo |
| T8 | Independent evaluation and PR update | T7 | Evaluator verdict and PR evidence | todo |

Rules:

- One task should produce a reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Concise Claude entrypoint | `CLAUDE.md` source | pass by source inspection |
| Authoritative workflow | `docs/engineering/CLAUDE_CODE_WORKFLOW.md` | pass by source inspection |
| Valid settings and hooks | Local JSON/shell validation not yet run | no evidence |
| Claude-specific SessionStart | `scripts/hooks/session-start.sh` source | pass by source inspection; manual output pending |
| Dangerous actions denied | `scripts/hooks/pre-tool-safety.sh` source | no runtime evidence yet |
| Benign actions allowed | Hook exits 0 when no deny pattern matches | no runtime evidence yet |
| Evaluator independent | `.claude/agents/evaluator.md` has read/search/bash tools only | pass by source inspection |
| README discovery | Pending T2 | no evidence |
| No runtime product behavior change | Planned diff is docs and Claude tooling only | pass by scope inspection |

### Review findings

- Correctness: local JSON, shell and hook simulations remain required.
- Security/ownership: source policy is stricter than before; false-positive/false-negative behavior requires local simulation.
- UI/UX/accessibility: not applicable.
- Maintainability/duplication: the workflow references parent authorities rather than importing their full content.
- Scope compliance: changes remain limited to documentation and Claude Code tooling.

### Remaining limitations

- GitHub connector edits cannot run the repository locally.
- The owner must validate current installed Claude Code compatibility and visible hook behavior.
- CI is currently affected by the separate account-level Actions issue and is not evidence for this packet until jobs execute real steps.

## Delivery record

- Branch: `chore/claude-code-hooks-and-evaluator`
- PR: #97
- Squash commit: pending
- CI run: pending
- Production deployment: not applicable to application runtime; repository merge still pending
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: pending
