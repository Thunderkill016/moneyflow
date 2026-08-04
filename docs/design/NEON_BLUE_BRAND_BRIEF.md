# MoneyFlow — Neon Blue brand application brief

**Status:** design discovery — not implementation authority  
**Owner input:** use Neon Blue as MoneyFlow's main color, including the logo  
**Current production authority:** Fresh Blue remains active until a reviewed replacement is selected, specified, implemented and approved  
**Primary hue under study:** `#3445FB`

## 1. Design question

How should MoneyFlow apply Neon Blue as a project-wide identity so the product feels distinctive and modern while remaining calm, financially honest, readable on mobile, accessible in light/dark workspace modes and clearly separated from income, expense, warning and transfer semantics?

The owner has selected the hue family to investigate. The unresolved design decision is **how that hue is distributed across surfaces, identity, actions, navigation, proof, charts and dark mode**.

## 2. User and product truth

MoneyFlow helps a user:

- record income, expense and internal transfers correctly;
- understand which account changed;
- reopen the transaction behind a number;
- correct mistakes and preserve an auditable ledger;
- use the product without linking a bank account.

Trust must come from correct product behavior, understandable flows, recovery, export and honest claims. Color may reinforce that trust but cannot create it by itself.

Forbidden design implications:

- Neon Blue must not imply bank affiliation, automated financial advice or guaranteed outcomes;
- visual intensity must not hide uncertainty, errors or destructive actions;
- brand color must not replace financial semantic colors;
- charts and financial status must remain understandable without color.

## 3. Representative user decisions

The study must apply each direction to the same representative screens and decisions:

| Surface | User decision | Primary action |
|---|---|---|
| Landing hero | Is this product relevant and credible? | Create a ledger |
| Landing guided story | How does a recorded movement become a checkable number? | Continue to registration |
| Login | How do I safely return to my ledger? | Sign in |
| Registration | How do I start a new checkable ledger? | Create account |
| Recovery | How do I regain access without losing data? | Request/reset password |
| Workspace shell | Where am I and what should I do next? | Record a transaction |
| Dashboard/account overview | Where is the money and why did it change? | Inspect account or transaction |
| Transaction list | Which record explains this number? | Filter/open/edit |
| Financial status and chart sample | What does each color mean? | Read/compare without ambiguity |

## 4. Required states and sizes

Every visual direction must show or specify:

- mobile `320px` and `390px`;
- desktop `1366px` or `1440px`;
- public Light-only behavior;
- workspace Light and Dark behavior;
- default, hover, pressed, focus and disabled actions;
- loading, empty, validation, error, success and recovery states where relevant;
- long Vietnamese labels and large monetary values;
- reduced-motion and forced-colors behavior.

## 5. Color architecture constraints

### Neutral foundation

Approximately 75–85% of the interface remains neutral: canvas, surfaces, text, borders, overlays and elevation.

### Brand and action

Approximately 8–15% may use Neon Blue for identity, primary actions, active navigation, focus, selection and branded emphasis.

### Financial semantics

These roles remain independent:

- green: income/success;
- red: expense/danger/destructive action;
- amber: warning/attention;
- violet: transfer/neutral movement;
- functional information: a separate information role where needed.

### Charts

Charts require an ordered palette, direct labels or legends and color-vision-deficiency checks. Neon Blue may be a brand or selected-series role, but it must not collapse adjacent data series or financial meanings.

## 6. Fixed and open decisions

### Fixed by owner

- Neon Blue is the hue family to study as the primary MoneyFlow identity;
- the canonical B3.2 logo geometry and `MoneyFlow` wordmark remain unchanged;
- the logo color must participate in the selected Neon Blue system;
- financial semantics remain separate.

### Open for design selection

- whether Neon Blue appears mainly as controlled action, framing surface or editorial signal;
- exact light and dark ramps;
- logo treatment on neutral, Neon and dark surfaces;
- proportion of Neon Blue per viewport;
- stage/subtle surface behavior;
- navigation, focus and selected-state composition;
- chart integration;
- supporting neutral temperature, border and elevation language.

## 7. Evidence basis

This brief applies the active MoneyFlow workflow and public-experience research:

- start from product truth and decision questions;
- audit the current product;
- compare multiple genuinely different directions on the same screens;
- separate brand/action from financial semantics;
- choose by clarity, mobile behavior, financial honesty, implementation quality and accessibility;
- lock tokens only after owner selection;
- implement through a bounded vertical slice;
- require browser/device evidence and owner visual approval before merge.

## 8. Deliverables and gates

1. Current-state audit.
2. Three independent application directions.
3. Responsive visual study on the same landing, auth and workspace samples.
4. Owner selects one direction or requests another divergence round.
5. Annotated semantic token, logo, light/dark, component and chart specification.
6. Separate implementation PR.
7. Automated and physical-device verification.
8. Owner visual approval.
9. Explicit merge authorization.

No production code or design authority is created by this brief.