# MoneyFlow Phase 2 token and primitive inventory — 2026-08-05

**Status:** completed for Phase 2
**Program provenance:** `docs/plans/completed/2026-08-08-ui-system-migration.md`
**Phase packet provenance:** `docs/plans/completed/2026-08-08-ui-phase-2-primitives.md`
**Branch:** `agent/ui-phase-2-primitives`
**PR:** #299
**Starting main:** `8688d95160579eacb908f0162994edba4901fc0c`

This inventory records the token, primitive, compatibility and proof-consumer boundaries completed by Phase 2. It does not claim that every product route has migrated away from legacy presentation contracts. Route rollout and final removal of global compatibility CSS remain later migration work.

## 1. Authority classification

Phase 2 keeps three authorities distinct:

| Type | Meaning |
|---|---|
| External standard/tool behavior | WCAG, WAI-ARIA APG, Next.js and Storybook requirements or documented capabilities |
| Selected migration practice | Native-first controls, incremental ownership, compatibility retention and evidence-driven removal |
| MoneyFlow project policy | Repository-specific decisions that may be stricter than an external minimum |

Target sizing is classified as follows:

- WCAG 2.2 AA baseline: 24×24 CSS px or a valid spacing/equivalent/inline/user-agent/essential exception.
- WCAG 2.2 AAA enhanced target: 44×44 CSS px.
- MoneyFlow important-action policy: actual target at least 44×44 CSS px for important financial, destructive, confirmation, icon-only, mobile-navigation and frequent-capture actions.
- Inline prose links and compact low-risk utilities are not automatically expanded to 44px.

Other external-contract consequences carried into implementation:

- native HTML semantics are preferred before custom ARIA;
- custom composites must implement their applicable role, state, relationship and keyboard model;
- Button does not own a generic invalid state;
- routine status feedback is polite by default and urgent errors alone are assertive;
- affected stored-financial-data mutations require a reversible, checked or confirmed safeguard;
- text resize, reflow and actual mobile viewport are separate evidence categories;
- focused controls must remain visible and not entirely obscured.

## 2. Token authority and normalization

`src/app/document-theme.css` remains the sole executable semantic color/theme authority for Phase 2.

Canonical families consumed by the primitives:

| Family | Ownership |
|---|---|
| `--mf-brand-*` | Fresh Blue identity and interaction roles |
| `--mf-canvas`, `--mf-surface*` | document/component surfaces |
| `--mf-text*`, `--mf-border*` | readable content and boundaries |
| `--mf-income-*` | income and positive financial meaning |
| `--mf-expense-*` | expense and destructive financial meaning |
| `--mf-transfer-*` | transfer and money-movement meaning |
| `--mf-warning-*`, `--mf-info-*` | warning and informational feedback |
| `--mf-focus*` | focus treatment |
| `--mf-shadow*`, `--mf-radius*` | elevation and geometry |
| `--mf-font-*`, `--mf-money-*` | UI and money typography |
| `--mf-fast`, `--mf-normal`, `--mf-ease` | motion timing |

Phase 2 found and corrected new TSX token references from nonexistent `--mf-*-soft` names to the canonical `--mf-*-subtle` names. No token value changed.

Compatibility aliases remain intentionally available:

- success aliases map to income roles;
- danger aliases map to expense roles.

Their removal still requires zero-reference evidence. Phase 1 token scanning remains a source guardrail rather than a complete CSS/runtime compiler; Phase 2 therefore added a source contract test and manually reconciled TSX arbitrary-value token references with the theme authority.

## 3. Primitive implementation inventory

### Action primitives

`src/components/ui/button.tsx` now provides:

- existing `variant` and `size` inputs as compatibility API;
- semantic `intent`: `primary`, `secondary`, `quiet`, `destructive`;
- semantic `density`: `standard`, `compact`;
- `targetSize`: `compat`, `aa`, `important`;
- pending state with accessible pending label, `aria-busy` and duplicate-activation prevention;
- `LinkButton` with real Next.js link semantics;
- `IconButton` requiring an accessible name and defaulting to the important 44px target;
- an explicit `unstyled` bridge for bounded migration of route-owned visual treatments without recreating global CSS.

Generic invalid styling was removed from the desired Button contract. Form invalid behavior belongs to field/form owners.

### Form primitives

| File | Completed ownership |
|---|---|
| `src/components/ui/text-field.tsx` | label, description, error, correction suggestion, preserved native input value, prefix/suffix, pending state and target policy |
| `src/components/ui/select-field.tsx` | native-first select, label/description/error, placeholder, long-option-safe native behavior and target policy |
| `src/components/ui/checkbox-field.tsx` | native checkbox, associated label target, description/error, indeterminate state and target policy |
| `src/components/ui/radio-group.tsx` | native fieldset/legend group, controlled/uncontrolled value, option descriptions, keyboard behavior delegated to native radio controls |

Phase 2 deliberately did not create a custom combobox or custom roving-tabindex radio implementation because current scope did not establish a product requirement that justified replacing correct native behavior.

### Overlay primitives

| File | Completed ownership |
|---|---|
| `src/components/ui/dialog.tsx` | native modal dialog, required accessible title, optional description, initial focus, Escape/cancel policy, focus restoration, scroll containment and 44px close target |
| `src/components/ui/sheet.tsx` | explicit modal/non-modal mode; modal composes Dialog, non-modal uses complementary aside semantics without `aria-modal` or a focus trap |

### Feedback, surface and empty-state primitives

| File | Completed ownership |
|---|---|
| existing `src/components/ui/card.tsx` | retained as a noninteractive surface; clickability is not implied |
| `src/components/ui/badge.tsx` | compatibility variants plus semantic neutral/info/income/warning/expense/transfer tones and density |
| `src/components/ui/alert.tsx` | semantic tones and explicit off/polite/assertive live policy |
| `src/components/ui/toast.tsx` | polite routine region, urgent-only alerts, message deduplication, no automatic focus and optional normal-flow action |
| `src/components/ui/empty-state.tsx` | title, explanation, one primary-action slot and optional secondary-action slot |

### Financial presentation

`src/components/ui/money-value.tsx` composes existing domain helpers from `src/lib/money.ts` and owns:

- full-value formatting through existing currency helpers;
- optional signed display;
- optional explicit income/expense/transfer kind;
- tabular numeral presentation;
- unavailable value treatment;
- accessible label without guessing financial meaning.

The primitive does not infer transaction kind, mutate amounts or replace domain validation.

## 4. Bounded proof consumers

Phase 2 uses shared internal consumers rather than changing broad route defaults:

1. Dialog consumes IconButton for an accessible named 44px close action.
2. Modal Sheet consumes Dialog and inherits its focus/dismissal contract.
3. Non-modal Sheet consumes IconButton without claiming modal behavior.
4. Badge, Alert and Toast consume canonical finance/status token families.
5. MoneyValue consumes the existing money-formatting domain helpers.

This bounded set proves API composition while avoiding App Shell changes, route redesign or mutation-behavior changes. No existing route is forced onto new visual defaults in Phase 2.

## 5. MinimumTargetSizeContract inventory

`src/components/minimum-target-size-contract.module.css` remains mounted. Phase 2 does not delete it because current routes still depend on its global and route-specific repairs.

### Selector-group classification

| Current selector group | Phase 2 classification | Required eventual owner |
|---|---|---|
| universal `button`, `a[href]`, role button/tab, `summary`, `select` | overbroad route compatibility debt; mixes AA, exceptions and important actions | individual primitives/routes after consumer migration |
| checkbox/radio wrapping labels | mixed AA/important compatibility debt | CheckboxField, RadioGroup or route-local native labels |
| Inbox select-all target and focus drawing | MoneyFlow-important control | Inbox-owned checkbox/header component |
| edit/delete/recurring row actions | MoneyFlow-important icon-only actions | route row-action component/IconButton |
| onboarding actions, landing CTA and standalone login/capture navigation | MoneyFlow-important navigation/action targets | owning route action/link primitives |
| commitment, budget and goal action groups | MoneyFlow-important financial actions plus route wrapping | owning financial route components |
| CSV export and privacy action-list links | explicit action targets, not prose links | report/privacy route owners |
| filter buttons, toolbar select and attention chip | mixed AA baseline or route-specific action debt; requires per-consumer evidence | owning filter/toolbar/report components |
| mobile wrapping, full-width filter and action-group layout repairs | route-specific responsive debt, not primitive target-size ownership | owning route CSS Modules/components |

The global contract currently also controls discoverability and mobile layout, proving that it is more than a pure target-size primitive. Those responsibilities must be separated before final removal.

### P2-T9 result

Every remaining rescued consumer now falls into one of four required categories:

1. MoneyFlow important target;
2. WCAG AA baseline/spacing;
3. valid exception;
4. route-specific compatibility/layout debt.

No global selector was removed in Phase 2. Zero-consumer proof and physical-device acceptance remain required before later retirement.

## 6. Financial mutation-safety boundary

The new primitives contain no financial mutation logic and the bounded proof consumers do not create, update or delete stored financial records.

For later route adoption, each consequential consumer must record one existing safeguard:

- reversible;
- checked with correction before commitment; or
- reviewed/confirmed before commitment.

Pending action state must also prevent duplicate mutation. Any change to domain mutation semantics remains outside Phase 2 and requires separate authorization.

## 7. Storybook reassessment

Phase 2 now has more than five high-value primitive/state boundaries, so the internal reassessment condition was reached.

Decision: **continue to defer installation**.

Reason:

- current source contracts, unit/static tests and existing Playwright route/device audit already cover the initial slice;
- no hosted visual-review provider is required;
- adding a second build/configuration surface did not demonstrate lower review cost for this PR;
- dependency installation still requires a separate explicit adoption decision.

This is a MoneyFlow sequencing decision, not a Storybook rule.

## 8. Contract verification

`src/lib/ui-primitives-contract.test.ts` protects the implemented source boundaries:

- semantic action API, target policy, pending behavior and accessible IconButton name;
- form relationships and native controls;
- modal/non-modal overlay distinction;
- polite/assertive feedback policy and deduplication;
- Card non-clickability, EmptyState action slots and MoneyValue domain-helper use.

Executable source changes also select full static, unit, production-build, browser-smoke and cross-device audit gates once PR #299 is moved out of draft.

## 9. Remaining migration debt after Phase 2

Phase 2 intentionally leaves these items for later phases:

- route-by-route primitive adoption;
- final removal of compatibility variants;
- zero-reference removal of success/danger aliases;
- route ownership of responsive fixes currently mixed into `MinimumTargetSizeContract`;
- final removal of that global contract;
- physical Android and iOS/Safari acceptance;
- any separately approved Storybook/equivalent adoption.

These are recorded debt and next-phase work, not incomplete Phase 2 deliverables.
