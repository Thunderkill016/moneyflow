# MoneyFlow — active-plan pointer

**Status:** retired as executable authority

The former hand-maintained Current Work Board is intentionally retired. It no longer owns `NOW`, `NEXT`, commit baselines, current-slice selection, or post-merge projections.

Executable plan authority lives only in [`docs/plans/PLAN_AUTHORITY.json`](../PLAN_AUTHORITY.json) and is resolved by `npm run plan:resolve`. The manifest names the merged master packet and at most one current executable packet; Git first-parent history proves when an `introducedByPr` becomes active.

Human backlog, priority, status, blockers and follow-up work belong in GitHub Issues and pull requests. Detailed scope/evidence remains in the selected packet under this directory.

Do not add a Markdown authority table back to this file.
