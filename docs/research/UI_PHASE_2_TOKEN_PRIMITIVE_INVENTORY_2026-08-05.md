# MoneyFlow Phase 2 token and primitive inventory — 2026-08-05

**Status:** initial inventory — standards contract corrected; source inventory still incomplete by design
**Program:** `docs/plans/active/ui-system-migration.md`
**Phase packet:** `docs/plans/active/ui-phase-2-primitives.md`
**Branch:** `agent/ui-phase-2-primitives`
**PR:** #299
**Starting main:** `8688d95160579eacb908f0162994edba4901fc0c`

This is the first P2-T2 inventory. It records source facts verified at Phase 2 start and the standards classifications that executable slices must satisfy. Missing primitive files, exports, consumers and token references are unresolved work, not assumed absence.

## 1. Authority classification

Phase 2 distinguishes three types of evidence:

| Type | Meaning in this inventory |
|---|---|
| External standard/tool behavior | Requirements or capabilities documented by W3C/WCAG, WAI-ARIA APG, Next.js or Storybook |
| Selected migration practice | Incremental ownership, native-first controls, compatibility retention and evidence-driven removal |
| MoneyFlow project policy | Rules intentionally stricter or more specific than external minimums because of this repository's product and legacy state |

Verified external target-size baseline:

- WCAG 2.2 Level AA SC 2.5.8 uses 24×24 CSS px, with spacing and other defined exceptions.
- WCAG 2.2 Level AAA SC 2.5.5 uses 44×44 CSS px, with defined exceptions.
- Therefore 44×44 is not the universal WCAG AA minimum.

Verified MoneyFlow policy:

- important financial/navigation/destructive/icon-only actions target at least 44×44 CSS px;
- other controls must meet WCAG AA target-size or a valid exception;
- inline prose links are not automatically expanded to 44px;
- the existing global 44px repair is compatibility debt, not the intended final architecture.

Additional standards boundaries now carried by the Phase 2 packet:

- Button does not own a generic `invalid` state; form invalid behavior stays with fields and form submission.
- Native controls are preferred when sufficient; custom select, checkbox, radio, dialog and sheet implementations must satisfy their applicable APG keyboard and ARIA contracts.
- Routine status updates are polite by default; ordinary toasts are not assertive alerts.
- Financial transactions and user-controlled stored-financial-data mutations require a reversible, checked or confirmed safeguard.
- 200% text resize, equivalent 320 CSS-pixel reflow and an actual 320px mobile viewport are separate evidence categories.
- Visible focus must also remain not entirely obscured by author-created content.

## 2. Token authority verified

`src/app/document-theme.css` explicitly owns project-wide color roles, light/dark resolution, canvas, focus visibility, type roles and motion values. Components are expected to consume `--mf-*` roles rather than create independent route palettes.

### Canonical role families currently visible

| Family | Current purpose |
|---|---|
| `--mf-brand-*` | Fresh Blue identity and interaction ramp |
| `--mf-canvas`, `--mf-surface*` | document and component surfaces |
| `--mf-text*` | primary, muted and soft text |
| `--mf-border*` | standard and strong borders |
| `--mf-income*` | income and positive financial meaning |
| `--mf-expense*` | expense and destructive financial meaning |
| `--mf-transfer*` | transfers and money movement |
| `--mf-warning*` | warning and attention |
| `--mf-info*` | informational feedback |
| `--mf-focus*` | focus color and ring |
| `--mf-shadow*` | shared elevation |
| `--mf-radius*` | shared radius roles |
| `--mf-font-*`, `--mf-money-*` | UI and financial typography |
| `--mf-fast`, `--mf-normal`, `--mf-ease` | motion timing |

### Verified compatibility aliases

The theme file currently maps success roles to income and danger roles to expense:

- `--mf-success`, `--mf-success-soft`, `--mf-success-text`, `--mf-success-border`;
- `--mf-danger`, `--mf-danger-soft`, `--mf-danger-text`, `--mf-danger-border`.

These aliases are compatibility boundaries. Phase 2 does not delete or rename them until all consumers are inventoried and computed values are proven unchanged.

The Phase 1 token scanner is useful for catching new undefined references, but it is not a complete CSS/runtime compiler. Runtime, generated or external tokens require an explicit known prefix or documented source rather than being assumed invalid.

### Theme behavior to preserve

- B3.2/Fresh Blue remains selected.
- Public routes remain light-only.
- Signed-in workspace retains Light/Dark/System behavior.
- Dark mode changes readable semantic values without changing their meaning.
- Finance colors are functional roles, not decorative palette choices.

## 3. Action primitive verified

### `src/components/ui/button.tsx`

Current implementation:

- wraps `@base-ui/react/button`;
- uses class-variance-authority;
- exposes variants `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`;
- exposes sizes `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`;
- current visible/control boxes range from 24px to 36px before global repair;
- includes focus-visible, disabled, invalid and icon-child styling;
- does not yet expose an explicit pending contract or a distinct MoneyFlow LinkButton/IconButton API.

Inventory judgment:

- preserve existing variants as compatibility inputs until direct consumers are mapped;
- do not globally increase every current size without route evidence;
- classify each consumer as WCAG-AA baseline, MoneyFlow-important or valid exception;
- use at least 44×44 for important action instances and icon-only controls;
- allow compact low-risk controls only when AA target-size/spacing requirements are met;
- separate visible density from actual pointer-target geometry;
- remove `invalid` from the future Button API; any current `aria-invalid` styling is compatibility behavior to classify, not a desired Button state;
- pending state must prevent duplicate activation while retaining an intelligible accessible name;
- prefer an explicit MoneyFlow semantic API rather than adding more route classes.

## 4. Global target-size compatibility verified

### `MinimumTargetSizeContract`

The root-mounted invisible component exists only to apply a CSS Module with global repairs.

The module currently:

- applies a 44×44px minimum to broad button, link, role-button, tab, summary and select families;
- repairs checkbox/radio label targets;
- contains route-specific Inbox, Accounts, Categories, Onboarding, Landing, Planning, Reports, Capture and Privacy selectors;
- uses multiple `!important` declarations to outrank legacy layers;
- controls discoverability of some edit/delete row actions;
- adds mobile wrapping rules for several action groups.

Inventory judgment:

- the broad global rule is stricter than WCAG AA and too wide for the final ownership model;
- its intent remains valuable for important actions, but it incorrectly treats every target family as equivalent;
- it remains mounted during Phase 2 to avoid regressions;
- action primitives should begin absorbing target-size ownership;
- route-specific repairs are not automatically primitive responsibilities;
- removal requires a later measured consumer inventory and zero-regression evidence;
- no selector is deleted from scanner or grep evidence alone.

### Required P2-T9 classification

Every remaining repaired consumer must eventually be classified as:

1. **MoneyFlow important:** retain at least 44×44 through the owning primitive/component;
2. **WCAG AA baseline:** at least 24×24 or valid spacing behavior;
3. **Valid exception:** inline text, equivalent control, user-agent-owned or essential presentation;
4. **Route-specific compatibility debt:** requires a local owner before the global selector is removed.

## 5. P0/P1 clarification carried into Phase 2

- The 1,200 `!important` budget is a temporary MoneyFlow regression ceiling, not a W3C or framework standard.
- The no-new-global-CSS gate is a MoneyFlow migration policy selected because the repository already has seven global compatibility layers; Next.js itself supports global CSS.
- The `/dashboard`, `/insights` and legacy-class rules are repository-specific.
- The five-state Storybook reassessment gate is an internal adoption heuristic, not a Storybook requirement.
- These clarifications do not invalidate P0 or P1; they prevent internal controls from being misrepresented as universal standards.

## 6. Standards-driven ownership gaps

The following are required by Phase 2 but not yet fully inventoried:

| Boundary | Inventory question | Required classification before implementation | Current state |
|---|---|---|---|
| LinkButton | Is there an existing semantic link wrapper or only Button `link` styling? | real anchor semantics, modified-click behavior, `aria-current` where applicable | unresolved |
| IconButton | Are icon-only actions standardized, named accessibly and guaranteed a 44px target? | accessible name, 44px actual target, pending/disabled behavior | unresolved |
| TextField/Input | Which wrappers own label, description and error relationships? | text error identification, correction suggestion when known, preserved input | unresolved |
| Select | Which implementation owns trigger, popup, validation and long labels? | native-first; otherwise expanded state, popup relationship, Arrow/Enter/Escape/typeahead and focus return | unresolved |
| Checkbox | Which controls rely on global label target repair? | group naming, Space, mixed state where applicable, non-color state | unresolved |
| Radio Group | Which controls are native versus custom? | group accessible name, one-tab-stop custom behavior and Arrow-key selection | unresolved |
| Dialog | Which wrappers own focus, scroll and cancellation? | accessible title, modal semantics, initial focus, Tab containment, Escape, focus restoration; description optional | unresolved |
| Sheet | Which sheets are modal and which are non-modal? | modal follows Dialog; non-modal must not claim modal semantics or trap focus by default | unresolved |
| Alert/Toast | Which components are shared versus route-local? | polite-by-default status, urgent-only alert, no automatic focus, deduplication and actionable duration | unresolved |
| Card/Badge/EmptyState | Which components are shared versus route-local/global-class consumers? | semantic clickability and non-color meaning; no duplicate primary CTA | unresolved |
| MoneyValue | Which component and helpers own full integer VND and accessible labels? | no semantic guessing, sign/currency clarity, tabular numeral policy | unresolved |
| Financial/stored-data consumers | Which routes create, update or delete stored financial data? | existing safeguard must be reversible, checked or confirmed; pending prevents duplicates | unresolved |
| Focus environment | Which sticky headers, sheets, navs or toasts can cover focused controls? | focus visible and not entirely obscured | unresolved |
| Responsive evidence | Which existing tests distinguish text resize, reflow and mobile viewport? | 200% text, equivalent 320 CSS-pixel reflow and actual 320px mobile checked separately | unresolved |
| Direct Button consumers | Which routes depend on existing 24–36px size names, Button `link` or `aria-invalid` styling? | compatibility list and bounded migration order | unresolved |
| Token references | Which files consume canonical roles versus success/danger aliases, runtime tokens or raw values? | canonical/compatibility/runtime/unknown classification | unresolved |

## 7. Next inventory actions

1. Enumerate the actual files and exports under `src/components/ui/**` and finance presentation boundaries.
2. Find direct consumers of Button variants, sizes, Button `link` and current `aria-invalid` styling before changing defaults.
3. Classify token definitions and references as canonical, compatibility, runtime external or unknown.
4. Classify target-size consumers as MoneyFlow-important, AA-baseline, valid exception or route-specific debt.
5. Classify Select, Checkbox, Radio, Dialog and Sheet implementations as native, library-owned or custom and record their current keyboard/focus contracts.
6. Inventory status/alert/toast implementations and current live-region urgency, focus and timeout behavior.
7. Inventory consumer mutations of user-controlled financial data and record the current reversible, checked or confirmed safeguard.
8. Identify focus-obscuring sticky UI and separate current 200% text, equivalent 320 CSS-pixel reflow and actual 320px mobile evidence.
9. Identify five low-risk consumer candidates that can prove the action-primitive API without touching App Shell or changing financial semantics.
10. Record which global 44px selectors are satisfied by primitives and which remain route-specific.
11. Add focused contract tests before the first executable primitive change.

## 8. Constraints

- No rendered token value change in the inventory slice.
- No new global stylesheet or unreviewed `!important`.
- No universal 44px rule in new primitive code.
- No Storybook dependency at Phase 2 start.
- No App Shell, broad route redesign, financial domain logic, database, auth, RLS, provider or production-data change.
- UI-level error-prevention safeguards may be specified, but any required domain mutation change stops for separate authorization.
- Open PR #299 remains candidate evidence only until owner review, protected checks and merge.
