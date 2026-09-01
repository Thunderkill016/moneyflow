# #529 — retire Markdown Current Work Board authority

**Issue:** #529
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Change class:** Class 3 governance/CI-policy boundary
**Base:** `main@dea07378fe00030c3fee1a3f4be52831ece959f0`

## Repository reconnaissance

PR #528 selected #527 and passed its pull-request CI, CodeQL and secret scan. After owner merge, push CI #3162 failed `Project knowledge contract` because `docs/plans/active/README.md` still carried the pre-merge baseline `d6ff88b...` and no matching post-merge projection marker. The resolver therefore reported `current slice: none` even though the merge commit itself was the accepted #528 authority transition.

Current executable authority is duplicated across `PLAN_AUTHORITY.json`, a Markdown board table, manual SHA baseline/projection markers, packet metadata and project memory. The failure is caused by duplicated state, not by application runtime behavior.

## Research

GitHub's current Issues/Projects documentation treats issues and projects as the native place to plan and track human work. MoneyFlow does not need a second hand-maintained Markdown backlog in order to decide which packet is executable.

Internal evidence is stronger for the machine boundary: the manifest already owns master-plan supersession and Git first-parent history already proves merged introduction PRs. Extending that manifest to own `current` removes the hand-maintained commit-baseline race.

External sources are method references only; MoneyFlow's repository tests and merged history define acceptance.

## Specification

1. `docs/plans/PLAN_AUTHORITY.json` becomes schema v2 and owns exactly one master plus zero/one current executable packet.
2. Each authority entry has `path` and `introducedByPr`; merged first-parent history activates it.
3. A current entry introduced in its own open PR is candidate/validation-only until merged.
4. The Markdown board loses all executable semantics. `docs/plans/active/README.md` remains only as a small compatibility tombstone so old links do not break.
5. `plan:resolve`, `agent:doctor` and lifecycle checks no longer parse Markdown roles, SHA baselines or post-merge projection markers.
6. A completing current-slice PR changes manifest `current` to `null`, archives the active packet and updates current memory in the same PR. It may not directly select follow-on work.
7. Human backlog/status remains in GitHub Issues/PRs.
8. No runtime, financial, provider, schema, RLS, Auth or deployment behavior changes.

## Implementation plan

- Upgrade manifest to schema v2 and record #527 as introduced by merged PR #528.
- Rewrite plan resolver/selection/doctor to use manifest + merged history only.
- Rewrite lifecycle validator around manifest current transitions.
- Replace board table with retired-pointer content and change active-packet validation to ensure it cannot regain authority semantics.
- Update tests and current documentation/memory.
- Verify exact-head policy/knowledge, unit/static tests, build, CodeQL and secret scan as selected by CI. Because governance scripts change, fail safe if classifier selects broader gates.

Rollback: revert this focused PR to restore schema v1 + board behavior. Do not partially roll back only the manifest or only the scripts.

## Tasks

| ID | Task | Status |
|---|---|---|
| G1 | Record issue/root-cause and create focused recovery branch | done |
| G2 | Move master/current executable authority into manifest schema v2 | implementing |
| G3 | Remove board baseline/projection parsing from resolver/lifecycle | implementing |
| G4 | Replace board with compatibility tombstone and update docs/memory | implementing |
| G5 | Run exact-head CI and repair only migration defects | pending |
| G6 | Independent review of fail-closed semantics and rollback | pending |

## Evaluation

Pass only if:

- `plan:resolve` on the PR head resolves merged master #432 and current #527 without reading a Markdown board baseline;
- #527 remains candidate before its introducing PR merge in fixture tests and active after merged history proves #528;
- zero-current remains valid;
- same-PR completion cannot swap directly to follow-on work;
- a ready PR that owns current work still cannot evade lifecycle convergence;
- the retired README contains no NOW/NEXT/authority table or SHA baseline;
- current memory and guidance stop naming the board as executable truth;
- exact-head CI/CodeQL/secret scan are green;
- no runtime or provider behavior is changed.
