# #443 — Fail-closed plan authority resolution

**Status:** completed on merge of PR #444
**Change class:** Class 3 — repository governance / agent task-selection contract
**Parent:** repository delivery governance; protects the current master program and any later replacement
**Issue / PR:** #443 / #444
**Base:** `main@6123d263c60fba98bd67b5c935a7179477ad7fcb`
**Owner:** human owner

## Outcome

MoneyFlow no longer asks an agent to infer the latest plan from filenames, dates, chat memory or whichever board entry looks plausible. Task selection is fail-closed around a machine-readable master/supersession graph, the active packet registry, Current Work freshness and Git first-parent provenance.

The post-#441 defect that triggered this work was real: `main` had already merged #441 while Current Work still pinned the pre-#441 baseline and still named #440 as `NOW`.

## Durable design

- `docs/plans/PLAN_AUTHORITY.json` names one master plan, its introducing PR and explicit predecessor plan history.
- The active registry independently identifies the same master and at most one current agent-executable slice.
- `scripts/plan-authority.mjs` validates graph/registry/file/history consistency and board freshness.
- `scripts/plan-selection.mjs` is stricter than validation: only a merged `active` master may authorize task selection.
- A future master replacement may validate as `candidate` in its own PR, but `plan:resolve` and the standard doctor remain NOT READY until merged first-parent history proves that PR.
- A lifecycle PR may carry an explicit post-merge board projection. Any projection remains validation-only until `plan-authority` proves `baselineMode=post-merge-projection` from the exact merged commit, so the block also holds in local checkouts where no GitHub PR event exists. After squash merge the projection is accepted only when the exact merge commit carries the same PR number and is the latest commit touching the board.
- An already-started lifecycle-reconciliation PR may finish acceptance defects/evaluation inside its recorded scope while its projection blocks new task selection; it cannot use projected `NOW`/`NEXT` to begin follow-on work.
- `agent:doctor -- --json` exposes resolved master/current/chain/history and makes readiness depend on selection-ready authority.
- Authority/selection policy files select the full policy gate set.

## Current authority encoded at completion

- Active master: `docs/plans/active/432-vietnam-long-term-product-strategy.md`.
- Installed by merged PR #433 (`a35d6f96…`).
- Superseded predecessor: `docs/plans/PRODUCT_DEVELOPMENT_PLAN.md` from #420.
- Open/conflicting PR #431 remains candidate evidence and never becomes authority by recency alone.
- No agent-executable child is auto-promoted by this closeout; #442 remains a NEXT candidate that must be re-read/rebased from fresh `main` before promotion.

## Research

Official Git `git log` documentation supports `--first-parent` for integration-branch evolution and `--follow` for single-path rename history. GitHub merge documentation establishes squash-merge behavior. MoneyFlow's actual #433 merge subject contains `(#433)`, providing repository-specific provenance evidence.

These sources verify history mechanics only; owner decisions plus repository authority artifacts still decide what is current.

## Adversarial findings fixed during implementation

1. A strict `board baseline == HEAD` rule would invalidate its own reconciliation merge.
2. A broad “latest commit touched board” exception would have incorrectly blessed the original #441 stale-board failure.
3. An unmerged master candidate could validate and then self-authorize through doctor readiness unless validation and task selection were separated.
4. A post-merge projection could be mistaken for current pre-merge state if selection depended only on a GitHub PR event; local feature checkouts have no such event. Selection now blocks every unactivated projection by `baselineMode`, independent of environment.
5. Blocking every projection without a scoped lifecycle rule would deadlock acceptance fixes on the reconciliation PR itself. Governance now distinguishes finishing the already-recorded reconciliation scope from selecting follow-on work.
6. Authority-policy files initially did not force every CI shard; classifier ownership now covers them.
7. PR-memory schema is executable: using `Verified in current source:` instead of the required `Verified:` correctly failed CI rather than being waived.

## Acceptance

PR #444 may merge only after its final exact head has green policy/knowledge, lint/typecheck/unit/build, fresh Supabase/pgTAP + archive round trips, browser/auth smoke, cross-device UI audit, aggregate verify/e2e, CodeQL and Secret History checks. Exact run identities are provider evidence attached to PR #444; this completed packet deliberately does not self-reference a future CI run that would require another source mutation.

Rollback: revert PR #444. No product runtime, financial, Auth/RLS, provider, deployment or production-data state needs rollback.
