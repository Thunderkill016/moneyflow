# MoneyFlow product principles

This is the current product truth. Historical research may describe older directions; when it conflicts with this document, this document wins until a reviewed specification changes it.

## Primary user

A Vietnamese individual who wants to manage their own money without accounting jargon, bank aggregation or a judgmental financial coach.

## Core jobs

1. Record income or expense quickly, especially on a phone.
2. Know current balances across active accounts.
3. Understand income, expense and where money went in the selected period.
4. Correct mistakes without corrupting the ledger.
5. Retain and export trustworthy data.

## Product character

- Calm, factual and non-judgmental.
- Manual-first and transparent about data quality.
- Useful with a small amount of setup.
- Vietnamese copy and integer VND are first-class requirements.
- Mobile usability is a release gate, not a later enhancement.

## Financial honesty

MoneyFlow must distinguish these concepts:

- **Total assets/balance:** money represented by active accounts.
- **Income and expense:** ledger activity in a period, excluding transfers.
- **Allocated money:** money assigned to goals or budgets but still part of total assets.
- **Commitments:** expected obligations, which may be unpaid or incomplete.
- **Spending plan:** a user-approved plan derived from sufficient income-cycle, obligation and reserve data.

The product must not infer a spending plan from total assets alone. Missing income dates, reserves, obligations or account intent remain unknown. Do not turn unknowns into confident recommendations.

## Current scope

- Email/password and supported OAuth authentication.
- Demo mode with browser-local data.
- Multiple accounts.
- Income, expense and balanced transfers.
- Edit, soft delete and recovery paths.
- Category budgets.
- Recurring commitments and recurring income templates.
- Savings goals.
- Weekly/monthly/yearly reporting.
- CSV export and controlled import tools.
- Responsive web UI with light/dark support.

## Explicit non-goals for the current phase

- Bank synchronization or Open Banking.
- AI financial advice or autonomous money decisions.
- OCR receipt processing as a core workflow.
- Family/shared finance.
- Business accounting, tax or invoicing.
- A complete YNAB-style envelope system.
- Native mobile applications before the web product proves daily usefulness.

A non-goal may only become scope through a new researched specification and human approval.

## Prioritization rule

Use this order when trade-offs conflict:

1. Data correctness and ownership safety.
2. Ability to complete the core transaction flow.
3. Mobile usability and accessibility.
4. Clear explanations and recovery from mistakes.
5. Performance and maintainability.
6. Visual polish.
7. New feature breadth.

## Evidence before features

A proposed feature must answer:

- What user problem was observed?
- What existing behavior or data supports the need?
- What products or official sources were researched?
- Which assumptions remain unknown?
- What is the smallest testable vertical slice?
- How will success and failure be observed?
- What must not be changed?

Ideas without evidence stay in research or backlog; they do not enter implementation automatically.

## Daily-use readiness

MoneyFlow is ready for real self-use only when:

- authentication and recovery complete on the production domain;
- transaction creation, editing and deletion are reliable on a physical phone;
- balances, income, expense and transfers reconcile correctly;
- export opens safely in common spreadsheet tools;
- no open P0/P1 defect blocks a core flow;
- the product is used for seven consecutive days without data loss or manual repair.

## Success for the current project phase

The near-term goal is not maximum feature count. It is proving that MoneyFlow can become the user's trusted daily ledger. New work should reduce uncertainty, improve correctness or remove friction in that daily loop.
