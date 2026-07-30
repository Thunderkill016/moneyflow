@AGENTS.md

# Claude Code orientation

This file is a lightweight session entrypoint. It does not replace `AGENTS.md`, the active work packet, current code, tests or merged GitHub history.

## Before editing

1. Run `git status -sb`, `git branch --show-current` and `git log -5 --oneline`.
2. Follow the read order in `AGENTS.md`.
3. Read `docs/product/PRODUCT_DEVELOPMENT_PLAN.md` and `docs/engineering/DEVELOPMENT_SEQUENCE.md` before selecting or continuing an initiative.
4. Revalidate the current GitHub issues, pull requests and `docs/plans/active/`; their status can be newer than repository prose.
5. Find the controlling work packet and check whether another branch or pull request changes the same ownership area.
6. Separate observed facts, inference, stale documentation and unresolved questions.
7. For non-trivial work, finish reconnaissance, specification, plan, tasks and verification criteria before editing runtime code.

## Selecting work

- When the owner names a task, follow that task within product law and record any conflict.
- When asked to continue the project without a named task, use `/next-initiative`.
- Name the user-facing feature, product stage and unmet outcome gate before selecting its implementation slice.
- Close or reconcile implemented work before starting another initiative.
- After P0/P1 and financial/tenant blockers, follow the feature queue; quality,
  authenticated evidence and accessibility belong in each feature's Definition
  of Done.
- Do not let broad cleanup or internal refactors displace the next product
  feature unless they directly block it.
- Do not silently skip a blocked higher-priority item. Record the blocker and why the selected work is independent.
- One active implementation scope owns one branch or isolated worktree. Do not let parallel agents edit the same ownership area.

## Current project facts

- Production repository: `Thunderkill016/moneyflow`; it is public and is the source of truth.
- Legacy verification mirror: `Thunderkill016/moneyflow-public`; do not treat it as authoritative over the production repository.
- MoneyFlow is a Vietnamese, manual-first personal income-and-expense ledger.
- `/dashboard` is the canonical authenticated home; `/insights` is a compatibility redirect.
- Authenticated mode uses Supabase Auth and PostgreSQL with RLS.
- Demo mode uses browser-local storage.
- Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`.
- VND is stored as integer đồng.
- Transfers never count as income or expense.
- Financial calculations belong in deterministic domain modules, not presentation components.
- The shared shell is owned by `src/components/layout/app-shell.tsx` and its CSS Module.
- Dashboard presentation is route-owned under `src/app/dashboard/`.
- GitHub Actions can execute on the public production repository; issue #86 is resolved. A missing or stale run is still not evidence that checks passed.

## Source precedence

When sources conflict, use this order:

1. Explicit human decisions for the current task.
2. `docs/product/PRINCIPLES.md`.
3. The reviewed controlling work packet.
4. `ARCHITECTURE.md`.
5. Current code, tests, migrations and merged PR history.
6. Historical research and old draft PRs as evidence only.

Record conflicts instead of silently choosing a convenient source.

## Delivery guardrails

- Use a focused branch and pull request; do not write feature or fix commits directly to `main`.
- Keep non-trivial work in an active packet using `docs/templates/FEATURE_WORK_PACKET.md`.
- Run verification layers appropriate to the change; one passing layer does not prove another.
- Do not infer database, browser or production correctness from a build status.
- Do not merge or deploy without explicit human-owner approval.
- Report work as `implemented`, `verified`, `deployed`, `accepted` or `blocked` according to the evidence actually available.
- When compacting context, preserve the controlling packet path, acceptance criteria, modified files, commands run, failures and remaining tasks.
