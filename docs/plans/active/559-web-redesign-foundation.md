# #559 — MoneyFlow web redesign foundation

**Status:** active candidate until selector PR merges
**Execution state:** researching / specifying
**Active role:** researcher / product designer / planner
**Permission scope:** branch documentation/research only; no runtime/UI implementation in this slice
**Owner:** human owner
**Issue:** #559
**PR:** TBD
**Branch:** `design/559-web-redesign-foundation`
**Base:** `main@ad0461514acaec1c9a8a100ba92592c83ece46b2`

## Outcome

Create the evidence and architecture required to redesign the full MoneyFlow web experience without repeating the product's prior UI/CSS/test failures.

This slice does **not** redesign runtime screens. It establishes:

1. historical design failure postmortem;
2. current presentation/route authority inventory;
3. focused external web-design/accessibility/finance-workflow research;
4. target product experience architecture and information architecture;
5. Design System v3 contract and machine-verifiable guardrails;
6. migration/validation workflow for later bounded UI slices.

## Why this slice exists

MoneyFlow has already paid the cost of UI work that looked complete in source or screenshots while failing at runtime. PR #337 proved product code could emit classes with no active stylesheet owner while existing CSS gates stayed green, and `/onboarding` shipped effectively unstyled. It also surfaced semantic Tailwind theme utilities that existed in component source but generated no corresponding production CSS.

A full redesign therefore cannot begin with screens, colors or component rewrites. The authority chain must be established first:

```text
product/brand semantics
  -> design tokens
  -> primitives
  -> patterns
  -> route composition
  -> production CSS
  -> computed browser styles
  -> interaction behavior
```

## Product constraints

From current product law and project memory:

- MoneyFlow is a Vietnamese personal-finance product built on one trustworthy user-owned ledger.
- The currently shipped product is manual/import-assisted; redesign copy or affordances must not imply unshipped provider sync/native acquisition.
- Financial truth, ownership/recoverability and maintenance reduction outrank visual novelty.
- Mobile usability is a release gate.
- Advanced capability is progressively disclosed.
- Financial meaning must not rely on color alone.
- Demo and authenticated modes are distinct runtime truths.

## Research

### External sources selected for this bounded decision

1. **W3C WCAG 2.2 / Understanding docs** — accessibility floor for focus visibility/not-obscured, target size, contrast and input behavior.
2. **WAI-ARIA Authoring Practices Guide** — semantic/keyboard contracts for dialog, table vs interactive grid, tabs, disclosure and other composite widgets.
3. **MDN CSS container queries + reduced-motion guidance** — component-responsive layout and motion preference implementation.
4. **Current YNAB workflow/help evidence** — finance workflow reference for transaction capture, import/manual coexistence and responsive account/register patterns; reference only, not MoneyFlow authority.

### Initial findings

- WCAG 2.2 AA adds a 24×24 CSS-pixel minimum target-size requirement (subject to defined exceptions) and requires focused controls not be completely obscured. MoneyFlow should use this as a floor and prefer ~44px primary touch targets on mobile.
- Keyboard focus must remain visibly identifiable; shared primitives therefore need explicit focus tokens and computed-style tests.
- Native semantic HTML should be preferred where possible. WAI-ARIA distinguishes a static table from an interactive grid; choosing grid semantics creates an additional keyboard-focus-management contract and should be reserved for genuinely spreadsheet-like interaction.
- Dialog focus must stay contained while open and return to a sensible workflow position when closed.
- Container queries let reusable cards/panels respond to their actual allocated space rather than only viewport width; useful for MoneyFlow's desktop split panes and responsive dashboard/planning cards.
- Non-essential motion should honor `prefers-reduced-motion`.
- Current YNAB materials show a useful workflow principle: manual entry and imported activity can coexist, while the UI clarifies transaction type and matching rather than forcing users to understand accounting mechanics. MoneyFlow can adopt the interaction principle while keeping its own ledger/provenance semantics.

### What these sources do not establish

- They do not prove a specific MoneyFlow visual identity.
- They do not justify copying competitor navigation, data model or financial semantics.
- They do not establish Vietnamese bank/provider capability.
- They do not replace runtime/browser/physical-device validation.

## Historical failure postmortem — mandatory findings to verify

The postmortem must inspect merged history and affected code/tests, not only PR summaries.

| Failure class | Known symptom | Required prevention |
|---|---|---|
| presentation ownership gap | code emitted classes with no active CSS owner; onboarding shipped effectively unstyled | code→CSS ownership gate; debt shrink-only; component ownership graph |
| token/runtime mismatch | semantic utilities emitted in JSX but missing from production bundle | token→build→generated CSS→computed style proof |
| cascade conflict | global/unlayered rules can defeat primitive intent | cascade-layer authority + primitive consumer blast-radius tests |
| runtime-mode false green | browser suites can prove demo while claiming authenticated behavior | explicit demo/auth test contracts and environment assertions |
| screenshot false confidence | a frame can look correct while first-paint/persistence interaction is wrong | first-attempt interaction assertions; retry-pass treated as finding |
| legacy accumulation | migration can add another compatibility/global layer rather than retire old ownership | replace-and-retire within each vertical slice; no new root override layer |
| authority conflict | brand/design/docs/runtime can each imply different tokens/identity | one canonical brand/token authority before migration |

Deliverable: `docs/research/DESIGN_FAILURE_POSTMORTEM_2026.md` with `symptom -> root cause -> why missed -> cost -> repair -> permanent prevention`.

## Current-product inventory requirements

Before designing routes, inventory from current `main`:

- every user-facing route and its primary job;
- app shell/navigation ownership;
- global stylesheets, CSS modules and token sources;
- shared UI primitives and route-specific patterns;
- tables/lists/charts/forms/dialogs/sheets/toasts;
- loading/empty/error/unknown/partial-coverage states;
- demo vs authenticated behavior;
- responsive/mobile behavior and dark/light parity;
- existing browser/UI-audit coverage.

Do not infer dead presentation from source naming; measure ownership and DOM/runtime behavior.

## Target product experience architecture — hypothesis to validate

Reduce feature-as-navigation sprawl into a small set of durable user mental models:

1. **Today** — whole-money snapshot, trust/coverage status, next attention, one dominant action.
2. **Activity** — posted transactions plus Inbox/review/acquisition state as one workstream.
3. **Accounts** — balances, account register, reconciliation and source health.
4. **Plan** — budgets, commitments and goals as connected planning, progressively disclosed.
5. **Insights** — traceable period understanding, changes and drill-down.
6. **Settings & Data** — acquisition/import settings, ownership/backup/export, security and preferences.

This is a design hypothesis, not implementation permission. Route mapping must preserve existing URLs where useful and avoid unnecessary rewrite risk.

## Interaction principles

- **Attention before analytics:** unresolved/reconciliation/source-health states precede decorative dashboard metrics.
- **One dominant action per viewport:** secondary actions remain visible but visually subordinate.
- **Progressive disclosure:** daily work shows the minimum needed; provenance and advanced controls remain reachable.
- **Facts vs expectations are visually distinct:** no chart/card should blur posted ledger facts, planning expectations and projections.
- **Correction is first-class:** users can understand and reverse/correct imported or manually entered activity without learning internal architecture.
- **No color-only semantics:** signs, labels, icons/patterns and text carry meaning together.
- **Mobile is a distinct composition, not compressed desktop.**
- **Desktop can exploit split-view density** for account list + register and review queue + detail where task efficiency improves.

## Design System v3 contract

### Authority namespaces

**Brand/neutral semantics**
- canvas/surface/elevated/overlay;
- foreground/muted/subtle/inverse;
- border/focus/interactive/accent;
- danger/warning/success/info as UI states.

**Financial semantics**
- income;
- expense;
- transfer;
- allocation/plan;
- cleared/pending/unresolved/reconciled;
- fact/expectation/projection/source-evidence.

Brand color aliases must not silently own financial meaning.

### Required foundations

- typography scale suitable for Vietnamese copy and dense VND numbers;
- tabular-number behavior for money/data cells;
- spacing/density scale;
- radius/elevation policy;
- icon rules;
- motion duration/easing + reduced-motion fallback;
- responsive/container-query rules;
- focus/target/contrast contracts;
- data visualization palette/pattern rules that remain understandable without color alone;
- loading/empty/error/offline/unknown/partial-coverage states;
- light/dark parity.

### Component hierarchy

```text
Tokens
  -> primitives (Button, Input, Select, Dialog, Sheet, Tabs, Table/List, Badge, Card, etc.)
  -> finance patterns (MoneyAmount, TransactionRow, AccountSummary, CoverageState, ReviewItem, PeriodMetric, ReconciliationStatus)
  -> workflow compositions (Activity workstream, Account register, Plan section, Insight drilldown)
  -> routes
```

A route must not create a second visual language for a primitive or finance semantic already owned below it.

## Responsive model

### Phone

- bottom navigation limited to high-frequency top-level destinations;
- persistent or easy-reach Add action where task evidence supports it;
- full-width lists/cards, sheets for secondary detail/edit, no desktop table squeezed into 360px;
- minimum 24px targets, prefer >=44px for primary controls;
- monetary hierarchy remains readable without horizontal scrolling for normal daily paths.

### Tablet / narrow desktop

- navigation rail or compact sidebar;
- two-pane patterns where master/detail materially reduces context switching;
- card/panel adaptation driven by container size where practical.

### Wide desktop

- persistent sidebar;
- bounded readable content widths for forms/settings;
- dense but accessible registers/review surfaces;
- multi-column dashboards only when each region has a clear job and does not create competing primary actions.

## Migration workflow

Later implementation must use vertical slices, not a repo-wide CSS rewrite:

1. lock selected visual territory and tokens;
2. prove shared primitives in an isolated runtime matrix;
3. migrate app shell/navigation;
4. migrate Today;
5. migrate Activity/review;
6. migrate Accounts/reconciliation;
7. migrate Plan;
8. migrate Insights;
9. migrate Settings/Data ownership;
10. migrate auth/onboarding/system states;
11. final legacy/consistency sweep.

Each slice must retire the legacy presentation it replaces in the same PR where feasible.

## Validation matrix

Baseline combinations:

```text
demo × authenticated
light × dark
phone × desktop
empty × content
```

Risk-selected additions:

```text
loading
error
unknown/partial coverage
unresolved review
reconciliation mismatch
long Vietnamese labels
large VND amounts
keyboard only
reduced motion
```

Shared primitive/token changes require representative consumers, not only component-story screenshots.

## Machine-verifiable guardrails to design

- presentation ownership debt cannot grow;
- raw brand hex/font/radius/motion values prohibited outside owned authority surfaces (with documented exceptions if necessary);
- no new root/global override stylesheet;
- shared primitive changes trigger representative-consumer browser tests;
- semantic-token changes require production CSS + computed-style probes;
- demo/auth test environment asserted explicitly;
- retry-pass is reported as flaky/finding rather than clean acceptance;
- accessibility checks cover focus, target size, semantics and contrast;
- migration PR reports whether presentation-authority count decreased or increased.

## Tasks

| ID | Task | Status |
|---|---|---|
| D0.1 | select #559 foundation slice through plan authority | in_progress |
| D0.2 | forensic merged UI history / design failure postmortem | pending |
| D0.3 | current route/component/CSS/test inventory | pending |
| D0.4 | focused external UX/accessibility/pattern research | in_progress |
| D0.5 | validate target IA against current route jobs | pending |
| D0.6 | specify Design System v3 authority + guardrails | in_progress |
| D0.7 | define visual-territory brief for exactly three directions | pending |
| D0.8 | exact-head docs/knowledge/CI-policy verification | pending |
| D0.9 | independent evaluation + owner handoff | pending |

## Exit criteria

This slice can close only when:

- postmortem is grounded in merged history/code/tests;
- current presentation inventory is complete enough to identify authority/debt boundaries;
- research sources and non-applicability are recorded;
- target IA is mapped to current jobs/routes;
- Design System v3 contract and migration guardrails are explicit;
- exactly three visual territories are ready for owner selection in a later design step;
- no runtime code or schema changed;
- exact-head required checks are green;
- PR memory and lifecycle state are truthful.

## Handoff

Owner instruction on 2026-09-10 authorizes designing the complete MoneyFlow web experience. Repository policy still requires this bounded foundation/selector before runtime implementation. Merge remains owner decision.