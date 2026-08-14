# Dispatcher boundary reconciliation

**Status:** active delivery
**Execution state:** implementing
**Change class:** Class 3 — local agent/Git/GitHub execution boundary
**Permission scope:** branch_write only
**Owner:** Thunderkill016
**Source:** issue #379, stale draft PR #380, current-main reconciliation
**Base:** `main@755956f4302df6482b439720c1645efe13673166`

## Outcome

Resolve the four known P1 safety/correctness defects in the merged owner-opt-in local Codex dispatcher without reviving the stale #380 lifecycle branch or changing MoneyFlow product/runtime/provider behavior.

## Current evidence

Current `main` still contains the vulnerable #377 implementation:

1. body command identity hashes the whole body, so unrelated prose edits can re-dispatch;
2. the first `/agent` line anywhere can execute, including ambiguous Markdown examples;
3. `main` is validated once and its SHA can become stale before later worktree creation;
4. Codex launches with automatic approval while inherited Git/GitHub access is not constrained by a command policy.

PR #380 contains focused remediation and deterministic tests, but its base and lifecycle docs are stale. Only the still-applicable implementation/test delta may be adopted onto current `main`.

## Research decision

Current OpenAI safety guidance treats sandboxing and approvals as complementary technical controls and recommends constraining higher-risk actions rather than relying on agent intent. MoneyFlow will keep the existing compatible Codex invocation for this bounded reconciliation and add a process-level Git/GitHub command guard as defense in depth.

The guard is **not** claimed to be an OS sandbox or a hostile-process boundary. An absolute-binary/path bypass remains residual risk. Repository protection, exact-head review and owner-scoped credentials remain independent controls.

## Acceptance criteria

- **DBR-AC1** unrelated body prose edits do not create a new command identity; an explicit marker-note change does;
- **DBR-AC2** fenced, blockquoted and prose examples are ignored;
- **DBR-AC3** exact local/remote `main` is revalidated immediately before each worktree and the fresh SHA is used;
- **DBR-AC4** launched Codex receives a guard-first `PATH`; GitHub token environment variables are removed;
- **DBR-AC5** ordinary `git` main/merge/rebase/pull/force-push and `gh pr merge` / merge-main-ref API paths are blocked;
- **DBR-AC6** the guarded environment reaches the actual child process and large local Codex output does not fail from Node's default buffer;
- **DBR-AC7** no product, financial, database, Auth, provider, production, workflow or branch-protection behavior changes;
- **DBR-AC8** current exact-head policy/static/unit/build/security gates selected by the repository pass before merge.

## Implementation plan

1. Reuse only `scripts/agent-dispatcher/command-guard.mjs`, the dispatcher hardening and its focused tests from #380.
2. Do not copy #380's stale active-packet/registry/memory state.
3. Run exact-head current-main CI and protected security workflows.
4. Evaluate the diff and explicitly record the residual absolute-path bypass limitation.
5. Merge only if exact-head evidence is clean; then retire this packet in lifecycle closeout and close #379/#380.

## Control contract

### State

- Owner: local dispatcher state under ignored `.agent-dispatcher/`.
- Code owner: `scripts/agent-dispatcher/`.
- No provider or production state is written by this task.

### Feedback

- Expected failing signal: focused regressions for all four historical P1 defects.
- Deterministic success signal: dispatcher focused suite plus repository-selected exact-head gates.
- Semantic evidence: diff review proves no product/runtime/provider scope leak and records residual guard limitations.

### Removal impact

Removing the hardening would restore the reviewed redispatch/Markdown/TOCTOU/credential-boundary defects. Rollback of this task is a focused revert; no external state needs unwinding.

### Action safety

- Allowed: branch code/tests/docs and read-only GitHub/provider evidence selected by policy.
- Forbidden: direct main write, force push, merge until gates pass, provider/production/database/Auth mutation, protection/ruleset changes.
- Stop if current CLI compatibility requires a broader dispatcher redesign rather than this bounded hardening.

## Tasks

| ID | Covers | Task | Evidence | Status |
|---|---|---|---|---|
| DBR-T1 | DBR-AC1–6 | transplant applicable #380 hardening onto current main | focused diff/tests | implementing |
| DBR-T2 | DBR-AC7 | scope/evidence review | changed-file audit | pending |
| DBR-T3 | DBR-AC8 | exact-head verification and security checks | GitHub workflow runs | pending |
| DBR-T4 | internal: lifecycle | merge/retire only after clean evidence | exact-head merge + closeout | pending |

## Handoff

Current next action: apply only the three still-applicable dispatcher code/test files from #380 onto this branch, then use current-main CI to decide whether the old remediation remains valid.