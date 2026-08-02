# MoneyFlow — product competitive memory

**Status:** active product and roadmap synthesis  
**Snapshot date:** 2026-08-02  
**Repository baseline:** `main@05e923a17e579470ddcdb16108f0834ce17dc456`  
**Scope:** current MoneyFlow capability, representative competitors and substitutes, cumulative research reconciliation, durable product decisions and next-development priorities  
**Owner rule:** evidence accumulates; binding product truth and explicit owner decisions win

## 1. Purpose

This document is the durable product memory for MoneyFlow. It combines the repository's existing product, competitor, open-source, UX, architecture, issue and rollout evidence into one current synthesis.

Use it to answer:

1. What is MoneyFlow today, based on merged behavior rather than plans?
2. How does it compare with representative Vietnamese, commercial and open-source products?
3. Which patterns should MoneyFlow adopt, adapt or reject?
4. Which earlier research conclusions are stale or contradicted by current code?
5. What should be developed next, and what must remain deferred?

This document is **not**:

- a feature checklist to copy;
- a pricing decision;
- a visual style guide;
- proof of market demand;
- permission to add bank sync, AI, OCR, household finance or a new architecture;
- a replacement for `docs/product/PRINCIPLES.md`, `docs/MVP_DEFINITION.md` or `ARCHITECTURE.md`.

## 2. Authority and interpretation

### 2.1 Source hierarchy

When sources disagree, use this order:

1. Current merged MoneyFlow code, database migrations and tests.
2. `docs/product/PRINCIPLES.md`.
3. `docs/MVP_DEFINITION.md`.
4. `ARCHITECTURE.md` and accepted work packets.
5. Explicit owner decisions recorded in Git history.
6. This synthesis.
7. Active cumulative research ledgers and reference maps.
8. Historical research, old concepts, dated competitor snapshots and chat context.

### 2.2 Evidence labels

| Label | Meaning |
|---|---|
| **Binding** | Current product or owner constraint. |
| **Verified current** | Confirmed in merged MoneyFlow behavior or an official source reviewed for this snapshot. |
| **Dated evidence** | Useful observation whose product state, pricing or activity can change. |
| **Inference** | Reasoned conclusion, not direct proof. |
| **Hypothesis** | Must be tested through owner self-use or user research. |
| **Historical** | Preserved for lessons and provenance, not current status. |
| **Rejected** | Explicitly not an active direction. |

### 2.3 Update rule

A new source supplements this memory. It does not silently erase older evidence. Each update must record:

- what the source establishes;
- what applies to MoneyFlow;
- what must not be copied;
- conflicts with existing evidence;
- the final MoneyFlow decision and reason.

Commercial pricing, bank coverage, AI features, platform availability and user counts are volatile. Recheck them before using them in product or business decisions.

---

# 3. Internal evidence consolidated

## 3.1 Binding product and architecture

| Source | Retained authority |
|---|---|
| `README.md` | MoneyFlow is a Vietnamese manual-first income and expense ledger with multiple accounts, fast capture, balances, period reporting and user-owned export. |
| `docs/product/PRINCIPLES.md` | Correctness, core transaction flow, mobile usability, recovery and honest explanations outrank visual polish and feature breadth. |
| `docs/MVP_DEFINITION.md` | Current MVP capabilities and ship gates. |
| `ARCHITECTURE.md` | Modular monolith, explicit authenticated/demo runtimes, ledger and mutation boundaries, integer VND, transfer neutrality and layered verification. |
| `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` | Delivery and CI evidence must match affected risk rather than apply every heavy gate to every change. |

## 3.2 Cumulative research retained

| Source | What remains useful | What is not current truth |
|---|---|---|
| `docs/research/01_RESEARCH_PLAN.md` | Research questions and source discipline | Initial product assumptions without later validation |
| `docs/research/02_USER_AND_COMPETITORS.md` | Vietnamese user hypotheses, manual-entry friction, export/ownership, competitor categories and interview questions | Dated prices, unverified market gaps, old feature states and safe-to-spend proposals |
| `docs/research/03_DOMAIN_RULES.md` | Financial behavior the UI must represent honestly | Any superseded product wording |
| `docs/research/04_OPEN_SOURCE_ANALYSIS.md` | Repository patterns, license boundaries and applicability | Dated repository activity and stars |
| `docs/research/05_PRODUCT_AND_ARCHITECTURE.md` | Manual-first positioning, integer VND, transfer correctness, export and bounded architecture | Withdrawn spending-advice conclusions |
| `docs/COMPETITOR_AND_OSS_RESEARCH.md` | Early comparison, register-first lessons, quick capture, reconciliation and anti-ERP boundary | Claims that CSV import/rules are absent, safe-to-spend is an active USP, and old implementation gaps remain open |
| `docs/UX_RESEARCH_AND_REDESIGN.md` | Deep competitor teardowns, state design, accessibility and anti-copy discipline | Inbox-first identity, fixed IA, dashboard demotion and safe-to-spend conclusions |
| `docs/BEST_OF_MATRIX.md` | Select one strong pattern rather than copying a whole product | Old navigation and planning decisions |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Concept-neutral cumulative UI/UX evidence, conflicts, rejected directions and source boundaries | It is not the current product roadmap |
| `docs/research/REPOSITORY_REFERENCE_MAP.md` | Product/repository source index by decision area | It is not a feature backlog |
| `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` | Research and engineering evidence discipline | It does not authorize tool or architecture adoption |

## 3.3 Current issue and rollout evidence

| Evidence | Current implication |
|---|---|
| Issue #53 — domain benchmark | Reconciliation remains the largest missing ledger-trust workflow; authenticated deterministic rules and mutation audit follow later. |
| Issue #72 — route/state audit | Emulated responsive coverage is broad, but real state depth and physical-phone readiness remain incomplete. |
| Issue #172 — product assessment | Technical foundation is stronger than daily-use, retention, positioning and willingness-to-pay evidence. |
| Issue #174 — provider controls | Repository security is strong, but provider-side Auth and edge controls remain incomplete before broad public beta. |
| Completed import-provenance packet | Authenticated Inbox approval, provenance, dry-run, idempotency and atomic ledger commit are merged, migrated and production-smoked. |
| PR #212 | Risk-proportional delivery is merged; governance should no longer block focused feature work. |

---

# 4. MoneyFlow current capability snapshot

## 4.1 Verified product surface

MoneyFlow currently includes:

- email/password authentication, supported OAuth and recovery;
- explicit authenticated and demo modes;
- multiple account representations: cash, bank, e-wallet, credit and savings;
- income, expense and balanced internal transfers;
- transaction search/filter surfaces, editing, soft delete and recovery;
- dashboard balances, income, expense, net, recent activity and planning state;
- categories and monthly category budgets;
- recurring commitments and recurring income templates;
- savings goals;
- weekly, monthly and yearly reports;
- CSV export and controlled import tooling;
- Inbox review, provenance, duplicate planning and atomic approval;
- responsive light/dark web UI;
- PostgreSQL ledger, RLS, RPC constraints, pgTAP and browser verification.

## 4.2 Strongest current areas

| Area | Assessment | Evidence reason |
|---|---|---|
| Ledger model | **Strong** | Integer VND, transactions + entries, balanced transfers, deterministic totals |
| Tenant ownership | **Strong** | RLS, narrow authenticated RPCs, tenant-isolation tests |
| Transfer semantics | **Strong** | Transfers are structural and excluded from income/expense reporting |
| Import provenance | **Strong** | Mutable candidates, immutable provenance, server planning, atomic approval and idempotency |
| Data correction | **Strong** | Edit, soft delete and restore paths exist |
| Export ownership | **Strong** | CSV export is part of current MVP and product law |
| Engineering verification | **Strong** | Static/domain/database/browser/security layers and risk-proportional CI |
| Architecture fit | **Strong** | Single-deployment modular monolith matches current team, scale and ownership |

## 4.3 Partial or unproven areas

| Area | Assessment | Missing proof or behavior |
|---|---|---|
| Daily capture loop | **Partial** | Product supports quick capture, but physical-phone median capture time and seven-day habit are not proven |
| Onboarding | **Partial** | Flow exists; first-transaction completion and abandonment are not measured |
| Mobile readiness | **Partial** | Broad Playwright coverage; physical keyboard, touch and repeated real use remain incomplete |
| Budget usefulness | **Partial** | Category budgets exist; behavior change and continued use are unproven |
| Recurring awareness | **Partial** | Commitments/templates exist; accuracy and daily value have not been measured with real use |
| Transaction review | **Partial** | Inbox review is advanced, but routine ledger review/bulk correction is not yet a proven daily workflow |
| Public beta security | **Partial** | Repository controls exist; provider configuration and production Auth/edge verification remain open |
| Performance evidence | **Partial** | Dashboard fan-out was reduced and load tooling exists; approved staging concurrency evidence is not complete |
| Product differentiation | **Unproven** | Positioning is coherent, but retention, willingness to pay and switching evidence do not exist |

## 4.4 Largest missing capability

**Account reconciliation is the largest missing product capability that directly improves ledger trust.**

MoneyFlow can calculate balances, but it does not yet give users a complete workflow to:

- compare a MoneyFlow account against a bank statement or known cash balance;
- mark transactions pending, cleared and reconciled;
- see the exact difference;
- finish and lock a reconciliation period;
- reopen with an explicit warning;
- create an auditable adjustment transaction rather than directly overwriting balance.

This is a trust gap, not a request to copy YNAB or Actual wholesale.

---

# 5. Representative comparison set

The products are selected by role rather than popularity alone.

| Role | Products / substitute | Why included |
|---|---|---|
| Vietnamese consumer baseline | Money Lover, MISA MoneyKeeper | Local language, multi-wallet mental model, daily manual entry, local pricing and feature expectations |
| Method-led budgeting | YNAB | Reconciliation, explicit transaction states and behavior-oriented budgeting |
| Aggregated household overview | Monarch Money | Account aggregation, planning, reporting and collaboration |
| Review-first premium experience | Copilot Money | Transaction review, fast correction, recurring awareness and visual hierarchy |
| Broad multi-platform tracker | Wallet by BudgetBakers | Account types, imports, labels, rules, exports and feature breadth |
| Action/service-led finance | Rocket Money | Subscription detection, recurring attention and action cards |
| User-owned open-source ledger | Actual Budget | Transfers, reconciliation, import matching, rules and data ownership |
| Accounting-rich self-hosted ledger | Firefly III | Transfers, bills, goals/piggy banks, tags and deterministic rules |
| Real substitute | Excel / Google Sheets | Ownership, flexibility, portability and low switching cost |

---

# 6. Capability comparison

Legend: **Strong** = core, mature product behavior; **Partial** = available with limits or not central; **No/Deferred** = absent or intentionally outside MoneyFlow scope. Commercial-product status is based on official surfaces reviewed for this dated snapshot.

| Capability | MoneyFlow | Money Lover | MISA MoneyKeeper | YNAB | Monarch | Copilot | Wallet | Rocket Money | Actual | Firefly III | Sheets |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Vietnamese-first | **Strong** | **Strong** | **Strong** | No | No | No | Partial localization | No | No | No | User-built |
| Manual transaction entry | **Strong** | **Strong** | **Strong** | **Strong** | Partial/aggregation-led | Partial | **Strong** | Partial/aggregation-led | **Strong** | **Strong** | **Strong** |
| Multiple accounts/wallets | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** | User-built |
| Structural internal transfers | **Strong** | Verified support | Unclear from current public overview | **Strong** | **Strong** | **Strong** | **Strong** | Aggregator classification | **Strong** | **Strong** | User-built |
| Reconciliation workflow | **No — next** | Not established here | Not established here | **Strong** | Not central | Not established here | Balance adjustment / confirmation, not benchmarked as full reconcile | Not central | **Strong** | Accounting-oriented, not selected as beginner benchmark | Manual |
| Category budgets | **Strong basic** | **Strong** | **Strong** | **Strong method** | **Strong; flex/category** | **Strong** | **Strong** | **Strong** | **Strong envelope** | **Strong** | User-built |
| Recurring / bills | **Strong basic** | **Strong** | Product claims recurring/debt utilities | **Strong** | **Strong** | **Strong** | **Strong** | **Strong subscription focus** | **Strong schedules** | **Strong bills** | User-built |
| Savings goals | **Strong basic** | **Strong** | **Strong** | Targets within method | **Strong** | Product goals exist | **Strong** | Automated savings goals | Envelope/planning oriented | Piggy-bank model | User-built |
| Import and duplicate handling | **Strong controlled** | Bank/automation and export surfaces | Automation claims; current import detail not established | **Strong imported approval** | **Strong aggregation/rules** | **Strong aggregator review** | **Strong import/sync/rules** | **Strong aggregation** | **Strong file import/matching/dry run** | **Strong importer/rules ecosystem** | Manual |
| Deterministic user rules | Local/parse rules; authenticated persistence deferred | Automation/assistant surfaces | AI/automation marketing | Method automation | **Strong transaction rules** | Name/category rules | **Strong automatic rules** | Automated detection | **Strong ordered rules** | **Strong ordered rules** | Formulas |
| Transaction review state | Inbox-specific | Not established here | Not established here | Imported approval/cleared state | Review status/rules | **Strong To Review** | Record confirmation | Subscription/action review | Cleared/locked states | Accounting review | Manual |
| Export / data portability | **Strong CSV** | Premium CSV / Google Sheet support | Excel/PDF | Export/import support | Export available; aggregation product | **Strong CSV** | Premium CSV/XLS/PDF | Not a product identity | **Strong import/export and self-host** | **Strong export/API/self-host** | Native |
| Data ownership / self-host | Cloud account + export | Cloud | Cloud | Cloud | Cloud | Cloud | Cloud | Cloud | **Strong local/self-host/E2EE options** | **Strong self-host** | **Strong file ownership** |
| Household/shared finance | Deferred | Wallet sharing | **Strong sharing claims** | YNAB Together | **Strong** | Tags/review workflows, not full MoneyFlow target | **Strong group sharing** | Shared accounts premium | Multi-user technical support, not beginner household product | Possible but complex | Shared file |
| Bank sync | Explicit non-goal now | Available/marketed | Marketed automation | Available in supported regions | Core | Core | Core premium | Core | Optional providers | External importer | No |
| AI/OCR/advice | Explicit non-goal now | Assistant/receipt features marketed | AI/rapid entry marketed | Not MoneyFlow-relevant | Automation/ML categorization | AI categorization positioning | OCR and personalized-budget direction | Algorithms/services | Rules, not advice | Rules, not advice | User-built |

**Interpretation:** MoneyFlow is already broad enough for an MVP. The meaningful gap is not “add every competitor feature”; it is proving daily reliability and adding reconciliation.

---

# 7. Product-by-product lessons

## 7.1 Money Lover

### Official current signals

Money Lover presents itself as a simple personal-finance manager with fast transaction entry, budgets, reports, multiple devices, recurring transactions, savings, debt/loan management and multi-currency. Its store distinguishes free and Premium limits; web access and CSV export are Premium features. Current support surfaces also reference bank connections, wallet sharing, transfers, AI-assisted entry and an assistant beta.

### Learn

- Vietnamese users understand wallets/accounts, categories and a prominent add action.
- Recurring items, savings and debt are familiar local feature categories.
- Cross-device access and export are meaningful trust and convenience signals.
- The core value proposition is simple: record quickly and understand where money went.

### Do not copy

- Ads or paywalls inside the core daily ledger loop.
- Broad AI, receipt and bank-connection claims before capability and production support are proven.
- Multi-currency/travel scope before VND daily use is proven.
- Feature breadth as a substitute for retention evidence.

### MoneyFlow decision

Keep the Vietnamese manual-first model, multiple accounts, recurring and export. Compete on trustworthy data, transparent limits and a calmer daily loop rather than matching every automation feature.

## 7.2 MISA MoneyKeeper

### Official current signals

MISA markets smart income/expense tracking, visual reports, debt tracking, savings planning, sharing, Excel/PDF export, cloud synchronization and spending limits. Its current public page also markets AI-assisted rapid entry.

### Learn

- Local users recognize “sổ thu chi”, debt, savings and spending-limit language.
- Export and synchronization are visible selling points.
- Reports must explain finances with familiar Vietnamese wording rather than accounting terminology.
- Debt and savings are legitimate local mental models even when MoneyFlow keeps them simpler.

### Do not copy

- Shared/group finance before ownership and collaboration requirements are researched.
- AI/OCR claims without precise capability and failure-state evidence.
- A utility catalogue that obscures the daily ledger.
- Product counts, ratings or testimonials as proof of MoneyFlow demand.

### MoneyFlow decision

Use local language and honest feature explanations. Keep family/group finance, tax calculators, shopping lists and broad utilities outside the current phase.

## 7.3 YNAB

### Official current signals

YNAB treats reconciliation as a routine for comparing bank and app balances so users can trust the numbers. Its account register uses transaction states and reconciliation history; the product combines this with a method-led budgeting system and imported-transaction approval.

### Learn

- Reconciliation is not an advanced accounting extra; it is how a ledger earns trust.
- Pending/cleared/reconciled states should have explicit meanings.
- Editing previously reconciled data requires a warning and recovery path.
- A transaction register can be the primary truth while planning remains derived.

### Do not copy

- Mandatory zero-based/envelope methodology.
- A high-learning onboarding course as a prerequisite for recording expenses.
- Region-specific bank assumptions or pricing expectations.
- “Give every dollar a job” language as MoneyFlow's identity.

### MoneyFlow decision

Adopt a focused account-reconciliation vertical slice. Do not adopt the full YNAB budgeting method.

## 7.4 Monarch Money

### Official current signals

Monarch is an all-in-one aggregated-finance product with account connections, transaction categorization, category or flex budgeting, goals, net-worth tracking and household collaboration. Its budget depends on correctly categorized income and connected account data; transaction rules can rename, categorize, tag, hide, set review status or link to goals.

### Learn

- Budgeting should be adaptable rather than forcing one level of detail.
- Review status and rules can reduce correction friction.
- Goals should connect to observable contributions rather than motivational copy alone.
- Information hierarchy can separate tracking, planning and long-term net-worth views.

### Do not copy

- Aggregator-first onboarding.
- Household/collaborator scope.
- Net-worth and investment density in the core daily dashboard.
- Machine-learning categorization claims without explainable review and correction.

### MoneyFlow decision

Keep category budgets simple. Study review status and flexible information hierarchy, but do not pivot to household aggregation or net-worth management.

## 7.5 Copilot Money

### Official current signals

Copilot distinguishes Income, Internal Transfers and Regular transactions; internal transfers are excluded from spending budgets. It emphasizes transaction search/filtering, review status, bulk edits, categories, tags, recurrings, exports and polished cross-platform transaction workflows. Its dashboard also uses a “Free to Spend” value derived from monthly budget assumptions.

### Learn

- Transaction correction should be fast, searchable and available in list context.
- “To Review” is a useful exception queue when users can resolve it without leaving the register.
- Bulk review/category/type changes can help power users without changing the core model.
- Recurring items are most useful when linked to observed transactions and expected dates.
- Internal transfers must remain a first-class transaction type excluded from spending.

### Do not copy

- A “Free to Spend” number without complete and explicit MoneyFlow planning data.
- Opaque AI categorization.
- Premium visual polish as a substitute for data trust.
- Investment/holdings scope in the current core.

### MoneyFlow decision

Retain transfer neutrality. Later improve transaction review/search/bulk correction after physical daily-use findings justify the exact slice. Continue rejecting unsupported spending recommendations.

## 7.6 Wallet by BudgetBakers

### Official current signals

Wallet supports manual accounts, bank-connected accounts, imports, account types, budgets, labels, automatic rules, record confirmation, export, group sharing, investments, loans, mortgages and other utilities. Export is a Premium feature. Its documentation distinguishes archiving an account from excluding it from statistics.

### Learn

- Account status and reporting inclusion are separate concepts and must be explained clearly.
- Filters and export should work together.
- Labels can serve cross-category analysis, but only after the core model is stable.
- Account types need clear semantics without pretending the app moves money.

### Do not copy

- Multi-currency, investment, mortgage, shopping-list and warranty breadth.
- Bank-sync dependency.
- OCR and personalized-budget suggestions before core use is proven.
- Platform inconsistencies where a capability exists only on one client without clear communication.

### MoneyFlow decision

Keep account/archive semantics explicit and export discoverable. Defer tags/labels until real use demonstrates category limitations.

## 7.7 Rocket Money

### Official current signals

Rocket Money is centered on linked accounts, subscription detection/cancellation, budgets, net worth, credit, bill negotiation and automated savings. Its value proposition combines software with financial services and human assistance.

### Learn

- Recurring obligations deserve an attention-oriented view.
- Action cards are useful when the underlying data proves an actual task: due, unpaid, changed or cancelable.
- A dashboard should surface exceptions rather than repeat every feature.

### Do not copy

- Subscription cancellation, bill negotiation, credit scoring or automated savings services.
- US financial-provider assumptions.
- “Autopilot” positioning for a manual-first ledger.
- Savings claims derived from vendor-controlled calculations.

### MoneyFlow decision

Use commitment attention states only when based on user-entered or verified data. Do not become a financial-services marketplace.

## 7.8 Actual Budget

### Official current signals

Actual links both sides of a transfer, excludes on-budget transfers from income/expense categories, supports file import and duplicate reconciliation, provides a cleared/locked reconciliation workflow, applies ordered rules to original imported fields, and offers user-controlled local/self-hosted data and optional encryption.

### Learn

- Reconciliation should show cleared, uncleared and difference values and end in an explicit locked state.
- Imported IDs are the strongest duplicate identity; heuristic matching must remain reviewable.
- Rules should operate on immutable original/imported descriptions and execute deterministically.
- Transfer sides must stay structurally linked.
- Data ownership and export are product features, not legal footer text.

### Do not copy

- A local-first/sync architecture rewrite during MoneyFlow MVP.
- Envelope budgeting as the whole product identity.
- Self-hosting setup complexity for ordinary Vietnamese users.
- Automatic rules that silently post uncertain financial facts.

### MoneyFlow decision

Actual is the strongest reference for MoneyFlow's next reconciliation slice and later deterministic rules. Learn behavior and invariants, not architecture wholesale.

## 7.9 Firefly III

### Official current signals

Firefly III uses explicit financial transaction types and a powerful ordered rule engine built from triggers and actions. Existing MoneyFlow research maps its bills, piggy banks, tags, transfers and importer concepts to commitments, goals, optional metadata and controlled import.

### Learn

- Rules need explicit order, conditions, actions and predictable conflict behavior.
- Financial automation should be auditable and reversible.
- Bills/commitments and savings goals are separate planning concepts.
- Domain documentation is part of product trust.

### Do not copy

- Accounting-heavy interface and vocabulary.
- Enterprise feature density.
- AGPL code without an explicit compliance plan.
- A separate importer platform or service architecture without operational need.

### MoneyFlow decision

Use Firefly III as a domain counterexample and later rules reference. Preserve MoneyFlow's simpler consumer language and modular monolith.

## 7.10 Excel and Google Sheets

### What they prove

- Users can own their data and create arbitrary reports.
- Export reduces lock-in and increases trust.
- A familiar file can outlive a product.
- Flexible correction is valuable.

### Their real weaknesses

- Manual formulas and structure are easy to break.
- Mobile entry is poor.
- Transfers, deletion, reconciliation and duplicate handling are not structural unless the user builds them.
- No default tenant security, audit or recovery model exists.

### MoneyFlow decision

MoneyFlow must remain easier and safer than a spreadsheet while preserving export and portability. Do not turn the product UI into a spreadsheet clone.

---

# 8. Cumulative synthesis

## 8.1 Common patterns worth learning

Across local apps, premium consumer products and open-source ledgers, the strongest recurring patterns are:

1. **Fast capture:** the user can record a transaction without navigating through planning or analytics.
2. **Clear account model:** users know where money is held or owed.
3. **Structural transaction types:** income, expense and transfer are not inferred from labels.
4. **Register as truth:** charts and dashboards derive from a correct transaction history.
5. **Correction and review:** mistakes, uncertain imports and recurring matches are easy to inspect and fix.
6. **Period understanding:** users can answer balance, income, expense, net and category questions for a stated period.
7. **Recurring awareness:** obligations and expected income are visible without pretending they are posted facts.
8. **Reconciliation:** trustworthy products provide a way to compare the ledger with an external balance.
9. **Data portability:** export and original-source preservation reduce lock-in.
10. **Automation with review:** imported IDs, deterministic rules and explicit confidence are safer than opaque autopilot.

## 8.2 What fits MoneyFlow specifically

- Vietnamese-first manual capture with integer VND.
- Multiple user-declared accounts across cash, bank and e-wallet contexts.
- Structural transfers and deterministic reports.
- Calm, non-judgmental correction rather than coaching or guilt.
- Category budgets and recurring commitments as optional planning layers.
- Export and provenance as trust features.
- Reconciliation as the next major trust capability.
- Advanced import/rules remain secondary to the daily ledger.

## 8.3 What MoneyFlow should not copy

- Bank-sync-first onboarding.
- Net-worth, investments or credit as the main dashboard.
- Family/shared authorization before single-user daily use is proven.
- AI advice, automatic money decisions or confident spending recommendations.
- Full envelope methodology.
- OCR, receipt capture and broad automation as product identity.
- Subscription cancellation, bill negotiation or financial marketplace services.
- Tags, multi-currency, loans, mortgages and utilities added merely for parity.
- Self-hosting/local-first rewrite without user and operational need.
- Accounting-heavy language or ERP-like navigation.

## 8.4 Source conflicts and resolution

### Manual-first vs automation-first

- Money Lover, MISA, Wallet, Monarch, Copilot and Rocket increasingly market bank connection, AI or automation.
- Actual, Firefly and spreadsheet workflows prove that explicit user control and imports can still produce trustworthy ledgers.

**Resolution:** MoneyFlow remains manual-first. Import and rules reduce repetitive work but must not become the product identity or silently create uncertain financial facts.

### Simple tracking vs planning methodology

- YNAB and Actual are method-led.
- Monarch and Copilot derive planning indicators from categorized income and budgets.
- MoneyFlow lacks a complete income-cycle/reserve contract.

**Resolution:** keep category budgets and planning inputs, but do not present safe-to-spend/free-to-spend advice until the required data and contract exist.

### Feature breadth vs daily trust

- Local and global products advertise many adjacent utilities.
- MoneyFlow already has broad MVP coverage but lacks seven-day and physical-phone evidence.

**Resolution:** stop parity development. Prioritize daily-loop evidence, P0/P1 fixes and reconciliation.

### Local-first ownership vs hosted convenience

- Actual and spreadsheets maximize direct ownership.
- Commercial products maximize account aggregation and managed convenience.
- MoneyFlow uses hosted Supabase with RLS and export.

**Resolution:** keep the hosted modular-monolith architecture. Strengthen export, deletion, provenance and recovery rather than rewriting storage architecture.

### Visual polish vs ledger truth

- Copilot and Monarch demonstrate strong hierarchy and polished review flows.
- MoneyFlow history includes attractive concepts that did not improve daily-use evidence.

**Resolution:** visual quality remains important, but no full redesign outranks transaction correctness, physical mobile flow and reconciliation.

---

# 9. Current product phase

The best description is:

> **Feature-rich owner beta / private alpha with a strong financial and engineering foundation, but without proven daily retention or public-beta operations.**

## 9.1 Dated assessment

These scores are directional, not scientific percentages:

| Dimension | Snapshot assessment | Reason |
|---|---:|---|
| Technical foundation | **8.5/10** | Strong domain, RLS, tests, deployment contracts and architecture |
| MVP feature coverage | **8/10** | Most defined capabilities exist |
| Financial correctness | **8/10** | Strong invariants and production-proven import path; reconciliation absent |
| Daily-use UX | **6/10** | Broad UI exists, physical repeated use not proven |
| Private beta readiness | **7/10** | Suitable for owner and a small supervised group |
| Public beta readiness | **5.5/10** | Provider controls and production Auth/edge acceptance incomplete |
| Market validation | **2/10** | No retention, willingness-to-pay or switching evidence |
| Commercial readiness | **2–3/10** | Product value and pricing are not proven |

Do not quote these scores as external market facts. They are an internal prioritization snapshot.

## 9.2 Exit from the current phase

MoneyFlow exits owner beta only when:

- production authentication and recovery work end-to-end;
- core create/edit/delete/restore flows work on a physical phone;
- balances and transfers reconcile against real external balances;
- export opens safely in common spreadsheet tools;
- no P0/P1 core-flow defect remains;
- the owner uses the product for seven consecutive days without data loss or manual database repair;
- at least a small external test group completes core tasks without live guidance.

---

# 10. Prioritized roadmap

## Priority 0 — prove the daily ledger

Before another broad feature or redesign:

1. Use MoneyFlow for seven consecutive days.
2. Record at least 50–100 real transactions across cash, bank/e-wallet and one transfer scenario.
3. Test registration/recovery and the complete daily loop on a physical phone.
4. Record every P0/P1 friction with route, state, device and expected behavior.
5. Fix only the smallest root-cause slices.
6. Confirm CSV export opens correctly and preserves Vietnamese text and integer VND.

### Measure

- time to first transaction;
- median time to record a routine expense;
- abandoned or failed submissions;
- edit/delete/restore rate;
- balance discrepancies;
- transactions entered late because capture was inconvenient;
- export success;
- user confidence in balances.

## Priority 1 — account reconciliation MVP

The next major capability should be a focused account-reconciliation vertical slice:

1. Choose an account and statement date.
2. Enter the external statement/current balance.
3. Distinguish pending, cleared and reconciled transactions.
4. Show cleared total, uncleared total and exact difference.
5. Allow completion only when the difference is zero, or require an explicit adjustment transaction.
6. Lock the reconciled state.
7. Warn and record when reopening or editing reconciled history.
8. Preserve RLS, integer VND, transfer neutrality and recoverability.

### Explicit non-scope

- no bank sync;
- no automatic matching service;
- no multi-currency engine;
- no accounting period close;
- no direct balance overwrite;
- no AI discrepancy explanation.

## Priority 1 — finish public-beta controls

In parallel with daily-use work:

- align provider password policy with application policy;
- verify trusted origins, callbacks and email confirmation;
- enable and production-smoke CAPTCHA only through the approved runbook;
- review Auth rate limits and enumeration behavior;
- enable breached-password protection when supported;
- add conservative route/method-scoped edge controls;
- verify legitimate share/import flows after each reversible change.

## Priority 2 — transaction correction and review

Only after real use identifies the exact need:

- improve list-context editing and review state;
- add bounded bulk actions for category/type/review when safe;
- improve transaction search and filters;
- connect recurring detection to observed transactions;
- preserve original imported information and explicit confidence.

Do not implement a broad Copilot/Monarch clone.

## Priority 2 — authenticated deterministic rules

After reconciliation and provenance are stable:

- persist rules per user with RLS;
- define explicit priority/stage and enabled state;
- match immutable raw/imported fields where appropriate;
- preview effects before approval;
- record rule version on approved provenance;
- never auto-post low-confidence candidates.

## Priority 2 — audit and performance correctness

- append non-sensitive financial mutation metadata: actor, action, entity, timestamp and request/idempotency ID;
- benchmark real transaction feed, dashboard, budgets and reports at realistic row counts;
- add caching only after measurement and pair it with invalidation tests;
- finish approved staging load acceptance before throughput claims.

## Priority 3 — market validation

After the trusted daily loop is stable:

1. Recruit at least five target users.
2. Let them complete onboarding and first-week tasks without live instruction.
3. Measure D2/D7 retention and repeated capture.
4. Ask what they replaced: memory, notebook, bank app, Money Lover/MISA or spreadsheet.
5. Record reasons for abandonment and trust failures.
6. Test willingness to pay only after observed value exists.

Pricing, public marketing claims and feature expansion remain hypotheses until this evidence exists.

---

# 11. Durable decision register

| Decision | Status | Reason |
|---|---|---|
| MoneyFlow is a Vietnamese manual-first personal ledger | **Binding** | Best fit with current product, user context and architecture |
| Trustworthy balances and correction outrank feature breadth | **Binding** | Financial product law and user-risk boundary |
| VND remains integer đồng | **Binding** | Correctness |
| Internal transfers never count as income or expense | **Binding** | Structural ledger invariant |
| Advanced import/Inbox/rules are secondary capture tools | **Binding** | Prevents identity drift |
| Safe-to-spend/free-to-spend is withdrawn without a complete planning contract | **Binding** | Missing data must not become confident advice |
| Account reconciliation is the next major product capability | **Active roadmap decision** | Largest gap between calculated balances and trusted balances |
| Seven-day owner self-use and physical-phone evidence precede broad feature expansion | **Active roadmap decision** | Current uncertainty is daily use, not feature coverage |
| Authenticated deterministic rules come after provenance and reconciliation | **Deferred** | Automation must be explainable and auditable |
| Bank sync, AI advice, OCR, family finance, investments and native apps remain out of scope | **Deferred / non-goal** | High operational cost and weak current evidence |
| Current modular monolith remains the architecture | **Binding** | No independent runtime, team or scaling boundary justifies extraction |
| External products are pattern references, not acceptance authorities | **Binding research rule** | Prevents cargo-cult parity |

---

# 12. Research-to-development gate

A new product feature may enter implementation only when it answers:

1. What observed user problem does it solve?
2. What current MoneyFlow behavior or data proves the problem?
3. Which two to four relevant sources were reviewed?
4. What does each source establish and what does not apply?
5. What is the smallest testable vertical slice?
6. What financial, ownership, privacy and rollback risks exist?
7. How will success and failure be measured?
8. Which existing capability or workflow will remain unchanged?

Ideas without evidence stay in research or backlog.

---

# 13. Supersession and history notes

## 13.1 `docs/COMPETITOR_AND_OSS_RESEARCH.md`

Retain as historical evidence. The following status claims are superseded:

- CSV import is no longer absent.
- Rules are no longer entirely absent; local deterministic parse rules exist, while authenticated persisted rules remain deferred.
- Import provenance, duplicate planning and atomic approval now exist.
- Safe-to-spend is not an active MoneyFlow USP.
- Several “fix now” entry and dashboard items were implemented or replaced by later product decisions.

## 13.2 `docs/research/02_USER_AND_COMPETITORS.md`

Retain user hypotheses, pain points and interview questions. Recheck all prices, platform availability, user counts, bank coverage and AI claims. Its market-gap statement remains a hypothesis until interviews and retention evidence exist.

## 13.3 `docs/UX_RESEARCH_AND_REDESIGN.md` and `docs/BEST_OF_MATRIX.md`

Retain detailed teardowns, state design, accessibility and anti-copy principles. Inbox-first identity, fixed navigation, safe-to-spend and named visual directions do not override current product principles or the UI/UX research ledger.

## 13.4 Design concepts

Calm Ledger, Signal Ledger and other named directions are historical experiments unless the owner explicitly selects one again. Product roadmap decisions must remain concept-neutral.

---

# 14. Source register

## 14.1 MoneyFlow internal sources

- `README.md`
- `ARCHITECTURE.md`
- `docs/product/PRINCIPLES.md`
- `docs/MVP_DEFINITION.md`
- `docs/research/01_RESEARCH_PLAN.md`
- `docs/research/02_USER_AND_COMPETITORS.md`
- `docs/research/03_DOMAIN_RULES.md`
- `docs/research/04_OPEN_SOURCE_ANALYSIS.md`
- `docs/research/05_PRODUCT_AND_ARCHITECTURE.md`
- `docs/research/UI_UX_RESEARCH_LEDGER.md`
- `docs/research/REPOSITORY_REFERENCE_MAP.md`
- `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md`
- `docs/COMPETITOR_AND_OSS_RESEARCH.md`
- `docs/UX_RESEARCH_AND_REDESIGN.md`
- `docs/BEST_OF_MATRIX.md`
- issue #53, issue #72, issue #172 and issue #174
- accepted import-provenance and atomic-approval work packet
- PR #212 delivery-policy evidence

## 14.2 External official sources reviewed for this snapshot

### Money Lover

- https://moneylover.me/
- https://moneylover.me/vi/
- https://web.moneylover.me/store/
- https://note.moneylover.me/
- https://moneylover.me/vi/policy/

### MISA MoneyKeeper

- https://moneykeeper.misa.vn/
- https://moneykeeper.misa.vn/home
- https://moneykeeper.misa.vn/term-of-use/

### YNAB

- https://support.ynab.com/en_us/reconciling-accounts-a-guide-BJFE3fHys
- https://www.ynab.com/whats-new/ynabs-api-gets-even-better

### Monarch Money

- https://help.monarchmoney.com/hc/en-us/articles/360048393272-Getting-Started-Guide
- https://help.monarchmoney.com/hc/en-us/articles/360048883631-Budgets
- https://help.monarchmoney.com/hc/en-us/articles/360048393372-Transaction-rules
- https://www.monarchmoney.com/features/collaboration

### Copilot Money

- https://help.copilot.money/en/articles/3971267-transaction-types
- https://help.copilot.money/en/articles/9554412-transactions-tab-overview
- https://help.copilot.money/en/articles/5944414-exporting-your-transaction-data
- https://help.copilot.money/en/articles/3760068-creating-recurrings
- https://help.copilot.money/en/articles/11780342-copilot-money-for-web

### Wallet by BudgetBakers

- https://support.budgetbakers.com/hc/en-us/articles/12212428113810-What-is-the-Wallet-app
- https://support.budgetbakers.com/hc/en-us/articles/34453128217618-Adding-an-Account
- https://support.budgetbakers.com/hc/en-us/articles/7076953735314-Setup-Budgets
- https://support.budgetbakers.com/hc/en-us/articles/7151606064018-How-to-export-transactions-from-Wallet
- https://support.budgetbakers.com/hc/en-us/sections/6961343873426-Features

### Rocket Money

- https://www.rocketmoney.com/
- https://www.rocketmoney.com/faq
- https://help.rocketmoney.com/en/articles/2677184-premium-membership-features

### Actual Budget

- https://actualbudget.org/docs/accounts/reconciliation/
- https://actualbudget.org/docs/transactions/transfers/
- https://actualbudget.org/docs/transactions/importing/
- https://actualbudget.org/docs/budgeting/rules/
- https://actualbudget.org/docs/getting-started/sync/
- https://actualbudget.org/docs/api/reference/
- https://github.com/actualbudget/actual

### Firefly III

- https://docs.firefly-iii.org/how-to/firefly-iii/features/rules/
- https://github.com/firefly-iii/firefly-iii
- https://github.com/firefly-iii/data-importer

### Standards and substitutes

- Excel and Google Sheets as user-controlled spreadsheet substitutes
- WCAG, GOV.UK, 18F and other UX sources remain indexed in `UI_UX_RESEARCH_LEDGER.md`

---

# 15. Final product direction

MoneyFlow should not respond to competitor comparison by expanding sideways.

The correct sequence is:

1. prove the current daily ledger through seven-day owner use and physical-phone evidence;
2. fix observed P0/P1 capture, correction, mobile and export failures;
3. implement account reconciliation as the next trust-building vertical slice;
4. complete provider-side public-beta controls;
5. improve transaction review and deterministic automation only after real-use evidence;
6. validate retention and willingness to pay before pricing or broad market claims.

The durable competitive position is not “more features than Money Lover, MISA, YNAB or Wallet.” It is:

> **A Vietnamese manual-first ledger that makes financial facts easy to record, correct, reconcile, understand and export without pretending to be a bank, an accounting ERP or an AI adviser.**
