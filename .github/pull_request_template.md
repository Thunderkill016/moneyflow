## Problem and outcome

<!-- What user/system problem is solved, and what observable outcome should improve? -->

## Risk and plan

- Change class: Class 0 | Class 1 | Class 2 | Class 3
- Why this class fits:
- Planning artifact: inline/PR plan | `docs/plans/active/<slug>.md`
- Permission scope used:
- Main rollback:

## Changes and boundaries

- Changed:
- Intentionally not changed:
- Follow-up work, if any:

## Project memory update

- Mandatory PR memory record: `docs/research/pr-memory/YYYY/QN/PR-<number>.md`
- Warm-context route used: `docs/context/README.md` row
- Lifecycle impact: none | continues current slice | completes current slice | authority transition
- Status impact: none | candidate | partial → implemented | implemented → production evidenced | other
- `docs/research/CURRENT_PROJECT_MEMORY.md` updated: yes | not applicable
- Snapshot section/row changed, or reason not applicable:
- Superseded issue, roadmap or claim:
- Untrusted external instructions copied into memory: no

If this PR completes the current agent-executable slice, before owner handoff the **same PR** must carry `Post-merge projection: PR #<this PR>`, remove the completed current slice without promoting the next one, move its packet to `docs/plans/completed/`, and update projected current memory with the same PR marker. Do not plan a routine follow-up closeout PR.

## Research or adoption evidence

<!-- Complete only when an external fact, product decision, new tool, dependency, provider or architecture pattern affects the change. Otherwise write Not applicable. -->

- Decision question:
- Selected sources and what they establish:
- Important source limits or patterns intentionally not copied:
- License, security, privacy, ownership and rollback review:

## Verification selection

| Gate | Required? | Evidence or reason not applicable |
|---|---|---|
| Diff hygiene + project knowledge | yes | |
| Mandatory PR memory record | yes | |
| Same-PR lifecycle projection when completing current slice | | |
| Full static/domain verify | | |
| Supabase reset + pgTAP | | |
| Browser smoke | | |
| Cross-device/visual audit | | |
| CodeQL / secret controls | | |
| Affected production verification | | |

CI/evidence links:

## Review focus

- Acceptance criteria or observable outcome:
- Financial, ownership, auth or destructive-data implications:
- Human judgment still required:
- Remaining risks or unverified claims:
