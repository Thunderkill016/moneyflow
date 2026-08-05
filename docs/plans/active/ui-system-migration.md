# MoneyFlow UI system migration and interface recovery

**Status:** planned
**Execution state:** planned
**Active role:** human_owner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** pending
**Last updated:** 2026-08-05

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This is the parent work packet for a cross-cutting interface migration. It does not authorize product-code changes. Every implementation phase stops for explicit owner approval before its first write.

## Outcome

MoneyFlow has one understandable and maintainable interface system in which the selected Fresh Blue/B3.2 identity, semantic finance colors, responsive behavior, accessibility rules and financial safety states are owned by the correct tokens, primitives, components and routes. The migration preserves current financial behavior and keeps the application continuously buildable and reviewable. Legacy presentation layers are removed only after their consumers have moved and before/after evidence proves the removal is safe.

## Repository reconnaissance

### Current behavior

- The current product renders a selected white-first, Fresh Blue visual identity, public light-only behavior and workspace light/dark/system themes through `src/app/document-theme.css` and later compatibility layers.
- The signed-in application uses a CSS-module App Shell, but route presentation still depends on seven ordered global legacy stylesheets, route-level global CSS, CSS Modules with `:global(...)` bridges and two invisible contract components.
- Dashboard, Transactions, Accounts and Planning routes are at different migration stages. Some components own their styles; others still depend on global class vocabularies such as `.dashboard`, `.panel`, `.manager-row` and `*-workspace`.
- The selected product safety decision withdraws unproven safe-to-spend guidance, but current runtime enforcement still includes CSS that hides the old surface rather than preventing the component from rendering.
- The current UI audit covers a broad Chromium/WebKit matrix, dark mode, 200% text and keyboard behavior. Issue #72 remains open for validation/error states, destructive confirmations, Inbox/import review, wider planning/settings coverage and physical-device acceptance.
- Open PRs #170 and #171 contain useful historical dead-CSS research but are based on an older stacked baseline and are not safe to merge wholesale into current `main`.
- Open PRs #293, #294 and #295 are candidate work only. They do not change current project truth until merged and owner-accepted.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/design/DESIGN_DIRECTION_STATUS.md` | Latest explicit owner direction for color, identity and public/workspace theme behavior | Reuse as current decision authority; do not extend it into a permanent layout concept without owner approval |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Cumulative concept-neutral UI/UX evidence | Reuse as research authority; update only with durable findings |
| `src/app/document-theme.css` | Executable semantic token and theme authority | Reuse initially; normalize naming and consumers before considering generated token artifacts |
| `src/app/legacy.css` | Ordered compatibility boundary for seven global layers | Shrink by vertical slice; never add another root override layer |
| `src/app/globals.css` | Tailwind/shadcn bridge, reset, aliases and legacy presentation | Split responsibilities incrementally; do not rewrite wholesale |
| `src/app/ui-refresh.css` | Broad authenticated-route overrides and historical mobile clearance | Retire only after owner components replace each live rule |
| `src/app/ai-uiux-refresh.css` and `src/app/ai-uiux-guardrails.css` | Later hierarchy and repair layers | Migrate useful decisions into route/component owners; remove bridges after evidence |
| `src/app/safe-to-spend-withdrawal.css` | Product-safety withdrawal enforced through CSS | Replace with render/capability ownership; preserve safety decision |
| `src/components/layout/app-shell.tsx` and `.module.css` | Current signed-in shell, navigation, sheets and safe-area owner candidate | Make the sole owner of application chrome |
| `src/components/minimum-target-size-contract.*` | Global 44px repair for undersized primitives and legacy controls | Remove only after primitives and remaining route actions own target size |
| `src/components/mobile-shell-contract.*` | Global route padding and dialog repair | Remove after App Shell and route modules own safe-area and dialog behavior |
| `src/components/ui/**` | Shadcn/Base UI primitives | Adapt to MoneyFlow product contracts rather than relying on global rescue rules |
| `src/components/landing-page.*` and `auth-form.*` | Current public and authentication surfaces | Preserve selected content direction; clean stale palette and breakpoint ownership later |
| `src/components/moneyflow-dashboard.*` and dashboard route CSS | Most layered presentation boundary | Use as the first route migration after App Shell foundations |
| `src/components/transactions-page.*` and dialogs | Highest-frequency, highest-state daily flow | Migrate as one coherent ledger/capture slice |
| `src/components/accounts-page.*` and transfer dialogs | Account and balanced-transfer flow | Migrate after shared primitives and transaction dialogs are stable |
| `src/components/planning/**` and planning route CSS | Budgets, commitments, income templates and goals | Consolidate behind shared planning layout/components |
| `e2e/audit/**` and Playwright configs | Existing responsive, browser and state evidence | Preserve structural assertions; repair stale route naming and add reviewed visual baselines selectively |
| `scripts/check-css-ownership.mjs` and dead-CSS tooling | Current no-regression and candidate detection | Extend with diff-based gates; never treat scanner output as deletion authority |

### Existing tests and constraints

- Related unit/static tests: project knowledge, CI policy, CSS ownership, architecture, token/brand contracts, route-specific source contracts and dead-CSS reporting.
- Database/RLS tests: not expected to change for presentation-only slices; any discovered data or financial contract change stops this program and receives a separate Class 3 specification.
- Browser tests: expense-path smoke, critical-browser audit, responsive audit, safety-review states, reports custom range, budget month history, text-scale and keyboard audits.
- Product/architecture rules:
  - never write directly to `main`;
  - no new root override layer;
  - App Shell layout belongs to `src/components/layout/app-shell.module.css`;
  - `!important` is budgeted and the owning rule must be fixed;
  - one primary action per viewport;
  - money must not rely on color alone or be truncated;
  - no unproven spending guidance;
  - owner review is mandatory for product-direction changes and Class 3 boundaries.

### Similar implementation and recent history

- Existing pattern to reuse: move one bounded consumer behind a new owner, keep compatibility during migration, verify exact-head behavior, then remove the retired implementation in the same or immediately following reviewable slice.
- Relevant decisions:
  - current Fresh Blue/B3.2 and public/workspace theme decision in `docs/design/DESIGN_DIRECTION_STATUS.md`;
  - guided-story public direction merged in PR #282;
  - token/color and money typography consolidation in PR #147;
  - current App Shell migration and route-specific repair history;
  - issue #72 for remaining route/state UI acceptance;
  - PRs #170/#171 as historical evidence about dead mobile chrome CSS and the risk of deleting styles without visual proof.

### Open questions

- [ ] Owner confirms whether the current guided-story landing structure is preserved during architecture cleanup or reopened for a separate conversion-focused redesign.
- [ ] Owner approves or rejects a Storybook adoption spike as a development-only component-state harness.
- [ ] Owner identifies available physical Android and iOS/Safari devices for final acceptance.
- [ ] Owner decides whether current open candidate PRs #293, #294 and #295 should be closed, superseded or reconciled into future bounded slices.
- [ ] Owner confirms whether the current selected color/identity direction remains fixed for this migration. Until changed, this packet treats `DESIGN_DIRECTION_STATUS.md` as binding.

## Research

### Research scope and source selection

- Decision question: How should MoneyFlow replace a multi-generation CSS and component architecture without a big-bang rewrite, while preserving financial safety, responsive behavior and continuous delivery?
- Reference map consulted: `docs/research/REPOSITORY_REFERENCE_MAP.md` and `docs/research/ENGINEERING_FOUNDATIONS_REFERENCE_MAP.md` where applicable, plus focused primary/authoritative external sources.
- Source budget: eight focused sources. This exceeds the default because the program crosses framework CSS behavior, cascade mechanics, migration architecture, token interoperability, component-state testing, visual regression and two accessibility/financial-error requirements.
- Expected decision or uncertainty to resolve: select an incremental migration method, define ownership boundaries and determine which tools are necessary now versus deferred.

### Questions researched

1. How does Next.js App Router load and retain global CSS, and what ownership model reduces route conflicts?
2. Can cascade layers safely neutralize the current `!important` debt by themselves?
3. What migration pattern keeps a large interface replacement continuously releasable?
4. When should MoneyFlow adopt a formal design-token interchange format?
5. How should component states and visual changes be tested without replacing existing end-to-end assertions?
6. Which pointer-target and error-prevention rules are relevant to a financial ledger?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| [Next.js: CSS](https://nextjs.org/docs/app/getting-started/css) | Official framework documentation | 2026-08-05 | CSS Modules are locally scoped; global styles can persist across App Router navigation and create conflicts; production build must verify final CSS ordering | Does not prescribe MoneyFlow-specific architecture or migration order |
| [MDN: Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers) | Authoritative web-platform documentation | 2026-08-05 | Named layers can establish explicit normal-declaration precedence independent of selector specificity | Layers do not automatically fix incorrect ownership or remove legacy selectors |
| [MDN: `!important`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/important) | Authoritative web-platform documentation | 2026-08-05 | Important declarations reverse layer precedence and should not be used as a general specificity escape hatch | Existing MoneyFlow important declarations require owner-by-owner removal; wrapping them in a layer is not a complete fix |
| [Martin Fowler: Branch by Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html) | Established software migration pattern | 2026-08-05 | Large replacements should move clients gradually behind new abstractions while the system remains releasable | The pattern must be adapted to UI/component ownership rather than copied as a library swap recipe |
| [W3C Design Tokens Format 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) | W3C Community Group final report | 2026-08-05 | A stable interchange format now exists for typed tokens, aliases and tool interoperability | It is not necessary to introduce a token build pipeline before current CSS ownership is stable; it is a Community Group report, not a W3C Recommendation |
| [Storybook: Why Storybook](https://storybook.js.org/docs/10.5/get-started/why-storybook) | Official tool documentation | 2026-08-05 | Component states can be developed and tested in isolation; stories can support interaction, accessibility and visual workflows | Adoption adds development dependency and maintenance; it requires a bounded spike and owner approval |
| [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) | Official test framework documentation | 2026-08-05 | `toHaveScreenshot()` supports committed visual baselines, but rendering environment must be stable and snapshot changes reviewed | Pixel snapshots supplement, not replace, semantic and geometry assertions; broad full-page snapshot coverage would be noisy |
| [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | W3C WAI accessibility guidance | 2026-08-05 | Level AA requires 24×24 CSS px or spacing exceptions; 44×44 is an enhanced target and remains a reasonable MoneyFlow product standard for important financial actions | Inline links and equivalent controls have exceptions; a global rule forcing every link to 44×44 is not required |
| [WCAG 2.2 financial/data error prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI accessibility guidance | 2026-08-05 | Important submissions and stored-data changes need a way to reverse, check or confirm the action | MoneyFlow ledger mutations are not bank transactions, but they modify user-controlled financial records and should preserve undo/review/confirmation safeguards |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Big-bang interface rewrite | Fast conceptual reset; removes visible legacy in one branch | Unreviewable diff, state loss, long-lived branch, difficult rollback, high financial-flow regression risk | Rejected |
| Merge PRs #170/#171 wholesale | Reuses extensive prior cleanup work | Stale stacked baseline, current-route drift, mixes deletion tooling with user-visible spacing decisions | Rejected; reuse evidence and techniques only |
| Add one final override stylesheet | Small immediate visual changes | Creates an eighth authority layer and increases specificity debt | Rejected |
| Wrap all legacy CSS in cascade layers immediately | Explicit order with limited code movement | Important declarations reverse layer precedence; wrong ownership remains | Rejected as a first move; cascade layers may be used later after important debt is reduced |
| Convert the whole application to Tailwind utilities | One styling syntax and existing dependency | Does not solve token authority, component semantics, state coverage or visual governance; creates a second migration | Rejected |
| Replace CSS Modules with CSS-in-JS | Co-located styles | Adds runtime/framework complexity and does not solve current ownership; App Router constraints require extra care | Rejected |
| Incremental vertical-slice migration behind MoneyFlow primitives and layout owners | Small reviewable diffs, continuous delivery, exact rollback, state-by-state evidence | Requires discipline and temporary adapters | Selected |
| Generate all tokens from DTCG JSON immediately | Future interoperability with design tools and multiple platforms | Adds pipeline and dual-source risk before names/roles are stable | Deferred until late migration review |
| Add Storybook for every current component | Immediate component catalogue | Large initial setup and story backlog before ownership is fixed | Rejected; bounded spike then adopt only for migrated primitives/components if evidence supports it |

### Research decision

Observed facts:

- Next.js global styles may remain active across route navigation, so route-level global CSS is a real conflict risk.
- Cascade layers can control normal precedence, but important declarations reverse layer order.
- MoneyFlow currently has multiple compatibility layers and product contracts enforced after component rendering.
- Existing Playwright audits provide strong geometry and behavior coverage but do not fully replace component-state visual review or physical-device acceptance.

Inference:

- MoneyFlow should treat its presentation replacement like Branch by Abstraction: establish correct primitives/layout owners, move one coherent user flow at a time, and delete the old rules only after the last consumer moves.
- The safest first implementation boundary is shared primitives followed by App Shell, not a full visual redesign of a route.

Product judgment:

- Keep `document-theme.css` as the executable token authority during the migration.
- Do not create a token generator, Storybook dependency, cascade-layer reorganization or new design-tool dependency without a bounded adoption decision and owner approval.
- Preserve current financial behavior and selected identity while architecture is repaired. Any new layout or public narrative direction remains a separate owner-selected design task.

What does not apply directly:

- Branch by Abstraction does not require a permanent generic abstraction framework; MoneyFlow should use concrete primitives and route owners.
- DTCG format does not require immediate Style Dictionary adoption.
- Storybook visual testing does not require Chromatic or a hosted service; no external provider is authorized by this packet.
- WCAG does not require every inline link to be 44×44; MoneyFlow may keep 44px for important controls as a product standard.

### Adoption review

#### Storybook candidate

- Observed problem: critical component states are currently reached through route seeding and page-level Playwright, making visual review expensive and incomplete.
- Existing or simpler alternatives considered: existing Playwright fixtures, dedicated test routes, React/Playwright component tests.
- License/code-reuse compatibility: open-source development tool; exact package/license must be verified in the adoption spike.
- Secrets, user-data and privacy exposure: stories must use synthetic fixtures only; no production data, provider secrets or authenticated remote calls.
- Runtime, bundle, deployment and operational cost: development-only; must not enter the production bundle or require a hosted service.
- Owning boundary and maintenance responsibility: `src/components/ui`, `src/components/finance` and migrated component stories; owned by the UI system migration.
- Migration and rollback: one isolated tooling PR; removal is package/config/story deletion with no runtime dependency.
- Verification plan: build Storybook locally/CI, prove at least five critical states are easier to review, and confirm no production bundle impact.
- Removal condition: reject/remove if setup is brittle, duplicates Playwright without reducing state complexity, or requires an unapproved hosted provider.

#### DTCG token artifact candidate

- Observed problem: future Atoryn/design-tool interoperability may need a portable token source.
- Simpler alternative: keep `document-theme.css` authoritative while naming and component roles stabilize.
- Decision: deferred. Reassess only after primitive and route migrations prove the final semantic vocabulary.

#### Cascade layers

- No dependency or provider adoption.
- Decision: optional late-stage tool for remaining vendor/legacy ordering after important declarations have been removed from the affected boundary.

## Specification

### Problem

People using MoneyFlow can encounter a visually functioning product whose implementation is difficult to reason about because multiple design generations, global layers and repair contracts affect the same element. Maintainers and AI agents can easily add a new override, preserve a dead selector or break another viewport while making a local fix. This increases the cost and risk of every future interface change, especially on daily financial flows where full VND values, transfer meaning, destructive recovery and mobile accessibility must remain trustworthy.

### User stories

- As a MoneyFlow user, I can record, review and correct financial entries on phone, tablet and desktop without clipped values, hidden actions or overlapping chrome.
- As a keyboard or assistive-technology user, I can reach and understand every important control, dialog and state.
- As a user changing financial records, I can review, correct, undo or confirm important actions before serious loss.
- As the product owner, I can review one coherent visual direction and one bounded flow at a time before it ships.
- As a developer or agent, I can identify the token, primitive, component and route that owns a rendered property without tracing an uncontrolled override chain.
- As a maintainer, I can remove legacy CSS with evidence and a simple rollback rather than trusting grep or scanner output alone.
- As a designer, I can create candidate directions using real content and states without those candidates becoming runtime authority automatically.

### Acceptance criteria

#### Governance and authority

- [ ] One current design-system authority index identifies current, historical, rejected and candidate documents.
- [ ] B3.2, Fresh Blue, semantic finance colors, public light-only behavior and workspace theme behavior remain unchanged unless the owner explicitly replaces them.
- [ ] New design tools and generated candidates cannot modify production components without owner selection and a bounded implementation packet.
- [ ] Every implementation phase records owner approval before product-code writes.

#### CSS and ownership

- [ ] No new root override stylesheet is introduced.
- [ ] New or migrated route/component presentation uses CSS Modules or an explicitly approved local utility contract.
- [ ] Route pages do not import new global CSS.
- [ ] Every removed selector has consumer analysis and browser/visual evidence.
- [ ] `!important` debt does not increase; each migrated boundary removes the important declarations it supersedes.
- [ ] Final state has no product behavior or safety decision enforced only by `display:none` CSS.
- [ ] Final state has no invisible contract component whose sole purpose is global presentation repair.

#### Tokens and primitives

- [ ] `document-theme.css` remains the only executable semantic color/theme authority during migration.
- [ ] Unknown, misleading and retired aliases are inventoried, migrated and removed or explicitly documented.
- [ ] Button, LinkButton, IconButton, form controls, Dialog/Sheet, Card, Alert/Toast, EmptyState and MoneyValue own their product contracts directly.
- [ ] Important financial actions meet the MoneyFlow 44px product target without a global all-links override.
- [ ] Color is never the only carrier of income, expense, transfer, warning or destructive meaning.

#### Shell and routes

- [ ] App Shell is the sole owner of sidebar, topbar, mobile navigation, safe-area reservation, bottom clearance, shell z-index and global sheets.
- [ ] Signed-in identity renders the canonical BrandLockup directly; no pseudo-element compatibility logo bridge remains.
- [ ] `/insights` remains only as a compatibility redirect; current UI, tests and navigation use `/dashboard` and `Tổng quan`.
- [ ] Dashboard duplicate actions and withdrawn safe-to-spend markup are removed from rendering rather than hidden.
- [ ] Transactions, Capture, Accounts, Transfer, Planning, secondary flows, Landing and Auth each have a clear local presentation owner.

#### Responsive, accessibility and financial safety

- [ ] Supported 320/360/390 phone widths have no document overflow, clipped money, obscured focus or stacked shell clearance.
- [ ] Tablet portrait/landscape and desktop layouts remain usable with long Vietnamese and large VND fixtures.
- [ ] Workspace light/dark/system and public light-only behavior remain deterministic.
- [ ] Important controls have visible focus, accessible names and suitable target size.
- [ ] Financial/data mutations provide reversal, checking or confirmation as appropriate.
- [ ] 200% text, reduced motion, forced colors and keyboard-only checks are retained or expanded where affected.

#### Evidence and delivery

- [ ] Each slice has structural assertions, affected browser flows and owner-reviewed visual evidence.
- [ ] Visual snapshots run in a pinned environment and snapshot changes are never auto-approved.
- [ ] Issue #72 remaining state coverage is either completed or replaced by exact successor records before closure.
- [ ] Physical Android and iOS/Safari acceptance is recorded before final program acceptance.
- [ ] Legacy files are deleted only when their live consumer count reaches zero and rollback evidence exists.

### Required states

- Loading: skeleton/progress must not imitate final money values or shift critical controls unexpectedly.
- Empty: one clear explanation and one appropriate primary action; no duplicate shell/page CTA.
- Populated: representative daily data, multiple accounts and planning records.
- Validation/error: field-level error, route data error, provider/configuration error and retry/recovery behavior.
- Recovery/undo: transaction deletion undo, recoverable archived/soft-deleted data and safe cancellation of dialogs.
- Long data / large VND: long Vietnamese labels/notes, negative values, multi-currency labels and full-precision integer VND.
- Mobile/tablet/desktop: 320, 360, 390, 768, 1024, 1366 and 1440 representative viewports.
- Accessibility: keyboard, focus visibility, focus not obscured, accessible names/landmarks, reduced motion, 200% text and forced colors where relevant.
- Theme: public light-only; signed-in light, dark and system.
- Interaction: dialog/sheet open, disabled, pending, destructive confirmation, bulk selection, filter overflow and import review.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Safe-to-spend remains unavailable until a separately researched contract and reliable income-cycle/commitment/reserve data exist.
- Presentation migrations do not change RLS, ownership, authentication actions, schema, mutation semantics or production data.
- Synthetic fixtures only in stories, screenshots and visual baselines.
- Any discovered financial, auth, RLS, provider or production-data change stops the affected slice and creates a separate Class 3 packet.

### Out of scope

- Bank synchronization, OCR product identity, AI financial advice, family finance or envelope-budgeting expansion.
- New product capabilities disguised as interface cleanup.
- Immediate DTCG/Style Dictionary token generation.
- Automatic migration to Figma, Penpot, Open Design, Webflow, Framer or any hosted design provider.
- Replacing Next.js, React, Base UI, Tailwind or CSS Modules.
- Merging, deploying or changing provider rules without explicit owner approval.
- Redesigning every screen before ownership and evidence foundations exist.

## Implementation plan

### Architecture fit

The existing architecture already separates routes, components, hooks and domain logic. This program stays inside the presentation boundary:

- `src/app/document-theme.css` owns document-level semantic tokens and theme switching during migration.
- `src/components/ui/**` owns generic MoneyFlow primitives.
- `src/components/finance/**` may be introduced only for reusable finance-specific presentation with at least two real consumers or a clear product-wide contract.
- `src/components/layout/**` owns signed-in chrome and safe areas.
- route/component CSS Modules own route-specific composition and local visual treatment.
- `src/app/legacy.css` remains a temporary compatibility boundary that shrinks; it is not extended.
- financial calculations and mutations remain in current domain/server boundaries.

Target import shape:

```text
root layout
  -> token/theme authority
  -> reset/base/vendor bridge
  -> temporary legacy compatibility

route
  -> App Shell
  -> local route/component modules
  -> shared primitives and finance components
```

No permanent generic abstraction framework is required. The practical Branch-by-Abstraction seam is the MoneyFlow primitive/component API and the route owner that replaces each global class family.

### Program sequencing and owner gates

| Phase | Scope | Primary output | Owner gate before next phase |
|---|---|---|---|
| 0 | Authority, inventory and current-main baseline | Approved current-truth index, measured debt baseline and representative screenshots | Owner approves authority, metrics and implementation order |
| 1 | No-regression guardrails and optional Storybook spike decision | Diff-based policy gates; adoption decision | Owner approves tooling/dependency changes |
| 2 | Tokens and primitives | MoneyFlow-native primitive contracts and state evidence | Owner approves primitive appearance/API |
| 3 | App Shell and mobile chrome | One shell owner; correct safe areas; canonical signed-in identity | Owner approves desktop/phone shell evidence |
| 4 | Dashboard pilot | Dashboard-owned composition; withdrawn feature removed from render path | Owner approves Dashboard states and responsive hierarchy |
| 5 | Transactions and Capture | Coherent daily ledger/capture slice | Owner approves daily-use flow evidence |
| 6 | Accounts and Transfer | Account and balanced-transfer presentation | Owner approves account/transfer review states |
| 7 | Planning | Shared planning page/summary/card patterns across four routes | Owner approves planning hierarchy and states |
| 8 | Secondary and safety flows | Reports, categories, Inbox/import/rules/timeline/settings | Owner approves remaining destructive/review states |
| 9 | Landing and Auth cleanup | Current direction preserved with clean ownership; stale generations removed | Owner separately decides whether a new public redesign is opened |
| 10 | Legacy retirement and optional token interchange review | Zero live legacy consumers; deletion evidence; DTCG decision | Owner approves legacy deletion and any token-pipeline adoption |
| 11 | Full acceptance | Cross-browser, physical-device and production evidence | Owner accepts and closes program |

### Phase rules

- Every phase is one or more focused PRs, not one long-lived implementation branch.
- A PR changes one ownership boundary or one coherent user flow.
- New discoveries update this packet before scope expands.
- Compatibility adapters are temporary, named and paired with a removal task.
- The program never merges automatically. Owner selection, merge and production verification remain human decisions.
- A phase can stop without forcing the next phase; the application must remain releasable after every merged slice.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| Design/current-memory documents | Reconcile current/historical/rejected/candidate status and link this packet | Prevent stale concepts from acting as authority |
| CSS ownership and CI classification scripts | Add diff-based no-new-debt checks without making existing debt instantly blocking | Stop regression while allowing incremental migration |
| `src/app/document-theme.css` and bridges | Inventory and normalize misleading/unknown aliases; preserve current values | Make token meaning understandable without changing selected identity |
| `src/components/ui/**` | Adapt/create MoneyFlow primitives with semantics, 44px important-action targets and states | Move product contracts into components |
| Optional component-state harness | Run a bounded Storybook or equivalent spike if approved | Review state combinations without route seeding overhead |
| `src/components/layout/**` | Consolidate chrome, identity, safe-area and global sheet ownership | Remove double clearance and shell compatibility bridges |
| Dashboard route/components | Replace layered CSS and hidden JSX with local owners | Prove migration method on the most layered route |
| Transactions/Capture/dialogs | Replace global manager/dialog class dependencies | Protect the primary daily flow and financial mutation states |
| Accounts/Transfer | Replace workspace/global-card bridges | Establish account/transfer components and review states |
| Planning components/routes | Create shared planning composition and migrate four routes | Remove duplicated global planning presentation |
| Reports/Categories/Inbox/Rules/Imports/Timeline/Settings | Migrate remaining route families and complete issue #72 states | Close secondary and safety-flow gaps |
| Landing/Auth | Remove stale palettes/generations and resolve breakpoint ownership | Keep selected public direction while making source match rendered truth |
| `src/app/legacy.css` and legacy files | Delete family by family after zero-consumer proof | Finish migration without speculative deletion |
| Playwright audit/evidence | Repair stale `/insights` references, preserve structural checks and add selective reviewed snapshots | Make evidence match current routes and rendered states |

### Data and migration impact

- Schema/migration: none planned.
- Backfill: none.
- Compatibility: route redirects and temporary class/component adapters remain only until current consumers migrate.
- Rollback: each implementation PR reverts independently to the prior owner; no database rollback is expected. A tooling spike is removable without runtime impact.
- Stop condition: any required change to financial semantics, auth, RLS, provider configuration or production data exits this packet and receives separate specification/approval.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| A local module looks correct only because a later global rule still wins | Inspect computed style and disable/remove the legacy rule in the same test branch; add source ownership assertion |
| Wrapping legacy CSS in layers makes important rules stronger | Do not layer important-heavy files as the first step; measure and remove important declarations per boundary |
| Primitive migration changes every route unexpectedly | Introduce compatibility variants, migrate bounded consumers and run full affected matrix before changing defaults |
| Global 44px contract removal exposes undersized controls | Inventory measured controls first; remove contract only after all important consumers use compliant primitives/local rules |
| Removing mobile padding hides content behind bottom navigation | App Shell geometry assertion compares nav height, shell reservation, focused control visibility and document end spacing |
| Dead-CSS scanner marks a dynamic class dead | Require AST/DOM evidence, interaction coverage and before/after screenshots; never delete from scanner output alone |
| Screenshot snapshots become noisy/flaky | Pin browser/container/fonts/data, mask dynamic values only when necessary, use component/representative page snapshots and retain semantic assertions |
| Storybook becomes a second application | Limit to migrated components and synthetic fixtures; no business duplication, provider calls or production dependency |
| Design cleanup silently changes financial advice | Keep product copy and safe-to-spend boundary in acceptance tests; require separate product decision for new guidance |
| Multiple phases run in parallel and edit the same owner | One active owner per shared primitive/shell boundary; parallel work allowed only on non-overlapping route families after primitives stabilize |
| A redesign candidate is treated as approved because it exists | Candidate status in docs/PR; no production implementation until explicit owner selection is recorded |
| Legacy deletion removes forced-colors/reduced-motion fallback | Include media-query/fallback inventory and targeted accessibility checks before deletion |
| Public and workspace themes leak into each other | Keep route-level theme contracts and computed-color assertions for public light-only and workspace selectable themes |
| Old `/insights` names remain hidden in tests/copy | Add no-new-reference gate; migrate current UI/tests; allow only the compatibility redirect and explicit historical docs |
| Long program creates stale parent plan | Update execution state, evidence and handoffs after every approved slice; archive only after final acceptance |

### Verification plan

- Static:
  - `npm run check:knowledge`
  - `npm run test:ci-policy`
  - `npm run check:css-ownership`
  - `npm run check:architecture`
  - lint, typecheck and build for executable slices
  - diff-based no-new-global/import/important/token/route-alias checks when introduced
- Unit/domain:
  - primitive variant and accessibility-name contracts
  - token/alias contracts
  - no product/domain calculation changes expected
- Database:
  - not applicable for presentation-only slices unless classification or discovered scope requires it
- Browser flow:
  - affected daily and destructive flows
  - dialog/sheet open, submit, cancel, validation, recovery and undo
- Responsive/visual:
  - existing project matrix at affected routes
  - long Vietnamese and large VND
  - light/dark/public-light-only
  - component/representative page snapshots in a pinned environment if approved
  - owner review of attached screenshots/diffs
- Production/manual:
  - affected routes after merge
  - physical Android and iOS/Safari before program acceptance
  - no claim of physical readiness from emulation

## Tasks

### Phase 0 — authority, inventory and baseline

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P0-T1 | Reconcile every active design document as current, historical, rejected or candidate | Owner review of this packet | Authority inventory with exact paths | todo |
| P0-T2 | Record selected identity, color, theme, typography, IA and product-safety boundaries in one current index | P0-T1 | Owner-approved current-truth index | todo |
| P0-T3 | Inventory all global CSS imports, route CSS imports, CSS Modules with `:global`, inline styles and styled utility families | None | Machine-readable and human-readable inventory | todo |
| P0-T4 | Measure current-main counts for stylesheets, selectors, `!important`, unknown/misleading tokens, route aliases and invisible contracts | P0-T3 | Reproducible baseline command/output summary | todo |
| P0-T5 | Map live class families to routes/components and identify product behavior enforced through CSS | P0-T3 | Ownership matrix | todo |
| P0-T6 | Capture representative current-main screenshots and computed-style/geometry evidence for critical routes/states | P0-T2 | Versioned audit artifact, not committed production data | todo |
| P0-T7 | Reconcile issue #72 and open UI PRs against current main; classify keep, supersede, close or rebase | P0-T3, P0-T6 | Decision table; no PR mutation without owner approval | todo |
| P0-T8 | Present baseline and proposed implementation order to owner | P0-T1 through P0-T7 | Recorded owner approval or requested changes | todo |

### Phase 1 — no-regression controls and tooling decisions

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P1-T1 | Add a diff-based gate preventing new root/global stylesheet imports outside an explicit allowlist | P0-T8 | Fixture tests and current-main pass | blocked |
| P1-T2 | Add a diff-based no-new-`!important` gate with narrow commented exceptions | P0-T8 | Fixture tests and current-main pass | blocked |
| P1-T3 | Add token-reference validation for new/changed CSS declarations | P0-T4 | Known-token fixtures and current-main pass | blocked |
| P1-T4 | Add no-new `/insights` UI/test reference rule while preserving redirect/historical allowlist | P0-T7 | Fixture tests and current-main pass | blocked |
| P1-T5 | Add no-new legacy workspace/class registration rule for migrated boundaries | P0-T5 | Source fixtures and current-main pass | blocked |
| P1-T6 | Run Storybook/equivalent component-state harness spike if owner approves | P0-T8 | Adoption report, no runtime bundle impact | blocked |
| P1-T7 | Owner accepts or rejects tooling changes before merge | P1-T1 through P1-T6 | Owner decision and rollback note | blocked |

### Phase 2 — token and primitive ownership

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P2-T1 | Define MoneyFlow primitive API and state matrix before code changes | P1-T7 | Approved specification | blocked |
| P2-T2 | Normalize token vocabulary and inventory compatibility aliases without changing rendered values | P2-T1 | Token contract tests and computed-color comparison | blocked |
| P2-T3 | Implement/adapt Button, LinkButton and IconButton with semantic DOM and product target sizes | P2-T1 | Stories/tests and affected route evidence | blocked |
| P2-T4 | Implement/adapt TextField, Select, Checkbox and Radio states | P2-T1 | Validation, focus, disabled and 200% text evidence | blocked |
| P2-T5 | Implement/adapt Dialog and Sheet primitives with focus, scroll and safe cancellation | P2-T3, P2-T4 | Keyboard/mobile/browser evidence | blocked |
| P2-T6 | Implement/adapt Card, Badge, Alert, Toast and EmptyState roles | P2-T1 | State and theme evidence | blocked |
| P2-T7 | Stabilize MoneyValue and finance-status presentation contracts | P2-T2 | Large VND, negative, currency and semantic-label evidence | blocked |
| P2-T8 | Migrate a bounded low-risk consumer set to prove primitive APIs | P2-T3 through P2-T7 | Exact-head route evidence and rollback | blocked |
| P2-T9 | Inventory all remaining consumers rescued by MinimumTargetSizeContract | P2-T8 | Measured control list | blocked |
| P2-T10 | Owner approves primitive appearance/API and next migration boundary | P2-T8, P2-T9 | Owner decision | blocked |

### Phase 3 — App Shell and chrome

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P3-T1 | Make App Shell render canonical BrandLockup directly | P2-T10 | Desktop/phone/forced-colors evidence | blocked |
| P3-T2 | Define one mobile navigation height and one safe-area reservation contract | P2-T10 | Geometry specification | blocked |
| P3-T3 | Remove double bottom clearance and retired FAB clearance from migrated routes | P3-T2 | 320/360/390 document-end and focus geometry | blocked |
| P3-T4 | Consolidate sidebar, topbar, mobile nav, global sheets and shell z-index in App Shell module | P3-T1, P3-T2 | Cross-browser shell evidence | blocked |
| P3-T5 | Replace `body:has()` and route-global chrome fixes with explicit component props/owners | P3-T4 | Source ownership tests | blocked |
| P3-T6 | Migrate remaining important shell controls to primitives | P2-T10, P3-T4 | Target/focus/theme evidence | blocked |
| P3-T7 | Remove logo guardrail and MobileShellContract after zero-consumer proof | P3-T3 through P3-T6 | Before/after comparison and zero-reference proof | blocked |
| P3-T8 | Owner approves signed-in shell on desktop and physical/emulated phone evidence | P3-T7 | Owner decision | blocked |

### Phase 4 — Dashboard pilot

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P4-T1 | Inventory Dashboard render tree and every active stylesheet declaration affecting it | P3-T8 | Selector-to-owner map | blocked |
| P4-T2 | Remove duplicate in-page primary action from JSX and preserve one action per viewport | P4-T1 | Accessible action count tests | blocked |
| P4-T3 | Remove withdrawn safe-to-spend markup from render path while preserving product-safety tests | P4-T1 | Source and browser assertions | blocked |
| P4-T4 | Make balance statement and supporting figures component-owned | P2-T7, P4-T1 | Large VND/theme/responsive evidence | blocked |
| P4-T5 | Consolidate planning cards, weekly summary and detail stacks behind route/component modules | P4-T1, P4-T4 | Empty/populated/long-data evidence | blocked |
| P4-T6 | Resolve contradictory phone column rules using measured 320/360/390 layouts | P4-T4 | Geometry and screenshot review | blocked |
| P4-T7 | Remove Dashboard legacy class/styles only after zero-consumer proof | P4-T2 through P4-T6 | Before/after evidence and selector deletion list | blocked |
| P4-T8 | Owner approves Dashboard empty/rich/light/dark/phone/desktop states | P4-T7 | Owner decision | blocked |

### Phase 5 — Transactions and Capture

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P5-T1 | Specify shared ledger row, day group, summary and filter contracts | P4-T8 | Approved flow/component spec | blocked |
| P5-T2 | Migrate Transactions summary, filters, ranges and bulk toolbar to local owners/primitives | P5-T1 | Filter/state/keyboard evidence | blocked |
| P5-T3 | Migrate transaction rows, amounts, actions and review states | P5-T1, P2-T7 | Long Vietnamese/large VND/touch evidence | blocked |
| P5-T4 | Migrate add/edit/transfer/split dialogs to shared form/dialog contracts | P2-T5, P5-T1 | Validation, pending, cancel and error evidence | blocked |
| P5-T5 | Preserve soft delete and undo; review destructive wording and timing | P5-T3, P5-T4 | Delete/undo browser flow | blocked |
| P5-T6 | Migrate quick capture, paste/upload entry and mobile keyboard-safe layout | P5-T4 | Phone/keyboard/long-input evidence | blocked |
| P5-T7 | Repair stale audit route/evidence helpers to target `/dashboard` and current components | P3-T8 | Exact route assertions and screenshot artifacts | blocked |
| P5-T8 | Remove global manager/dialog class families after last consumer moves | P5-T2 through P5-T7 | Zero-consumer and before/after evidence | blocked |
| P5-T9 | Run full daily expense/transfer/capture matrix | P5-T8 | Exact-head CI and browser artifacts | blocked |
| P5-T10 | Owner approves the daily-use flow | P5-T9 | Owner decision | blocked |

### Phase 6 — Accounts and Transfer

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P6-T1 | Specify AccountSummary, AccountCard, archived state and account actions | P5-T10 | Approved component/state spec | blocked |
| P6-T2 | Migrate Accounts route off global `.dashboard` and account-card bridges | P6-T1 | Route ownership and responsive evidence | blocked |
| P6-T3 | Migrate account create/edit/archive dialogs to shared primitives | P2-T5, P6-T1 | Validation/destructive/recovery evidence | blocked |
| P6-T4 | Implement explicit transfer review of source, destination, amount and currency compatibility | P5-T4, P6-T1 | Review/confirm and balanced-transfer tests | blocked |
| P6-T5 | Preserve multi-currency non-aggregation copy and full values | P2-T7, P6-T2 | Currency/large-value evidence | blocked |
| P6-T6 | Remove remaining account global selector families | P6-T2 through P6-T5 | Zero-consumer and screenshot comparison | blocked |
| P6-T7 | Owner approves Accounts and Transfer states | P6-T6 | Owner decision | blocked |

### Phase 7 — Planning

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P7-T1 | Specify shared PlanningPage, header, period navigation, summary, card and empty state | P6-T7 | Approved planning system spec | blocked |
| P7-T2 | Replace `/insights` planning breadcrumbs with `/dashboard` and `Tổng quan` | P1-T4, P7-T1 | Source and browser assertions | blocked |
| P7-T3 | Migrate Budgets including month history, comparison, progress and actions | P7-T1 | Empty/rich/history/phone evidence | blocked |
| P7-T4 | Migrate Commitments including due/paid/required states and stale safe-to-spend copy review | P7-T1 | State/copy/destructive evidence | blocked |
| P7-T5 | Migrate recurring income templates and validation states | P7-T1 | Empty/populated/error evidence | blocked |
| P7-T6 | Migrate Goals including allocated-money truth and progress states | P7-T1 | Empty/rich/large-VND evidence | blocked |
| P7-T7 | Consolidate shared planning CSS and remove route/global duplicates | P7-T3 through P7-T6 | Zero-consumer and visual comparison | blocked |
| P7-T8 | Verify semantic colors are not the sole status signal | P7-T3 through P7-T6 | Accessibility/state assertions | blocked |
| P7-T9 | Run planning matrix in light/dark, phone/tablet/desktop and 200% text | P7-T7, P7-T8 | Exact-head artifacts | blocked |
| P7-T10 | Owner approves Planning hierarchy and states | P7-T9 | Owner decision | blocked |

### Phase 8 — secondary and safety flows

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P8-T1 | Migrate Reports including custom ranges, full values and export actions | P7-T10 | Range/large-VND/export evidence | blocked |
| P8-T2 | Migrate Categories including identity colors, edit/hide actions and dark mode | P7-T10 | State/theme evidence | blocked |
| P8-T3 | Migrate Inbox/import review including selection, validation and confirmation states | P5-T10 | Review-state browser evidence | blocked |
| P8-T4 | Migrate Rules, Imports and Timeline advanced flows | P8-T3 | Empty/populated/error evidence | blocked |
| P8-T5 | Migrate Settings, export/privacy and destructive account-data surfaces | P6-T7 | Confirm/recovery/accessibility evidence | blocked |
| P8-T6 | Reconcile and close or supersede issue #72 with exact remaining limitations | P8-T1 through P8-T5 | Updated issue evidence | blocked |
| P8-T7 | Remove secondary-flow global selector families | P8-T1 through P8-T5 | Zero-consumer and comparison evidence | blocked |
| P8-T8 | Owner approves secondary/safety flows | P8-T6, P8-T7 | Owner decision | blocked |

### Phase 9 — Landing and Auth cleanup

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P9-T1 | Confirm whether guided-story structure is preserved or moved into a separate redesign packet | P0-T8 | Owner decision | blocked |
| P9-T2 | Reconcile landing Login breakpoint behavior across 320–980 widths | P9-T1 | Accessibility/action hierarchy evidence | blocked |
| P9-T3 | Remove stale landing palette/generation files after zero-import/consumer proof | P9-T1 | Before/after public evidence | blocked |
| P9-T4 | Remove stale auth palette/dark declarations so source matches public light-only behavior | P9-T1 | Login/register/recovery computed-style evidence | blocked |
| P9-T5 | Verify all auth modes, CAPTCHA states, password-manager/paste behavior and recovery copy | P2-T4, P9-T4 | Browser/accessibility evidence | blocked |
| P9-T6 | Preserve truthful product claims, media dimensions and public performance budgets | P9-T3 through P9-T5 | Copy/performance/SEO contracts | blocked |
| P9-T7 | Owner approves public/auth surfaces or opens a separate redesign packet | P9-T6 | Owner decision | blocked |

### Phase 10 — legacy retirement and token interchange decision

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P10-T1 | Re-run current-main ownership/dead-selector inventory after all route migrations | P9-T7 | Zero/live candidate report | blocked |
| P10-T2 | Remove remaining legacy stylesheet families in bounded deletion PRs | P10-T1 | Before/after screenshots and exact-head audits | blocked |
| P10-T3 | Delete `src/app/legacy.css` when no live import is required | P10-T2 | Build/import graph and browser evidence | blocked |
| P10-T4 | Remove MinimumTargetSizeContract after all important controls own size | P2-T9, P10-T2 | Product-wide measured target sweep | blocked |
| P10-T5 | Remove misleading aliases, dead mobile/FAB tokens and compatibility names | P10-T2 | Token reference zero and computed-style comparison | blocked |
| P10-T6 | Decide whether stable tokens should move to a DTCG artifact/generator | P10-T5 | Separate adoption review and owner decision | blocked |
| P10-T7 | Enforce final no-dead-selector/no-important/no-route-global-import invariants | P10-T2 through P10-T5 | Blocking gate tests and current-main pass | blocked |
| P10-T8 | Owner approves final architecture and any token-pipeline decision | P10-T6, P10-T7 | Owner decision | blocked |

### Phase 11 — final evaluation and acceptance

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P11-T1 | Run full static, unit, build, database-as-classified, browser and responsive matrix | P10-T8 | Exact-head CI artifacts | blocked |
| P11-T2 | Run selective visual baselines and review every intentional diff | P10-T8 | Reviewed snapshot report | blocked |
| P11-T3 | Run physical Android acceptance checklist | P11-T1 | Device/browser/version and findings | blocked |
| P11-T4 | Run physical iOS/Safari acceptance checklist | P11-T1 | Device/browser/version and findings | blocked |
| P11-T5 | Verify affected production routes after owner-approved merges/deployments | P11-T1 through P11-T4 | Production evidence with no sensitive data | blocked |
| P11-T6 | Record remaining limitations, accepted exceptions and maintenance ownership | P11-T2 through P11-T5 | Final evaluation section | blocked |
| P11-T7 | Owner accepts program, archives packet and closes superseded UI plans/issues | P11-T6 | Explicit owner acceptance | blocked |

Rules:

- One task produces one reviewable result.
- Parallel tasks must not edit overlapping ownership areas.
- New discoveries update the specification/plan before implementation scope changes.
- Research is complete when it supports a decision, not when every related repository has been read.
- A task advances only when the current execution state's evidence exists.
- `blocked` means owner approval or an earlier phase is required; it does not mean work is in progress.

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | researcher | planner | specified | Full repository UI inventory, issue/PR review and focused external sources | Current-main debt counts and physical-device availability are not yet measured | Produce the parent work packet |
| 2026-08-05 | planner | human_owner | planned | `docs/plans/active/ui-system-migration.md` on a documentation-only branch | Owner decisions in Open questions; no implementation phase is authorized | Review/edit/approve Phase 0 only |

### Current permission boundary

- Granted scope: create and revise this planning packet and its required PR memory on `agent/ui-system-migration-plan`.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` repository documentation only.
- Forbidden writes: product/runtime code, styles, tests, dependencies, provider settings, production data, merges, deployment and changes to existing UI PRs.
- Human approval required before: every implementation phase, any dependency/tool adoption, any visual direction change, closing/superseding existing PRs or issues, merge or deployment.
- Rollback or stop condition: close the documentation PR or revert its documentation commits; stop immediately if requested scope expands beyond planning without explicit approval.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Full parent packet follows repository template and records research, specification, sequencing, tasks, risks and permissions | Documentation diff and policy checks | pending |
| No product/runtime change | PR changed-file list | pending |
| Owner approves Phase 0 scope | PR review/comment or explicit recorded decision | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending per implementation phase.
- Important source limitations remain respected: recorded in Research decision and Adoption review.
- New tool/dependency/pattern passed the adoption review, or not applicable: no adoption is authorized by this planning PR.

### Review findings

- Correctness: pending owner review.
- Security/ownership: documentation-only; no secret, provider or production-data write.
- UI/UX/accessibility: plan covers responsive, state, visual and physical-device evidence; no current UI claim is changed.
- Maintainability/duplication: plan explicitly forbids a new override/management layer and sequences retirement through existing owners.
- Scope compliance: only this packet and required PR memory are allowed in the planning PR.

### Remaining limitations

- Current-main quantitative debt baseline has not yet been measured under this packet.
- The plan does not select a new layout direction.
- Storybook and DTCG token generation remain candidates requiring separate owner approval.
- Physical-device availability is unresolved.

## Delivery record

- Branch: `agent/ui-system-migration-plan`
- PR: pending
- Squash commit: not applicable
- CI run: pending
- Production deployment: not applicable
- Production flow verified: not applicable; documentation-only
- Work packet moved to `docs/plans/completed/`: no
