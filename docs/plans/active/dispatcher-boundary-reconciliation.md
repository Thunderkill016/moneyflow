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

## Repository reconnaissance

### Current behavior

Current `main` inherited four reviewed defects from #377:

1. unrelated issue/PR body edits could re-dispatch an unchanged body marker;
2. ambiguous Markdown examples could execute;
3. `main` could move between cycle validation and worktree creation;
4. the auto-approved Codex child retained ordinary Git/GitHub mutation paths without a process-level command policy.

PR #380 contains a useful remediation prototype but is stale against current main and current lifecycle authority. Only its applicable implementation/test delta is reused; its old packet/registry state is not copied.

### Relevant areas

- `scripts/agent-dispatcher/dispatcher.mjs` — command discovery, identity, prerequisites, worktree creation and Codex launch.
- `scripts/agent-dispatcher/command-guard.mjs` — child-process Git/GitHub command policy.
- `scripts/agent-dispatcher/*.test.mjs` — deterministic safety regressions.
- `package.json` — CI-policy test composition.
- `docs/plans/active/README.md` — current execution authority.

### Existing constraints

- No MoneyFlow product/runtime, financial, database/RLS, Auth or provider semantics are changed.
- No branch protection/ruleset or production write is authorized.
- The dispatcher remains owner-opt-in and local-only.
- A wrapper placed on `PATH` is defense in depth, not an OS sandbox.

## Research

Current OpenAI safety guidance treats sandboxing and approvals/rules as complementary controls: routine work should happen inside bounded execution, while higher-risk actions should be blocked or reviewed. MoneyFlow therefore keeps Codex's sandbox as the primary execution boundary and adds a conservative Git/GitHub command allowlist as a local secondary control.

The guard is not claimed to defend against a hostile process deliberately executing an absolute binary path outside the inherited `PATH`. Repository protection and owner-scoped credentials remain independent safeguards.

### Adoption review

No external library, provider or service is adopted. This change uses Node built-ins and the existing local Codex/Git/GitHub CLI boundary.

## Specification

### Problem

The merged dispatcher can repeat an old command after unrelated prose edits, treat documentation examples as executable requests, start later commands from stale `main`, and give the Codex child ordinary authenticated Git/GitHub command paths that the prompt merely asks it not to use.

### Acceptance criteria

- **DBR-AC1** unrelated body prose edits preserve command identity; explicit marker-note changes remain new commands;
- **DBR-AC2** fenced, blockquoted and prose examples are ignored;
- **DBR-AC3** exact local/remote `main` is revalidated immediately before worktree creation and the fresh SHA is used;
- **DBR-AC4** Codex receives a guard-first `PATH` and no documented GitHub token environment variables;
- **DBR-AC5** direct main/merge/rebase/pull/force-push, inline Git aliases, unknown Git aliases, PR merge, repo sync, unknown `gh` aliases and GraphQL mutation paths are rejected by the wrapper;
- **DBR-AC6** guarded environment reaches the actual child process and large local Codex output does not fail from Node's default buffer;
- **DBR-AC7** no product, financial, database, Auth, provider, production or branch-protection behavior changes;
- **DBR-AC8** dispatcher safety tests are part of the repository CI policy suite and exact-head policy/static/unit/build/security gates pass before merge.

### Required states

- Safe owner command: processed once in an isolated non-main worktree.
- Duplicate command: suppressed after restart/body prose edit.
- Ambiguous Markdown: ignored.
- Main movement: fresh SHA used before worktree creation or dispatch fails closed.
- Forbidden Git/GitHub action: wrapper exits non-zero before the real command is executed.
- Unsupported/unknown command path: fails closed.

### Security constraints

- No provider or production credentials are added.
- Documented GitHub token environment variables are stripped from the child environment.
- Existing owner Git/GitHub authentication is not represented as removed; the wrapper constrains ordinary CLI paths only.
- Absolute executable-path bypass remains a named residual limitation of this local defense-in-depth layer.

### Out of scope

Product features, UI, financial semantics, database/RLS, Auth, provider configuration, production data, CI workflow topology, branch rulesets and a hostile-process sandbox redesign.

## Implementation plan

1. Transplant only the applicable dispatcher source/tests from stale #380 onto current main.
2. Stabilize body command identity and require an unambiguous top-level marker.
3. Revalidate exact main immediately before each worktree.
4. Build a guard-first environment and strip token variables.
5. Restrict ordinary Git/GitHub CLI operations using allowlists and targeted forbidden-path rules.
6. Add regressions for env propagation, output buffering and command-policy escape hatches.
7. Wire dispatcher safety suites into `test:ci-policy` so provider CI must execute them.
8. Run ready-for-review exact-head policy/static/unit/build/CodeQL/secret-history gates.
9. Merge only after fresh review and final base/head/thread recheck; then retire this packet and close #379/#380.

### Data/migration impact

None. Rollback is a focused code/test/docs revert; no external state must be unwound.

### Risks and counterexamples

| Risk | Control/evidence |
|---|---|
| prose edit replays command | stable body key + deterministic regression |
| Markdown example executes | top-level marker parser regression |
| stale base | per-command fresh-main validation regression |
| `git -c alias.*` bypass | inline-alias rejection + operation allowlist regression |
| pre-existing/unknown CLI alias | unknown Git/GitHub operations fail closed |
| GraphQL merge/update path | GraphQL API blocked from dispatcher lane |
| wrapper mistaken for sandbox | explicit residual limitation + primary Codex sandbox remains separate |
| tests exist but CI skips them | dispatcher suites included in `test:ci-policy` |

## Tasks

| ID | Covers | Task | Evidence | Status |
|---|---|---|---|---|
| DBR-T1 | DBR-AC1–6 | current-main dispatcher hardening | implementation + focused regressions | complete |
| DBR-T2 | DBR-AC5–8 | close self-review alias/CI-coverage findings | allowlists + guard tests + CI-policy script | complete |
| DBR-T3 | DBR-AC7–8 | exact-head verification and fresh review | ready PR workflow runs | in progress |
| DBR-T4 | lifecycle | merge/retire only after clean evidence | expected-head merge + closeout | pending |

## Handoff record

| Date | From | To | State | Evidence | Open boundary | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-15 | reconciliation | implementer | implementing | current-main review of #377/#380 | four P1 defects live on main | fresh current-main remediation only |
| 2026-08-15 | implementer | evaluator | evaluating | #384 implementation + regressions | initial guard alias bypass and CI test coverage | repair before ready |
| 2026-08-15 | evaluator | provider CI + reviewer | evaluating | allowlists, alias/GraphQL regressions, dispatcher tests wired into CI policy | exact-head gates/review pending | ready-for-review full verification |

## Evaluation

### Findings

**P1 — first transplanted guard allowed inline Git alias bypass — RESOLVED.**

Example: `git -c alias.ship='!git push origin HEAD:main' ship` stayed inside the ordinary `git` path but escaped the original operation parser. The fix adds explicit Git/GitHub operation allowlists, rejects inline aliases/unknown operations, blocks repo sync/GraphQL paths and adds dedicated regressions.

**P1 — dispatcher safety tests were not part of provider CI — RESOLVED.**

`npm test` covers `src/lib` only and `test:ci-policy` previously omitted dispatcher tests. `test:agent-dispatcher` now includes both dispatcher and command-guard suites, and `test:ci-policy` includes both files.

**Draft-run interpretation — NOT EVIDENCE.**

The first #384 workflow correctly classified `fullVerify=true`, but verification jobs are intentionally skipped while a PR is draft. No draft “green” is counted as acceptance.

### Current verdict

`EVALUATING — exact-head ready-for-review gates and independent review pending.`

### Required final evidence

- `Verify policy contracts` must execute and pass the dispatcher safety suites;
- full static/unit/build shards must pass when selected;
- CodeQL and secret-history must pass on the same head;
- no material reviewer finding or unresolved thread may remain;
- main/base/head must be rechecked immediately before expected-head merge.

## Handoff

Next allowed action: fix the current project-knowledge contract failure, allow the new exact head to run full verification/security review, resolve any material finding, then perform final merge checks.