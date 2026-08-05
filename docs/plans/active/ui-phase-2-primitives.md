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

The owner explicitly instructed **“Bắt đầu p2”** on 2026-08-05 and then instructed the standards gaps identified in review to be corrected. This authorizes Phase 2 reconnaissance, specification and bounded implementation of token and primitive ownership. It does not authorize Phase 3 App Shell work, a new visual direction, Storybook installation, provider operations, deployment or production-data access.

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

1. Define and review the primitive API, state, keyboard and accessibility matrix.
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
| [WAI-ARIA APG Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | Button role, accessible name, keyboard activation and focus behavior | It does not define `invalid` as a normal Button state |
| [WAI-ARIA APG Checkbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) and [Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) | Group naming, checked/mixed state and required keyboard interaction for custom controls | Styling alone is not sufficient for a custom checkbox or radio group |
| [WAI-ARIA APG Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | Expanded state, popup relationship, selection and keyboard behavior for custom comboboxes | It does not require a custom combobox when native `<select>` is sufficient |
| [WAI-ARIA APG Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal naming, focus entry, focus containment, Escape, restoration and `aria-modal` behavior | It does not require `aria-describedby` for structurally complex dialog content and does not make every sheet modal |
| [WCAG 2.2 SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Status updates can be announced without moving focus through suitable roles or properties | It does not justify making every toast an assertive alert |
| [WCAG 2.2 SC 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) and [SC 3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) | Errors must be identified in text and a correction suggestion supplied when known | A red border alone is not sufficient |
| [WCAG 2.2 SC 3.3.4 Error Prevention (Legal, Financial, Data)](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | Financial transactions and user-controlled stored-data mutations require a reversible, checked or confirmed safeguard | It does not require a confirmation dialog when undo or validation is the better safeguard |
| [WCAG 2.2 SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) and [SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | 200% text resizing and reflow at an equivalent 320 CSS-pixel width are separate requirements | A 320px mobile viewport alone does not prove 400% zoom/reflow |
| [WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Focused components must not be entirely hidden by author-created content | Visible focus styling alone does not prove the focus is unobscured |
| [Next.js App Router CSS documentation](https://nextjs.org/docs/app/getting-started/css) | Next.js supports global CSS, CSS Modules, Tailwind, external stylesheets and other styling approaches; CSS Modules provide local scoping | It does not prescribe MoneyFlow's exact two-root-owner architecture or forbid every additional global stylesheet in all projects |
| [Storybook documentation](https://storybook.js.org/docs/10.5/get-started/why-storybook) | Storybook supports developing and reviewing components and states in isolation | It does not require installation, hosted review or a five-state threshold |

### Migration practices selected for MoneyFlow

- Migrate incrementally behind owned primitives instead of rewriting the whole interface at once.
- Preserve current computed values and behavior while moving ownership.
- Prefer native semantic controls when they meet product requirements; custom composite controls must implement the applicable APG keyboard and ARIA contract.
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
- Important financial/destructive/icon-only/mobile-navigation/frequent-capture controls use that 44×44 target.
- The Storybook reassessment threshold of five high-value states is an internal adoption heuristic, not a Storybook rule.
- MoneyValue uses full integer values and tabular numerals without guessing or altering domain meaning.

## Specification

### Target-size policy

MoneyFlow uses two distinct levels:

| Level | Requirement | Applicable examples |
|---|---|---|
| Accessibility baseline | Meet WCAG 2.2 AA target-size requirements: 24×24 CSS px, or a valid spacing/equivalent/inline/user-agent/essential exception | low-risk compact controls, inline links, dense desktop utilities where spacing is sufficient |
| MoneyFlow important-action target | At least 44×44 CSS px for the actual interactive target | primary financial actions, destructive or confirmation actions, icon-only buttons, mobile navigation, frequent capture actions and modal dismissal |

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
- Prefer native HTML behavior before adding ARIA. Custom composites must implement the applicable APG role, state, relationship and keyboard model.
- Every interactive primitive supports visible keyboard focus; focused controls must not be entirely obscured by sticky headers, sheets, toasts or other author-created content.
- Disabled, pending and invalid states are exposed only where semantically applicable.
- Color is never the only carrier of income, expense, transfer, warning, invalid or destructive meaning.
- Public surfaces stay light-only; workspace primitives resolve through current semantic tokens in Light/Dark/System.
- No primitive guesses, truncates or reformats financial meaning outside existing domain helpers.
- Compatibility variants must be explicit and paired with a removal consumer list.

### Keyboard, ARIA and focus contracts

#### Button, LinkButton and IconButton

- Button activation follows native/Base UI keyboard behavior; no custom `invalid` state belongs to the Button primitive.
- LinkButton renders an anchor for navigation and supports normal link behavior, including modified clicks and `aria-current` where applicable.
- IconButton requires an accessible name independent of the icon glyph.
- Pending actions prevent duplicate activation while preserving an intelligible accessible name.
- Focus after activation follows the resulting workflow rather than moving arbitrarily.

#### TextField

- Label, description and error are programmatically associated.
- Invalid state identifies the error in text and supplies a correction suggestion when the correction is known.
- Failed submission preserves the user's entered value.
- Form-level submission failure moves focus to an error summary or first relevant invalid field according to the form contract, not the Button primitive.

#### Select / combobox

- Native `<select>` is preferred when it satisfies the required experience.
- A custom select/combobox must expose accessible name, expanded state, popup relationship and selected option.
- Applicable keyboard behavior includes Arrow keys, Enter, Escape and typeahead; editable comboboxes must not intercept standard text-editing keys.
- Closing returns focus to the trigger or other documented logical destination.
- Long Vietnamese option text must remain readable and selectable.

#### Checkbox and Radio

- Native controls use `<fieldset>` and `<legend>` for related groups when practical; custom groups expose an accessible group name.
- Checkbox supports Space activation and indeterminate state where applicable; custom mixed state uses the correct programmatic value.
- Custom radio groups implement one-tab-stop behavior and Arrow-key movement/selection according to the APG pattern.
- The label or associated control owns the pointer target; state is not communicated by color alone.

#### Dialog and Sheet

- A modal dialog has an accessible name, moves focus inside on open, contains Tab/Shift+Tab navigation, closes on Escape unless a documented essential operation prevents dismissal, and restores focus to the trigger or a logical successor.
- Modal behavior uses `aria-modal="true"`; background content is not operable while modal.
- `aria-describedby` is optional and must not flatten complex structural content into an unusable announcement.
- A modal Sheet follows the Dialog contract.
- A non-modal Sheet must not claim `aria-modal="true"` or trap focus by default; its focus and dismissal behavior must be explicitly documented.
- A visible keyboard-operable close or cancel control is provided where dismissal is allowed.

### Status, pending and feedback contracts

- Routine saving, loading, success and progress messages use a polite status mechanism such as `role="status"` when announcement is required.
- Urgent errors that require immediate attention may use `role="alert"`; ordinary informational toasts do not become assertive alerts by default.
- Toasts do not receive focus automatically. An actionable toast must expose a keyboard-reachable action through the normal focus order and remain available long enough to operate.
- Repeated or rapidly changing messages are deduplicated to avoid announcement spam.
- Pending actions prevent duplicate submission and expose progress/result without relying on visual spinner state alone.

### Financial and stored-data mutation safety

Any consumer that commits a financial transaction or creates, updates or deletes user-controlled stored financial data must satisfy at least one safeguard before Phase 2 migration is accepted:

1. **Reversible:** an effective undo/reversal path exists;
2. **Checked:** input is validated and the user can correct detected errors before commitment; or
3. **Confirmed:** the user can review and confirm the consequential action before commitment.

Controls:

- Confirmation dialogs are not mandatory when undo or validation is safer and less disruptive.
- Destructive copy names the affected object or consequence when practical.
- Pending state prevents duplicate financial mutation.
- Cancel and recovery paths preserve user input where safe.
- Phase 2 primitives do not change domain mutation logic; consumer migrations must document which safeguard already exists or add a separately approved UI-level safeguard without altering financial semantics.

### Primitive API matrix

| Primitive | Required variants / props | Required states | Ownership boundary |
|---|---|---|---|
| Button | primary, secondary, quiet, destructive; default and compact; pending label | rest, hover, active, focus, disabled, pending | native button/Base UI; important-action instances own 44px target; form invalid handling stays at form level |
| LinkButton | Button visual intents plus link semantics | rest, hover, active, focus, aria-current | renders a link; never emulates navigation with a button; important navigation/action links own 44px target |
| IconButton | accessible name required; standard and compact visual glyph | rest, hover, active, focus, disabled, pending | actual target is at least 44×44 even when the icon is smaller |
| TextField | label, description, error, correction suggestion, prefix/suffix, input mode | empty, filled, focus, disabled, read-only, invalid, pending | owns label, description and error relationships; preserves entered data on failure |
| Select | native-first; label, description, error, placeholder; custom popup contract when needed | closed/open, focus, disabled, invalid, selected, long option text | native behavior where possible; custom implementation owns expanded state, popup relationship, keyboard and focus return |
| Checkbox | label, optional description, optional group name | checked, unchecked, indeterminate, focus, disabled, invalid | label/associated target meets AA; custom control owns Space and mixed-state semantics |
| Radio Group | group label and item labels | selected, unselected, focus, disabled, invalid | owns group semantics, one-tab-stop behavior and Arrow-key selection for custom implementation |
| Dialog | required accessible title, optional description, dismiss policy, initial focus | open, scroll, validation error, pending submit, cancel, destructive confirm | owns modal semantics, focus containment/restoration, Escape, scroll and safe cancellation |
| Sheet | modal or non-modal mode must be explicit | open, scroll, pending, cancel | modal follows Dialog; non-modal does not claim modal semantics or trap focus by default |
| Card | surface hierarchy; explicit separate interactive contract | default, selected, disabled only when interactive | never implies clickability without semantic control |
| Badge | neutral, info, income/success, warning, expense/destructive, transfer | standard and compact | text or icon accompanies semantic color |
| Alert | info, success, warning, error; optional action | visible, persistent, dismissed where allowed | owns semantic message and urgency without making all feedback assertive |
| Toast | polite status by default; assertive only for urgent errors; optional action | queued, visible, dismissing, persistent action | owns live-region policy, deduplication, duration and non-focus-stealing behavior |
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

### State and browser evidence matrix

Every implemented primitive must be verified against its applicable subset:

- workspace light and dark themes;
- public light-only where used publicly;
- keyboard operation and documented focus destination;
- focus visibility and focus not entirely obscured;
- disabled, pending and invalid/error relationships;
- target geometry and spacing under the two-level policy;
- form error identification, correction suggestion and preserved input;
- polite/assertive live-region behavior without duplicate announcements;
- modal focus containment/restoration and non-modal Sheet behavior;
- financial/stored-data safeguard evidence for affected consumer mutations;
- text resize at 200%;
- browser zoom/reflow at an equivalent 320 CSS-pixel content width;
- an actual 320px mobile viewport as a separate responsive check;
- reduced motion and forced colors where relevant;
- long Vietnamese labels and option text;
- large and negative VND for MoneyValue;
- representative desktop width.

### Storybook decision

Storybook remains deferred at Phase 2 start. Its documented value is isolated component-state development and review. MoneyFlow's reassessment gate—at least five implemented high-value states that are materially expensive to review through existing tests—is an internal heuristic for controlling adoption cost. It is not an external standard.

Any spike must be separately approved, development-only, synthetic-data-only, removable without runtime impact and must demonstrate lower review cost rather than duplicating Playwright.

## Implementation plan

### Slice A — specification and inventory

- Maintain this Phase 2 packet and PR #299 memory.
- Inventory current primitive files, exports, variants and direct consumers.
- Inventory token definitions, aliases and current primitive references.
- Classify target-size consumers as AA-baseline, MoneyFlow-important or valid exception.
- Classify current form/select/radio/dialog/sheet/toast implementations against the keyboard, ARIA and status contracts above.
- Record which affected financial/stored-data consumers already satisfy reversible, checked or confirmed protection.
- Record candidate low-risk consumers for proof migration.
- Add no runtime dependency.

### Slice B — action primitives

- Adapt Button while preserving compatibility for current consumers.
- Add LinkButton and IconButton only if current source lacks equivalent owned contracts.
- Encode the two-level target-size policy without a new global selector or `!important`.
- Add pending duplicate-submit protection and accessible-name contracts.
- Add focused source, unit and accessibility contracts.
- Migrate only a bounded low-risk consumer set after the API is stable.

### Later slices

Form controls, overlays, feedback/surfaces and finance presentation remain separate reviewable commits or PRs if the diff becomes broad. Shared primitive defaults do not change without affected-route browser evidence.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API, state, keyboard and accessibility matrix before code changes | this specification, including standards/policy classification | done as owner-authorized candidate; final appearance/API approval remains P2-T10 |
| P2-T2 | Normalize token vocabulary and inventory compatibility aliases without rendered-value changes | Phase 2 inventory and future contract tests | in progress; standards gap classification added |
| P2-T3 | Implement/adapt Button, LinkButton and IconButton | semantic/keyboard/pending/target-size unit and browser evidence | pending P2-T2 inventory |
| P2-T4 | Implement/adapt TextField, Select, Checkbox and Radio | labels, groups, keyboard, error suggestion, 200% and reflow evidence | blocked by action/form inventory |
| P2-T5 | Implement/adapt Dialog and Sheet | modal/non-modal semantics, Escape, focus containment/restoration and mobile evidence | blocked by P2-T3/P2-T4 |
| P2-T6 | Implement/adapt Card, Badge, Alert, Toast and EmptyState | state/theme/live-region/deduplication evidence | pending inventory |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | large-VND/currency/semantic evidence | blocked by token inventory |
| P2-T8 | Migrate a bounded low-risk consumer set | exact-head route evidence, rollback and financial/stored-data safeguard classification | blocked by primitive implementation |
| P2-T9 | Inventory remaining MinimumTargetSizeContract consumers by AA/important/exception category | measured consumer list | blocked by P2-T8 |
| P2-T10 | Owner approves primitive appearance/API and next boundary | owner decision | blocked by P2-T8/P2-T9 |

## Risks and controls

| Risk | Control |
|---|---|
| Treating a MoneyFlow preference as a universal standard | label every rule as external standard, migration practice or project policy |
| Changing Button defaults visually changes every route | preserve compatibility first; migrate bounded consumers before changing defaults |
| Applying 44px to every control makes dense layouts unusable | use the two-level target policy; test AA spacing and 320px wrapping |
| Reducing controls below safe target size | assert important categories at 44px and all others against WCAG AA/exception rules |
| Custom Select/Radio/Dialog looks correct but lacks keyboard semantics | native-first implementation; explicit APG keyboard and focus contracts with browser tests |
| Every toast becomes an intrusive alert | polite-by-default live-region policy; assertive only for urgent errors; deduplicate announcements |
| Financial mutation is triggered twice or committed without a safeguard | pending duplicate-submit protection plus reversible, checked or confirmed consumer evidence |
| Error UI marks a field but does not help correction | text error identification, correction suggestion when known and preserved input |
| 320px mobile testing is mistaken for WCAG reflow proof | test 200% text, equivalent 320 CSS-pixel reflow and actual mobile viewport separately |
| Focus is styled but hidden behind sticky UI | assert focus visibility and focus-not-obscured behavior |
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
- semantic role/name/state and keyboard assertions for custom controls;
- target-size assertions that distinguish AA baseline, important-action target and valid exceptions;
- error identification/suggestion and preserved-input evidence where applicable;
- modal/non-modal focus behavior and status-message announcement evidence;
- financial/stored-data mutation safeguard evidence for affected consumers;
- separate 200% text, equivalent 320 CSS-pixel reflow and actual 320px mobile checks;
- affected browser smoke and cross-device audit;
- owner-reviewed appearance/API evidence before Phase 3.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | Explicit instruction: “Bắt đầu p2” | Create branch, packet and PR; define P2-T1 |
| 2026-08-05 | planner | implementer | implementing | branch `agent/ui-phase-2-primitives`, draft PR #299 and initial P2-T1 matrix | Complete P2-T2 inventory, then propose the bounded action-primitive slice |
| 2026-08-05 | human_owner | implementer | implementing | Owner requested standards correction after external verification | Apply the two-level target policy and authority classification before runtime writes |
| 2026-08-05 | human_owner | implementer | implementing | Owner instructed the remaining standards gaps to be fixed | Add keyboard/ARIA, feedback, financial-error-prevention, focus and reflow contracts before executable primitive work |

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
