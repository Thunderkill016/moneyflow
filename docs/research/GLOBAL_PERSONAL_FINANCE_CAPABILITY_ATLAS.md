# Global personal-finance capability atlas

- **Status:** active long-term research authority
- **Prepared:** 2026-08-03
- **Owner direction:** MoneyFlow may ultimately adopt the strongest proven personal-finance capabilities worldwide, but listing a capability does not authorize implementation.
- **Current implementation authority:** `docs/research/CURRENT_PROJECT_MEMORY.md`
- **Binding product selection:** `docs/product/MONEYFLOW_PRODUCT_VISION.md`
- **Architecture sequencing:** `docs/architecture/TARGET_ARCHITECTURE_ROADMAP.md`

## 1. Purpose

This atlas answers a different question from the MVP definition and the current-main gap matrix:

> What is the full set of high-value personal-finance capabilities MoneyFlow should understand, evaluate and potentially deliver over its lifetime?

It is not a backlog, release promise or permission to copy a competitor. A capability enters implementation only through an accepted specification, explicit owner selection, financial/security constraints, migration and rollback design, and evidence from self-use or users.

## 2. Evidence and adoption rules

### Evidence labels

| Label | Meaning |
|---|---|
| **Observed official capability** | Described by the product's own current documentation or help center. |
| **MoneyFlow fit** | Product judgment about applicability to MoneyFlow. |
| **Prerequisite** | Domain, evidence or operational condition needed before implementation. |
| **Deferred horizon** | Worth understanding, but not selected for the current delivery wave. |
| **Rejected pattern** | The underlying problem may matter, but the observed product behavior should not be adopted. |

### Adoption rules

1. Copy the problem-solving principle, never another product's code, visual identity or workflow wholesale.
2. Keep one calm, manual-first Core. Advanced capabilities appear through progressive disclosure.
3. Financial facts, user assumptions and projections are separate data classes.
4. Every automation is explainable, previewable, reversible and bounded by confidence.
5. Bank feeds are an input adapter, never the ledger source of truth.
6. A capability that changes ownership, currency, accounting or financial meaning receives its own architecture decision and migration plan.
7. Product breadth never outranks correctness, recovery, mobile capture or user trust.

## 3. Reference products and retained lessons

| Product family | Official capability evidence retained | MoneyFlow lesson | Do not inherit automatically |
|---|---|---|---|
| Actual Budget | reconciliation, schedules, ordered rules, reports, user-owned/self-hosted data | build a trustworthy register with explicit states and deterministic automation | local-first sync architecture or AGPL implementation code |
| YNAB | targets, zero-based planning, loan planner, reports and group sharing | connect plans to concrete funding requirements and debt outcomes | force every user into one budgeting philosophy |
| Monarch Money | flex/category budgets, goals, transaction review, net worth and household collaboration | support multiple planning styles and shared review | bank-provider breadth as an immediate dependency |
| PocketSmith | calendar forecasts, scenarios, account projections and multi-currency | make future cash position explorable and assumption-aware | present long-range forecasts as certainty |
| Lunch Money | tags, recurring, multi-currency, net worth and OpenAPI-first developer access | design for extensibility and portable user data | expose unstable internal schemas as public contracts |
| Copilot Money | review-first transactions, recurring/subscription attention and custom alerts | create an attention layer that closes actionable review work | opaque AI or judgmental recommendations |
| Tiller | reviewable transaction feeds, templates, split tools and user-controlled analysis | preserve user ownership and customizable views | turn MoneyFlow into a spreadsheet product |
| Firefly III | deterministic rule actions, bills, goals/piggy banks and accounting-rich records | learn explicit linking and audit-oriented workflows | ERP complexity or AGPL code reuse |

### Official sources reviewed

- Actual reconciliation: https://actualbudget.org/docs/accounts/reconciliation/
- Actual schedules: https://actualbudget.org/docs/schedules/
- Actual rules: https://actualbudget.org/docs/budgeting/rules/
- YNAB features and targets: https://www.ynab.com/features and https://www.ynab.com/features/goal-tracking
- YNAB debt management: https://www.ynab.com/features/debt-management
- Monarch getting started and budgeting: https://help.monarchmoney.com/hc/en-us/articles/360048393272-Getting-Started-Guide
- Monarch collaboration: https://www.monarchmoney.com/features/collaboration
- PocketSmith forecasting and scenarios: https://learn.pocketsmith.com/article/506-calendar-forecasting and https://learn.pocketsmith.com/article/1248-everything-you-need-to-know-about-scenarios-in-pocketsmith
- PocketSmith multi-currency: https://learn.pocketsmith.com/article/513-multi-currency
- Lunch Money features and developer API: https://lunchmoney.app/features and https://lunchmoney.app/developers
- Copilot review, recurring and alerts: https://help.copilot.money/en/articles/11780342-copilot-money-for-web, https://help.copilot.money/en/articles/9778259-recurrings-tab-overview and https://www.copilot.money/faq
- Tiller feeds and templates: https://help.tiller.com/en/articles/3279649-what-is-tiller-and-how-does-it-work and https://help.tiller.com/en/articles/3278731-using-the-tiller-money-feeds-add-on-for-google-sheets
- Firefly III rules and license boundary: https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/ and https://docs.firefly-iii.org/explanation/more-information/license/

## 4. Capability horizon

### 4.1 Ledger trust and transaction operations

#### Horizon capabilities

- Income, expense, transfer, refund, adjustment and split transaction semantics.
- Pending, cleared, reviewed and reconciled states with explicit meanings.
- Statement reconciliation, exact difference, lock, reopen and adjustment history.
- Multi-select with bounded, atomic correction and preview.
- Split-line correction without double counting.
- Payee/merchant normalization separated from raw imported description.
- Tags, notes, attachments and user-defined metadata.
- Soft delete, restore and versioned mutation history.
- Search, saved filters, register views and keyboard-efficient review.
- Non-sensitive financial mutation audit.

#### MoneyFlow decision

**Highest priority.** The ledger is the foundation for every later plan, report, forecast and automation. PR #255 is a valid candidate slice for review state and bounded category correction. Reconciliation remains a separate owner decision because PR #222 is verified unmerged and needs current-main evaluation.

#### Prerequisites

- Stable logical transaction identity.
- Entry-level invariants for transfers and splits.
- Ownership-safe RPCs and tenant-isolation tests.
- A defined relationship among `reviewed`, `cleared` and `reconciled`; they must not collapse into one flag.

### 4.2 Accounts, balances and liabilities

#### Horizon capabilities

- Cash, bank, e-wallet, savings, credit card, loan, asset and investment account types.
- Account register, balance history, archive/close and opening-balance provenance.
- Credit-card statement cycles, due dates, utilization and payment linking.
- Loan principal, interest, payment schedule and extra-payment effects.
- Manual assets and liabilities with valuation history.
- Account groups and user-defined purpose labels.
- Balance alerts and stale-account detection.

#### MoneyFlow decision

Expand from current account representations only when the accounting semantics are explicit. Credit, loans and investments must not be modeled as cosmetic account-type labels.

### 4.3 Budgeting methods

#### Horizon capabilities

- Category budgeting.
- Flex or group-level budgeting.
- Zero-based/envelope allocation as an optional method.
- Weekly, monthly, pay-cycle and custom periods.
- Rollover policies: none, positive-only, full balance or explicit cap.
- Copy from previous period and reusable templates.
- Spending targets, savings targets and sinking funds.
- Planned versus actual, variance and drill-down.
- Mid-period reallocation with history.
- Target snooze/skip for one period.
- Income-plan coverage and unallocated-money explanation.

#### MoneyFlow decision

Support multiple methods through one planning contract rather than mutually incompatible modules. The default remains simple category budgeting; envelope behavior is opt-in and must not redefine account balances.

#### Prerequisites

- Period and allocation model.
- Explicit treatment of rollover and overspending.
- Separation of account assets from allocated money.
- Real user evidence before adding method complexity.

### 4.4 Recurring cash flow, bills and subscriptions

#### Horizon capabilities

- One-time and recurring expected income/expense/transfer.
- Exact, approximate or ranged expected amount.
- Multiple dates, flexible frequencies, end dates and skip/pause.
- Weekend/business-day adjustment policy.
- Auto-post or require approval.
- Matching between expectation and observed transaction.
- Suggested recurrence based on history.
- Upcoming, due, paid, missed, skipped and archived states.
- Bill calendar and 7/14/30-day cash requirement.
- Subscription detection, price-change attention and cancellation record.

#### MoneyFlow decision

Upgrade current recurring templates into an occurrence lifecycle. Expectations never become financial facts until posted or matched to a real transaction.

### 4.5 Goals, reserves and debt planning

#### Horizon capabilities

- Goal target, target date, priority and required contribution.
- Contribution and withdrawal history.
- Funding account and category linkage.
- Emergency reserve and sinking-fund semantics.
- On-track/off-track explanation.
- Debt avalanche, snowball and custom priority.
- Loan amortization and extra-payment simulation.
- Interest and payoff-date comparison.
- Goal scenarios and trade-off views.

#### MoneyFlow decision

Goals become auditable funding plans, not editable progress bars. Debt planning may simulate outcomes but must never move money or make autonomous financial decisions.

### 4.6 Reports, query and drill-down

#### Horizon capabilities

- Arbitrary date ranges and saved periods.
- Previous-period and year-over-year comparison.
- Account, type, category, tag, merchant and review-state dimensions.
- Drill-down from every aggregate to contributing transactions.
- Cash flow, income/expense, category and merchant trends.
- Savings rate, recurring burden, budget variance and debt progression.
- Net-worth history and asset/liability composition.
- Calendar and heatmap views.
- Custom report builder and multiple dashboards.
- Export that preserves the exact active filter/query.

#### MoneyFlow decision

Reports must remain ledger-derived and explainable. PR #257 is a valid first custom-range slice; dimensions, drill-down and report composition follow separately.

### 4.7 Forecasting and scenarios

#### Horizon capabilities

- Future balance by account and consolidated view.
- Forecast inputs from posted facts, expected occurrences, budgets and explicit user assumptions.
- Financial calendar with past actuals and future projections.
- Low-balance and cash-gap warnings.
- Base, conservative and optimistic scenarios.
- One-time life-event scenarios.
- Forecast checkpoints/corrections without rewriting history.
- Confidence, source and assumption explanation for every projection.
- Actual-versus-forecast comparison.

#### MoneyFlow decision

Forecasting is a major differentiator but must wait for trustworthy recurring, budget and account data. It is planning support, not financial advice.

#### Required data classes

| Class | Example | Product treatment |
|---|---|---|
| Financial fact | posted transaction | immutable historical source, corrected through audited mutation |
| Expected occurrence | next rent payment | planned and matchable, not counted as spent |
| User assumption | salary rises in October | explicit scenario input |
| Derived projection | predicted account balance | recalculable output with source/confidence |

### 4.8 Rules and deterministic automation

#### Horizon capabilities

- Conditions on raw description, merchant, amount, account, date, category, tags and source.
- AND/OR groups, ordering and stages.
- Actions to normalize merchant, assign category/tags/note, split or suggest transfer.
- Preview against sample and historical transactions.
- Apply to future, selected past or import batch.
- Rule version, conflict explanation and mutation audit.
- Behavior-derived suggestions that remain user-owned.
- Confidence thresholds and mandatory review for risky actions.

#### MoneyFlow decision

Persisted authenticated rules are valuable after review state and provenance are stable. Rules must be deterministic; probabilistic suggestions are a separate optional assistant layer.

### 4.9 Import, feeds and Inbox

#### Horizon capabilities

- Manual, quick capture, CSV, XLSX, PDF and standardized financial formats.
- Mapping presets and institution templates.
- Batch history, retry/resume and rollback.
- Original row, source ID, parser/mapping version and lineage.
- Duplicate and transfer matching with confidence/reason.
- Dry-run plan and atomic approval.
- Bulk review and correction.
- Public import API and webhooks.
- Optional bank-feed adapters with provider health and consent state.

#### MoneyFlow decision

MoneyFlow already has a strong import foundation. Mapping presets, batch operations and rules come before bank sync. A provider failure must never mutate the ledger silently or erase user-entered data.

### 4.10 Alerts and attention

#### Horizon capabilities

- Transactions needing review.
- Reconciliation difference.
- Upcoming bill or missed occurrence.
- Possible duplicate or unusual transaction.
- Budget near/over limit.
- Subscription amount change.
- Goal off-track.
- Forecasted low balance.
- Import/rule conflict or stale connection.
- User-configurable threshold, channel, snooze and dismissal.

#### MoneyFlow decision

Alerts point to evidence and one bounded action. Avoid shame, fear marketing and opaque anomaly claims.

### 4.11 Net worth, investments and wealth

#### Horizon capabilities

- Manual and connected assets/liabilities.
- Valuation history with source and date.
- Investment accounts, securities, holdings and cash.
- Cost basis and realized/unrealized return.
- Contributions, withdrawals, dividends and fees.
- Asset allocation and benchmark comparison.
- Net-worth timeline and composition.
- Retirement projections only after a researched planning contract.

#### MoneyFlow decision

Wealth is a separate module over the same ownership and reporting principles. Investment positions are not ordinary spending transactions, and market valuation must not rewrite ledger history.

### 4.12 Multi-currency

#### Horizon capabilities

- Currency per account and transaction leg.
- Native amount and base-currency valuation.
- Exchange-rate source, timestamp and manual override.
- Cross-currency transfer with explicit rate/fees.
- Historical reporting without retroactive rate drift.
- Budget, goal, forecast and net worth in native/base views.
- FX gain/loss only when the chosen accounting contract requires it.

#### MoneyFlow decision

A future architecture module, not a field added casually to current VND tables. VND remains the current first-class currency until a dedicated migration and compatibility design is accepted.

### 4.13 Household and collaboration

#### Horizon capabilities

- Household/workspace ownership.
- Members, invitations, roles and removal.
- Shared and private accounts.
- Shared budgets and goals.
- Transaction assignment/review and comments.
- Adviser read-only or scoped access.
- Activity history and export by permission scope.
- Separation and migration when a household changes.

#### MoneyFlow decision

Requires an ownership-model redesign. `user_id` must not be patched with ad-hoc sharing arrays. Household work begins only after single-user daily trust and a threat model are proven.

### 4.14 Data ownership and extensibility

#### Horizon capabilities

- Full CSV/JSON export with versioned schema.
- Encrypted backup and restore validation.
- Public API with scoped tokens.
- Webhooks and integration events.
- User-defined fields, saved queries and dashboard widgets.
- Import/export mapping SDK or plugin boundary.
- Privacy-safe support bundle and data scrambling.
- Deletion and portability evidence.

#### MoneyFlow decision

Data portability is a core trust property, not a premium trap. Public contracts must be versioned and narrower than internal persistence schemas.

### 4.15 Optional intelligence

#### Horizon capabilities

- Explainable categorization suggestions.
- Merchant normalization suggestions.
- Recurring and duplicate suggestions.
- Natural-language query over the user's own ledger.
- Scenario drafting from explicit user inputs.
- Confidence, citations to source transactions and correction feedback.
- Complete opt-out and deterministic fallback.

#### MoneyFlow decision

Optional intelligence may assist review and explanation. It may not autonomously move money, approve uncertain imports, infer missing financial facts or present personalized investment/credit decisions as authoritative advice.

## 5. Product-layer map

```text
MoneyFlow Core
├── Ledger trust
├── Accounts and balances
├── Transactions and review
├── Categories and tags
└── Export and recovery

MoneyFlow Plan
├── Budgets and allocations
├── Recurring cash flow
├── Goals and reserves
├── Debt planning
└── Forecast and scenarios

MoneyFlow Understand
├── Reports and query
├── Dashboards
├── Net worth
└── Attention and explanations

MoneyFlow Automate
├── Import and Inbox
├── Deterministic rules
├── API and integrations
└── Optional provider feeds

MoneyFlow Wealth
├── Assets and liabilities
├── Investments
└── Multi-currency

MoneyFlow Together
├── Household ownership
├── Roles and permissions
└── Collaboration
```

Core remains the default navigation and onboarding. Other layers are enabled when the user has enough data or explicitly chooses them.

## 6. Capability selection score

A candidate feature is selected only after scoring:

| Dimension | Question |
|---|---|
| Trust | Does it reduce doubt, error or irreversible damage? |
| Daily frequency | How often does the target user encounter the problem? |
| Connected value | Does it strengthen more than one existing module? |
| Evidence | Was the problem observed in owner self-use or user research? |
| Architectural readiness | Are identity, ownership, currency and financial semantics ready? |
| Operational cost | Does it add provider, support, privacy or data-quality burden? |
| Reversibility | Can rollout, migration and user action be reversed safely? |
| Complexity exposure | Can the feature stay hidden from users who do not need it? |

No total score automatically authorizes implementation. High operational or ownership risk can veto a feature regardless of apparent value.

## 7. Delivery horizon

| Wave | Theme | Representative outcomes |
|---|---|---|
| 1 | Ledger trust | review, bounded correction, reconciliation, split correction, audit |
| 2 | Connected planning | budget history, recurring lifecycle, goal contributions, debt plan |
| 3 | Deep understanding | custom ranges, dimensions, drill-down, dashboards, net worth |
| 4 | Forecast | calendar, account projections, scenarios, low-balance attention |
| 5 | Automation and ownership | persisted rules, mapping presets, API, backup/restore |
| 6 | Wealth | assets, liabilities, investments, multi-currency |
| 7 | Collaboration and connectivity | household, roles, adviser access, selected bank feeds |
| 8 | Optional intelligence | explainable suggestions and natural-language exploration |

Waves express dependency order, not fixed dates. Evidence can reorder slices, but cannot bypass prerequisites.

## 8. Explicit non-decisions

This atlas does not decide:

- which bank provider, market-data provider or AI model to use;
- whether any capability is free or paid;
- which countries or currencies launch first;
- whether MoneyFlow becomes native mobile;
- whether household or adviser access is commercially viable;
- how investment tax lots or FX gains are calculated;
- that every listed capability must eventually ship.

Those decisions require dedicated research and owner approval.