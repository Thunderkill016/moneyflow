@AGENTS.md

# Claude Code orientation

This file is a Claude Code adapter. It does not replace `AGENTS.md`, current code/tests, architecture/product policy, explicit owner decisions or merged GitHub history.

## Before editing

1. Run `git status -sb`, `git branch --show-current` and `git log -5 --oneline`.
2. Follow the read order in `AGENTS.md`.
3. Read the explicit issue/PR and affected work packet when one is tied to the task.
4. Run `npm run agent:doctor -- --json` for non-trivial work.
5. Check whether another open PR changes the same files or source of truth.
6. Separate observed facts, inference, stale documentation and unresolved questions.
7. Complete reconnaissance, specification, plan, tasks and verification criteria before non-trivial runtime edits.

`docs/plans/active/` is a packet directory, not a queue. GitHub Issues/PRs track human backlog and status. A packet filename or presence does not authorize work.

## Current project facts

- Production repository: `Thunderkill016/moneyflow`; it is public and is the source of truth.
- `/dashboard` is the canonical authenticated home; `/insights` is compatibility-only.
- Authenticated mode uses Supabase Auth and PostgreSQL with RLS.
- Demo mode uses browser-local storage.
- Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`.
- VND is stored as integer đồng.
- Transfers never count as income or expense.
- Financial calculations belong in deterministic domain modules, not presentation components.
- The shared shell is owned by `src/components/layout/app-shell.tsx` and its CSS Module.
- Dashboard presentation is route-owned under `src/app/dashboard/`.
- A missing or stale CI run is not evidence that checks passed.

## Source precedence

When sources conflict, use this order:

1. Explicit human decisions for the current task and applicable legal/security constraints.
2. Current code, tests, migrations and merged PR history.
3. Accepted task specification/work packet and current GitHub issue/PR evidence.
4. `docs/product/PRINCIPLES.md`, `ARCHITECTURE.md`, `docs/MVP_DEFINITION.md` and engineering policy.
5. Historical research, completed packets and old draft PRs as evidence only.

For the complete question-to-authority route, use `docs/context/README.md`. Do not use `.claude/skills/` as product, project-state or permission authority.

## Delivery guardrails

- Use a focused branch and pull request; do not write feature/fix commits directly to `main`.
- Keep non-trivial work in a work packet when required by `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
- Run verification layers appropriate to the change; one passing layer does not prove another.
- Do not infer database, browser or production correctness from a build status.
- Do not merge or deploy without explicit human-owner approval.
- Report work as `implemented`, `verified`, `deployed`, `accepted` or `blocked` according to evidence actually available.
