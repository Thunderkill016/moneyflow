# MoneyFlow — pull request memory log

- **Status:** mandatory append-only pull-request memory
- **Applies to:** every pull request targeting `main`
- **Companion snapshot:** `docs/research/CURRENT_PROJECT_MEMORY.md`

## Rule

Every pull request must add one entry to this file before it can pass CI. There are no documentation, dependency, maintenance, design or infrastructure exceptions.

The entry must state what changed, what was verified and whether the current implementation-status snapshot changed.

- When a PR changes capability, architecture, security, operational or verification status, it must also update the affected row or section in `CURRENT_PROJECT_MEMORY.md`.
- When a PR does not change implementation status, record `Status impact: none` and explain the bounded change. Do not invent a capability update merely to satisfy the rule.
- An open PR is candidate evidence only. Do not write candidate behavior as merged truth.
- After merge or production verification, update the applicable snapshot status in the same PR whenever that evidence already exists before merge. Provider or post-merge evidence that cannot exist yet belongs in a follow-up PR with its own memory entry.

CI checks that this file is present in every pull-request diff. The PR template and reviewer must still verify the entry is truthful and complete.

## Entry template

```md
### PR #<number> — <title>

- Date: YYYY-MM-DD
- Change class: Class 0 | Class 1 | Class 2 | Class 3
- Affected capability or project boundary:
- Status impact: none | candidate | partial → implemented | implemented → production evidenced | other
- Changed:
- Verified:
- Remaining:
- Production/provider evidence: none | exact evidence
- Snapshot update: `CURRENT_PROJECT_MEMORY.md` section/row | not applicable
- Superseded issue, roadmap or claim: none | exact reference
```

## Entries

### PR #215 — refresh current project memory and capability roadmap

- Date: 2026-08-02
- Change class: Class 1 repository-knowledge and CI policy
- Affected capability or project boundary: project memory, roadmap authority and delivery governance
- Status impact: project-status authority created; no runtime capability change
- Changed: audited merged MoneyFlow behavior, corrected stale feature-gap claims, added the current capability matrix, and made per-PR memory updates mandatory
- Verified: exact-head knowledge contract, CI classification contract, lint, typecheck, unit/static RLS, production build, CodeQL and secret-history scan
- Remaining: owner review and merge; future PRs must append their own entry
- Production/provider evidence: not applicable because runtime and provider behavior did not change
- Snapshot update: `CURRENT_PROJECT_MEMORY.md` was created and reconciled in this PR
- Superseded issue, roadmap or claim: old reports/export/recurring/goals/dashboard/import/security gap claims recorded in the snapshot
