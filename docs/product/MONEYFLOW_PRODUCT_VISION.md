# MoneyFlow product vision

- **Status:** binding long-term product direction
- **Owner decision:** 2026-08-03
- **Current product truth:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Capability research:** `docs/research/GLOBAL_PERSONAL_FINANCE_CAPABILITY_ATLAS.md`
- **Architecture sequence:** `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md`

## 1. Vision

MoneyFlow will grow from a trustworthy Vietnamese manual-first income-and-expense ledger into a comprehensive personal-finance platform that helps a person:

1. capture and verify financial facts;
2. understand current balances and historical cash flow;
3. plan budgets, obligations, goals and debt;
4. forecast future cash positions from explicit assumptions;
5. automate repetitive work without losing control;
6. track assets, liabilities and wealth;
7. collaborate safely when the user chooses;
8. retain, export and extend their own data.

The goal is not to copy every screen from every finance product. The goal is to combine the strongest proven capabilities into one coherent system whose complexity is revealed only when useful.

## 2. Product promise

> Every number has a source. Every plan states its assumptions. Every automation can be reviewed. The user remains in control of their data and decisions.

MoneyFlow is calm, factual and non-judgmental. It may explain, compare and project. It does not shame spending, invent missing information or make autonomous financial decisions.

## 3. Primary users

### 3.1 Daily ledger user

A Vietnamese individual who wants to record income, expense and transfers quickly, know where money is held and correct mistakes without accounting jargon.

### 3.2 Planner

A user who wants budgets, recurring obligations, goals, debt plans and upcoming cash requirements connected to actual transactions.

### 3.3 Power user

A user who wants custom reports, tags, rules, imports, saved views, API access, multi-currency or wealth tracking without losing the simple daily loop.

### 3.4 Household or adviser participant

A future user who needs scoped collaboration, shared and private financial areas, review and audit. This persona is horizon-only until the ownership model is redesigned and validated.

## 4. Product laws

1. **Ledger before dashboard.** Financial facts are the source; summaries are derived.
2. **Correctness before breadth.** A new module cannot weaken transfer, split, ownership, integer-money or recovery invariants.
3. **Progressive disclosure.** New users see Core. Advanced modules appear after explicit choice or relevant data.
4. **Facts, expectations, assumptions and projections are distinct.** They may interact but never masquerade as one another.
5. **Explainable automation.** The user can see why a rule, match, suggestion or alert occurred.
6. **Safe correction.** High-impact edits are bounded, previewed, atomic where needed and recoverable.
7. **No hidden lock-in.** Export, backup and future APIs are first-class trust features.
8. **Vietnamese-first, globally capable.** Vietnamese language, VND and local mental models remain first-class while architecture may later support other currencies and regions.
9. **Web-first until evidence says otherwise.** Native applications are not a prerequisite for comprehensive capability.
10. **A capability horizon is not an implementation commitment.** Each high-risk module still needs a separate accepted specification and owner decision.

## 5. Product system

### MoneyFlow Core — know and trust the ledger

Default for every user:

- accounts and balances;
- income, expense, transfer and split transactions;
- review, correction, soft delete and restore;
- categories, tags and search;
- reconciliation;
- trustworthy export and backup.

Core must remain usable without budgets, bank sync, AI, investments or household setup.

### MoneyFlow Plan — give future money explicit jobs

Optional planning layer:

- multiple budget methods;
- recurring income, bills and subscriptions;
- goals, reserves and debt plans;
- financial calendar;
- forecasts and scenarios.

Planning never changes account balances directly. It creates allocations, expectations and projections that are reconciled against ledger facts.

### MoneyFlow Understand — answer questions with traceable evidence

- reports and arbitrary query ranges;
- dimensions and drill-down;
- cash flow, savings rate and budget variance;
- net worth and debt progress;
- configurable dashboards;
- attention items tied to underlying records.

Every aggregate must expose the contributing records and calculation boundary.

### MoneyFlow Automate — reduce repetitive work safely

- imports and Inbox;
- mapping presets and batch management;
- deterministic rules;
- optional provider feeds;
- public API, webhooks and integrations;
- explainable suggestions.

Automate proposes or performs only actions allowed by its confidence and permission contract. Failure never silently falls back to a different source of truth.

### MoneyFlow Wealth — connect daily cash flow with the balance sheet

- assets and liabilities;
- loans and credit;
- investments and holdings;
- valuation history;
- multi-currency;
- net-worth composition.

Wealth data has its own accounting and valuation semantics. It must not be faked through ordinary expense categories.

### MoneyFlow Together — collaborate without losing ownership

- household/workspace membership;
- private and shared accounts;
- scoped roles;
- transaction review and comments;
- shared plans and goals;
- adviser read-only access;
- activity history and separation workflows.

Together begins only after a dedicated ownership threat model and migration design.

## 6. Progressive experience

### Level 1 — start a ledger

The user creates an account, records a transaction and sees the correct balance. No planning setup is required.

### Level 2 — keep it trustworthy

The product surfaces unreviewed transactions, correction, reconciliation and export only when useful.

### Level 3 — plan the next period

Budgets, recurring obligations and goals become available after the user has enough data or explicitly enables planning.

### Level 4 — understand and forecast

Reports, custom dashboards and forecasts use the user's existing facts and explicit assumptions.

### Level 5 — automate and extend

Rules, imports, APIs and provider feeds reduce repetitive work after review and recovery paths are proven.

### Level 6 — manage wealth or collaborate

Investments, multi-currency and household features remain modular and do not change the default daily experience.

## 7. Success measures

### Trust

- no unexplained balance changes;
- percentage of accounts reconciled or explicitly acknowledged;
- correction success without manual database repair;
- export/restore success;
- user-reported confidence in balances.

### Daily use

- time to first transaction;
- median capture time on a physical phone;
- transactions recorded per active day;
- day-2, day-7 and day-30 retention;
- percentage of sessions that complete the intended task without support.

### Planning value

- recurring matches completed;
- budgets or goals revisited after creation;
- percentage of projections with explicit assumptions;
- alerts acted on, dismissed or snoozed rather than ignored.

### Product breadth health

- advanced modules enabled intentionally;
- Core completion does not regress as breadth grows;
- feature discovery without navigation overload;
- support burden and escaped money defects by module.

### Business evidence

- users who voluntarily continue after trial;
- willingness to pay;
- conversion from landing to first trusted ledger week;
- reasons users switch from spreadsheets or other apps;
- cost to operate providers and support per active user.

No repository test can substitute for these measurements.

## 8. Prioritization

When candidate features compete, use this order:

1. known money correctness or data-loss defect;
2. inability to complete the daily ledger loop;
3. trust and correction depth;
4. repeated friction observed in self-use or user research;
5. connected planning and understanding;
6. automation that reduces proven repetitive work;
7. wealth, collaboration and connectivity after prerequisites;
8. visual polish and speculative breadth.

A feature's popularity in another app is not evidence that MoneyFlow should build it next.

## 9. Current strategic waves

### Wave 1 — Ledger Trust

- transaction review and bounded correction;
- reconciliation decision and implementation;
- split-line correction;
- payee/merchant normalization;
- mutation audit and saved review views.

### Wave 2 — Connected Planning

- budget history, copy and explicit rollover;
- recurring occurrence lifecycle and matching;
- goal contribution history;
- debt payoff planning;
- connections among plan records and ledger facts.

### Wave 3 — Deep Understanding

- arbitrary report ranges;
- account/type/tag/merchant dimensions;
- drill-down and saved reports;
- custom dashboards;
- cash flow, savings rate and net-worth baseline.

### Wave 4 — Forecast

- financial calendar;
- account balance projection;
- low-balance attention;
- scenarios and actual-versus-forecast review.

### Wave 5 — Automation and Ownership

- persisted deterministic rules;
- mapping presets and batch management;
- versioned backup/restore;
- scoped public API and webhooks.

### Wave 6 — Wealth

- assets and liabilities;
- loans and credit semantics;
- investment holdings and valuation;
- multi-currency architecture.

### Wave 7 — Together and Connectivity

- household ownership and roles;
- shared/private financial areas;
- adviser access;
- selected bank-data providers after market, cost and operational research.

### Wave 8 — Optional Intelligence

- explainable classification and recurring suggestions;
- natural-language exploration over the user's own records;
- confidence and source-linked answers;
- complete opt-out and deterministic fallback.

Waves represent dependency order, not fixed delivery dates. Observed evidence may reorder bounded slices.

## 10. Current boundaries

The following are approved as long-term research and product horizons, but are **not individually authorized implementation work** by this document alone:

- bank synchronization;
- probabilistic or generative AI;
- household finance;
- investment tracking;
- multi-currency;
- native mobile applications;
- credit scoring, tax, insurance or regulated financial advice.

Each requires its own specification, owner approval, privacy/security review, architecture decision, operational cost model, migration and rollback.

## 11. Relationship to the released MVP

`docs/MVP_DEFINITION.md` remains the authoritative definition of the MVP released on 2026-08-03. It proves what the first release required. It is not the final definition of MoneyFlow and must not be used to reject an owner-approved future module solely because that module was once an MVP non-goal.

Current implementation claims still come only from merged code, migrations, tests and `CURRENT_PROJECT_MEMORY.md`. This vision describes direction, not current behavior.