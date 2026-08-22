# #443 — Fail-closed plan authority resolution

**Status:** active
**Execution state:** implementing
**Change class:** Class 3 — repository governance / agent task-selection contract
**Parent:** repository delivery governance; protects #432 and every later master program
**Active role:** implementer / evaluator
**Permission scope:** focused branch/repository documentation and tooling only; no provider, production, financial-data, main or merge write
**Branch:** `chore/443-plan-authority-resolution`
**Issue:** #443
**Base:** `main@6123d263c60fba98bd67b5c935a7179477ad7fcb`
**Owner:** human owner

## Outcome

A fresh agent must be able to determine the current master plan, the current agent-executable slice, the plan supersession chain and whether the Current Work Board is fresh **without relying on chat memory, file-name recency or manual page-by-page guessing**.

If those facts are ambiguous or stale, the standard doctor/knowledge flow fails before implementation selection.

## Repository reconnaissance

The current failure was reproduced from repository truth rather than inferred:

- PR #441 merged as `6123d263…`;
- `docs/plans/active/README.md` on that main still pinned `d5324c…` and still named merged #440 as `NOW`;
- `scripts/active-packet-registry.mjs` proves only that active filenames and references exist;
- `scripts/check-project-knowledge.mjs` proves required files/headings/memory shape but does not establish which product plan supersedes another or whether the board baseline matches main/base;
- `agent:doctor` diagnoses risk/gates/capabilities but previously had no plan-authority result;
- the actual master change is discoverable only by following history: #420 introduced `PRODUCT_DEVELOPMENT_PLAN.md`, #431 proposed but never merged a conflicting replacement, #432 was owner-promoted, and merged PR #433 installed #432 as the master program before #435/#437/#439/#441 executed P1.

This means the repository had good documents but no fail-closed resolver for their precedence.

## Research

Focused official references after repository inspection:

1. Git `git log` documentation — https://git-scm.com/docs/git-log
   - `--first-parent` presents integration-branch evolution without expanding merged topic-branch internals;
   - `--follow` continues file history across renames for a single path.
2. GitHub Pull Request Merges — https://docs.github.com/en/pull-requests/reference/pull-request-merges
   - squash merge places one consolidated commit on the base branch;
   - the default squash commit message may include the pull-request title/number, which matches MoneyFlow's observed main history.

Applicability: MoneyFlow uses squash-merged PRs with PR numbers in main subjects; merged #433 is `a35d6f96…` with subject `docs(product): align MoneyFlow around low-maintenance acquisition (#433)`. First-parent file history is therefore a useful local provenance check. It is still evidence, not authority by chronology alone: the machine authority graph + active registry decide which plan is current, while Git history verifies how that authority arrived.

No external library or service is adopted.

## Specification

### Machine authority graph

`docs/plans/PLAN_AUTHORITY.json` is the compact machine route for strategic plan precedence. It records:

- exactly one current master path;
- the PR that introduced that master authority;
- explicit predecessor plan path(s) and the PR that superseded them.

It is **not** a free-standing “latest filename” claim. The resolver rejects it unless the active registry independently identifies the same master packet and Git first-parent history contains the declared introduction PR.

### Current Work Board freshness

`docs/plans/active/README.md` carries the base from which its current content was reconciled. The resolver compares it with:

- `pull_request.base.sha` in PR CI;
- `HEAD` when running on `main`;
- otherwise the merge-base with `origin/main`/`main` for a local feature branch.

A PR cannot know its future squash-merge SHA, so one transition is explicitly supported: after a board-updating PR lands, a mismatched header is accepted only when Git proves the exact current `HEAD` itself is also the latest commit touching the board. The very next main commit that does not update the board makes that proof false and the resolver fails closed again.

### Master/current uniqueness

From the active registry table:

- exactly one row must carry role `master product program`;
- at most one row may carry `current agent-executable`;
- both referenced files must exist;
- manifest master and registry master must match exactly.

Zero current agent-executable slices is permitted only as a warning because the repository can legitimately be waiting on owner/provider/external evidence.

### Standard entrypoints

- `npm run plan:resolve` prints the resolved authority or exits non-zero;
- `npm run check:knowledge` runs authority resolution before the existing knowledge checker;
- `npm run agent:doctor -- --json` includes `planAuthority`, raises the standard wrapper report schema to v3, and makes `ready=false` when authority is stale/ambiguous.

### History trail

The resolver returns up to twelve first-parent commits touching the resolved master path and verifies the declared introduction PR is present. This lets a future agent jump directly to the PR that installed the current plan and inspect later changes without scanning hundreds of unrelated pages.

### Boundaries

- Open/unmerged PR text remains candidate evidence and cannot become authority merely by being newer.
- Git chronology does not override owner decisions or the registry/authority graph.
- No hidden chat context is required for resolution.
- No product runtime, financial, database, RLS/Auth, provider, deployment or production behavior changes.

## Implementation plan

1. Add pure resolver/parser and deterministic negative tests.
2. Add machine authority graph for current #432 ← #420 supersession.
3. Wrap the standard agent doctor so JSON/human output carries plan authority and readiness depends on it.
4. Make `check:knowledge` run the resolver first.
5. Reconcile the post-#441 board/current memory and retire merged #440 from active packets.
6. Document the required pre-work route in `AGENTS.md`, root README and `docs/plans/README.md`.
7. Classify authority-policy changes as Class 3/full-gate so a broken resolver cannot pass through a light docs lane.
8. Open the required PR/memory record, run exact-head policy/static/build/database/browser/UI/security checks, and independently attack stale/ambiguous/history counterexamples.

Rollback: revert #443. No persisted product/provider state needs rollback.

## Tasks

| ID | Task | Status |
|---|---|---|
| 443.1 | reproduce stale-board / wrong-authority failure | done |
| 443.2 | inspect existing registry/knowledge/doctor ownership | done |
| 443.3 | official Git/GitHub history research | done |
| 443.4 | add authority resolver + CLI | done |
| 443.5 | add deterministic stale/conflict/history/self-merge tests | done |
| 443.6 | add machine authority graph | done |
| 443.7 | integrate standard doctor + knowledge entrypoints | done |
| 443.8 | reconcile post-#441 active state, memory and entrypoint docs | done |
| 443.9 | classify authority policy as full-gate Class 3 | done |
| 443.10 | PR memory + exact-head gates | implementing |
| 443.11 | independent evaluator / owner handoff | pending |

## Evaluation

Required counterexamples:

- stale board baseline returns non-zero even if its `NEXT` prose looks plausible;
- the board-updating squash merge does not invalidate itself;
- the next main commit without a board update fails freshness again;
- two master rows fail;
- two current agent-executable rows fail;
- authority graph and registry choosing different masters fail;
- missing predecessor/master files fail;
- declared master-introduction PR absent from first-parent history fails;
- an open newer PR does not replace the merged master without registry + graph changes;
- standard `agent:doctor -- --json` exposes master/current/chain/history and sets `ready=false` on authority failure;
- current #432 graph resolves through PR #433 to the superseded #420 plan;
- post-#441 board baseline resolves to `6123d263…` on this branch base;
- authority-policy changes select the full CI/database/browser/UI/CodeQL gate set.

The design is rejected if an agent must know a magic plan filename, scan every plan page, query chat memory, trust modification dates, or trust a board whose freshness cannot be mechanically established.
