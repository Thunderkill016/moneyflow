# MoneyFlow

MoneyFlow is a **personal finance web app** — built first so the owner can track **income and expenses** and answer:

> **Hôm nay mình có thể chi bao nhiêu?**

Not a bank aggregator. Not an AI advisor. Not a startup “universal inbox” product (yet).  
Primary user: **you** — manage your own money cleanly.

This repository has a dashboard + transaction flow, Supabase Auth, and a protected PostgreSQL ledger. Without Supabase credentials it runs in local demo mode (browser storage).

## Autopilot (khi bạn ngủ)

Agent tự lấy task từ `AGENT_BACKLOG.md` (Inbox-first wireframe order), code, lint/typecheck/test, commit, push `origin main`.

**Yêu cầu:** `grok` trong PATH (`~/.local/bin/grok`, đã login); máy không sleep; network cho model API + `git push`.

```bash
cd /home/thunder/Code/moneyflow
chmod +x scripts/agent-*.sh

# Smoke: task tiếp theo (ghi logs/agent/.next-task.json)
bash scripts/agent-pick-task.sh

# Một cycle (refill → pick → headless agent)
bash scripts/agent-orchestrator.sh

# Daemon liên tục (systemd user service, fallback nohup)
bash scripts/agent-daemon-start.sh

# Xem log
tail -f logs/agent/daemon.log

# Dừng
bash scripts/agent-daemon-stop.sh
```

**Logs:** `logs/agent/daemon.log`, `logs/agent/*_TASK-*.log`, circuit breaker `logs/agent/.orchestrator-state` (3 FAIL → nghỉ dài; reset: `rm -f logs/agent/.orchestrator-state`).

Chi tiết: [AGENT_AUTOPILOT.md](AGENT_AUTOPILOT.md) · hàng đợi: [AGENT_BACKLOG.md](AGENT_BACKLOG.md) · roadmap pool: [AGENT_ROADMAP.md](AGENT_ROADMAP.md)

## Docs

- [Product focus (simple)](docs/PRODUCT.md) — what we build now vs later
- [UX research & redesign (Inbox-first)](docs/UX_RESEARCH_AND_REDESIGN.md) — audit đối thủ, IA, flows, decisions
- [Wireframes Inbox-first](docs/wireframes-inbox.md) — 24 màn hình low-fi
- [Competitor & open-source research](docs/COMPETITOR_AND_OSS_RESEARCH.md)
- [UX principles](docs/UX_PRINCIPLES.md)
- [Design system](docs/design-system.md)
- [Wireframes (legacy dashboard-era)](docs/wireframes.md)
- [Supabase setup](docs/supabase-setup.md)
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

# Optional E2E smoke (Playwright): landing → register skip → paste → inbox
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

Full RLS integration tests, receipt attachments, and legal/privacy flows are still required before handling real financial data.
