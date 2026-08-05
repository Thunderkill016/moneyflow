# MoneyFlow UI migration — Phase 2 tokens and primitives

**Status:** specified
**Execution state:** specified
**Active role:** planner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 1 evidence:** PR #298
**Current PR:** pending
**Last updated:** 2026-08-05

The owner explicitly instructed **“Bắt đầu p2”** on 2026-08-05. This authorizes Phase 2 reconnaissance, specification and bounded implementation of token and primitive ownership. It does not authorize Phase 3 App Shell work, a new visual direction, Storybook installation, provider operations, deployment or production-data access.

## Outcome

Establish MoneyFlow-native token and primitive contracts so important controls, form states, overlays, feedback, empty states and financial values own their semantics, accessibility and responsive behavior directly instead of depending on global repair CSS.

Phase 2 preserves the current B3.2/Fresh Blue identity, public light-only behavior, signed-in Light/Dark/System behavior and all financial semantics.

## Repository reconnaissance

### Current verified boundaries

- `src/app/document-theme.css` is the executable semantic token and theme authority.
- `src/components/ui/button.tsx` uses Base UI and class-variance-authority, but its current sizes range from 24px to 36px.
- `MinimumTargetSizeContract` globally repairs buttons, links, tabs, selects and legacy route controls to the MoneyFlow 44px important-action target.
- The global target contract contains broad selectors and multiple `!important` repairs, so it cannot be removed until primitives and remaining consumers own their geometry.
- Phase 1 blocks new global CSS layers, new unreviewed `!important`, unknown token references and new legacy-class registrations.

### Initial implementation order

1. Define and owner-review the primitive API and state matrix.
2. Inventory semantic tokens and compatibility aliases without changing rendered values.
3. Adapt action primitives: Button, LinkButton and IconButton.
4. Adapt form primitives: TextField, Select, Checkbox and Radio.
5. Adapt Dialog and Sheet.
6. Adapt Card, Badge, Alert, Toast and EmptyState.
7. Stabilize MoneyValue and finance-status presentation.
8. Migrate a bounded low-risk consumer set.
9. Measure remaining consumers still rescued by `MinimumTargetSizeContract`.

## Specification

### Cross-primitive rules

- Use semantic DOM by default; no clickable `div` replacement for buttons or links.
- Important financial and navigation actions target at least 44×44 CSS px.
- Compact visual glyphs may remain smaller only when the actual interactive target remains at least 44×44.
- Every interactive primitive supports visible keyboard focus, disabled and pending states where applicable.
- Color is never the only carrier of income, expense, transfer, warning or destructive meaning.
- Public surfaces stay light-only; workspace primitives resolve through current semantic tokens in Light/Dark/System.
- No primitive guesses, truncates or reformats financial meaning outside existing domain helpers.
- Compatibility variants must be explicit and paired with a removal consumer list.

### Primitive API matrix

| Primitive | Required variants / props | Required states | Ownership boundary |
|---|---|---|---|
| Button | `intent`: primary, secondary, quiet, destructive; `size`: default, compact; pending label | rest, hover, active, focus, disabled, pending, invalid association | native button/Base UI; owns 44px important-action target |
| LinkButton | same visual intents as Button; `href`; external semantics remain explicit | rest, hover, active, focus, aria-current | renders link, never button navigation emulation |
| IconButton | accessible name required; standard and compact visual glyph | rest, hover, active, focus, disabled, pending | 44px target with icon-only visual treatment |
| TextField | label, description, error, prefix/suffix, input mode | empty, filled, focus, disabled, read-only, invalid, pending | label/error relationship owned by field primitive |
| Select | label, description, error, placeholder | closed/open, focus, disabled, invalid, long option text | trigger, popup and error relationship owned locally |
| Checkbox / Radio | label and optional description | checked, unchecked, indeterminate where applicable, focus, disabled, invalid | label is pointer target; state is not color-only |
| Dialog / Sheet | title and description contract; dismiss policy; initial focus | closed/open, scroll, validation error, pending submit, cancel, destructive confirm | focus trap, restoration, scroll and safe cancellation |
| Card | surface hierarchy only; interactive card is a separate explicit contract | default, selected, disabled only when interactive | never implies clickability without semantic control |
| Badge | neutral, info, success/income, warning, expense/destructive, transfer | standard and compact | text/icon accompanies semantic color |
| Alert / Toast | info, success, warning, error; optional action | visible, dismissing, persistent for blocking error | live-region behavior and action semantics |
| EmptyState | title, explanation, one optional primary action, optional secondary link | route empty, filtered empty, error-recovery empty | prevents duplicate primary CTA |
| MoneyValue | value, currency, sign policy, emphasis, accessible label | positive, negative, zero, large VND, multi-currency label, unavailable | full integer value; tabular numerals; no semantic guessing |

### Token normalization rules

- `document-theme.css` remains the sole executable theme/color authority during Phase 2.
- Existing rendered values must not change during vocabulary normalization.
- Canonical roles are `--mf-brand-*`, neutral surface/text/border roles and finance roles for income, expense, transfer, warning and info.
- Compatibility aliases such as success/danger remain until every consumer is classified; removal requires zero-reference evidence.
- A DTCG/Style Dictionary artifact remains deferred to Phase 10.
- New tokens require a semantic role and at least one approved primitive or product-wide consumer.

### State evidence matrix

Every implemented primitive must be verified against the applicable subset:

- light and dark workspace themes;
- public light-only where used publicly;
- keyboard focus and focus restoration;
- disabled and pending;
- invalid/error relationship;
- 200% text;
- reduced motion and forced colors where relevant;
- long Vietnamese labels;
- large and negative VND for MoneyValue;
- 320px phone and representative desktop width.

### Storybook decision

Do not install Storybook at Phase 2 start. Reassess only after at least five implemented high-value primitive states are demonstrably expensive to review through existing unit and Playwright coverage. Any spike must be development-only, synthetic-data-only and separately approved before dependency writes.

## Implementation plan

### Slice A — specification and inventory

- Record this Phase 2 packet.
- Inventory current primitive files, exports, variants and direct consumers.
- Inventory token definitions, aliases and current primitive references.
- Record candidate low-risk consumers for the proof migration.
- Add no runtime dependency.

### Slice B — action primitives

- Adapt Button while preserving compatibility for current consumers.
- Add LinkButton and IconButton only if current source lacks equivalent owned contracts.
- Add focused source/unit/accessibility contracts.
- Migrate only a bounded low-risk consumer set after the API is stable.

### Later slices

Form controls, overlays, feedback/surfaces and finance presentation each remain separate reviewable commits or PRs if the diff becomes broad. No shared primitive default changes without affected-route browser evidence.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API and state matrix before code changes | this specification | specified; owner instruction recorded |
| P2-T2 | Normalize token vocabulary and inventory compatibility aliases without rendered-value changes | token inventory and contract tests | pending |
| P2-T3 | Implement/adapt Button, LinkButton and IconButton | unit/source/browser evidence | pending |
| P2-T4 | Implement/adapt TextField, Select, Checkbox and Radio | validation/focus/200% evidence | blocked by P2-T1 review |
| P2-T5 | Implement/adapt Dialog and Sheet | keyboard/mobile/cancel evidence | blocked by P2-T3/P2-T4 |
| P2-T6 | Implement/adapt Card, Badge, Alert, Toast and EmptyState | state/theme evidence | blocked by P2-T1 review |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | large-VND/currency/semantic evidence | blocked by token inventory |
| P2-T8 | Migrate a bounded low-risk consumer set | exact-head route evidence and rollback | blocked by primitive implementation |
| P2-T9 | Inventory remaining MinimumTargetSizeContract consumers | measured consumer list | blocked by P2-T8 |
| P2-T10 | Owner approves primitive appearance/API and next boundary | owner decision | blocked by P2-T8/P2-T9 |

## Risks and controls

| Risk | Control |
|---|---|
| Changing Button defaults visually changes every route | preserve compatibility first; migrate bounded consumers before changing defaults |
| 44px sizing makes dense toolbars unusable | separate visual density from interactive target geometry; validate wrapping at 320px |
| Token rename changes computed colors | alias-first migration plus computed-color comparison |
| New primitive duplicates an existing wrapper | inventory exports and consumers before creation |
| Dialog abstraction changes financial mutation behavior | presentation only; keep actions/domain code unchanged and test cancel/submit/recovery |
| Global target contract is removed too early | retain until P2-T9 proves remaining consumers and Phase 10 removes it |
| Storybook becomes unbounded tooling work | no dependency until the recorded adoption gate is met and separately approved |

## Evaluation

Required for the initial specification branch:

- documentation and project-knowledge contracts;
- exact changed-file review;
- protected CodeQL and secret-history checks;
- no claim of runtime or visual completion.

Required for executable primitive slices:

- Phase 1 UI migration policy;
- CSS ownership and architecture contracts;
- lint, typecheck, unit tests and production build;
- affected browser smoke and cross-device audit;
- owner-reviewed appearance/API evidence before Phase 3.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | Explicit instruction: “Bắt đầu p2” | Create the Phase 2 branch/packet, audit current primitives and begin P2-T1/P2-T2 |

### Current permission boundary

- Granted: Phase 2 documentation, token inventory, primitive implementation, focused tests and bounded low-risk consumer migration on a dedicated branch.
- Forbidden: Phase 3 App Shell work, broad route redesign, new visual identity, unapproved Storybook/dependency installation, database/auth/RLS/provider changes, deployment and production-data access.
- Stop condition: any required financial/domain/auth/provider change, or a primitive default change whose affected consumers cannot be bounded and evidenced.
- Merge remains an owner decision after protected exact-head checks and visual/API review.
