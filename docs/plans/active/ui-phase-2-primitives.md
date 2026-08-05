# MoneyFlow UI migration — Phase 2 tokens and primitives

**Status:** evaluating
**Execution state:** closure verification
**Active role:** evaluator
**Permission scope:** branch_write_and_owner_authorized_closure
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 1 evidence:** merged PR #298
**Current PR:** #299
**Last updated:** 2026-08-05

The owner instructed **“Bắt đầu p2”**, requested external-standards corrections and then explicitly instructed **“hoàn tất p2 đi”** on 2026-08-05. The final instruction authorizes Phase 2 closure and merge when the exact PR head passes protected gates. It does not authorize Phase 3, deployment, provider operations, production-data access or a new visual direction.

## Outcome

Establish MoneyFlow-native token and primitive contracts so actions, form controls, overlays, feedback, empty states and financial values own their semantics, accessibility and target behavior directly. Preserve B3.2/Fresh Blue, public light-only behavior, workspace Light/Dark/System behavior and all financial-domain semantics.

Phase 2 creates owned shared primitives, proves bounded composition and inventories remaining global repairs. It does not perform a big-bang route migration or remove `MinimumTargetSizeContract`.

## Repository reconnaissance

Verified starting and completion boundaries:

- `src/app/document-theme.css` is the executable semantic theme/color authority.
- Existing Button used Base UI/CVA with 24–36px visual sizes and compatibility variants.
- `MinimumTargetSizeContract` globally repaired broad control families to 44px and mixed target geometry with route discoverability/responsive fixes.
- Phase 1 prevents new global CSS layers, import chains, unreviewed `!important`, unknown token references and known legacy-class registration.
- Existing `src/lib/money.ts` owns currency formatting/domain display helpers.
- Existing Card is noninteractive by default and already satisfies the Phase 2 surface boundary.
- PR #299 changes shared presentation primitives only; it changes no database, auth, RLS, provider, production-data or financial mutation logic.

Completed source inventory:

- action: Button, LinkButton, IconButton;
- forms: TextField, SelectField, CheckboxField, RadioGroup;
- overlays: Dialog, Sheet;
- feedback/surfaces: Card, Badge, Alert, Toast/ToastRegion, EmptyState;
- finance presentation: MoneyValue;
- contracts: `src/lib/ui-primitives-contract.test.ts`;
- compatibility inventory: `docs/research/UI_PHASE_2_TOKEN_PRIMITIVE_INVENTORY_2026-08-05.md`.

## Research

Phase 2 separates external requirements, migration practices and MoneyFlow policy.

### External standards/tool behavior

- WCAG 2.2 AA target-size baseline is 24×24 CSS px or a defined exception.
- WCAG 2.2 enhanced target is 44×44 CSS px; it is not universal AA.
- WAI-ARIA APG supports native semantics first and requires custom composites to implement applicable role, state, relationship, keyboard and focus behavior.
- WCAG requires non-color-only meaning, text error identification, correction suggestions when known, status semantics, focus not entirely obscured and reversible/checked/confirmed safeguards for consequential financial or stored-data operations.
- 200% text resize, equivalent 320 CSS-pixel reflow and actual mobile viewport are separate evidence categories.
- Next.js permits global CSS; MoneyFlow's no-new-global-CSS gate is project-specific.
- Storybook supports isolated component-state review but does not require installation or a five-state threshold.

### Selected migration practices

- add owned primitives while preserving current compatibility inputs;
- prefer native controls when they meet requirements;
- preserve token values and financial behavior while moving ownership;
- retain compatibility layers until consumers are measured and migrated;
- treat scanner output as guardrail/evidence rather than automatic deletion authority;
- require exact-head source/static/build/browser evidence before closure.

### MoneyFlow policy

- `document-theme.css` remains the only executable theme/color authority during this migration.
- Important financial, destructive, confirmation, icon-only, mobile-navigation and frequent-capture actions use an actual target of at least 44×44 CSS px.
- Other controls meet WCAG AA target-size/spacing or a valid exception.
- The global-CSS freeze, `!important` budget, route/class restrictions and Storybook reassessment gate are repository controls, not universal standards.
- Guided Story and B3.2/Fresh Blue remain preserved.

## Specification

### Action primitives

Button retains existing variant/size inputs while adding semantic intent, density, target policy, pending label, `aria-busy`, duplicate-activation prevention and an unstyled route-compatibility bridge. LinkButton renders real navigation. IconButton requires an accessible name and defaults to the important target. Generic invalid behavior remains a form concern, not a Button state.

### Form primitives

- TextField owns label, description, error, correction suggestion, value preservation, prefix/suffix, pending and target policy.
- SelectField is native-first and owns label/description/error/placeholder and target policy.
- CheckboxField is native, owns its associated label/error and supports indeterminate state.
- RadioGroup uses native fieldset/legend and native radio keyboard behavior.

No custom combobox or roving-tabindex radio was added without a product requirement that justified replacing native behavior.

### Overlay primitives

- Dialog uses the native modal dialog contract with required title, optional description, initial focus, Escape/cancel policy, focus restoration, scroll containment and accessible close target.
- Sheet requires an explicit modal/non-modal mode. Modal composes Dialog. Non-modal does not claim modal semantics or trap focus.

### Feedback, surface and financial presentation

- Card remains a noninteractive surface.
- Badge adds neutral/info/income/warning/expense/transfer semantic tones.
- Alert exposes explicit off/polite/assertive announcement policy.
- Toast uses a polite routine region, urgent-only alerts, ID deduplication and no automatic focus.
- EmptyState exposes one primary-action slot and optional secondary action.
- MoneyValue composes existing money helpers, uses tabular numerals and requires explicit sign/kind rather than guessing meaning.

### Token rules

- No token value changes.
- New semantic components consume canonical income, expense, transfer, warning and info roles.
- Incorrect new TSX references to nonexistent `--mf-*-soft` names were corrected to canonical `--mf-*-subtle` roles.
- Success/danger aliases remain until zero-reference evidence.

### Financial mutation boundary

The new primitives contain no mutation logic. Future route consumers that commit or alter stored financial data must identify a reversible, checked or confirmed safeguard and prevent duplicate mutation while pending. Domain changes remain separately governed.

## Implementation plan

### Completed slices

1. Specify standards, API, state, keyboard, target and mutation-safety boundaries.
2. Inventory tokens, aliases, existing primitives and global target repairs.
3. Adapt action primitives without changing compatibility defaults.
4. Add native-first form primitives.
5. Add modal/non-modal overlay primitives.
6. Add feedback, empty-state and semantic finance presentation contracts.
7. Add source-contract regression tests.
8. Prove bounded internal composition without broad route changes.
9. Classify remaining `MinimumTargetSizeContract` selector groups.
10. Reassess Storybook and continue to defer it.

### Bounded proof consumers

- Dialog consumes IconButton.
- Modal Sheet consumes Dialog.
- Non-modal Sheet consumes IconButton.
- Badge/Alert/Toast consume canonical semantic token roles.
- MoneyValue consumes existing money-formatting helpers.

This is intentionally lower-risk than changing every route to a new default in Phase 2.

### Remaining compatibility debt

`MinimumTargetSizeContract` remains mounted because it combines:

- universal target repairs that mix AA, important and exception cases;
- important Inbox/row/financial/navigation actions;
- action discoverability;
- route-specific responsive wrapping and full-width fixes.

Final removal requires route ownership, zero-consumer proof and physical-device acceptance in later work.

### Storybook decision

The internal reassessment condition was reached. Installation remains deferred because source contracts, unit/static tests and existing Playwright route/device audits cover this slice; a second configuration/build surface did not demonstrate lower review cost and no separate dependency adoption was approved.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API/state/keyboard/accessibility matrix | this packet | done |
| P2-T2 | Normalize token vocabulary and inventory aliases without value changes | completed inventory | done |
| P2-T3 | Implement Button, LinkButton and IconButton | source + contract tests | done |
| P2-T4 | Implement TextField, SelectField, CheckboxField and RadioGroup | source + contract tests | done |
| P2-T5 | Implement Dialog and Sheet | source + contract tests | done |
| P2-T6 | Establish Card, Badge, Alert, Toast and EmptyState contracts | source + contract tests | done |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | existing helpers + MoneyValue contract | done |
| P2-T8 | Migrate bounded low-risk consumers | shared composition proof set | done |
| P2-T9 | Inventory remaining target-contract rescues | selector-group classification | done |
| P2-T10 | Owner approves closure boundary | “hoàn tất p2 đi” | authorized; exact-head verification in progress |

## Evaluation

Required exact-head gates:

- no-new-debt, diff hygiene and project knowledge;
- CSS ownership, architecture, lint and TypeScript;
- complete unit/static suite including primitive contracts;
- production build;
- browser smoke;
- Chromium/WebKit cross-device audit, including existing text-200 and keyboard projects;
- CodeQL;
- all-ref secret history scan.

Database/provider/production-data gates are not applicable.

First ready-for-review run correctly exposed a governance-schema failure: required work-packet headings and exact PR-memory field names had been lost during compaction, and the current project snapshot was stale. This closure correction restores the required headings/fields and synchronizes `CURRENT_PROJECT_MEMORY.md`; the failure is not waived.

## Handoff record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | “Bắt đầu p2” | define matrix/inventory |
| 2026-08-05 | human_owner | implementer | implementing | standards corrections requested | harden contract and implement bounded slices |
| 2026-08-05 | human_owner | evaluator | evaluating | “hoàn tất p2 đi” | pass exact-head gates, fix failures, record closure and merge |

### Current permission boundary

- Authorized: finish Phase 2 verification, closure records and merge PR #299 when exact-head protected gates are green.
- Forbidden: Phase 3, broad route redesign, new identity, Storybook/dependency installation, database/auth/RLS/provider changes, deployment and production-data access.
- Stop condition: any required domain mutation, provider or production-data change.

## Delivery record

- Branch: `agent/ui-phase-2-primitives`
- PR: #299
- Starting main: `8688d95160579eacb908f0162994edba4901fc0c`
- Runtime scope: shared presentation primitives only
- Financial-domain behavior change: none
- Provider/production operation: none
- Phase 3 authorization: not granted
