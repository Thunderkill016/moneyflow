# Claude Code project context

**Status:** implementing  
**Owner:** ChatGPT; human approval required  
**Issue/PR:** pending  
**Last updated:** 2026-07-27

## Outcome

Claude Code receives a concise, repository-root orientation file that explains MoneyFlow's current production state, source-of-truth order, architecture, financial invariants, active redesign status, known documentation drift, verification limits and mandatory human release gates.

## Repository reconnaissance

### Current behavior

- Root `CLAUDE.md` currently contains only `@AGENTS.md`.
- Private production `main` currently points to `c0c9b6fb9aa98f55a37f635dd029a6226467925a`.
- The exact commit reports a successful Vercel deployment.
- Calm Ledger public surfaces, canonical `/dashboard`, CSS ownership foundation, signed-in AppShell, shared `MoneyValue`, split Dashboard composition and Transactions money-value migration are merged.
- Private GitHub Actions are quota-blocked before meaningful job steps; public CI has been the verification authority for synchronized runtime slices, but private integration still requires a private Vercel build.
- PR #95 is open and reconciles the delivery record; authenticated production-flow and final screenshot evidence remain open.

### Relevant repository areas

| Area | Why it matters | Action |
|---|---|---|
| `AGENTS.md` | Mandatory operating rules | Import and obey |
| `README.md` | Product, commands and workflow | Summarize, do not duplicate fully |
| `ARCHITECTURE.md` | System boundaries and change map | Summarize |
| `docs/product/PRINCIPLES.md` | Current product truth | Preserve |
| `docs/MVP_DEFINITION.md` | Ship/readiness contract | Flag stale `/insights` reference |
| `docs/engineering/AI_DELIVERY_WORKFLOW.md` | Required delivery lifecycle | Enforce human merge gate |
| `docs/plans/active/` | Current task specifications | Read task-specific packet |
| GitHub issue #81 | Calm Ledger redesign umbrella | Record rollout state |
| PR #95 | Delivery reconciliation | Record as open, not merged truth |

### Existing tests and constraints

- Documentation-only change; no runtime, finance, database, auth, RLS or deployment configuration changes.
- `npm run check:knowledge` is the relevant repository-owned check.
- This connector-backed change cannot execute local commands, so CI evidence must be reported honestly.

### Similar implementation and recent history

- PR #82: Calm Ledger foundation plus landing/auth.
- PR #90: `/dashboard` canonical; `/insights` compatibility redirect.
- PR #91: two root CSS owners and CSS debt gates.
- PR #93: shared `MoneyValue`, split Dashboard and Transactions migration.
- PR #94: restored a dependency omitted from the first private synchronization.
- PR #92: signed-in Calm Ledger AppShell and Dashboard route styling.

### Open questions

- [x] Should Claude Code automatically merge or deploy? No.
- [x] Should open draft PRs be considered active truth? No; require human confirmation.
- [ ] Human reviews and merges the resulting documentation PR.

## Research

Not required. This change summarizes repository-local sources, merged history and current GitHub state.

## Specification

### Problem

Claude Code currently imports operating rules but lacks a reliable snapshot of what has already shipped, what remains partial, which documents are stale and which release actions require human approval. That increases the risk of duplicated work, stale-route assumptions, scope drift and unauthorized merge/deploy actions.

### User story

- As the project owner, I can open Claude Code in MoneyFlow and have it understand the current project state before proposing or changing code.

### Acceptance criteria

- [ ] Root `CLAUDE.md` imports `AGENTS.md`.
- [ ] It records the exact production snapshot and recent merged slices.
- [ ] It distinguishes implemented capability from incomplete Calm Ledger migration.
- [ ] It identifies known documentation drift without silently rewriting product truth.
- [ ] It states financial, ownership, CSS and deployment invariants.
- [ ] It requires focused branches, work packets, independent evaluation and explicit human merge/deploy approval.
- [ ] It gives Claude a deterministic start-of-task checklist and verification commands.
- [ ] It remains an orientation layer and does not replace authoritative documents.

### Out of scope

- Runtime code changes.
- Resolving the seven-day self-use product decision.
- Merging PR #95.
- Closing or merging old draft PRs.
- Performing authenticated production verification.

## Implementation plan

### Architecture fit

`CLAUDE.md` is Claude Code's repository-root memory entrypoint. It should import `AGENTS.md`, summarize current state and route Claude toward authoritative task-specific documents rather than copying the entire repository encyclopedia.

### Planned changes

| File | Change | Reason |
|---|---|---|
| `CLAUDE.md` | Expand from one-line import into current-state orientation | Give Claude Code reliable startup context |
| `docs/plans/active/claude-project-context.md` | Record specification and evidence | Follow MoneyFlow delivery workflow |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: Claude Code only; other tooling continues to use `AGENTS.md`.
- Rollback: revert the documentation commit.

### Risks and counterexamples

| Risk | Prevention |
|---|---|
| Snapshot becomes stale | Date it and require live Git/PR verification at task start |
| `CLAUDE.md` overrides product truth | Explicit source precedence and non-authority warning |
| Claude treats draft PRs as approved | Require human confirmation for all open/draft work |
| Claude repeats unauthorized merge/deploy | Explicit prohibition plus human gate |
| Context becomes bloated | Keep detailed task truth in work packets and linked docs |

### Verification plan

- Static: inspect Markdown and source references.
- Repository: compare branch to `main`; expect only two Markdown files.
- Knowledge: `npm run check:knowledge` through available CI; report runner limitations.
- Runtime/database/browser: not applicable.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Inspect current product, architecture, workflow and recent merged PRs | none | source files and PR metadata | done |
| T2 | Write root Claude Code orientation | T1 | `CLAUDE.md` diff | implementing |
| T3 | Review scope and open draft PR treatment | T2 | branch comparison | todo |
| T4 | Open draft PR for human review | T3 | PR URL | todo |

## Evaluation

### Review focus

- Correctness: every current-state statement must be supported by merged history or clearly labeled pending.
- Scope: documentation only.
- Maintainability: snapshot must direct Claude to verify live state rather than pretend to be permanent truth.
- Workflow: no automatic merge or deployment.

## Delivery record

- Branch: `agent/add-claude-project-context`
- PR: pending
- Commit: pending
- CI: pending
- Human approval: pending
- Work packet moved to `docs/plans/completed/`: no
