# #529 — retire Markdown Current Work Board authority

**Issue/PR:** #529 / PR #531
**Execution state:** evaluating
**Active role:** implementer
**Permission scope:** branch_write
**Change class:** Class 3 governance/CI-policy boundary
**Base:** `main@dea07378fe00030c3fee1a3f4be52831ece959f0`

## Repository reconnaissance

PR #528 selected #527 and passed pull-request checks. After merge, push CI #3162 failed because `docs/plans/active/README.md` still duplicated a pre-merge SHA baseline, so the old resolver reported no current slice. The defect is duplicated executable state, not application runtime behavior.

Draft recovery PR #530 implemented the migration and reached exact-head green at `1c386a5493801a7cacd7dda6b3fea4e568ca64a6` (CI #3173, CodeQL #2208, secret scan #2208). The connected GitHub ready-for-review mutation is broken upstream, so GitHub REST refused to merge the still-draft PR. #530 was closed unmerged and replaced by non-draft PR #531; manifest selection is therefore bound to #531.

## Research

GitHub Issues/PRs are the native human work/status surface. MoneyFlow does not need a second hand-maintained Markdown backlog to decide executable work. Internally, one machine-readable manifest plus Git first-parent history is sufficient to prove merged plan selection without hand-written SHA baselines.

External references are method guidance only; repository contracts and merged history define acceptance.

## Specification

1. `docs/plans/PLAN_AUTHORITY.json` schema v2 owns exactly one master plus zero/one current executable packet.
2. Master introduction is proven by its merged PR; current selection is proven by `current.selectedByPr` appearing in merged first-parent history of the manifest.
3. A current selection in its open selecting PR is candidate/validation-only until merged.
4. The Markdown board loses executable semantics. `docs/plans/active/README.md` remains only a compatibility tombstone.
5. `plan:resolve`, `agent:doctor` and lifecycle checks do not parse board roles, SHA baselines or post-merge projection markers.
6. Completing current work sets manifest `current` to `null`, archives the active packet and updates current memory in the same PR; it cannot directly select follow-on work.
7. Human backlog/status remains in GitHub Issues/PRs.
8. No runtime, financial, provider, schema, RLS, Auth or deployment behavior changes.

## Implementation plan

- Keep master/current executable authority in manifest schema v2.
- Bind #527 current selection to replacement PR #531.
- Resolve selection from manifest + merged Git history only.
- Validate lifecycle transitions from manifest current changes.
- Keep the former board as a non-authoritative tombstone and prevent authority semantics returning.
- Align guidance, current memory and PR memory.
- Require exact-head policy/knowledge, unit/static, build, browser/UI, CodeQL and secret checks before merge.

Rollback: revert this focused recovery as one unit. Do not partially restore only the board or only the manifest scripts.

## Tasks

| ID | Task | Status |
|---|---|---|
| G1 | Record issue/root cause and focused recovery branch | done |
| G2 | Move executable authority to manifest schema v2 | done |
| G3 | Remove board baseline/projection parsing | done |
| G4 | Retire board and align docs/memory | done |
| G5 | Replace unmergeable draft #530 with non-draft #531 and rebind selection | done |
| G6 | Exact-head verification for #531 | in progress |

## Evaluation

Pass only if:

- open PR #531 resolves master #432 active and current #527 candidate without reading a Markdown baseline;
- after #531 merge, fresh main resolves #527 active from merged manifest history;
- zero-current remains valid;
- an open PR cannot activate an old packet merely by claiming an old merged packet history;
- same-PR completion cannot directly preselect follow-on work;
- the retired README contains no NOW/NEXT/authority table/SHA baseline;
- current guidance stops naming the board as executable truth;
- exact-head CI, browser/UI audit, CodeQL and secret scan are green;
- no runtime/provider behavior changes.
