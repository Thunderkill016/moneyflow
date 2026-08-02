# MoneyFlow — pull request memory index

- **Status:** active memory policy and index
- **Applies to:** every pull request targeting `main`
- **Companion snapshot:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Record root:** `docs/research/pr-memory/YYYY/QN/PR-<number>.md`

## Why records are split

A single append-only Markdown file would grow without bound, consume unnecessary agent context and create avoidable merge conflicts when several pull requests run in parallel.

MoneyFlow therefore uses:

1. one compact current-state snapshot in `CURRENT_PROJECT_MEMORY.md`;
2. one small immutable record per pull request under the year/quarter directory;
3. this stable policy/index file, which does not receive an entry on every PR;
4. Git history and repository search for historical retrieval.

Per-PR files preserve complete provenance without forcing agents to load the full history.

## Mandatory rule

Every pull request must create or update exactly its own record before it can pass CI. There are no documentation, dependency, maintenance, design or infrastructure exceptions.

Example for PR #215 opened in Q3 2026:

`docs/research/pr-memory/2026/Q3/PR-215.md`

The record must state what changed, what was verified and whether the current implementation-status snapshot changed.

- When a PR changes capability, architecture, security, operational or verification status, it must also update the affected row or section in `CURRENT_PROJECT_MEMORY.md`.
- When a PR does not change implementation status, record `Status impact: none` and explain the bounded change. Do not invent a capability update merely to satisfy the rule.
- An open PR is candidate evidence only. Do not write candidate behavior as merged truth.
- Provider or post-merge evidence that cannot exist before merge belongs in a later PR with its own memory record.

The existing required project-knowledge check validates the current PR record path and mandatory fields.

## Record template

```md
# PR #<number> — <title>

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

## Size and retention policy

- Each PR record must remain at most **140 lines** and **12 KiB**.
- `CURRENT_PROJECT_MEMORY.md` must remain at most **900 lines** and **120 KiB**.
- Do not copy CI logs, patches, screenshots or full issue bodies into memory. Link or identify the exact PR/run instead.
- Keep only current truth, true remaining gaps and load-bearing incident lessons in the snapshot.
- When the snapshot approaches its budget, a focused compaction PR removes superseded prose, consolidates repeated evidence and preserves the original per-PR records unchanged.
- Historical records are not routinely loaded. Search the quarterly directories only when a task needs provenance.

## Current record partitions

| Period | Directory | Notes |
|---|---|---|
| 2026 Q3 | `docs/research/pr-memory/2026/Q3/` | Active project-memory rollout begins with PR #215 |
