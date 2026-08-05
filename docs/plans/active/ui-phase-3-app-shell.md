# MoneyFlow UI migration — Phase 3 App Shell and chrome

**Status:** planned
**Execution state:** specified
**Active role:** planner
**Permission scope:** documentation_only
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 2 evidence:** merged PR #299 (`c11c845cfcd5fe3f588f0564211566bac28f7afd`)
**Current PR:** pending
**Last updated:** 2026-08-05

The owner instructed **“Ok sửa đi”** after requesting a standards review of Phase 3. That instruction authorizes correction of the Phase 3 specification and supporting documentation only. It does not authorize runtime code, styling, dependency, provider, deployment, production-data or merge operations.

This packet supersedes the stale Phase 3 task rows in the parent packet. Current status reconciliation is: Phase 0, Phase 1 and Phase 2 are complete and merged; Phase 3 is specified but remains unauthorized for product-code writes until the owner explicitly starts it.

## Outcome

Make the signed-in App Shell the sole owner of desktop and mobile application chrome: canonical signed-in identity, sidebar, topbar, mobile navigation, safe-area reservation, scroll clearance, global shell sheets, normal stacking order and shell-level feedback.

The phase preserves B3.2/Fresh Blue, public light-only behavior, workspace Light/Dark/System behavior, current information architecture, financial semantics and route behavior. It does not redesign routes, introduce a new identity or remove compatibility code without measured zero-consumer evidence.

## Repository reconnaissance

### Current main truth

- `src/components/layout/app-shell.tsx` owns the signed-in shell structure, but it still renders a private `Brand` implementation instead of the canonical shared `BrandLockup`.
- `src/components/brand/brand-lockup.tsx` and `.module.css` contain the current main-branch B3.2 lockup and forced-colors behavior.
- Draft PR #119 is a different logo candidate. It is not selected product truth and must not be reused by this phase.
- `src/components/layout/app-shell.tsx` implements Capture and More with private native `<dialog>` wrappers and implements its own shell toast, even though Phase 2 added shared `Dialog`, `Sheet` and `Toast` contracts.
- `src/components/layout/app-shell.module.css` currently mixes at least four bottom-offset values: shell reserve `76px`, mobile navigation visual minimum `68px`, toast clearance `82px` and route-global repair `104px` in `MobileShellContract`.
- `src/components/mobile-shell-contract.module.css` owns route padding, dialog scroll padding, an Accounts `body:has()` display repair and transaction-dialog dark-theme amount-field repairs.
- Root `src/app/layout.tsx` mounts both `MobileShellContract` and `MinimumTargetSizeContract` and exports a typed Next.js `viewport` object without an explicit edge-to-edge `viewport-fit` decision.
- The App Shell still contains dead `/insights` compatibility branches even though current primary navigation uses `/dashboard`; any `/insights` compatibility belongs to routing, not active shell IA.
- `MinimumTargetSizeContract` remains Phase 2 compatibility debt and is not removed in Phase 3 unless a separately measured shell selector reaches zero consumers.

### Measured ownership conflicts

| Concern | Current owner(s) | Phase 3 target owner |
|---|---|---|
| Signed-in logo/wordmark | App Shell private CSS mark plus signed-in compatibility guardrail | canonical `BrandLockup` rendered by App Shell |
| Mobile nav visual height | App Shell module | App Shell module, one explicit variable |
| Bottom safe-area reserve | App Shell module plus route-global contract | App Shell module |
| Focus scroll clearance | broad dialog/route-global rule | shell scroll owner plus affected local scroll containers |
| Capture/More modal behavior | private App Shell dialog implementations | Phase 2 `Sheet`/`Dialog` primitives |
| Shell feedback | private App Shell toast | Phase 2 Toast/ToastRegion contract |
| Accounts topbar action visibility | `body:has()` structural inference | explicit App Shell action/capability props |
| Transaction amount-field dark repair | `MobileShellContract` | actual transaction-dialog owner or retained bounded compatibility remainder |
| `/insights` active-state inference | App Shell desktop/mobile branches | removed from active shell IA |
| Normal stacking | scattered numeric z-index values | documented App Shell normal-layer map |
| Modal stacking | private dialog plus normal z-index assumptions | browser modal/top-layer behavior through Phase 2 Dialog/Sheet |

### Existing tests and constraints

- Existing CI includes UI migration diff policy, CSS ownership, architecture, lint, TypeScript, complete unit/static tests, production build, browser smoke and Chromium/WebKit audit projects.
- Existing audit projects cover 320, 360 and 390 phone widths, tablets, desktop, dark mode, 200% text and keyboard behavior.
- Automated browser evidence is not physical-device evidence.
- Presentation work must not alter auth, RLS, schema, financial mutation behavior, provider settings, deployment or production data.
- No new root/global stylesheet, broad override layer, visual identity or dependency is permitted in this phase.

### Open questions resolved by this packet

- Canonical signed-in identity: use the B3.2 `BrandLockup` already on `main`, not PR #119.
- Shell modal owner: compose Phase 2 `Sheet`/`Dialog`; do not maintain private duplicate modal behavior.
- Shell feedback owner: compose Phase 2 Toast/ToastRegion.
- `:has()` status: valid platform CSS, but the current Accounts use is retired because it infers product capability from unrelated DOM structure.
- Physical evidence: record it only when executed on an actual device; emulation remains separately labelled.
- Storybook: remains deferred; Phase 3 uses existing source, unit and browser evidence.

## Research

### Decision question

How should MoneyFlow consolidate App Shell ownership while correctly handling viewport metadata, safe areas, fixed mobile chrome, focus visibility, modal behavior and compatibility debt?

### Primary and authoritative sources

| Source | What it establishes | MoneyFlow applicability |
|---|---|---|
| [Next.js `generateViewport` / static viewport object](https://nextjs.org/docs/app/api-reference/functions/generate-viewport) | App Router supports a typed static `viewport` object or dynamic `generateViewport` in Server Components | Keep viewport metadata in the existing root layout boundary and verify the generated meta output using the installed Next.js version |
| [WebKit: Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) | Edge-to-edge layout uses `viewport-fit=cover`; `env(safe-area-inset-*)` protects important content from unsafe screen regions | A full-width fixed mobile nav requires an explicit edge-to-edge decision and portrait/landscape verification; the document-wide impact must include public routes |
| [WCAG 2.2 SC 2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Author-created sticky/fixed content must not completely hide the focused component | Topbar, mobile nav, sheets and toast cannot entirely cover keyboard focus |
| [W3C Technique C43](https://www.w3.org/WAI/WCAG22/Techniques/css/C43.html) | Padding and `scroll-padding` can work together to prevent a fixed footer from obscuring focused controls | Shell reserve and focus scroll clearance are separate responsibilities and must be tested separately |
| [WAI-ARIA APG Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal content is inert outside the dialog, contains Tab navigation, supports Escape, receives initial focus and restores focus appropriately | Capture and More modal sheets must use the Phase 2 modal contract rather than a numeric z-index-only solution |
| [CSS Selectors Level 4 `:has()`](https://drafts.csswg.org/selectors/#relational) | `:has()` is a defined relational pseudo-class | Remove the current selector for ownership reasons, not by falsely claiming the feature is invalid |

### Observed facts

- App Shell and `MobileShellContract` currently disagree about the amount of bottom reservation.
- Mobile navigation is fixed while route padding is applied indirectly to selected global class names.
- Focus scroll clearance is currently coupled to broad `dialog[open]` and route selectors.
- Modal sheets already have a Phase 2 component contract, while App Shell keeps an older parallel implementation.
- The root viewport metadata affects the whole document, including public routes.
- `MobileShellContract` contains both shell debt and transaction-dialog debt, so a shell-only zero-consumer result does not by itself justify deleting the whole file.

### Inference

- Phase 3 must define geometry and ownership before editing CSS values.
- A single replacement number is insufficient; visual height, safe-area reserve, content-end spacing and focus scroll clearance are distinct.
- Modal dialogs must remain outside the normal shell z-index map because modal behavior includes focus containment and inertness, not just visual precedence.
- Compatibility removal must happen by selector group and owner, not by deleting an entire contract component because its name sounds shell-specific.

### Product judgment

- Preserve the current shell structure and IA unless a measured usability problem requires a bounded owner decision.
- Prefer direct composition of Phase 2 primitives over a new shell abstraction framework.
- Adopt edge-to-edge signed-in mobile chrome only with generated viewport evidence and public-route regression checks.
- Do not claim physical iOS/Android readiness from Playwright emulation.

## Specification

### Authority and scope

`src/components/layout/app-shell.tsx` and `app-shell.module.css` become the sole signed-in chrome owners. They may compose Phase 2 primitives and canonical brand components. Route modules continue to own route content spacing beyond the shell reservation.

This phase may change:

- signed-in BrandLockup composition;
- shell geometry and scoped layout variables;
- Capture/More shell composition;
- shell-level action primitives and feedback;
- active shell IA cleanup;
- shell compatibility selectors after measured migration.

This phase may not change:

- route content hierarchy or product capability;
- financial copy, calculations or mutation semantics;
- public visual direction;
- auth/RLS/database/provider/deployment behavior;
- PR #119 logo candidate status;
- `MinimumTargetSizeContract` outside measured shell consumers.

### Canonical brand contract

- App Shell renders the current main-branch `BrandLockup` directly for desktop and mobile.
- The lockup links to `APP_HOME_HREF` and keeps the existing accessible label meaning.
- Responsive wordmark hiding is implemented through a local class or supported BrandLockup API, not by recreating the mark.
- The signed-in icon/CSS pseudo-element compatibility guardrail is removed only after source search, browser evidence and zero live consumer proof.
- Forced-colors behavior remains owned by the canonical brand component.

### Viewport and safe-area contract

Phase 3 must produce and verify an explicit viewport decision before changing shell geometry.

Desired generated document behavior for edge-to-edge signed-in chrome:

- width is device width;
- initial scale remains 1;
- edge-to-edge viewport fitting is enabled through the framework-supported viewport metadata path when supported by the installed Next.js version;
- no hand-authored duplicate viewport meta tag is added beside the Next.js viewport export;
- generated HTML is inspected to confirm the actual viewport content;
- public Landing/Auth/Privacy routes are regression-tested because the root viewport is document-wide.

If the installed Next.js `Viewport` contract does not expose the required field, implementation stops for a documented framework-compatible decision instead of bypassing TypeScript or injecting duplicate metadata.

Safe-area rules:

- all four `env(safe-area-inset-*)` values are treated as environment inputs, not fixed device constants;
- mobile nav padding protects bottom unsafe space;
- left/right unsafe-area behavior is checked in landscape;
- topbar and sheets are checked against top/side unsafe regions where edge-to-edge layout applies;
- `env(..., 0px)` fallback is used where the local compatibility baseline requires it;
- keyboard/visual-viewport changes are tested rather than inferred from static viewport dimensions.

### Geometry contract

Define scoped App Shell layout variables with one owner. Suggested names are illustrative and may be adjusted without changing meaning:

```css
.shell {
  --mf-shell-mobile-nav-height: 68px;
  --mf-shell-safe-bottom: env(safe-area-inset-bottom, 0px);
  --mf-shell-bottom-reserve: calc(
    var(--mf-shell-mobile-nav-height) + var(--mf-shell-safe-bottom)
  );
  --mf-shell-focus-breathing-room: 16px;
  --mf-shell-scroll-bottom: calc(
    var(--mf-shell-bottom-reserve) +
      var(--mf-shell-focus-breathing-room)
  );
}
```

The values above are not pre-approved final measurements. Implementation must measure the rendered nav box and preserve current usable geometry.

Responsibilities:

- **Mobile-nav visual height:** actual fixed navigation box excluding safe-area extension.
- **Shell bottom reserve:** visual nav height plus safe-area inset; owned by App Shell.
- **Focus scroll clearance:** shell reserve plus breathing room; applied through `scroll-padding-bottom` to the actual scroll owner.
- **Route content-end spacing:** route-owned visual breathing room after content; it must not duplicate shell reserve.
- **Toast clearance:** derives from shell reserve when a toast is displayed above mobile navigation; it is not a separately invented magic number.

No route receives extra padding merely because it matches a legacy global class name.

### Focus and scrolling contract

- Keyboard focus must not be entirely obscured by topbar, mobile nav, toast or a non-modal sheet.
- Test forward and reverse tab order.
- Apply `scroll-padding-top` and/or `scroll-padding-bottom` to the actual scrolling element, not indiscriminately to every dialog or route.
- Modal focus is handled by the Phase 2 Dialog/Sheet contract.
- Opening and closing Capture/More restores focus to a logical trigger.
- Reduced-motion mode removes nonessential shell transitions without removing state feedback.

### Normal layer map and modal boundary

App Shell documents a normal stacking order for:

1. route content;
2. sticky sidebar/topbar;
3. fixed mobile navigation;
4. non-modal shell panels when used;
5. shell toast/status feedback.

Requirements:

- use a small documented local scale rather than unrelated arbitrary numbers;
- avoid creating unnecessary stacking contexts on route content;
- do not use `z-index: 9999` or equivalent escape values;
- modal Dialog/Sheet is not assigned a place in this numeric map; it uses the browser modal/top-layer behavior through the Phase 2 contract;
- toast must not cover a focused important action and must not steal focus automatically.

### Phase 2 primitive composition

- Capture and More modal surfaces compose the Phase 2 `Sheet` in modal mode.
- Shell feedback composes Phase 2 Toast/ToastRegion.
- Topbar primary action uses Button or LinkButton according to action versus navigation semantics.
- Mobile account, Capture, More and close controls use IconButton/Button contracts as appropriate.
- Sidebar and mobile destination items remain real links.
- Important shell controls follow the Phase 2 44×44 MoneyFlow product target.
- No navigation element is converted into a button merely for visual consistency.

### Explicit route capability contract

- Remove Accounts action visibility based on `body:has(...)` and positional selectors.
- Reuse or extend explicit `primaryAction`, `fabAction` or a narrowly named App Shell capability prop.
- Route capability is passed by the route/layout owner; App Shell does not inspect route content DOM to infer it.
- Removing `:has()` is an ownership decision, not a compatibility claim about the CSS feature.

### Active IA cleanup

- Remove active-state branches that test whether a primary navigation item points to `/insights`.
- Keep `/insights` only in the separately owned compatibility redirect and explicit historical documentation/allowlists.
- Current shell labels and links use `/dashboard` and `Tổng quan`.
- Source-contract tests prevent reintroduction of active shell `/insights` references.

### Compatibility-contract retirement

`MobileShellContract` is retired by selector group, not by filename.

1. Route bottom-padding rules move to App Shell geometry or route-owned content spacing.
2. Broad `dialog[open]` scroll padding is replaced by the actual shell or dialog scroll owner.
3. Accounts `body:has()` repair moves to explicit App Shell capability props.
4. Transaction-dialog dark amount-field rules must be traced to their live owner.

For the transaction-dialog remainder:

- preferred result: move the declarations value-for-value into the actual transaction-dialog component/module with computed-style and browser evidence;
- permitted fallback: retain a clearly documented compatibility remainder with an explicit Phase 5 removal owner;
- forbidden result: delete the rules solely because shell selectors reached zero consumers.

`MobileShellContract` may be unmounted and deleted only when every contained selector group has an owner or documented retained remainder.

The signed-in logo guardrail may be removed in the same phase after canonical BrandLockup migration and zero-reference evidence.

### Responsive and theme behavior

Required automated evidence includes:

- phone portrait: 320, 360 and 390 CSS px;
- at least one phone landscape case exercising left/right safe areas;
- tablet portrait and landscape;
- desktop 1366 and wide 1440;
- workspace light, dark and system resolution;
- public light-only regression after any viewport metadata change;
- long Vietnamese labels and account names;
- 200% text and equivalent reflow checks where affected;
- forced colors;
- reduced motion;
- keyboard-only forward/reverse focus traversal;
- open/close Capture and More, focus restoration and route navigation.

Physical Android and iOS/Safari evidence is recorded separately when available. A Playwright WebKit/iPhone project must never be labelled physical-device evidence.

### Financial and security constraints

- No financial mutation, calculation or copy meaning changes.
- No guessed balances, dates, safe-to-spend guidance or account state.
- No provider, database, auth, RLS, deployment or production-data operations.
- Synthetic fixtures only in browser evidence.
- Any discovered Class 3 requirement stops the affected work and receives a separate packet.

## Implementation plan

### Slice A — inventory and geometry specification

- map App Shell DOM, landmarks, scroll owners and mount points;
- capture computed heights and current padding at representative widths;
- map every `MobileShellContract` selector to live routes/components;
- identify the signed-in logo guardrail declarations and consumers;
- record generated viewport metadata before any change;
- select affected browser flows and rollback points.

### Slice B — canonical identity and active IA

- replace private App Shell Brand with current main `BrandLockup`;
- preserve desktop/mobile wordmark behavior locally;
- remove dead active-shell `/insights` logic;
- update source contracts;
- remove the logo compatibility guardrail after zero-consumer proof.

### Slice C — viewport and shell geometry

- implement the approved framework-supported viewport metadata output;
- create one scoped geometry contract in App Shell module;
- derive shell reserve, focus scroll clearance and toast offset from it;
- remove route-global shell-padding selectors after affected routes are covered;
- verify portrait, landscape and public-route regressions.

### Slice D — shell primitives and normal layers

- migrate Capture and More to Phase 2 Sheet;
- migrate shell toast to Phase 2 Toast/ToastRegion;
- migrate important shell controls to Phase 2 actions while preserving link semantics;
- document and implement the normal layer map;
- verify modal focus, cancellation and restoration independently of normal z-index.

### Slice E — explicit capabilities and compatibility closure

- replace `body:has()`/positional action repair with explicit props;
- move or retain-with-owner the transaction-dialog amount-field remainder;
- remove `MobileShellContract` only after zero live selector groups;
- run exact-head source, static, build and browser evidence;
- present desktop/mobile shell evidence for owner acceptance.

### Rollback

Each executable slice must be independently revertible. Viewport metadata and geometry changes must remain together so rollback does not leave edge-to-edge layout without safe-area protection. Compatibility deletion occurs only in the final slice after replacement evidence exists.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| P3-T1 | Inventory App Shell DOM, landmarks, scroll owners, current geometry, layer values and every compatibility selector group | merged P2 | source/selector map and measured baseline | blocked — owner has not started P3 implementation |
| P3-T2 | Render canonical main-branch BrandLockup and remove the signed-in logo guardrail after zero-consumer proof | P3-T1 | desktop/phone/forced-colors evidence | blocked |
| P3-T3 | Produce and implement the framework-supported viewport-fit/safe-area decision, including public-route regression coverage | P3-T1 | generated meta, portrait/landscape geometry | blocked |
| P3-T4 | Define one mobile-nav visual height, shell reserve, focus scroll-padding and route content-end spacing contract | P3-T1, P3-T3 | computed geometry at 320/360/390 and landscape | blocked |
| P3-T5 | Migrate Capture/More to Phase 2 Sheet and shell feedback to Phase 2 Toast/ToastRegion | P3-T1, P3-T4 | modal keyboard/focus/cancel/restore evidence | blocked |
| P3-T6 | Document and implement the normal shell layer map while keeping modal dialogs outside numeric z-index ownership | P3-T4, P3-T5 | source contract and overlap/focus tests | blocked |
| P3-T7 | Replace `body:has()` and structural route inference with explicit App Shell action/capability props | P3-T1, P3-T5 | source ownership tests and Accounts evidence | blocked |
| P3-T8 | Migrate important shell controls to Phase 2 primitives while preserving navigation link semantics | P3-T5, P3-T6 | target/focus/theme evidence | blocked |
| P3-T9 | Remove active `/insights` shell branches and retire logo/MobileShell compatibility groups only after owner-by-owner zero-consumer proof | P3-T2 through P3-T8 | deletion list, before/after evidence, retained transaction remainder if needed | blocked |
| P3-T10 | Run exact-head policy, static, complete tests, build, browser smoke and Chromium/WebKit cross-device audit; present owner review evidence | P3-T9 | final CI/artifacts and explicit owner decision | blocked |

## Evaluation

### Required exact-head gates for executable P3 work

- UI migration diff policy and project knowledge;
- CSS ownership and architecture boundaries;
- lint and TypeScript;
- complete unit/static test suite;
- production build;
- browser smoke;
- Chromium/WebKit cross-device audit with affected phone/tablet/desktop, dark, text-200 and keyboard projects;
- CodeQL and all-ref secret history scan;
- affected generated viewport/meta assertion;
- source contracts for BrandLockup ownership, no active-shell `/insights`, no `body:has()` route inference and no private shell Sheet/Toast implementation.

Database/provider/production-data gates are not applicable unless scope changes.

### Acceptance criteria

- App Shell directly renders canonical B3.2 BrandLockup.
- One owner defines mobile navigation visual height and safe-area reserve.
- Shell reserve, route content-end spacing and focus scroll clearance are not conflated.
- Fixed top/bottom chrome does not entirely obscure keyboard focus.
- Capture and More use Phase 2 modal contracts and restore focus correctly.
- Modal behavior is not implemented through z-index alone.
- Shell toast uses the shared feedback contract and derives its mobile offset from shell geometry.
- Current navigation uses `/dashboard`; shell source contains no active `/insights` compatibility branch.
- Accounts action visibility is explicit and contains no DOM-structural `body:has()` inference.
- `MobileShellContract` is removed only when every selector group is migrated or a non-shell remainder is explicitly retained and owned.
- Public light-only and workspace Light/Dark/System behavior remain deterministic.
- No route redesign, financial-domain change, provider operation or production-data access occurs.
- Physical-device claims are made only from actual physical-device evidence.

### Stop conditions

Stop and return to planning if:

- installed Next.js cannot produce the required viewport output through a supported typed path;
- edge-to-edge metadata causes unresolved public-route regression;
- transaction-dialog compatibility cannot be moved without changing transaction behavior;
- a route requires product hierarchy or capability redesign rather than shell ownership migration;
- any auth, RLS, database, provider, deployment or financial mutation change is required.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | researcher | reviewing | “check p3 từ tài liệu gg trước khi làm” | compare parent P3 against official sources and current main |
| 2026-08-05 | researcher | planner | specified | official Next.js, WebKit, W3C/WAI and CSSWG review plus current-main source inspection | correct P3 packet only |
| 2026-08-05 | human_owner | planner | planned | “Ok sửa đi” | publish documentation-only correction for review; no runtime write |

### Current permission boundary

- Authorized: create/revise this P3 packet, supporting documentation and a draft documentation PR.
- Not authorized: P3 runtime code, CSS, tests, dependency changes, provider operations, deployment, production data or merge.
- Phase 3 product-code work begins only after a separate explicit owner instruction.
- Phase 4 remains unauthorized.

## Delivery record

- Branch: `agent/ui-phase-3-spec-hardening`
- PR: pending
- Base: current `main` after merged PR #299
- Runtime changes: none
- Dependency/provider/production changes: none
- Parent status reconciliation: P0/P1/P2 complete; P3 specified but implementation blocked pending owner start
