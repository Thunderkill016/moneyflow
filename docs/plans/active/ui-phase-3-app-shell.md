# MoneyFlow UI migration — Phase 3 App Shell and chrome

**Status:** completed
**Execution state:** completed
**Active role:** human_owner
**Permission scope:** owner_authorized_closure_and_merge
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 2 evidence:** merged PR #299 (`c11c845cfcd5fe3f588f0564211566bac28f7afd`)
**Current PR:** #300
**Last updated:** 2026-08-05

The owner instructed **“Triển khai P3”** and then **“hoàn thành p3 đi”** on 2026-08-05. The final instruction authorizes Phase 3 closure and squash merge after closure-record exact-head checks pass. It does not authorize Phase 4, deployment, provider/database/auth/RLS operations, production-data access or a new visual direction.

This packet supersedes the stale Phase 3 rows in the parent packet. Phase 0, Phase 1 and Phase 2 are already complete and merged. After PR #300 merges, Phase 3 is complete and Phase 4 remains blocked pending a new explicit owner instruction.

## Outcome

Make the signed-in App Shell the sole owner of canonical identity, sidebar, topbar, mobile navigation, safe-area reservation, focus scroll clearance, global shell overlays, normal stacking and shell feedback while preserving B3.2/Fresh Blue, public light-only behavior, workspace Light/Dark/System, current IA and all financial semantics.

Phase 3 is delivered by PR #300 without route redesign, dependency adoption, financial mutation changes or external-system writes.

## Completed result

### Canonical identity and IA

- App Shell directly renders the canonical main-branch `BrandLockup` on desktop and mobile.
- Draft logo candidate PR #119 remains excluded.
- The signed-in pseudo-element logo guardrail is removed.
- Active App Shell `/insights` and `isPlanningPath` compatibility branches are removed.
- Current signed-in IA remains `/dashboard` and `Tổng quan`.

### Viewport, safe area and fixed chrome

- Root typed `Viewport` uses `viewportFit: "cover"`; no duplicate handwritten viewport meta is introduced.
- App Shell owns one measured mobile navigation visual height: `74px`.
- `--mf-shell-mobile-nav-reserve` derives from the visual height plus `safe-area-inset-bottom`.
- Shell reserve, route content-end spacing, focus clearance and toast clearance remain separate responsibilities.
- Root `scroll-padding` is active only while App Shell is mounted; focused shell controls use corresponding scroll margins.
- Safe-area top/right/bottom/left values use environment insets with zero fallbacks where applicable.
- The previous split 68/76/82/104px geometry and route-global repairs are retired.

### Shared primitives and modal behavior

- Capture and More no longer own private `<dialog>` implementations.
- Capture uses Phase 2 `Sheet` with centered tablet/desktop placement and preserved mobile bottom-sheet behavior where reachable.
- More uses Phase 2 right/bottom Sheet behavior.
- Escape, focus containment and focus restoration remain owned by shared Dialog/Sheet behavior.
- Modal behavior stays in the browser top layer and is not modeled as an arbitrary shell z-index.
- Shell feedback composes `ToastRegion` and uses explicit urgency without stealing focus.
- Important actions compose Button, LinkButton and IconButton; destination navigation remains semantic links.

### Explicit capability and compatibility cleanup

- Accounts passes `showPrimaryActionOnMobile` explicitly so the mobile “Thêm tài khoản” action is preserved without route-DOM inference.
- App Shell contains no structural `body:has()` capability rule.
- Route-global bottom padding and broad `dialog[open]` repairs are removed from `MobileShellContract`.
- `MobileShellContract` remains mounted only for transaction-dialog dark amount-field compatibility.
- That transaction-dialog remainder is explicitly owned for removal by Phase 5.
- `MinimumTargetSizeContract` remains wider migration debt and is not a Phase 3 deletion target.

## Research basis and decisions

| Source | Decision supported |
|---|---|
| [Next.js viewport API](https://nextjs.org/docs/app/api-reference/functions/generate-viewport) | use the typed root viewport export and verify generated output |
| [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) | pair edge-to-edge viewport fitting with safe-area environment insets |
| [WCAG Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | fixed shell chrome must not fully hide focused controls |
| [W3C Technique C43](https://www.w3.org/WAI/WCAG22/Techniques/css/C43.html) | shell reserve and focus `scroll-padding` are separate responsibilities |
| [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | focus, Escape and restoration belong to modal primitives rather than numeric z-index |
| [Selectors Level 4 `:has()`](https://drafts.csswg.org/selectors/#relational) | remove the Accounts rule for incorrect ownership, not because the selector is invalid |

Observed: App Shell duplicated Phase 2 owners; mobile geometry had conflicting numeric reserves; root viewport affected both signed-in and public documents; `MobileShellContract` mixed shell and transaction responsibilities.

Inference: visual height, safe-area reserve, route spacing, focus clearance and feedback offset need distinct contracts; modal behavior belongs outside the normal layer map; compatibility deletion must occur by selector group.

Product judgment: preserve current shell and IA, use main B3.2, add no dependency and never label Playwright emulation as physical-device evidence.

## Ownership matrix

| Concern | Phase 3 owner/result |
|---|---|
| Signed-in identity | canonical `BrandLockup` in App Shell |
| Mobile nav height/reserve | `app-shell.module.css` variables |
| Focus clearance | document root while App Shell is mounted plus focused-element scroll margins |
| Capture | centered shared Sheet on tablet/desktop; shared modal behavior |
| More | shared right/bottom Sheet |
| Shell feedback | shared `ToastRegion`, positioned by App Shell |
| Accounts mobile action | explicit capability prop |
| Transaction dark repair | retained Phase 5 compatibility remainder |
| Active `/insights` inference | removed |
| Normal layers | local shell scale; modal remains top-layer behavior |

## Scope and invariants

Allowed and completed:

- shell identity and active IA cleanup;
- typed viewport and safe-area geometry;
- shared Sheet/Toast composition;
- important shell action primitive adoption;
- explicit route capability ownership;
- measured shell compatibility retirement;
- source and browser contracts.

Preserved:

- B3.2/Fresh Blue;
- public light-only behavior;
- workspace Light/Dark/System;
- integer VND, transfer, split and all financial-domain semantics;
- existing route destinations and mutation behavior;
- no production/provider/database/auth/RLS write.

Still forbidden without a new packet or instruction:

- Phase 4 implementation;
- Dashboard redesign;
- new identity or PR #119 adoption;
- dependency/Storybook adoption;
- provider/database/auth/RLS/deployment/production-data operations;
- physical-device readiness claims based only on emulation.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P3-T1 | Inventory shell DOM, scroll owners, geometry, layers and selector groups | packet/source map | completed |
| P3-T2 | Render canonical BrandLockup and remove logo bridge | source contracts and browser audit | completed |
| P3-T3 | Establish typed viewport-fit and safe-area decision | generated meta/source/browser evidence | completed |
| P3-T4 | Define one measured nav height/reserve and separate focus/route spacing | 74px geometry contract and cross-device audit | completed |
| P3-T5 | Migrate Capture/More to Sheet and feedback to ToastRegion | modal, Escape, focus-return and browser evidence | completed |
| P3-T6 | Define normal shell layer map with modal outside numeric z-index | source and overlap assertions | completed |
| P3-T7 | Replace route inference with explicit Accounts capability | source and phone browser evidence | completed |
| P3-T8 | Migrate important shell controls to Phase 2 primitives while retaining links | target/focus/theme evidence | completed |
| P3-T9 | Remove active `/insights` and shell compatibility groups; retain Phase 5 remainder | source contracts and zero-owner evidence | completed |
| P3-T10 | Run exact-head policy/static/tests/build/browser/cross-device/security evidence | CI #1706 and security run #828 | completed |

## Evaluation and evidence

Exact runtime head: `0c61edc40f05bad25f3ea85e3290eb2b8df425cd`.

Passed on CI #1706:

- project knowledge and UI migration policy;
- CSS ownership and architecture boundaries;
- lint and TypeScript;
- 716 unit/static tests;
- production build;
- browser smoke;
- Chromium/WebKit cross-device UI audit;
- generated viewport metadata, public-route regression and affected shell geometry;
- Capture/More placement, Escape, focus containment/restoration;
- Accounts phone primary action and mobile-nav/feedback clearance.

Security evidence:

- CodeQL #828: passed;
- secret-history scan #828: passed.

Artifacts:

- browser smoke `8937883473`, digest `sha256:7eff6bca133ef0089e9e208bfae09c74d25f73cdce8be4069d36092514f0db3e`;
- UI audit `8938133878`, digest `sha256:b583087ffa69fb46742902795978ac6558138912c44cda6dab33573cd85f8a22`.

The audit covers representative Chromium/WebKit phone, landscape, tablet and desktop configurations, theme/text/keyboard states selected by the repository matrix. It does not claim physical Android or iOS/Safari acceptance; that remains Phase 11.

## Handoff record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | researcher | reviewing | “check p3 từ tài liệu gg trước khi làm” | compare official sources and current main |
| 2026-08-05 | researcher | planner | specified | corrected P3 packet | documentation only |
| 2026-08-05 | human_owner | implementer | implementing | “Triển khai P3” | implement and verify PR #300 |
| 2026-08-05 | implementer | evaluator | evaluating | exact runtime candidate | run protected full matrix |
| 2026-08-05 | human_owner | evaluator | closing | “hoàn thành p3 đi” | record closure, pass final head checks and merge |
| 2026-08-05 | evaluator | human_owner | completed | CI #1706, CodeQL #828, Secret #828 and browser artifacts | merge PR #300; Phase 4 stays unauthorized |

### Current permission boundary

- Authorized: close records and squash-merge PR #300 when the closure-record exact head is green.
- Forbidden: Phase 4, deployment, new identity, dependency adoption, provider/database/auth/RLS changes and production-data access.
- Stop condition: any runtime regression or external-system/domain change discovered during closure.

## Delivery record

- Branch: `agent/ui-phase-3-spec-hardening`
- PR: #300
- Starting main: `c11c845cfcd5fe3f588f0564211566bac28f7afd`
- Protected green runtime candidate: `0c61edc40f05bad25f3ea85e3290eb2b8df425cd`
- Runtime scope: signed-in App Shell/chrome ownership only
- Financial-domain behavior change: none
- Provider/production operation: none
- Remaining compatibility: transaction-dialog dark amount-field remainder owned by Phase 5; `MinimumTargetSizeContract` remains wider debt
- Phase 4 authorization: not granted
