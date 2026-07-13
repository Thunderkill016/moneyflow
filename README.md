# MoneyFlow

MoneyFlow is a Vietnamese-first personal finance web app. Its core experience answers one useful question: **How much can I safely spend today?**

This repository contains an interactive dashboard and transaction flow, plus Supabase Auth and a protected PostgreSQL ledger schema. Without Supabase credentials, it automatically runs in local demo mode and stores demo transactions in the browser.

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
npm run build
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
