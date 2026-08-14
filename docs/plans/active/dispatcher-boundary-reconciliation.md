# Dispatcher boundary reconciliation

**Status:** active delivery
**Execution state:** evaluating
**Change class:** Class 3 — local agent/Git/GitHub execution boundary
**Permission scope:** branch_write only
**Owner:** Thunderkill016
**Source:** issue #379, stale draft PR #380, current-main reconciliation
**PR:** #384
**Base:** `main@755956f4302df6482b439720c1645efe13673166`

## Outcome

Resolve the known P1 safety/correctness defects in the merged owner-opt-in local Codex dispatcher without reviving stale PR #380 or changing MoneyFlow product/runtime/provider behavior.

## Current evidence

Current `main` inherited four reviewed defects from #377:

1. unrelated issue/PR body edits could re-dispatch an unchanged body marker;
2. ambiguous Markdown examples could execute;
3. `main` could move between cycle validation and worktree creation;
4. the auto-approved Codex child retained ordinary Git/GitHub mutation paths without a process-level command policy.

Only the applicable code/test delta from #380 was transplanted onto current main. Its stale lifecycle files were not copied.

## Research decision

Current OpenAI safety guidance treats sandboxing and approvals/rules as complementary technical controls: routine actions belong inside bounded execution, while higher-risk actions should be blocked or reviewed. This task therefore uses a process-level Git/GitHub command allowlist as **defense in depth**, not as a substitute for Codex's OS sandbox, repository protection or owner-scoped credentials.

The guard is not claimed to defend against a hostile process that deliberately executes an absolute binary path outside the inherited `PATH` wrapper. That residual limitation is explicit.

## Acceptance criteria

- **DBR-AC1** unrelated body prose edits preserve command identity; explicit marker-note changes remain new commands;
- **DBR-AC2** fenced, blockquoted and prose examples are ignored;
- **DBR-AC3** exact local/remote `main` is revalidated immediately before worktree creation and the fresh SHA is used;
- **DBR-AC4** Codex receives a guard-first `PATH` and no documented GitHub token environment variables;
- **DBR-AC5** direct main/merge/rebase/pull/force-push, inline Git aliases, unknown Git aliases, PR merge, repo sync, unknown `gh` aliases and GraphQL mutation paths are rejected by the wrapper;
- **DBR-AC6** guarded environment reaches the actual child process and large local Codex output does not fail from Node's default buffer;
- **DBR-AC7** no product, financial, database, Auth, provider, production or branch-protection behavior changes;
- **DBR-AC8** dispatcher safety tests are part of the repository CI policy suite and exact-head policy/static/unit/build/security gates pass before merge.

## Self-review finding and remediation

The first transplanted guard still allowed a Git CLI alias escape such as:

`git -c alias.ship='!git push origin HEAD:main' ship`

That was material because it stayed inside the ordinary `git` executable path and therefore was not covered by the documented absolute-binary residual limitation.

Remediation on #384:

- Git commands now use an explicit operation allowlist;
- inline `alias.*` config is rejected;
- unknown operations/aliases are rejected;
- GitHub CLI uses a top-level allowlist;
- `gh alias`, `repo sync` and GraphQL API paths are rejected;
- dedicated regressions cover these escape hatches;
- `test:agent-dispatcher` now runs both dispatcher and command-guard tests;
- `test:ci-policy` includes the dispatcher safety suites so provider CI cannot accept this boundary without executing them.

## Verification interpretation

The first PR workflow run occurred while #384 was draft. The classifier correctly selected `fullVerify=true`, but the workflow intentionally skips verification shards for draft pull requests. That run is **not acceptance evidence**.

The next valid evidence must come from a ready-for-review exact head where:

- `Verify policy contracts` executes the dispatcher safety suite;
- full static/unit/build verification runs;
- CodeQL and secret-history complete on the same head;
- review submissions/threads and base movement are rechecked.

## Control contract

### State

- Owner: local dispatcher state under ignored `.agent-dispatcher/`.
- Code owner: `scripts/agent-dispatcher/`.
- No provider or production state is written by this task.

### Feedback

- Historical red signal: four P1 findings from exact-head review of #377.
- Current regression signal: focused tests for identity, Markdown, fresh-base, env propagation, output buffering and command-policy bypasses.
- Deterministic success signal: ready-for-review exact-head CI + CodeQL + secret-history.
- Semantic evidence: diff review plus explicit residual limitation.

### Removal impact

Removing this hardening restores reviewed redispatch/Markdown/TOCTOU/command-boundary defects. Rollback is a focused revert; no external state needs unwinding.

### Action safety

- Allowed: branch code/tests/docs and read-only GitHub evidence selected by policy.
- Forbidden: direct main write, force push, provider/production/database/Auth mutation, branch-protection/ruleset change.
- Merge only after exact-head evidence is complete and clean.

## Tasks

| ID | Covers | Task | Evidence | Status |
|---|---|---|---|---|
| DBR-T1 | DBR-AC1–6 | current-main dispatcher hardening | implementation + focused regressions | complete |
| DBR-T2 | DBR-AC5–8 | close self-review alias/CI-coverage findings | allowlists + command-guard tests + CI-policy script | complete |
| DBR-T3 | DBR-AC7–8 | exact-head provider verification and fresh review | ready PR workflow runs | pending |
| DBR-T4 | internal: lifecycle | merge/retire only after clean evidence | expected-head merge + closeout | pending |

## Handoff

Next allowed action: mark PR #384 ready for review, require exact-head full verification/security workflows, resolve any material finding, then perform final base/head/review/thread checks before merge.