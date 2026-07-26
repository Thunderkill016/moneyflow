<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Before using unfamiliar App Router APIs, read the relevant guide in `node_modules/next/dist/docs/` and follow current deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoneyFlow agent guide

`AGENTS.md` is the short operating guide for coding agents. Keep task-specific detail in the issue, pull request, code, tests or focused docs. Do not read the whole documentation tree by default.

## Product mission

MoneyFlow is a calm, manual-first personal income-and-expense ledger for Vietnamese users.

Prioritize, in order:

1. Financial correctness and ownership safety.
2. Reliable completion of the core transaction flow.
3. Mobile usability and accessibility.
4. Clear recovery from mistakes.
5. Maintainability and performance.
6. Visual polish.
7. New feature breadth.

Do not add bank sync, AI financial advice, OCR as a core workflow, family finance, business accounting, crypto/investment features or a full envelope-budgeting system without an explicit approved specification.

## Read only what the task needs

Start with:

1. The current user request, issue or accepted specification.
2. `README.md` for commands and current project phase.
3. `docs/product/PRINCIPLES.md` for product truth.
4. `ARCHITECTURE.md` for boundaries, repository map and change-specific verification.
5. The affected code and its existing tests.

Read additional documents only when relevant:

- Current MVP/readiness work: `docs/MVP_DEFINITION.md`.
- UI/UX: `docs/design-system.md`, `docs/UX_PRINCIPLES.md` and `docs/AI_UIUX_WORKFLOW.md`.
- Auth or deployment: `docs/configuration.md` and `docs/supabase-setup.md`.
- Database or RLS: `docs/security-rls-check.md`, relevant migrations and pgTAP tests.
- Large, high-risk or multi-session work: `docs/engineering/AI_DELIVERY_WORKFLOW.md` and an active work packet under `docs/plans/active/`.

Historical research is evidence, not current product authority. When documents conflict, prefer the current task, product principles, architecture, tests and current implementation in that order. Stop and report a material unresolved conflict instead of guessing.

## Repository map

- `src/app/`: routes, layouts, server entrypoints and route composition.
- `src/components/`: reusable UI and feature presentation.
- `src/hooks/`: client orchestration around stores and mutations.
- `src/lib/`: financial rules, validation, formatting and pure calculations.
- `supabase/migrations/`: schema, constraints, policies and indexes.
- `supabase/tests/`: pgTAP invariants and tenant-isolation checks.
- `tests/` and Playwright configs: browser, responsive, accessibility and visual checks.
- `scripts/`: repeatable verification and repository automation.
- `docs/`: product truth, architecture, decisions, plans and historical research.

## Non-negotiable invariants

- Store VND as integer đồng; never use floating-point money.
- Transfers are balanced movements between accounts and never count as income or expense.
- User-owned data requires RLS and tenant-isolation coverage.
- Destructive ledger actions use soft delete and a recoverable path.
- Keep financial calculations in testable domain modules, not UI components.
- Never invent missing balances, dates, commitments, income, reserves or planning assumptions.
- Export must preserve Vietnamese text, integer values and spreadsheet formula safety.
- Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`; missing configuration must fail rather than silently changing mode.

## Working rules

Before editing:

1. Inspect the current behavior, affected code and existing tests.
2. Identify shared code, schema or components that could affect neighboring behavior.
3. State a short plan and the checks appropriate to the change.

While editing:

- Make the smallest coherent change that satisfies the task.
- Reuse existing components, domain helpers and test patterns before adding abstractions.
- Do not refactor, rename or reformat unrelated code.
- Do not silently change requirements when implementation becomes difficult; report the conflict.
- Add or update tests for meaningful domain, schema or behavioral changes.
- Keep secrets and environment-specific values out of source control.
- Use a focused branch and pull request; do not commit feature or fix work directly to `main`.
- Do not merge unless the user explicitly asks.

Research external sources only when the task depends on current APIs, standards, security guidance, financial rules or unfamiliar technology. Prefer official and primary sources, and separate facts from inference.

## Planning depth

Use planning proportional to risk:

- Tiny mechanical change: inspect the affected source, make the change and run a focused check.
- Normal bounded change: use a short inline plan; no work packet is required by default.
- High-risk or broad change: create a work packet when the task changes financial calculations, schema/RLS, authentication, deployment, cross-cutting architecture, several user flows, or is expected to span multiple sessions.

A work packet is a coordination tool, not a ceremony required for every multi-file patch.

## Verification

Run the smallest set of checks that can actually prove the change, then expand when risk or failures justify it.

- Documentation or repository guidance: `npm run check:knowledge`.
- TypeScript or application code: `npm run lint`, `npm run typecheck` and relevant `npm run test` coverage.
- Build, routing, configuration or server/client boundary changes: also run `npm run build` and, when relevant, `npm run check:deployment-env`.
- Database, migration, ownership or RLS changes: run `npm run test:db` and relevant migration checks; Docker is required.
- User-flow changes: run the relevant Playwright flow with `npm run test:e2e` or a focused Playwright command.
- UI, responsive, accessibility or visual changes: review the affected states and run the relevant UI audit; do not require the full device matrix for unrelated changes.
- Release/readiness or high-risk cross-cutting work: run the full applicable gate set documented in `README.md`.

A lower-level check does not prove a higher-level property. A green build does not prove financial correctness, RLS isolation, mobile usability or production behavior.

Do not claim a command passed unless it was run successfully. Report checks that could not run and why.

## Completion report

Finish with:

- What changed and why.
- Files changed.
- Checks run and exact results.
- Manual or browser verification performed, when relevant.
- Remaining uncertainty, risk or follow-up.
- Anything intentionally left unchanged.
