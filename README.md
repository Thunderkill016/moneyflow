# MoneyFlow

**MoneyFlow** is a Vietnamese personal income-and-expense web ledger: multiple accounts, fast manual capture, clear balances and period reporting, with user-owned export. Calm, factual and non-judgmental.

Core jobs:

1. Record income, expense or transfer quickly.
2. Know balances across active accounts.
3. Understand income, expense and where money went this month.
4. Correct mistakes and export trustworthy data.

MoneyFlow is not currently a bank aggregator, AI financial adviser, business-accounting product or native mobile application. Paste, import, inbox and rules are optional advanced capture tools, not the product identity.

## Sources of truth

Start here before non-trivial work:

- [Agent entrypoint](AGENTS.md)
- [Architecture map](ARCHITECTURE.md)
- [Product principles](docs/product/PRINCIPLES.md)
- [MVP definition and readiness gates](docs/MVP_DEFINITION.md)
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

Historical research remains useful as evidence but does not override the current product and architecture sources of truth.

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

```bash
npm run check:knowledge
npm run check:deployment-env
npm run lint
npm run typecheck
npm run test
npm run build

# Database/RLS, requires Docker
npm run test:db

# Browser and responsive evidence
npm run test:e2e:install
npm run test:e2e
npm run test:ui-audit:pr
```

Each layer proves something different: build success does not prove RLS, browser usability or production behavior.

## Change workflow

Every non-trivial change follows this path:

1. Create a focused branch.
2. Copy `docs/templates/FEATURE_WORK_PACKET.md` to `docs/plans/active/<slug>.md`.
3. Audit the repository and relevant history.
4. Research unresolved external/product questions.
5. Define acceptance criteria, plan and small tasks.
6. Implement the smallest coherent vertical slice.
7. Open a pull request and evaluate the diff against the work packet.
8. Require static, unit, database and browser gates as applicable.
9. Review screenshot/artifact evidence for UI changes.
10. Squash merge and verify the exact production deployment.
11. Move the packet to `docs/plans/completed/`.

Do not push feature or fix commits directly to `main`. Do not create no-op commits to retrigger deployment.

## Current product scope

- Authentication: email/password, supported OAuth and recovery.
- Demo mode with browser local storage.
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

The near-term goal is to prove MoneyFlow can become the owner's trusted daily ledger:

- complete the readiness gates in [`docs/MVP_DEFINITION.md`](docs/MVP_DEFINITION.md);
- verify core flows on a physical phone;
- self-use for seven consecutive days;
- fix P0/P1 defects before feature expansion;
- improve reconciliation, provenance and auditability based on real use.
