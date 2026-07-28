@AGENTS.md

# Claude Code orientation

This file is a lightweight session entrypoint. It does not replace `AGENTS.md`, the active work packet, current code, tests or merged GitHub history.

## Before editing

1. Run `git status -sb`, `git branch --show-current` and `git log -5 --oneline`.
2. Follow the read order in `AGENTS.md`.
3. Find the controlling file under `docs/plans/active/` and the relevant issue or pull request.
4. Check whether another open PR changes the same files or source of truth.
5. Separate observed facts, inference, stale documentation and unresolved questions.
6. For non-trivial work, finish reconnaissance, specification, plan, tasks and verification criteria before editing runtime code.

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
