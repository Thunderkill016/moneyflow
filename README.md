# MoneyFlow

MoneyFlow is a **personal finance web app** — built first so the owner can track **income and expenses** and answer:

> **Hôm nay mình có thể chi bao nhiêu?**

Not a bank aggregator. Not an AI advisor. Not a startup “universal inbox” product (yet).  
Primary user: **you** — manage your own money cleanly.

This repository has a dashboard + transaction flow, Supabase Auth, and a protected PostgreSQL ledger. Without Supabase credentials it runs in local demo mode (browser storage).

## Autopilot (khi bạn ngủ)

Agent lấy **một** task `ready` (**TASK-100…125** — Wave thu chi MVP), code, lint/typecheck/test, commit, push.

**Luật:** [docs/AUTOPILOT_PLAN.md](docs/AUTOPILOT_PLAN.md) · [docs/research/05_PRODUCT_AND_ARCHITECTURE.md](docs/research/05_PRODUCT_AND_ARCHITECTURE.md) · [AGENTS.md](AGENTS.md)

```bash
cd /home/thunder/Code/moneyflow
bash scripts/agent-pick-task.sh      # phải ra TASK-100+
bash scripts/agent-daemon-start.sh
tail -f logs/agent/daemon.log
bash scripts/agent-daemon-stop.sh
```

Chi tiết: [AGENT_AUTOPILOT.md](AGENT_AUTOPILOT.md) · [AGENT_BACKLOG.md](AGENT_BACKLOG.md) · [AGENT_ROADMAP.md](AGENT_ROADMAP.md)

## Docs

- [Product focus (simple)](docs/PRODUCT.md) — what we build now vs later
- [UX research & redesign (Inbox-first)](docs/UX_RESEARCH_AND_REDESIGN.md) — audit đối thủ, IA, flows, decisions
- [Wireframes Inbox-first](docs/wireframes-inbox.md) — 24 màn hình low-fi
- [Competitor & open-source research](docs/COMPETITOR_AND_OSS_RESEARCH.md)
- [UX principles](docs/UX_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [Wireframes (legacy dashboard-era)](docs/wireframes.md)
- [Supabase setup](docs/supabase-setup.md)
- [RLS verification](docs/security-rls-check.md) — static + local pgTAP + manual checklist
- [Research archive](docs/RESEARCH_PRODUCT_STRATEGY.md)

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable real authentication and the database, follow [docs/supabase-setup.md](docs/supabase-setup.md).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build

# RLS surface (static migrations; no Docker) — see docs/security-rls-check.md
npm run check:rls
# Optional local Supabase pgTAP (needs Docker): npm run test:db

# Optional E2E smoke (Playwright): landing → demo → quick-add expense → insights → export
# First time: npm run test:e2e:install
npm run test:e2e
```

## Current scope

- Responsive dashboard
- "Có thể chi hôm nay" calculation
- Expense and income entry
- Browser persistence with validated local data in demo mode
- Supabase-backed accounts, categories, balances, and transaction feed for signed-in users
- Monthly budget progress and recent transactions
- Dedicated transaction manager with search and filters
- Safe transaction editing and confirmed deletion, including two-sided account transfers
- Account manager for cash, bank, e-wallet, credit card, and savings balances
- Secure account create/update/archive RPCs with last-active-account protection
- Monthly category budgets with ledger-derived progress and overspending states
- Budget-aware safe-to-spend calculation
- Recurring commitments that reserve unpaid bills and post real ledger expenses when paid
- Savings goals with earmarked balances and deadline-based daily saving guidance
- Goal-aware safe-to-spend calculation that protects planned savings
- Atomic account transfers with balanced source and destination ledger entries
- Weekly, monthly, and annual reports with period comparison, category breakdown, trends, and secure CSV export
- Unit tests for core financial calculations
- Email/password, Google OAuth, password reset, and sign-out flows
- Cookie-based Supabase SSR session refresh
- PostgreSQL ledger migration with Row Level Security
- Idempotent transaction creation, atomic editing, and soft-delete RPCs
- Server-side data access with authenticated transaction create/update/delete actions

## Not production-ready yet

Schema RLS is declared in migrations and checked statically (`npm run check:rls`) plus optional local pgTAP (`npm run test:db`). Two-user cross-tenant integration tests, receipt attachments, and fuller legal flows are still recommended before handling real financial data. See [docs/security-rls-check.md](docs/security-rls-check.md).
