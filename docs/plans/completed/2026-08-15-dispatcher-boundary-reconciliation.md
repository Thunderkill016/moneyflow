# Completed — dispatcher boundary reconciliation

**Status:** accepted/completed
**Merged PR:** #384
**Merge commit:** `91fdab2df7713aa5f31fd4eb9322cb67cbf5d205`
**Final reviewed head:** `97f6cb173a5a3170aee084b0e5bd13d6ccee2728`
**Change class:** Class 3 local agent/Git/GitHub execution boundary

## Outcome

The owner-opt-in local Codex dispatcher is hardened against the four live P1 findings inherited from #377 without changing MoneyFlow product/runtime/provider behavior.

Delivered controls include:
- stable body-command identity across unrelated prose edits;
- fenced/quoted/prose command examples ignored;
- exact `main` revalidation immediately before isolated worktree creation;
- guard-first child PATH and GitHub token-variable stripping;
- explicit Git/GitHub operation/subcommand allowlists;
- Git push limited to `origin HEAD` from an unambiguous non-main branch;
- draft PR creation bound to the current isolated branch and main base;
- fixed literal executable dispatch for `git`, `gh`, `codex` and `node`;
- dispatcher/guard regressions included in `test:ci-policy`.

## Evaluation

Material findings discovered and fixed during delivery included inline Git alias escape, over-broad GitHub mutation surface, broad push/PR scope, original-PATH escape exposure and missing provider execution of dispatcher tests.

A protected merge attempt on intermediate head `1a5c7ad1…` was correctly blocked by the repository ruleset because CodeQL reported one new medium alert: `js/shell-command-injection-from-environment` at generic `spawnSync(command, args, ...)`. The production helper was changed to literal executable dispatch, the transport tests were rewritten to fixed `node` probes, and the final CodeQL analysis reported **no new alerts / annotations_count 0**.

Final head evidence:
- CI #2456 — PASS;
- policy suite — 148/148 PASS, including dispatcher/guard regressions;
- static/type/lint — PASS;
- unit/static-RLS — PASS;
- production build — PASS;
- browser expense/CAPTCHA — PASS;
- authenticated ownership browser smoke — PASS;
- stable `verify` and `e2e` aggregators — PASS;
- CodeQL #1534 — PASS, 0 new alerts;
- Secret history #1534 — PASS;
- unresolved review threads — 0;
- `main` remained at reviewed base before merge;
- squash merge used expected-head protection and passed the active ruleset.

Independent Copilot review was requested repeatedly but no review submission was returned. This absence is not relabeled as independent approval. The provider ruleset required zero approving reviews while strictly enforcing required checks, thread resolution, code scanning and squash-only history.

## Residual limitation

The process-level PATH command guard is defense in depth, not an OS or hostile-process sandbox. A deliberately hostile child may attempt lower-level/absolute executable paths outside this wrapper. Codex sandboxing, repository protection, exact-head CI/code scanning and owner-scoped credentials remain independent controls.

## Rollback

Revert merge commit `91fdab2df7713aa5f31fd4eb9322cb67cbf5d205`. No provider/production/database/Auth state was changed by this task.

## Follow-up

Close issue #379 and stale PR #380 as superseded/completed by #384. Open-work reconciliation then proceeds only to the `js-yaml` 4.3.1 security backport before Release Readiness Audit v1 becomes current work.
