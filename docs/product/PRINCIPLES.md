# MoneyFlow product principles

This document owns MoneyFlow's long-term product law. Current shipped capability continues to come from merged code/tests and `docs/research/CURRENT_PROJECT_MEMORY.md`; an open pull request changing this file remains candidate evidence until merge.

## Primary user

A Vietnamese individual who wants to manage their own money without accounting jargon, provider lock-in or a judgmental financial coach.

The first market wedge to validate is digitally banked Vietnamese adults with enough account/payment activity that keeping one whole-money picture is recurring work. This is a validation hypothesis, not a claim that all Vietnamese adults need or will pay for MoneyFlow.

## Core jobs

1. Keep a trustworthy record of income, expense and internal transfers regardless of where the source data came from.
2. Know current balances across active accounts with explicit coverage and reconciliation state.
3. Understand income, expense, meaningful changes and where money went in a selected period.
4. Correct mistakes or source mismatches without corrupting the ledger.
5. Retain, back up and export trustworthy user-owned data.
6. Connect plans, obligations, goals and forecasts to explicit financial facts and assumptions.
7. Reduce the work required to keep the ledger complete as the user continues using the product.

## Product character

- Calm, factual and non-judgmental.
- Vietnamese copy and integer VND are first-class requirements.
- Mobile usability is a release gate, not a later enhancement.
- Advanced capability is progressively disclosed rather than placed in every user's daily path.
- Automation explains what changed, why, its source/provenance and how to correct or reverse it.
- Data quality and coverage are explicit; unknown activity is never presented as known completeness.
- The product remains usable when no bank/provider connection is available.

## Acquisition law

MoneyFlow's **current released MVP** is still predominantly manual/import-assisted. That is current capability, not the long-term workflow target.

Long-term:

> **A digital transaction that MoneyFlow can acquire safely should not require the user to retype it.**

Automatic or near-automatic acquisition is the strategic default for digital activity. Manual capture remains a first-class fallback for:

- cash;
- events no connected/source channel can observe;
- corrections and missing records;
- owner-chosen explicit entry.

All acquisition channels must converge on one neutral pipeline:

```text
source/evidence
  -> parser/adapter + version
  -> normalized candidate + provenance
  -> validation
  -> duplicate / transfer / rule decision
  -> human review or bounded approved automation
  -> atomic ledger fact
  -> reconciliation / correction / audit
```

A bank API, e-wallet/provider feed, statement file, share/paste input, Android notification source or manual form must not create a second financial truth model.

Provider adapters create source records/candidates. They do not directly overwrite balances or silently classify/post outside the normal financial mutation contract.

## Financial honesty

MoneyFlow must distinguish:

- **Total assets/balance:** money represented by active accounts according to known/reconciled data.
- **Income and expense:** ledger activity in a period, excluding transfers.
- **Allocated money:** money assigned to goals or budgets but still part of total assets.
- **Commitments:** expected obligations, which may be unpaid or incomplete.
- **Spending plan:** a user-approved plan derived from sufficient income-cycle, obligation and reserve data.
- **Financial fact:** a posted ledger record or explicitly sourced balance/valuation observation.
- **Expectation:** a planned occurrence that has not yet become a posted fact.
- **Assumption:** a user-owned scenario input.
- **Projection:** a recalculable output derived from facts, expectations and assumptions.
- **Suggestion:** a rule/model result that remains reviewable until its contract allows automatic action.
- **Source evidence:** external/user-provided material that may support a fact but is not itself automatically authoritative.

The product must not infer a spending plan from total assets alone. Missing income dates, reserves, obligations, source coverage or account intent remain unknown.

A projection must expose coverage and assumptions. It may inform planning, but it is not a promise or an autonomous financial decision.

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
- CSV export and controlled import/share tools.
- Responsive web UI with light/dark support.

Do not describe bank sync, automatic provider feeds, native Android capture, wealth or household finance as shipped until merged implementation evidence proves them.

## Product system and dependency order

MoneyFlow may ultimately expand through these layers, but the dependency order is now:

1. **Core trust:** ledger facts, balances, review, correction, recovery, export/backup.
2. **Acquire + reconcile:** sources, imports, candidates, provenance, duplicate/transfer matching, clearing and reconciliation.
3. **Understand:** traceable reports, drill-down, attention/review state and a compact whole-money picture.
4. **Plan:** recurring expectations, budgets, goals, reserves, debt plans and deterministic forecasts linked to facts.
5. **Automate:** versioned rules, learned suggestions, bounded auto-approval, APIs/webhooks and reliable background sync.
6. **Connect:** selective contracted read-only provider feeds when retention, legal/security and economics justify them. Connectivity may begin earlier as a bounded pilot once the acquisition contract exists; it must not bypass it.
7. **Wealth:** assets, liabilities, loans, investments, valuations and explicit multi-currency architecture.
8. **Together:** household/workspace ownership, permissions and collaboration.
9. **Optional intelligence:** explainable suggestions and natural-language exploration over authorized records with deterministic fallback.

A capability in the horizon is not implementation permission. High-risk modules require a researched specification, owner approval, financial/security contract, migration/rollback and measurable success/failure criteria.

## Provider and mobile boundaries

- Bank/Open Banking connectivity is read-only first.
- No bank/e-wallet is selected without current official API/contract/economics evidence.
- The product must degrade gracefully when a provider cannot connect or a consent expires.
- Native mobile is justified by validated capabilities the web cannot deliver reliably, not by category convention.
- Android SMS permissions must not be assumed available for a Play-distributed app; notification content is also a fallible source and may be redacted by the platform.
- Source data remains evidence requiring validation/reconciliation, not an excuse to trust external payloads blindly.

## Automation and intelligence boundaries

- Deterministic rules are preferred for repeatable known behavior.
- Probabilistic suggestions must expose uncertainty and be learned/evaluated from user-confirmed outcomes.
- Auto-approval is bounded by a measured precision/error contract and remains reversible.
- AI is not a source of financial truth, not autonomous financial advice and not an alternate posting path.
- Natural-language answers must be grounded in authorized records and make source/coverage visible where relevant.

## Prioritization rule

When trade-offs conflict, use this order:

1. Data correctness, ownership safety and recoverability.
2. Ability to maintain a trustworthy ledger.
3. Reduction in repeated human maintenance for real observed activity.
4. Mobile usability and accessibility.
5. Reconciliation, provenance and explainability.
6. Understanding that answers repeated user questions from traceable facts.
7. Connected planning that stays current from real facts.
8. Selective automation/connectivity with proven economics and reliability.
9. Performance and maintainability.
10. Visual polish and speculative breadth.

Feature popularity elsewhere is not evidence.

## Evidence before features

A proposed feature must answer:

- What user problem was observed?
- What current MoneyFlow code/data/workflow already exists?
- Which official sources or implementation references were researched?
- Which assumptions remain unknown?
- What is the smallest testable vertical slice?
- How will success and failure be measured?
- Which financial, ownership, source, currency or provider semantics change?
- What is the rollback/disconnect path?
- What must not change?

## Product health metrics

Primary program concept:

> **Trusted periods maintained with decreasing maintenance effort.**

Supporting metrics include:

- manual interventions per 100 observed transactions;
- maintenance minutes per active user/month;
- source coverage and unresolved/duplicate rate;
- automatic-match precision and user correction rate;
- reconciliation confidence/completion;
- time to first trustworthy period;
- multi-period retention;
- export/restore success;
- provider/support cost per retained paying user when applicable.

DAU and feature count are not primary success metrics. A good MoneyFlow may require fewer user interventions over time.

## Daily-use and release readiness

MoneyFlow is ready for real self-use only when the relevant production authentication/recovery, physical-phone core flows, financial reconciliation, safe export and open P0/P1 conditions meet the release contract.

Daily-use evidence remains important while broader modules are developed. New feature breadth never substitutes for trust/release evidence, and strategy work cannot close RRB/provider/legal/physical-device gates.

### Historical release-gate decision

The former requirement that the product be used for seven consecutive days was **Withdrawn 2026-08-12**. Nothing replaces it as a hidden time-based release criterion. Release readiness is determined by the explicit trust, financial, security, provider/legal and physical-device evidence named in the active release contract.