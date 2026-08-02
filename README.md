# MoneyFlow

**MoneyFlow** is a Vietnamese personal income-and-expense web ledger: multiple accounts, fast manual capture, clear balances and period reporting, with user-owned import/export. Calm, factual and non-judgmental.

Core jobs:

1. Record income, expense, split expense or transfer quickly.
2. Know balances across active accounts.
3. Understand income, expense, net and where money went for a stated period.
4. Correct mistakes and export trustworthy data.
5. Plan with budgets, recurring commitments/income and savings goals.

MoneyFlow is not currently a bank aggregator, AI financial adviser, business-accounting product or native mobile application. Paste, import, Inbox and rules are optional advanced capture tools, not the product identity.

## Sources of truth

Start here before bounded or high-risk work:

- [Agent entrypoint](AGENTS.md)
- [Current project memory](docs/research/CURRENT_PROJECT_MEMORY.md)
- [Architecture map](ARCHITECTURE.md)
- [Product principles](docs/product/PRINCIPLES.md)
- [MVP definition and readiness gates](docs/MVP_DEFINITION.md)
- [Competitive capability gap matrix](docs/research/PRODUCT_CAPABILITY_GAP_MATRIX.md)
- [Product competitive memory](docs/research/PRODUCT_COMPETITIVE_MEMORY.md)
- [Risk-proportional delivery](docs/engineering/RISK_PROPORTIONAL_DELIVERY.md)
- [AI delivery workflow](docs/engineering/AI_DELIVERY_WORKFLOW.md)
- [Feature work-packet template](docs/templates/FEATURE_WORK_PACKET.md)
- [Active/completed plan lifecycle](docs/plans/README.md)

Use `CURRENT_PROJECT_MEMORY.md` for current implementation status. Old issue bodies, competitor tables and design concepts remain useful evidence but do not override merged code or the current memory.

UI, brand and infrastructure references:

- [MoneyFlow brand guidelines](docs/brand/MONEYFLOW_BRAND_GUIDELINES.md)
- [Canonical logo identity](docs/design/MONEYFLOW_LOGO.md)
- [AI-assisted UI/UX workflow](docs/AI_UIUX_WORKFLOW.md)
- [UX principles](docs/UX_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [Configuration contract](docs/configuration.md)
- [Supabase setup](docs/supabase-setup.md)
- [RLS verification](docs/security-rls-check.md)

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
npm run check:css-ownership
npm run check:architecture
npm run lint
npm run typecheck
npm run test
npm run build

# Database/RLS, requires Docker and applies to database boundaries
npm run test:db

# Browser and responsive evidence, selected by affected runtime/UI paths
npm run test:e2e:install
npm run test:e2e
npm run test:ui-audit:pr

# Load-profile contracts and approved environment runs
npm run test:load:contracts
npm run test:load:public
npm run test:load:dashboard
```

Each layer proves something different. Build success does not prove RLS, browser usability, provider configuration or production correctness.

## Change workflow

1. Create a focused branch.
2. Read `CURRENT_PROJECT_MEMORY.md` and inspect the affected code before trusting backlog status.
3. Classify the change using `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`.
4. Use an inline/PR plan for bounded low-risk work; create a full work packet for financial, data, security, operational, multi-stage or cross-cutting work.
5. Research only unresolved external/product questions.
6. Define acceptance criteria, risks and rollback proportional to the change.
7. Implement the smallest coherent vertical slice.
8. Open a pull request and evaluate the actual diff against the scope.
9. Run exact-head risk-selected static, unit, database and browser gates.
10. Review screenshot/artifact evidence for UI changes.
11. Verify exact affected production/provider behavior when it changed.
12. Update `CURRENT_PROJECT_MEMORY.md` when implementation status changes.
13. Move a full work packet to `docs/plans/completed/` after merge and acceptance.

Do not push feature or fix commits directly to `main`. Do not create no-op commits to retrigger deployment.

## Current merged product scope

- Authentication: email/password, supported OAuth, recovery and optional CAPTCHA token plumbing.
- Explicit authenticated and browser-local demo modes.
- Accounts: cash, bank, e-wallet, credit and savings representations; add/edit/archive/restore; per-currency totals.
- Transactions: income, expense, balanced transfer and split expense.
- Search and filters by text, kind, account and category.
- Edit, soft delete, undo and restore.
- Dashboard: bounded period/recent activity, balances and planning state through one authenticated bundle RPC with fallback.
- Categories and current-month category budgets.
- Recurring commitments and recurring income with current-month occurrence-to-transaction linkage.
- Savings goals with target, allocation, deadline and planned-daily pace.
- Reports: week/month/year, previous comparable period, category shares and trends.
- Export: period CSV plus date-range transaction/candidate/all CSV or JSON.
- Controlled CSV/XLSX/PDF import, Inbox review, provenance, dry-run, duplicate/transfer planning and atomic approval.
- Responsive light/dark web UI with broad Playwright/WebKit/rich-VND coverage.
- PostgreSQL ledger with RLS, pgTAP, security scanning and risk-proportional CI.

VND is represented as integer đồng. Internal transfers never count as income or expense. Non-VND tracking is separated from VND totals; MoneyFlow does not perform FX conversion. Total assets are not automatically a spending budget, and missing planning data is never guessed.

## Current project phase

MoneyFlow is in **competitive capability maturation**.

Development continues on existing modules; validation is embedded in each workstream rather than used as a global feature freeze.

Highest-priority remaining work:

1. account reconciliation;
2. provider-side public-beta controls;
3. transaction review, date/amount filters and bounded bulk correction;
4. account register/detail;
5. budget history and drill-down;
6. recurring history/lifecycle/matching;
7. goal contribution history/lifecycle;
8. report arbitrary ranges and transaction drill-down;
9. import batch/mapping UX and authenticated deterministic rules;
10. physical-device, staging-load and large-ledger acceptance.

See the [current project memory](docs/research/CURRENT_PROJECT_MEMORY.md) for exact completed, partial, absent, external-pending and candidate-only status.
