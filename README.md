# MoneyFlow

**MoneyFlow** is a Vietnamese personal income-and-expense web ledger: multiple accounts, fast manual capture, clear balances and period reporting, with user-owned export. Calm, factual and non-judgmental.

Core jobs:

1. Record income, expense or transfer quickly.
2. Know balances across active accounts.
3. Understand income, expense and where money went this month.
4. Correct mistakes and export trustworthy data.

MoneyFlow is not currently a bank aggregator, AI financial adviser, business-accounting product or native mobile application. Paste, import, inbox and rules are optional advanced capture tools, not the product identity.

## Sources of truth

Start here before bounded or high-risk work:

- [Agent entrypoint](AGENTS.md)
- [Architecture map](ARCHITECTURE.md)
- [Product principles](docs/product/PRINCIPLES.md)
- [MVP definition and readiness gates](docs/MVP_DEFINITION.md)
- [Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md)
- [Pull-request memory log](docs/research/PR_MEMORY_LOG.md)
- [Current capability gap matrix](docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md)
- [Product competitive memory](docs/research/PRODUCT_COMPETITIVE_MEMORY.md)
- [Risk-proportional delivery](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md)
- [AI delivery workflow](docs/engineering/AI_DELIVERY_WORKFLOW.md)
- [Feature work-packet template](docs/templates/FEATURE_WORK_PACKET.md)
- [Active/completed plan lifecycle](docs/plans/README.md)

UI, brand and infrastructure references:

- [MoneyFlow brand guidelines](docs/brand/MONEYFLOW_BRAND_GUIDELINES.md)
- [Canonical logo identity](docs/design/MONEYFLOW_LOGO.md)
- [AI-assisted UI/UX workflow](docs/AI_UIUX_WORKFLOW.md)
- [UX principles](docs/UX_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [Configuration contract](docs/configuration.md)
- [Supabase setup](docs/supabase-setup.md)
- [RLS verification](docs/security-rls-check.md)

Historical research remains useful as evidence but does not override current code, the current-project memory or accepted owner decisions. Every pull request targeting `main` must append one truthful entry to the pull-request memory log. A PR that changes implementation status must also update the affected row or section in the current-project memory.

## Runtime modes

- `authenticated`: Supabase Auth + PostgreSQL with RLS.
- `demo`: browser-local data for product exploration.

Runtime mode is explicit through `NEXT_PUBLIC_APP_MODE`; it is never inferred from missing credentials.

## Run locally

```bash
npm install
cp .env.example .env.local
# Fill explicit local values in .env.local
npm run dev
```

Open `http://localhost:3000`.

Production values live in Vercel Project Settings, never in committed `.env` files, TypeScript constants or `vercel.json`. Missing deployment configuration must fail validation instead of falling back to a guessed hostname.

## Quality checks

GitHub CI keeps stable required check names but selects heavy work from the changed paths. Pushes to `main` and manual runs execute the complete suite. See [risk-proportional delivery](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md).

```bash
# Fast repository-policy checks
npm run check:knowledge
npm run test:ci-policy

# Static, domain and build verification
npm run check:deployment-env
npm run check:architecture
npm run lint
npm run typecheck
npm run test
npm run build

# Database/RLS, requires Docker and only applies to the database boundary
npm run test:db

# Browser and responsive evidence, selected by affected runtime/UI paths
npm run test:e2e:install
npm run test:e2e
npm run test:ui-audit:pr
```

Each layer proves something different: build success does not prove RLS, browser usability or production behavior. Conversely, a database reset or visual audit adds no useful evidence to an unrelated documentation change.

## Change workflow

1. Create a focused branch.
2. Classify the change using `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
3. Use an inline/PR plan for bounded low-risk work; create a full work packet for financial, data, security, operational, multi-stage or cross-cutting work.
4. Audit the repository and relevant history.
5. Research unresolved external/product questions.
6. Define acceptance criteria, plan and small tasks proportional to the change.
7. Implement the smallest coherent vertical slice.
8. Update `docs/research/PR_MEMORY_LOG.md`; update `CURRENT_PROJECT_MEMORY.md` too when implementation status changed.
9. Open a pull request and evaluate the actual diff against the stated scope.
10. Require exact-head static, unit, database and browser gates only where the affected layer makes them relevant.
11. Review screenshot/artifact evidence for UI changes.
12. Squash merge and verify the exact affected production behavior when production behavior changed.
13. Move a full work packet to `docs/plans/completed/` after acceptance.

Do not push feature or fix commits directly to `main`. Do not create no-op commits to retrigger deployment.

## Current product scope

- Authentication: email/password, supported OAuth and recovery.
- Demo mode with browser-local data.
- Multiple accounts: cash, bank, e-wallet, credit and savings representations.
- Income, expense and balanced internal transfers.
- Edit, soft delete and recovery paths.
- Category budgets, recurring commitments, recurring income and savings goals.
- Weekly, monthly and yearly reports.
- CSV export and controlled import tooling.
- Responsive light/dark web UI.
- PostgreSQL ledger with RLS and pgTAP coverage.

VND is represented as integer đồng. Internal transfers never count as income or expense. Total assets are not automatically a spending budget, and missing planning data is never guessed.

## Current project phase

The owner direction is to continue maturing existing MoneyFlow capabilities toward competitive depth. Validation remains embedded in each workstream rather than acting as a global feature freeze.

Current priorities and exact completed/partial/absent status live in:

- [`docs/research/CURRENT_PROJECT_MEMORY.md`](docs/research/CURRENT_PROJECT_MEMORY.md);
- [`docs/research/PR_MEMORY_LOG.md`](docs/research/PR_MEMORY_LOG.md);
- [`docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md`](docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md).

Do not recreate a completed feature from an old issue body without checking current code and these sources first.
