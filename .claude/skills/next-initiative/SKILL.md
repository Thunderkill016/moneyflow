---
name: next-initiative
description: Select and execute the next authorized MoneyFlow initiative from live repository and GitHub evidence. Use when the owner says continue, proceed, do the next task, or asks Claude Code to keep developing without naming one exact issue.
argument-hint: "[optional scope or constraint]"
---

# Next MoneyFlow initiative

Use this workflow only from the MoneyFlow repository root.

## 1. Reconcile current state

Read:

1. `CLAUDE.md` and `AGENTS.md`
2. `docs/engineering/DEVELOPMENT_SEQUENCE.md`
3. `docs/product/PRINCIPLES.md`
4. `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`
5. `docs/MVP_DEFINITION.md`
6. `docs/plans/active/README.md`

When selecting F01-F12, also read that feature's evidence row in
`docs/research/06_GLOBAL_EXPENSE_WEB_UX_BENCHMARK.md`, section 13. Recheck the
linked official source when the external behavior materially affects the
specification. Treat competitor behavior as evidence, never authorization.

Then inspect:

```bash
git status -sb
git branch --show-current
git log -5 --oneline
git remote -v
```

Query live open pull requests and issues with the available GitHub tools. If
live access is unavailable, mark the recommendation provisional.

## 2. Select exactly one initiative

First name the current product feature, stage and unmet outcome gate from
`docs/product/PRODUCT_DEVELOPMENT_PLAN.md`. Then apply the ordering law in
`docs/engineering/DEVELOPMENT_SEQUENCE.md`:

1. in-flight implementation/review closure;
2. P0/P1 core flow;
3. financial correctness and ownership;
4. next user-facing feature from the feature queue;
5. authenticated, recovery, mobile and accessibility evidence inside the slice;
6. direct technical enablers for that feature;
7. measured maintenance/performance only when blocking or user-visible.

Do not select from an old branch name, a completed packet or historical research
alone. Do not silently skip a blocked higher item. State its blocker and prove
that the selected work is independent.

Present the selected initiative with:

- observed problem and affected user;
- current feature, product stage and unmet outcome gate;
- controlling issue/PR/packet;
- why it is next;
- dependencies and owner-only gates;
- smallest coherent user-facing vertical slice;
- verification layers;
- explicit out of scope.

When `$ARGUMENTS` is supplied, treat it as an owner constraint, not permission
to violate product law or financial/security invariants.

## 3. Establish the contract

For non-trivial work:

1. Create or update one packet from
   `docs/templates/FEATURE_WORK_PACKET.md`.
2. Complete reconnaissance and required primary-source research.
3. Resolve or exclude product questions.
4. Record adopt, adapt and reject decisions from primary-source product
   research, including relevant counterexamples.
5. Write observable acceptance criteria.
6. Name exact repository ownership and tests.
7. Split the slice into reviewable tasks with dependencies.

Use Plan mode until those items are reviewable. Do not edit runtime code while
the packet still contains unresolved decisions that affect behavior.

## 4. Implement

- Use a focused branch or isolated worktree based on current `origin/main`.
- Write a failing regression/counterexample before behavior changes.
- Implement one packet task at a time.
- Update task status and evidence as facts change.
- Keep unrelated findings out of the diff.
- Stop and update the specification when implementation disproves a requirement.

Parallel research is allowed. Parallel editing requires worktrees and
non-overlapping ownership. Do not use an agent team by default.

## 5. Evaluate independently

After implementation, invoke the `evaluator` agent with the controlling packet.
The evaluator must inspect the actual diff and rerun relevant gates. It reports
findings; it does not repair its own review.

Address blockers in the implementing context, then request re-evaluation.

## 6. Verify and report

Run every applicable layer from `AGENTS.md`. Record exact commands, exits and
artifacts. A lower layer never proves a higher one.

End with a requirement-by-requirement table:

| Requirement | Evidence | Result |
|---|---|---|
| acceptance criterion | file/test/artifact | pass/fail/no evidence |

Use precise states: `implemented`, `verified`, `deployed`, `accepted` or
`blocked`. Never merge, deploy, change shared protection or claim owner
acceptance without the owner's explicit action.
