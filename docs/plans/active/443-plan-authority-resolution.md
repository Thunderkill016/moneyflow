# #443 — Fail-closed plan authority resolution

**Status:** active
**Execution state:** evaluating
**Change class:** Class 3 — repository governance / agent task-selection contract
**Parent:** repository delivery governance; protects #432 and every later master program
**Active role:** implementer / evaluator
**Permission scope:** focused branch/repository documentation and tooling only; no provider, production, financial-data, main or merge write
**Branch:** `chore/443-plan-authority-resolution`
**Issue / PR:** #443 / #444
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

`docs/plans/PLAN_AUTHORITY.json` is the compact machine route for strategic plan precedence. It records exactly one current master path, the PR that introduced it, and explicit predecessor plan path(s).

The graph is not a “latest filename” shortcut. Resolver acceptance requires the active registry to name the same master and merged first-parent Git history to contain its introducing PR.

A deliberate future master replacement is still possible: on that replacement PR, `introducedByPr` may equal the **current PR number**. The resolver marks the new master `candidate` and the predecessor `superseded-if-merged`; only after the PR appears in merged first-parent history does that master become `active`. An unrelated newer/open PR never gains authority by chronology alone.

### Current Work Board freshness

On a normal PR, the board baseline must match the PR base. On local feature work it must match the merge-base. On `main`, a mismatch is a hard stop.

There is only one explicit post-merge exception: a dedicated lifecycle-reconciliation PR may include:

`**Post-merge projection:** PR #<number>`

After squash merge, that projection is accepted only when all three facts agree: the exact current commit subject carries that PR number, the exact current commit is the latest commit touching the board, and the declared projection number matches. Merely editing the board inside an implementation PR is not enough. This intentionally means a merged implementation can force a lifecycle reconciliation before another agent may choose new work.

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
- `npm run agent:doctor -- --json` includes `planAuthority` and makes `ready=false` when authority is stale/ambiguous.

### History trail

The resolver returns up to twelve first-parent commits touching the resolved master path and verifies the declared introduction PR. This lets a future agent jump directly to the PR that installed the current plan instead of scanning hundreds of unrelated documents.

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

Rollback: revert #444. No persisted product/provider state needs rollback.

## Tasks

| ID | Task | Status |
|---|---|---|
| 443.1 | reproduce stale-board / wrong-authority failure | done |
| 443.2 | inspect existing registry/knowledge/doctor ownership | done |
| 443.3 | official Git/GitHub history research | done |
| 443.4 | add authority resolver + CLI | done |
| 443.5 | add deterministic stale/conflict/path/projection/future-master tests | done |
| 443.6 | add machine authority graph | done |
| 443.7 | integrate standard doctor + knowledge entrypoints | done |
| 443.8 | reconcile post-#441 active state, memory and entrypoint docs | done |
| 443.9 | classify authority policy as full-gate Class 3 | done |
| 443.10 | PR #444 memory + exact-head gates | evaluating |
| 443.11 | independent evaluator / owner handoff | pending |

## Evaluation

Required counterexamples:

- stale board baseline returns non-zero even if its `NEXT` prose looks plausible;
- an implementation merge that merely touched candidate board state remains stale;
- only an explicit correctly-numbered post-merge reconciliation projection survives its squash merge;
- a copied/old projection cannot bless a later commit;
- two master rows fail;
- two current agent-executable rows fail;
- zero current executable row resolves with a warning, not invented work;
- authority graph and registry choosing different masters fail;
- missing predecessor/master files fail;
- declared master-introduction PR absent from first-parent history fails;
- current PR can propose a replacement master only under its own PR number, and it stays candidate until merge;
- standard `agent:doctor -- --json` exposes master/current/chain/history and sets `ready=false` on authority failure;
- current #432 graph resolves through PR #433 to the superseded #420 plan;
- authority-policy changes select full CI/database/browser/UI/CodeQL gates.

The design is rejected if an agent must know a magic plan filename, scan every plan page, query chat memory, trust modification dates, or trust a board whose freshness cannot be mechanically established.

### Verification status

PR #444 opened from exact base `6123d263…`. The first non-draft exact-head run on `376e0c8…` already proved diff hygiene, migration identity, project knowledge, CI policy contracts and production build before a fresh evaluator found the too-permissive self-merge exception. That older head is historical evidence only. Exact-head verification must restart after the projection/future-master hardening; no earlier green shard is final evidence.
