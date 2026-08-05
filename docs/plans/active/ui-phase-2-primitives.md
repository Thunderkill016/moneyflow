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
- `MinimumTargetSizeContract` globally repairs buttons, links, tabs, selects and legacy route controls to a 44px target.
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

## Research and authority classification

Phase 2 separates external standards, migration practices and MoneyFlow-specific policy. Project policy may be stricter than an external minimum, but it must not be presented as though the external standard requires it.

### External standards and official tool behavior

| Source | What it establishes | What it does not establish |
|---|---|---|
| [WCAG 2.2 SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Level AA target minimum is 24×24 CSS px, with spacing, equivalent-control, inline-text, user-agent and essential exceptions | It does not require every web control or inline link to be 44×44 |
| [WCAG 2.2 SC 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | Level AAA enhanced target is 44×44 CSS px, with defined exceptions | It does not make 44×44 the WCAG AA minimum |
| [Next.js App Router CSS documentation](https://nextjs.org/docs/app/getting-started/css) | Next.js supports global CSS, CSS Modules, Tailwind, external stylesheets and other styling approaches; CSS Modules provide local scoping | It does not prescribe MoneyFlow's exact two-root-owner architecture or forbid every additional global stylesheet in all projects |
| [Storybook documentation](https://storybook.js.org/docs/10.5/get-started/why-storybook) | Storybook supports developing and reviewing components and states in isolation | It does not require installation, hosted review or a five-state threshold |

### Migration practices selected for MoneyFlow

- Migrate incrementally behind owned primitives instead of rewriting the whole interface at once.
- Preserve current computed values and behavior while moving ownership.
- Treat scanners and source inventories as evidence and guardrails, not as complete CSS compilers or automatic deletion authority.
- Keep compatibility layers until their consumers are measured and migrated.
- Require affected browser evidence before changing shared primitive defaults.

### MoneyFlow project policy

The following are deliberate project decisions rather than universal web standards:

- `document-theme.css` remains the only executable semantic theme/color authority during this migration.
- No new root/global CSS layer is allowed while the existing seven-layer compatibility chain is being retired.
- The 1,200 `!important` ceiling is a temporary regression budget, not an external quality standard.
- Current `/dashboard` and legacy-class restrictions are repository-specific migration controls.
- 44×44 CSS px is the MoneyFlow **important-action target**, not the minimum for every interactive element.
- The Storybook reassessment threshold of five high-value states is an internal adoption heuristic, not a Storybook rule.

## Specification

### Target-size policy

MoneyFlow uses two distinct levels:

| Level | Requirement | Applicable examples |
|---|---|---|
| Accessibility baseline | Meet WCAG 2.2 AA target-size requirements: 24×24 CSS px, or a valid spacing/equivalent/inline/user-agent/essential exception | low-risk compact controls, inline links, dense desktop utilities where spacing is sufficient |
| MoneyFlow important-action target | At least 44×44 CSS px for the actual interactive target | primary financial actions, destructive or confirmation actions, icon-only buttons, mobile navigation, frequent capture actions and dialog/sheet dismissal |

Rules:

- Do not apply 44×44 globally to every `button`, `a`, `select` or role-based control.
- Inline links inside prose are not automatically expanded to 44px.
- A compact visible icon or glyph may remain 16–24px while its interactive target is larger.
- Compact low-risk controls may be smaller than 44px only when they satisfy WCAG AA target-size or spacing rules and are not an important-action category.
- Target size is measured on the actual pointer target, not only the visible glyph.
- Phase 2 retains `MinimumTargetSizeContract` as compatibility debt until migrated primitives and remaining route controls are measured.

### Cross-primitive rules

- Use semantic DOM by default; no clickable `div` replacement for buttons or links.
- Apply the target-size policy above instead of one universal 44px rule.
- Every interactive primitive supports visible keyboard focus, disabled and pending states where applicable.
- Color is never the only carrier of income, expense, transfer, warning or destructive meaning.
- Public surfaces stay light-only; workspace primitives resolve through current semantic tokens in Light/Dark/System.
- No primitive guesses, truncates or reformats financial meaning outside existing domain helpers.
- Compatibility variants must be explicit and paired with a removal consumer list.

### Primitive API matrix

| Primitive | Required variants / props | Required states | Ownership boundary |
|---|---|---|---|
| Button | primary, secondary, quiet, destructive; default and compact; pending label | rest, hover, active, focus, disabled, pending, invalid association | native button/Base UI; important-action instances own 44px target, compact instances must meet AA/spacing policy |
| LinkButton | Button visual intents plus link semantics | rest, hover, active, focus, aria-current | renders a link; never emulates navigation with a button; important navigation/action links own 44px target |
| IconButton | accessible name required; standard and compact visual glyph | rest, hover, active, focus, disabled, pending | actual target is at least 44×44 even when the icon is smaller |
| TextField | label, description, error, prefix/suffix, input mode | empty, filled, focus, disabled, read-only, invalid, pending | owns label, description and error relationships |
| Select | label, description, error, placeholder | closed/open, focus, disabled, invalid, long option text | owns trigger, popup and error relationship; mobile/frequent selects use important-action target |
| Checkbox / Radio | label and optional description | checked, unchecked, indeterminate where applicable, focus, disabled, invalid | label/associated target meets AA; important financial choices use larger target where appropriate; state is not color-only |
| Dialog / Sheet | title/description contract, dismiss policy, initial focus | open, scroll, validation error, pending submit, cancel, destructive confirm | owns focus trap, restoration, scroll and safe cancellation; close/cancel/confirm controls use important-action target |
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
- Phase 1 token-reference validation is a source guardrail, not a complete CSS/runtime compiler. External/generated/runtime tokens require an explicit known prefix or documented source.
- A DTCG/Style Dictionary artifact remains deferred to Phase 10.
- New tokens require a semantic role and at least one approved primitive or product-wide consumer.

### State evidence matrix

Every implemented primitive must be verified against its applicable subset:

- workspace light and dark themes;
- public light-only where used publicly;
- keyboard focus and focus restoration;
- disabled, pending and invalid/error relationships;
- target geometry and spacing under the two-level policy;
- 200% text, reduced motion and forced colors where relevant;
- long Vietnamese labels;
- large and negative VND for MoneyValue;
- 320px phone and representative desktop width.

### Storybook decision

Storybook remains deferred at Phase 2 start. Its documented value is isolated component-state development and review. MoneyFlow's reassessment gate—at least five implemented high-value states that are materially expensive to review through existing tests—is an internal heuristic for controlling adoption cost. It is not an external standard.

Any spike must be separately approved, development-only, synthetic-data-only, removable without runtime impact and must demonstrate lower review cost rather than duplicating Playwright.

## Implementation plan

### Slice A — specification and inventory

- Maintain this Phase 2 packet and PR #299 memory.
- Inventory current primitive files, exports, variants and direct consumers.
- Inventory token definitions, aliases and current primitive references.
- Classify target-size consumers as AA-baseline, MoneyFlow-important or valid exception.
- Record candidate low-risk consumers for proof migration.
- Add no runtime dependency.

### Slice B — action primitives

- Adapt Button while preserving compatibility for current consumers.
- Add LinkButton and IconButton only if current source lacks equivalent owned contracts.
- Encode the two-level target-size policy without a new global selector or `!important`.
- Add focused source, unit and accessibility contracts.
- Migrate only a bounded low-risk consumer set after the API is stable.

### Later slices

Form controls, overlays, feedback/surfaces and finance presentation remain separate reviewable commits or PRs if the diff becomes broad. Shared primitive defaults do not change without affected-route browser evidence.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API and state matrix before code changes | this specification, including standards/policy classification | done as owner-authorized candidate; final appearance/API approval remains P2-T10 |
| P2-T2 | Normalize token vocabulary and inventory compatibility aliases without rendered-value changes | Phase 2 inventory and future contract tests | in progress; target-size classification corrected |
| P2-T3 | Implement/adapt Button, LinkButton and IconButton | unit/source/browser evidence | pending P2-T2 inventory |
| P2-T4 | Implement/adapt TextField, Select, Checkbox and Radio | validation/focus/200% evidence | blocked by action/form inventory |
| P2-T5 | Implement/adapt Dialog and Sheet | keyboard/mobile/cancel evidence | blocked by P2-T3/P2-T4 |
| P2-T6 | Implement/adapt Card, Badge, Alert, Toast and EmptyState | state/theme evidence | pending inventory |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | large-VND/currency/semantic evidence | blocked by token inventory |
| P2-T8 | Migrate a bounded low-risk consumer set | exact-head route evidence and rollback | blocked by primitive implementation |
| P2-T9 | Inventory remaining MinimumTargetSizeContract consumers by AA/important/exception category | measured consumer list | blocked by P2-T8 |
| P2-T10 | Owner approves primitive appearance/API and next boundary | owner decision | blocked by P2-T8/P2-T9 |

## Risks and controls

| Risk | Control |
|---|---|
| Treating a MoneyFlow preference as a universal standard | label every rule as external standard, migration practice or project policy |
| Changing Button defaults visually changes every route | preserve compatibility first; migrate bounded consumers before changing defaults |
| Applying 44px to every control makes dense layouts unusable | use the two-level target policy; test AA spacing and 320px wrapping |
| Reducing controls below safe target size | assert important categories at 44px and all others against WCAG AA/exception rules |
| Token rename changes computed colors | alias-first migration plus computed-color comparison |
| Token scanner rejects valid runtime tokens | known-prefix/documented-source exception; treat scanner as guardrail rather than compiler |
| New primitive duplicates an existing wrapper | inventory exports and consumers before creation |
| Dialog abstraction changes financial mutation behavior | keep actions/domain code unchanged; test cancel, submit and recovery |
| Global target contract is removed too early | retain until P2-T9 and later Phase 10 zero-consumer proof |
| Storybook becomes unbounded tooling work | internal adoption gate and separate dependency approval |

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
- target-size assertions that distinguish AA baseline, important-action target and valid exceptions;
- affected browser smoke and cross-device audit;
- owner-reviewed appearance/API evidence before Phase 3.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | Explicit instruction: “Bắt đầu p2” | Create branch, packet and PR; define P2-T1 |
| 2026-08-05 | planner | implementer | implementing | branch `agent/ui-phase-2-primitives`, draft PR #299 and P2-T1 matrix | Complete P2-T2 inventory, then propose the bounded action-primitive slice |
| 2026-08-05 | human_owner | implementer | implementing | Owner requested standards correction after external verification | Apply the two-level target policy and authority classification before runtime writes |

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
