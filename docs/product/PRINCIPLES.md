# MoneyFlow product principles

This is the current product truth. Historical research may describe older directions; when it conflicts with this document, this document wins until a reviewed specification changes it.

## Primary user

A Vietnamese individual who wants to manage their own money without accounting jargon, mandatory bank aggregation or a judgmental financial coach.

MoneyFlow may later support power users, households and advisers through optional modules. Those future personas must not make the default single-user daily ledger harder to understand.

## Core jobs

1. Record income or expense quickly, especially on a phone.
2. Know current balances across active accounts.
3. Understand income, expense and where money went in the selected period.
4. Correct mistakes without corrupting the ledger.
5. Retain and export trustworthy data.
6. Connect plans, obligations, goals and forecasts to explicit financial facts and assumptions.

## Product character

- Calm, factual and non-judgmental.
- Manual-first and transparent about data quality.
- Useful with a small amount of setup.
- Vietnamese copy and integer VND are first-class requirements.
- Mobile usability is a release gate, not a later enhancement.
- Advanced capability is progressively disclosed rather than placed in every user's daily path.
- Automation explains what it changed, why it changed it and how to reverse or correct it.

## Financial honesty

MoneyFlow must distinguish these concepts:

- **Total assets/balance:** money represented by active accounts.
- **Income and expense:** ledger activity in a period, excluding transfers.
- **Allocated money:** money assigned to goals or budgets but still part of total assets.
- **Commitments:** expected obligations, which may be unpaid or incomplete.
- **Spending plan:** a user-approved plan derived from sufficient income-cycle, obligation and reserve data.
- **Financial fact:** a posted ledger record or explicitly sourced balance/valuation observation.
- **Expectation:** a planned occurrence that has not yet become a posted fact.
- **Assumption:** a user-owned scenario input.
- **Projection:** a recalculable output derived from facts, expectations and assumptions.
- **Suggestion:** a rule/model result that remains reviewable until the relevant contract allows automatic action.

The product must not infer a spending plan from total assets alone. Missing income dates, reserves, obligations or account intent remain unknown. Do not turn unknowns into confident recommendations.

A projection must expose its coverage and assumptions. It may inform planning, but it is not a promise or an autonomous financial decision.

## Current released scope

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

The exact current implementation status lives in `docs/research/CURRENT_PROJECT_MEMORY.md`. The released MVP definition remains in `docs/MVP_DEFINITION.md`.

## Long-term product horizon

The owner approved a comprehensive personal-finance capability horizon on 2026-08-03. MoneyFlow may ultimately expand through these optional layers:

- **Core:** ledger trust, review, reconciliation, correction, tags, export and recovery;
- **Plan:** multiple budgeting methods, recurring lifecycle, goals, debt planning, forecast and scenarios;
- **Understand:** flexible reports, dimensions, drill-down, dashboards, attention and net worth;
- **Automate:** imports, deterministic rules, APIs, integrations and optional provider feeds;
- **Wealth:** assets, liabilities, loans, investments and multi-currency;
- **Together:** household ownership, permissions and collaboration;
- **Optional intelligence:** explainable suggestions and natural-language exploration with opt-out and deterministic fallback.

`docs/product/MONEYFLOW_PRODUCT_VISION.md` selects the product shape. `docs/research/GLOBAL_PERSONAL_FINANCE_CAPABILITY_ATLAS.md` records the horizon. `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md` defines dependency and migration order.

A capability appearing in the horizon is not an implementation commitment. Each high-risk feature still requires a researched specification, owner approval, financial/security contract, migration and rollback plan, and evidence that it solves a real problem.

## Deferred from the current default experience

The following are not part of the current default daily ledger and must not be added through incidental feature work:

- Bank synchronization or Open Banking.
- Probabilistic or generative AI behavior.
- OCR receipt processing as a core workflow.
- Family/shared finance.
- Business accounting, tax or invoicing.
- Investments and portfolio accounting.
- Multi-currency accounting.
- A complete YNAB-style envelope system.
- Native mobile applications before the web product proves daily usefulness.

These are no longer permanent product prohibitions. They are separately gated future modules. A new researched specification and explicit human approval are mandatory before implementation, and the default Core must remain usable without them.

## Prioritization rule

Use this order when trade-offs conflict:

1. Data correctness and ownership safety.
2. Ability to complete the core transaction flow.
3. Mobile usability and accessibility.
4. Clear explanations and recovery from mistakes.
5. Trust depth: review, reconciliation and traceability.
6. Observed repeated friction from self-use or user research.
7. Connected planning and understanding.
8. Performance and maintainability.
9. Visual polish.
10. Speculative feature breadth.

## Evidence before features

A proposed feature must answer:

- What user problem was observed?
- What existing behavior or data supports the need?
- What products or official sources were researched?
- Which assumptions remain unknown?
- What is the smallest testable vertical slice?
- How will success and failure be observed?
- Which financial, ownership, currency or provider semantics change?
- What must not be changed?

Ideas without evidence stay in the capability horizon, research or backlog; they do not enter implementation automatically.

## Daily-use readiness

MoneyFlow is ready for real self-use only when:

- authentication and recovery complete on the production domain;
- transaction creation, editing and deletion are reliable on a physical phone;
- balances, income, expense and transfers reconcile correctly;
- export opens safely in common spreadsheet tools;
- no open P0/P1 defect blocks a core flow;
- real daily use surfaces no data loss and needs no manual repair.

**Withdrawn 2026-08-12:** the earlier form of the last condition required *seven
consecutive days* of use. The owner removed that duration gate after the
physical-phone run, and **nothing replaces it** — no shorter count, no substitute
streak. Real daily use is still how defects get found, and the physical-phone run is
the evidence of that; it is simply no longer counted in days. This document is
higher precedence than any work packet, so the withdrawal is recorded here rather
than only in `docs/plans/active/moneyflow-trust-prove.md`.

Daily-use evidence remains necessary while broader modules are developed. Adding feature breadth does not substitute for trust and retention evidence.

## Success for the current project phase

The near-term goal is not maximum feature count. It is to prove that MoneyFlow can remain the user's trusted daily ledger while selected long-term modules add connected value.

New work should do at least one of the following:

- reduce uncertainty or money risk;
- improve correctness, review or recovery;
- remove repeated friction observed in use;
- connect an existing plan, report or automation to trustworthy ledger data;
- establish a prerequisite for an owner-selected future module without exposing premature complexity.

The repository may research the full global capability horizon, but delivery remains bounded, evidence-driven and dependency-ordered.