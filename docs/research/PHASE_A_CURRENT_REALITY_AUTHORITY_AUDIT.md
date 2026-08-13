# Phase A — Current Reality / Authority Audit

**Status:** accepted/completed reconnaissance record — no product, brand or UI decision
**Audited baseline:** `main@157ba76795c4ddc1add726e6fb6d4dd82c881c04` (`#364` merged)
**Method:** executable code, tests and configuration first; prose is classified below
**Scope:** what MoneyFlow runs today and what a later research agent may safely assume

## 1. Executive current-state map

MoneyFlow is a Next.js personal-finance application with an explicit two-mode runtime:
`demo` is local/demo-backed; `authenticated` requires configured Supabase and a signed-in
viewer. The signed-in product owns capture, dashboard, transactions, accounts, planning,
advanced operational surfaces and a mobile “More” sheet. The public landing/auth routes
are distinct from those product surfaces.

| Current fact | Executable evidence | Authority owner | Confidence / limitation |
|---|---|---|---|
| Runtime mode is explicit, not inferred from route or data presence. | `src/lib/supabase/config.ts`; `src/server/auth.ts` | runtime configuration + server auth adapter | High. Live deployment configuration is not audited here. |
| Signed-in shell owns desktop navigation, mobile navigation, capture and More sheet. | `src/components/layout/app-shell.tsx`; `src/components/layout/app-shell.module.css`; `src/lib/nav-ia.ts` | AppShell + navigation IA | High for source ownership; no new visual judgment is made. |
| Public landing/auth and authenticated product are separate entry states. | `src/app/page.tsx`; `src/app/(auth)/**`; protected route pages calling `requireViewer()` | route/server boundaries | High. Public content availability still depends on configured mode. |
| Semantic design values become runtime presentation through document theme, Tailwind mapping and component/module CSS. | `src/app/layout.tsx`; `src/app/document-theme.css`; `src/app/globals.css`; CSS ownership checks | root stylesheet/import contract | High for source chain; a production bundle was not run in this docs-only phase. |
| The current program is still not public-beta accepted. | `docs/plans/active/public-beta-trust.md` PBT-AC15 | active Trust parent | High for program authority. |

This is an authority map, not a recommendation to retain or redesign any surface.

## 2. Product surface and route map

| Surface / core job | Route family and current owner | Runtime mode | Evidence / limitation |
|---|---|---|---|
| Public orientation, legal and sign-in | `/`, `/landing`, `/privacy`, `(auth)` entry routes and `account-deletion-result`; `src/app/page.tsx` | public/support state | Landing is public only when configured; auth/legal/result surfaces are not authenticated product capability. |
| Auth callback, share and export endpoints | `/auth/callback`, `/api/share-target` and `/reports/export` route handlers | callback/service boundary | These are endpoint/control-flow surfaces, not page/navigation destinations. |
| Start-page financial overview | dashboard route and dashboard feature components | authenticated or demo viewer | `requireViewer()` protects authenticated pages; demo substitutes its viewer/store path. |
| Record a transaction quickly | capture action in `AppShell`; transaction/capture features | authenticated or demo viewer | Navigation action is shell-owned, while domain handling remains feature-owned. |
| Review and manage transactions | transactions route/features | authenticated or demo viewer | Route ownership is distinct from mobile navigation visibility. |
| Manage accounts | accounts route/features; account actions in More sheet | authenticated or demo viewer | PP-12 coverage proves the final More action can be reached at tested mobile sizes, not every device/browser combination. |
| First-use onboarding | `/onboarding`; `OnboardingFlow` | distinct optional-viewer path | It calls `getViewer()`, not `requireViewer()`: it renders safe initial/demo state when no viewer resolves, then enriches from account workspace only when one exists. |
| Plan spending and commitments | budgets, commitments, income templates and goals routes/features | authenticated or demo viewer | These are planning IA entries in `src/lib/nav-ia.ts`. |
| Operate advanced financial workflows | Inbox, timeline, rules and imports | authenticated or demo viewer | Advanced IA is separately grouped; it is not proof that every feature is public-facing. |
| Settings, categories and reports | More-sheet navigation targets | authenticated or demo viewer | The mobile “More” sheet is an access mechanism, not a second product runtime. |

The canonical current navigation grouping is `src/lib/nav-ia.ts`: primary dashboard,
transactions, capture and accounts; More reports/categories/settings; advanced Inbox,
timeline/rules/imports; planning budgets/commitments/income templates/goals. Route files
and `requireViewer()` calls, rather than this prose table, remain the decisive source.

## 3. Runtime-mode matrix

| Concern | Demo | Authenticated | Safe interpretation |
|---|---|---|---|
| Configuration | `NEXT_PUBLIC_APP_MODE=demo`; Supabase client is absent | configured Supabase URL/publishable key required | A route is not authenticated merely because demo can render it. |
| Viewer | server adapter supplies demo viewer | server adapter reads Supabase claims/profile | Do not generalize demo identities/data to a production user. |
| Product data | demo stores/adapters | Supabase-backed adapters | `e2e/auth/inbox-ownership.mobile.auth.spec.ts` guards against demo data leaking into an authenticated export. |
| Access control | useful local product simulation | `requireViewer()` redirects unauthenticated users | Mode controls backing/auth, while route protection is explicit server code. |
| Browser evidence | may exercise representative UI | authenticated specs exercise configured account flow | Existing e2e evidence is bounded test evidence, not production telemetry. |

## 4. Information architecture and shell ownership

`AppShell` is the sole signed-in shell owner: desktop sidebar/top bar, mobile bottom
navigation, capture affordance and the More sheet live in
`src/components/layout/app-shell.tsx` and its module stylesheet. `src/lib/nav-ia.ts`
owns the declared navigation groups. Route pages own their feature composition; feature
components own domain interaction; the shell does not become the data/domain owner.

The relevant mobile boundary is deliberately shared: AppShell supplies the More-sheet
consumer and bottom navigation, while the shared `Sheet`/`Dialog` primitive owns modal
semantics and constrained viewport geometry. A route must not add a second competing
scroll owner to compensate for the shell.

## 5. Presentation ownership chain

```text
document theme (--mf-* semantic values)
  -> globals @theme aliases (--color-* mappings)
  -> Tailwind utilities, primitive styles and CSS modules
  -> AppShell / feature components / route composition
  -> browser-rendered presentation
```

| Layer | Current executable owner | Evidence | Limitation |
|---|---|---|---|
| Document and preference state | `src/app/layout.tsx`, `document-theme.css` | root import order, light/dark/focus/reduced-motion values, `viewportFit` and `interactiveWidget` metadata | No new palette/type decision is implied. |
| Token-to-utility mapping | `src/app/globals.css` | `@theme inline` maps semantic `--mf-*` values to Tailwind-facing aliases | A token declaration alone does not prove a route uses it. |
| Compatibility import boundary | `src/app/legacy.css` | imports `globals.css`; `check-css-ownership.mjs` asserts exact root/import ownership | “legacy” is a live import boundary, not automatically dead CSS. |
| Component presentation | primitive styles and feature/layout CSS modules | import graph and CSS ownership/reachability scripts | Production compiled-bundle ownership is a separate `check:code-css-ownership` evidence layer and was intentionally not run. |

`scripts/check-css-ownership.mjs` and `scripts/check-dead-css-reachable.mjs` are the
current source-level guards. They establish ownership/reachability contracts; they do
not replace browser observation or prove a creative design outcome.

## 6. Live legacy and debt map

| Item | Current status | Evidence / owner | Later treatment |
|---|---|---|---|
| `legacy.css` root import | live compatibility boundary | `src/app/layout.tsx`; `legacy.css` imports `globals.css` | Retain until a source/compiled reachability audit proves a replacement path. |
| `CSS_OWNERSHIP.md` | mixed current/historical contract | its two-root, document/theme, component/route-owner and legacy-boundary principles match runtime; its Calm Ledger, seven-file and debt-budget detail conflicts with the current checker | Retain the compatible principles; treat stale detail as historical; this audit does not rewrite CSS. |
| Existing modules/utilities | live only where current import/reachability evidence supports them | CSS checks and source import graph | Do not delete based on a “legacy” filename. |
| Old design directions and research | historical/input as classified below | design-system status and A0 review | Do not promote literal old values into a rebuild. |

The material contradiction is narrow: `docs/design/CSS_OWNERSHIP.md` still correctly
states the two-root/layer/owner boundary, but describes Calm Ledger, a seven-file legacy
list and an older debt budget. The executable guard now asserts the current two-root
import contract and a `globals.css`-only legacy allowlist. Code/checks win for the
conflicting detail; the compatible prose remains live guidance/provenance.

## 7. Responsive, overlay, accessibility and financial-semantics boundaries

| Boundary | Current fact | Executable evidence | Confidence / limitation |
|---|---|---|---|
| Responsive ownership | AppShell owns desktop/mobile navigation handoff; component/module CSS controls its layout. | `app-shell.tsx`, `app-shell.module.css`, navigation IA | High for responsibility; no broad responsive visual audit was run. |
| Mobile bottom inset | AppShell sheet and mobile navigation cooperate with safe-area CSS. | shell stylesheet and `viewportFit: cover` metadata | Tested behaviors are constrained to existing e2e sizes/devices. |
| Overlay geometry | shared Dialog/Sheet has one coherent constrained-viewport scroll regime; consumer sweep forbids local competing owners. | `src/lib/p3-remediation.test.ts`; `e2e/auth/more-sheet.mobile.auth.spec.ts` | PP-12 is historical owner-phone acceptance plus automated guard, not an excuse to assume all overlays are identical. |
| Keyboard/focus/modal semantics | primitive contract covers modal semantics/focus and a representative shared-dialog short viewport/keyboard path. | `src/lib/ui-primitives-contract.test.ts`; More-sheet mobile e2e | Existing cases are representative, not exhaustive assistive-technology certification. |
| Controls/fields/toasts | button target, label/error and toast semantics have primitive tests. | `src/lib/ui-primitives-contract.test.ts` | Semantic tests do not establish visual hierarchy quality. |
| Financial correctness | P3 remediation tests keep idempotency, money parsing and related financial behavior guarded. | `src/lib/p3-remediation.test.ts` | This phase does not re-verify provider/database production state. |

## 8. Design Harness V2 and browser/e2e evidence boundary

`docs/engineering/DESIGN_HARNESS.md` is the current Design Harness V2 authority. It
is code-first and generator/evaluator-independent, requires phone/desktop evidence and
meaningful interaction, sets pass/refine/pivot thresholds, and keeps screenshots local
by default. It is an input/evidence-process authority, not a visual design direction
and not evidence that a specific screen now meets a new design standard. A0 explicitly
records limitations to carry into a later V2.1 decision; Phase A does not implement it.

Browser/e2e specifications provide behavior evidence at named viewports and modes. The
existing mobile More-sheet suite includes 390x844 and short 390x568 scenarios and
asserts reachability/actionability of “Đăng xuất”; it is stronger than a DOM-presence
claim, but does not substitute for a fresh device matrix or a live-production audit.

## 9. Authority hierarchy and conflicts

| Classification | Documents / owners | Permitted use |
|---|---|---|
| **CURRENT AUTHORITY** | `AGENTS.md`; README/context route; active registry and `public-beta-trust.md`; `CURRENT_PROJECT_MEMORY.md`; code/tests/config; `PRODUCT_PRINCIPLES.md`; architecture docs; `CURRENT_DESIGN_SYSTEM.md`, `DESIGN_DIRECTION_STATUS.md`, `MONEYFLOW_LOGO.md`, `BRAND_COLOR_SYSTEM.md`, `UI_UX_RESEARCH_LEDGER.md`, `PUBLIC_EXPERIENCE_FOUNDATION.md`, and Webflow synthesis/convergence for their explicitly scoped authority | Current facts are resolved code/tests/config first, then the named live program/decision owner. Current process/evidence authority does not preselect a future design answer. |
| **INPUT ONLY** | A0 historical failure review; Design Harness V2; retained provenance inventories, old PR evidence and concept explorations; the mixed `MONEYFLOW_BRAND_GUIDELINES.md`, `UX_PRINCIPLES.md`, `design-system.md` and `CALM_LEDGER_V2.md` literal visual values | Extract bounded evidence/guardrails and the mixed documents’ constrained principles; do not treat any retired visual values as a selected new product/design answer. |
| **HISTORICAL ONLY** | completed/archived packets, older PR evidence and released-MVP record | Provenance and regression context only. |
| **SUPERSEDED** | rejected Signal Ledger direction, withdrawn seven-day proof target, old active P3/reset routes, and any instruction contradicted by current registry/memory | Do not route new work through it. |
| **LIVE LEGACY** | current `legacy.css` compatibility import and actually reachable presentation code | Retain as runtime reality until proven otherwise. |

Where prose conflicts with executable source/test/config, executable evidence wins. Where
two current prose documents conflict, active registry/Trust and current-memory status
route win for program state; explicit design authority wins only inside its stated
design scope. `docs/MVP_DEFINITION.md` is released-reference/provenance, not a second
current product authority.

### Current scoped design decisions, not Phase B selections

`CURRENT_DESIGN_SYSTEM.md` is current authority only within its stated scope. A later
agent may safely preserve the current semantic constraints below while treating any
new product expression, layout or redesign decision as unanswered.

| Current scoped decision | Owner / executable anchor | Limitation for Phase B |
|---|---|---|
| Fresh Blue action family; white-first neutral surfaces; semantic green/red/amber/violet roles; color is not the only financial carrier | `DESIGN_DIRECTION_STATUS.md`; `document-theme.css`; `BRAND_COLOR_SYSTEM.md` | Color architecture is current; it does not select a layout, editorial style, card treatment or narrative. |
| Public routes are light-only; signed-in workspace supports Light, Dark and System | route theme boundary and `document-theme.css` | Preserve the mode boundary unless a later approved decision/evidence changes it. |
| `/dashboard` is canonical; `/insights` is compatibility redirect only | `src/lib/nav-ia.ts`, routes and current contract tests | Do not revive `/insights` as current IA from historical prose. |
| Important financial/navigation controls have a 44 CSS-pixel product floor; representative widths are 320, 360, 390, 768, 1024, 1366 and 1440 | target-size/mobile-layout contracts and Playwright audit configuration | This is a current usability constraint, not a substitute for future viewport/browser evidence. |
| Mixed historical design documents retain calm hierarchy, progressive disclosure, full money, restrained motion and accessibility principles; retired identity, logo geometry, route/IA and literal-value rules do not override current code | `CURRENT_DESIGN_SYSTEM.md` mixed classification | Reuse the constrained principles only after checking the current design authority and code owner. |

## 10. What a rebuild may reuse, and what it must later replace

| Category | Evidence-backed status | Phase B posture |
|---|---|---|
| Reuse as constraints | runtime mode boundary, route protection, financial semantics, navigation IA ownership, primitive accessibility/modal contracts, responsive/safe-area behavior, CSS ownership checks | Preserve/verify before proposing a change. |
| Reuse as evidence mechanism | browser/e2e suites, primitive and P3 contract tests, Design Harness V2 process | Extend only after Phase B defines the research/design question. |
| Replace later only with an approved decision | visual hierarchy, brand story, palette/type/token system, information architecture or route layout, legacy presentation layers | No replacement is selected by Phase A. |
| Retire later only with proof | legacy CSS/modules or historical documentation claims | Require actual import/compiled/runtime evidence; no filename-driven cleanup. |

## 11. A0 guardrails for future phases

The completed A0 review remains a retrospective guardrail, not a design brief. Future
phases must keep: source-to-compiled-to-cascade-to-runtime ownership tracing; first
paint and representative viewport evidence; one scroll owner for constrained
dialog/sheet geometry (and a popover only when it shares that mechanism); preserved
interaction/keyboard/focus semantics; and distinction between behavior proof and
visual/product judgment. PP-03, PP-07 and PP-16 remain closed or parked as recorded;
only PP-12 supplies the overlay-geometry guard and none is reopened here.

## 12. Explicit Phase B assumptions and open uncertainties

### Assumptions Phase B may safely make

- The executable map above is the current starting constraint at
  `main@157ba76795c4ddc1add726e6fb6d4dd82c881c04`.
- Demo and authenticated claims must remain separated; authenticated browser evidence
  must not be silently replaced with demo observation.
- AppShell/navigation IA, shared primitives and existing financial/accessibility guards
  have named owners and must be evaluated before a proposed redesign changes them.
- Current design documents are scoped authorities/inputs, not pre-approved Phase B
  outcomes. Phase B may research; it may not assume a palette, visual direction or
  redesign is already selected.
- PBT-AC15 remains open. No public-beta-ready claim follows from this audit.

### Open uncertainties

- Which product/user problems deserve priority, competitive/product research, and a
  brand direction are intentionally unanswered; they belong to Phase B.
- The production deployment configuration, real customer data, live provider health
  and post-baseline behavior need their own current evidence.
- A fresh full browser/build/compiled-CSS/assistive-technology matrix has not run in
  this docs-only phase. Existing test records have the limits stated above.
- The safe replacement sequence for live legacy presentation code requires a later
  dependency and runtime evidence decision.

## 13. Reading route for a new agent

Start with `README.md`, `docs/context/README.md`, the active registry, Trust parent and
`CURRENT_PROJECT_MEMORY.md`; then consult this audit for the code-first surface/owner
map. Open `src/lib/nav-ia.ts`, `AppShell`, runtime config/auth adapter and the named
tests before treating any surface as changed. Read A0 only for guardrails. Start Phase B
only when deliberately opened under a new packet; it is not started by this record.
