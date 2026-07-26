# MoneyFlow — current product focus

The detailed product contract lives in [`docs/product/PRINCIPLES.md`](./product/PRINCIPLES.md). This page is the short operational view.

## Goal now

Build a trustworthy personal income-and-expense ledger that the owner can use every day on a phone.

The product should make four things easy:

1. record income, expense or transfer quickly;
2. know balances across active accounts;
3. understand income, expense and where money went;
4. correct and export data without losing trust in the ledger.

## Current priorities

1. Complete production readiness and real-device checks.
2. Use the product for seven consecutive days.
3. Fix reproducible P0/P1 defects before adding features.
4. Improve data trust through import provenance, reconciliation and auditability.
5. Improve UI/UX through researched vertical slices and cross-device evidence.

## Financial boundary

Total assets are not a spending budget. Budgets, commitments, savings goals and recurring income are planning inputs with different meanings.

MoneyFlow must not present a daily spending recommendation until a researched planning model has reliable income-cycle, obligation, reserve and account-intent data. Unknown inputs remain unknown; they are not replaced with assumptions.

## Current scope

- Supabase authentication and demo mode.
- Multiple accounts.
- Income, expense and balanced transfers.
- Edit, soft delete and recovery paths.
- Category budgets.
- Recurring commitments and recurring income templates.
- Savings goals.
- Weekly, monthly and yearly reports.
- CSV export and controlled import tools.
- Responsive web interface with light/dark support.

## Not now

- Bank synchronization or Open Banking.
- AI financial advice.
- OCR as a core workflow.
- Family/shared finance.
- Business accounting.
- Native mobile apps.
- A full envelope-budgeting system.

These require a new researched specification and explicit human approval.

## Decision rule

Every proposed change must answer:

> How does this make the ledger more correct, safer or easier to use every day?

Feature breadth and visual novelty do not outrank correctness, mobile usability or user trust.

## Ready for daily use

- Production login and recovery work on the correct domain.
- A physical phone can complete the transaction flow without blocked controls.
- Balances, transfers and period totals reconcile.
- CSV export opens safely in common spreadsheet tools.
- No open P0/P1 defect blocks a core flow.
- Seven consecutive days of self-use complete without data loss or manual repair.
