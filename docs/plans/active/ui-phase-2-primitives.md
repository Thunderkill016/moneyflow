# MoneyFlow UI migration — Phase 2 tokens and primitives

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 1 evidence:** merged PR #298
**Current PR:** #299
**Last updated:** 2026-08-05

The owner explicitly instructed **“Bắt đầu p2”** on 2026-08-05. This authorizes Phase 2 reconnaissance, specification and bounded implementation of token and primitive ownership. It does not authorize Phase 3 App Shell work, a new visual direction, Storybook installation, provider operations, deployment or production-data access.

## Outcome

Establish MoneyFlow-native token and primitive contracts so important controls, form states, overlays, feedback, empty states and financial values own their semantics, accessibility and responsive behavior directly instead of depending on global repair CSS.

Phase 2 preserves the current B3.2/Fresh Blue identity, public light-only behavior, signed-in Light/Dark/System behavior and all financial semantics.

## Repository reconnaissance

### Verified starting boundaries

- `src/app/document-theme.css` is the executable semantic token and theme authority.
- `src/components/ui/button.tsx` uses Base UI and class-variance-authority, but its current visual sizes range from 24px to 36px.
- `MinimumTargetSizeContract` globally repairs buttons, links, tabs, selects and legacy route controls to the MoneyFlow 44px important-action target.
- The global target contract contains broad selectors and multiple `!important` repairs, so it cannot be removed until primitives and remaining consumers own their geometry.
- Phase 1 blocks new global CSS layers, new unreviewed `!important`, unknown token references and new legacy-class registrations.
- Open PR #299 is a candidate only; current `main` and production behavior remain unchanged.

### Initial implementation order

1. Define and review the primitive API and state matrix.
2. Inventory semantic tokens, compatibility aliases, primitive exports and global target-size consumers.
3. Adapt Button, LinkButton and IconButton.
4. Adapt TextField, Select, Checkbox and Radio.
5. Adapt Dialog and Sheet.
6. Adapt Card, Badge, Alert, Toast and EmptyState.
7. Stabilize MoneyValue and finance-status presentation.
8. Migrate a bounded low-risk consumer set.
9. Measure remaining consumers still rescued by `MinimumTargetSizeContract`.

## Research

The parent plan already selected incremental migration behind concrete primitives instead of a big-bang rewrite. Phase 2 applies that decision to current source.

Current evidence supports these judgments:

- visual density and interactive target geometry are separate concerns;
- a 24–36px visible control may retain compact visuals while its important-action target owns at least 44×44px;
- token normalization must be alias-first and preserve computed values;
- global repair CSS remains compatibility debt, not deletion authority;
- a component-state harness is useful only after real primitive APIs and high-value state combinations exist.

Storybook remains deferred. No package, lockfile, hosted service or production bundle change is authorized by this packet.

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
| Button | primary, secondary, quiet, destructive; default and compact; pending label | rest, hover, active, focus, disabled, pending, invalid association | native button/Base UI; owns important-action target |
| LinkButton | Button visual intents plus link semantics | rest, hover, active, focus, aria-current | renders a link; never emulates navigation with a button |
| IconButton | accessible name required; standard and compact visual glyph | rest, hover, active, focus, disabled, pending | 44px target with icon-only visual treatment |
| TextField | label, description, error, prefix/suffix, input mode | empty, filled, focus, disabled, read-only, invalid, pending | owns label, description and error relationships |
| Select | label, description, error, placeholder | closed/open, focus, disabled, invalid, long option text | owns trigger, popup and error relationship |
| Checkbox / Radio | label and optional description | checked, unchecked, indeterminate where applicable, focus, disabled, invalid | label owns pointer target; state is not color-only |
| Dialog / Sheet | title/description contract, dismiss policy, initial focus | open, scroll, validation error, pending submit, cancel, destructive confirm | owns focus trap, restoration, scroll and safe cancellation |
| Card | surface hierarchy; explicit separate interactive contract | default, selected, disabled only when interactive | never implies clickability without semantic control |
| Badge | neutral, info, income/success, warning, expense/destructive, transfer | standard and compact | text or icon accompanies semantic color |
| Alert / Toast | info, success, warning, error; optional action | visible, dismissing, persistent blocking error | owns live-region and action semantics |
| EmptyState | title, explanation, one optional primary action, optional secondary link | route empty, filtered empty, recovery empty | prevents duplicate primary CTA |
| MoneyValue | value, currency, sign policy, emphasis, accessible label | positive, negative, zero, large VND, multi-currency, unavailable | full integer value; tabular numerals; no semantic guessing |

### Token normalization rules

- `document-theme.css` remains the sole executable theme/color authority during Phase 2.
- Existing rendered values must not change during vocabulary normalization.
- Canonical roles are `--mf-brand-*`, neutral surface/text/border roles and finance roles for income, expense, transfer, warning and info.
- Compatibility aliases such as success/danger remain until every consumer is classified; removal requires zero-reference evidence.
- A DTCG/Style Dictionary artifact remains deferred to Phase 10.
- New tokens require a semantic role and at least one approved primitive or product-wide consumer.

### State evidence matrix

Every implemented primitive must be verified against its applicable subset:

- workspace light and dark themes;
- public light-only where used publicly;
- keyboard focus and focus restoration;
- disabled, pending and invalid/error relationships;
- 200% text, reduced motion and forced colors where relevant;
- long Vietnamese labels;
- large and negative VND for MoneyValue;
- 320px phone and representative desktop width.

## Implementation plan

### Slice A — specification and inventory

- Maintain this Phase 2 packet and PR #299 memory.
- Inventory current primitive files, exports, variants and direct consumers.
- Inventory token definitions, aliases and current primitive references.
- Record candidate low-risk consumers for proof migration.
- Add no runtime dependency.

### Slice B — action primitives

- Adapt Button while preserving compatibility for current consumers.
- Add LinkButton and IconButton only if current source lacks equivalent owned contracts.
- Add focused source, unit and accessibility contracts.
- Migrate only a bounded low-risk consumer set after the API is stable.

### Later slices

Form controls, overlays, feedback/surfaces and finance presentation remain separate reviewable commits or PRs if the diff becomes broad. Shared primitive defaults do not change without affected-route browser evidence.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API and state matrix before code changes | this specification | done as owner-authorized candidate; final appearance/API approval remains P2-T10 |
| P2-T2 | Normalize token vocabulary and inventory compatibility aliases without rendered-value changes | Phase 2 inventory and future contract tests | in progress |
| P2-T3 | Implement/adapt Button, LinkButton and IconButton | unit/source/browser evidence | pending P2-T2 inventory |
| P2-T4 | Implement/adapt TextField, Select, Checkbox and Radio | validation/focus/200% evidence | blocked by action/form inventory |
| P2-T5 | Implement/adapt Dialog and Sheet | keyboard/mobile/cancel evidence | blocked by P2-T3/P2-T4 |
| P2-T6 | Implement/adapt Card, Badge, Alert, Toast and EmptyState | state/theme evidence | pending inventory |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | large-VND/currency/semantic evidence | blocked by token inventory |
| P2-T8 | Migrate a bounded low-risk consumer set | exact-head route evidence and rollback | blocked by primitive implementation |
| P2-T9 | Inventory remaining MinimumTargetSizeContract consumers | measured consumer list | blocked by P2-T8 |
| P2-T10 | Owner approves primitive appearance/API and next boundary | owner decision | blocked by P2-T8/P2-T9 |

## Risks and controls

| Risk | Control |
|---|---|
| Changing Button defaults visually changes every route | preserve compatibility first; migrate bounded consumers before changing defaults |
| 44px sizing makes dense toolbars unusable | separate visual density from target geometry; validate wrapping at 320px |
| Token rename changes computed colors | alias-first migration plus computed-color comparison |
| New primitive duplicates an existing wrapper | inventory exports and consumers before creation |
| Dialog abstraction changes financial mutation behavior | keep actions/domain code unchanged; test cancel, submit and recovery |
| Global target contract is removed too early | retain until P2-T9 and later Phase 10 zero-consumer proof |
| Storybook becomes unbounded tooling work | no dependency until the recorded adoption gate is met and separately approved |

## Evaluation

Initial documentation/inventory commits require:

- diff hygiene and project-knowledge contracts;
- exact changed-file review;
- protected CodeQL and secret-history checks;
- no claim of runtime or visual completion.

Executable primitive slices require:

- Phase 1 UI migration policy;
- CSS ownership and architecture contracts;
- lint, typecheck, unit tests and production build;
- affected browser smoke and cross-device audit;
- owner-reviewed appearance/API evidence before Phase 3.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | Explicit instruction: “Bắt đầu p2” | Create branch, packet and PR; define P2-T1 |
| 2026-08-05 | planner | implementer | implementing | branch `agent/ui-phase-2-primitives`, draft PR #299 and P2-T1 matrix | Complete P2-T2 inventory, then propose the bounded action-primitive slice |

### Current permission boundary

- Granted: Phase 2 documentation, token inventory, primitive implementation, focused tests and bounded low-risk consumer migration on the dedicated branch.
- Forbidden: Phase 3 App Shell work, broad route redesign, new visual identity, unapproved Storybook/dependency installation, database/auth/RLS/provider changes, deployment and production-data access.
- Stop condition: any required financial/domain/auth/provider change, or a primitive default change whose affected consumers cannot be bounded and evidenced.
- Merge remains an owner decision after protected exact-head checks and visual/API review.

## Delivery record

- Branch: `agent/ui-phase-2-primitives`
- Draft PR: #299
- Starting main: `8688d95160579eacb908f0162994edba4901fc0c`
- Runtime/product change at start: none
- Provider/production operation: none
- Phase 3 authorization: not granted
