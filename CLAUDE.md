@AGENTS.md

# MoneyFlow current project context

> Snapshot date: 2026-07-27. This file is an orientation layer for Claude Code, not a permanent source of truth. Verify the current branch, `main` SHA, open pull requests and active work packet before changing code.

## Start every task here

1. Run `git status -sb`, `git branch --show-current` and `git log -5 --oneline`.
2. Read `README.md`, `ARCHITECTURE.md`, `docs/product/PRINCIPLES.md`, `docs/MVP_DEFINITION.md` and `docs/engineering/AI_DELIVERY_WORKFLOW.md` as required by `AGENTS.md`.
3. Find the controlling packet under `docs/plans/active/` and the relevant issue or pull request.
4. Check whether a newer open PR changes the same source of truth.
5. State observed facts, inferences, documentation conflicts and unresolved questions separately.
6. For non-trivial work, finish reconnaissance, specification, acceptance criteria, risks, tasks and verification plan before editing runtime code.
7. Never merge a pull request or deploy production without explicit human-owner approval.

## Source precedence

Use this order when sources conflict:

1. Human decisions explicitly given for the current task.
2. `docs/product/PRINCIPLES.md` for product truth and financial honesty.
3. The reviewed controlling work packet for the current task.
4. `ARCHITECTURE.md` for boundaries and ownership.
5. `docs/MVP_DEFINITION.md` for readiness scope, except where merged runtime history proves a route or implementation has changed and the doc is stale.
6. Current code, tests, migrations and merged pull-request history for implemented behavior.
7. Historical research, old draft PRs and superseded plans only as evidence, never as automatic requirements.

Do not silently choose one side of a conflict. Record it and update the specification before implementation.

## Product identity

MoneyFlow is a Vietnamese, manual-first personal income-and-expense web ledger.

Core jobs:

- record income, expense or an internal transfer quickly;
- know balances across active accounts;
- understand income, expense and where money went in a selected period;
- correct mistakes through recoverable paths;
- retain and export trustworthy user-owned data.

Product character:

- calm, factual and non-judgmental;
- Vietnamese-first copy;
- integer VND as a first-class requirement;
- mobile usability is a release gate;
- transparent about unknown or incomplete financial data.

Current non-goals include bank sync, AI financial advice, OCR as a core workflow, family finance, business accounting, tax/invoicing, native mobile applications and a full envelope-budgeting system.

## Repository and runtime

- Private production repository: `Thunderkill016/moneyflow`.
- Public verification repository: `Thunderkill016/moneyflow-public`.
- Framework: Next.js 16 App Router, React 19 and TypeScript.
- Authenticated mode: Supabase Auth plus PostgreSQL with RLS.
- Demo mode: browser-local stores and seeded data.
- Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`; never infer it from missing credentials.
- Production configuration belongs in Vercel settings, not committed secrets or guessed constants.

High-level boundary:

```text
Next.js routes
  -> client components / server actions
  -> domain modules in src/lib
  -> repository or store adapters
  -> Supabase PostgreSQL or browser-local demo storage
```

## Current production snapshot

Private `main` currently ends at:

```text
c0c9b6fb9aa98f55a37f635dd029a6226467925a
feat: migrate signed-in shell to Calm Ledger dashboard
```

GitHub reports Vercel `success` for this exact commit.

Merged rollout history:

- PR #82: Calm Ledger semantic foundation plus redesigned landing, login, register and recovery surfaces.
- PR #90: `/dashboard` became the canonical signed-in home; `/insights` became a compatibility redirect.
- PR #91: root CSS ownership reduced to two entry points with document/theme authority and frozen legacy compatibility imports.
- PR #93: synchronized the shared `MoneyValue`, split Dashboard composition and Transactions money-value migration from the verified public repository.
- PR #94: restored `dashboard-planning-empty.ts`, which the first private synchronization omitted and which caused the first Vercel build to fail.
- PR #92: merged the component-scoped Calm Ledger AppShell and route-owned Dashboard presentation.

Important lesson: public CI success does not prove private integration completeness. A synchronized slice must also build in the private repository and verify the exact Vercel deployment.

## Current route truth

- `/dashboard` is the canonical authenticated home.
- `/insights` is a compatibility redirect only.
- Navigation, auth redirects, onboarding exits, protected-route behavior and the PWA start URL should target `/dashboard`.
- Some older documentation still names `/insights` as the Dashboard route. Treat that as documentation drift, not current runtime truth.

## Current implementation state

### Completed or production-present

- Email/password auth, supported OAuth and recovery surfaces.
- Demo mode using browser-local persistence.
- Multiple accounts and categories.
- Income, expense and balanced internal transfers.
- Edit, soft delete and recovery paths.
- Budgets, recurring commitments, recurring income templates and savings goals.
- Weekly, monthly and yearly reporting.
- CSV export and controlled import tooling.
- Responsive light/dark web UI foundation.
- Calm Ledger landing and authentication surfaces.
- Canonical `/dashboard` signed-in route.
- Calm Ledger AppShell on phone, tablet and desktop.
- Shared `MoneyValue` display model.
- Dashboard balances, monthly KPIs, categories, recent transactions and planning values migrated to `MoneyValue`.
- Transactions filtered totals, daily totals and row values migrated to `MoneyValue`.
- Dashboard controller split from bounded overview and planning presentation components.

### Existing but not fully migrated to the final Calm Ledger design

- quick-capture field presentation;
- the remaining Transactions page presentation beyond the money-value slice;
- Accounts;
- Inbox, paste, import and rules review flows;
- budgets, commitments, recurring income, goals and reports route presentation;
- categories, settings and export presentation;
- final removal of legacy selectors after each route obtains a clear owner.

Do not rebuild existing capabilities merely because their visual migration is incomplete. Inspect the current domain helpers, stores, server actions and tests first.

## Calm Ledger redesign

Umbrella issue: #81, “Redesign toàn bộ MoneyFlow theo Calm Ledger”.

Locked decisions:

- Tổng quan remains the signed-in home.
- Inbox remains secondary and becomes prominent only when review items exist.
- Phone navigation has exactly five top-level destinations.
- The center phone action performs `Ghi chi tiêu`; there must be no duplicate floating action button.
- Desktop exposes one primary action in the topbar.
- The Dashboard prioritizes total balance, month income, expense, net, category distribution and recent transactions.
- Planning summaries remain secondary and compact.
- Do not show `Có thể chi hôm nay`, safe-to-spend or another daily spending recommendation without a separately researched and approved financial-planning contract.

## Financial and ownership invariants

These rules are non-negotiable:

1. Store VND as integer đồng; never use floating-point money.
2. Transfers are balanced movements between owned accounts and never count as income or expense.
3. Financial calculations belong in deterministic, testable domain modules, not React presentation components.
4. A total account balance is not automatically a spending budget.
5. Missing balances, dates, income cycles, commitments, reserves or account intent remain unknown; never invent them.
6. User-owned authenticated records require RLS and tenant-isolation evidence.
7. Destructive ledger actions use soft delete and a recoverable path.
8. Export must preserve Vietnamese text, integer values and spreadsheet formula safety.
9. Money direction must never rely on color alone; include signs, labels or accessible text.

## CSS and presentation ownership

Root layout has exactly two global CSS entry points:

- `legacy.css`: frozen compatibility imports only;
- `document-theme.css`: semantic Calm Ledger tokens, light/dark resolution, document canvas, focus and reduced motion.

New work must belong to either:

- a route-owned stylesheet; or
- a component CSS Module.

Do not add another root stylesheet, new `html` or `body` ownership, refresh/guardrail/override layers, or duplicate selectors to hide ownership problems. Every route migration should remove replaced legacy declarations and lower debt where practical.

## Current open work and GitHub state

- PR #95, `docs: reconcile production delivery workflow`, is open and mergeable. It records the real public-to-private synchronization sequence, the first failed Vercel build, the repair and remaining manual evidence. It is not merged source of truth yet.
- Authenticated production checks and final light/dark phone/desktop screenshot review remain open in PR #95.
- Open draft PRs #75, #84 and #87–#89 are not automatically active work. They may be historical, experimental, stacked or superseded. Do not continue, merge or use their requirements without explicit human confirmation.
- The private repository's GitHub Actions are currently quota-blocked before meaningful checkout or job steps. A failed private Actions run without steps or logs is not an application failure signal.

## Known documentation drift

- `docs/MVP_DEFINITION.md` still refers to `/insights` as the Dashboard surface; merged runtime uses `/dashboard`.
- Main's active Calm Ledger shell packet does not yet contain the reconciliation proposed in PR #95.
- README and product principles still include the seven-consecutive-day self-use readiness rule. Some unmerged CycleWarden drafts record a different owner decision. Because those drafts are not merged, do not silently remove or enforce a changed rule; ask the human owner and update authoritative documentation first.

## Required delivery workflow

For non-trivial work:

1. Create a focused branch or isolated worktree.
2. Create or update a packet under `docs/plans/active/`.
3. Complete repository reconnaissance.
4. Research only unresolved external or product questions.
5. Define the problem, user stories, acceptance criteria, required states, constraints and out-of-scope behavior.
6. Write the implementation plan, risks, rollback and verification plan.
7. Split the work into small verifiable tasks.
8. Implement one coherent vertical slice at a time.
9. Evaluate the result against the packet, preferably in a separate context or reviewer role.
10. Open a pull request with exact evidence and remaining limitations.
11. Stop for human approval. Do not merge or deploy autonomously.
12. After an approved merge, verify the exact production deployment and affected flow.
13. Move the packet to `docs/plans/completed/` only after the evidence is complete.

Never write feature or fix commits directly to `main`. Never use a no-op commit merely to retrigger deployment.

## Verification commands

Run the layers appropriate to the change:

```bash
npm run check:knowledge
npm run check:deployment-env
npm run check:css-ownership
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:rls
npm run test:db
npm run test:e2e
npm run test:ui-audit:pr
```

What each layer proves:

- static checks: repository and configuration contracts;
- unit tests: deterministic domain behavior;
- Supabase reset and pgTAP: schema, constraints, RLS and ownership;
- Playwright smoke: critical user flows;
- responsive audit and screenshots: visual, mobile, dark-mode, keyboard, WebKit and 200% text behavior;
- exact Vercel deployment check: private integration and production build;
- authenticated manual flow: actual production behavior.

A lower layer never proves a higher layer.

## Completion language

Do not say a task is complete merely because code was generated, public CI passed, a build succeeded or a PR was merged.

Report one of:

- **implemented**: code exists but verification is incomplete;
- **verified**: required checks for the claimed layer passed;
- **deployed**: the exact production commit reports deployment success;
- **accepted**: the human owner reviewed the required evidence and approved completion;
- **blocked**: name the missing evidence or external limitation.

## Maintaining this file

Update this snapshot when a merged change alters:

- canonical routes;
- system boundaries;
- product scope or financial invariants;
- Calm Ledger rollout status;
- production verification authority;
- active release risks;
- mandatory human approval rules.

Keep task-specific details in work packets. Keep this file concise enough to load every Claude Code session without replacing the repository's authoritative documents.
