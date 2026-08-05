# MoneyFlow UI migration — Phase 3 App Shell and chrome

**Status:** active
**Execution state:** in_progress
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 2 evidence:** merged PR #299 (`c11c845cfcd5fe3f588f0564211566bac28f7afd`)
**Current PR:** #300
**Last updated:** 2026-08-05

The owner instructed **“Triển khai P3”** on 2026-08-05. This authorizes Phase 3 runtime, CSS and test writes on `agent/ui-phase-3-spec-hardening`. It does not authorize merge, deployment, provider/database/auth/RLS/production-data operations or Phase 4.

This packet supersedes the stale Phase 3 rows in the parent packet. Phase 0, Phase 1 and Phase 2 are complete and merged. Phase 3 is the only active UI-system implementation boundary.

## Outcome

Make the signed-in App Shell the sole owner of canonical identity, sidebar, topbar, mobile navigation, safe-area reservation, focus scroll clearance, global shell sheets, normal stacking and shell feedback while preserving B3.2/Fresh Blue, public light-only behavior, workspace Light/Dark/System, IA and financial semantics.

## Repository reconnaissance

### Starting truth

- App Shell duplicated Brand, native dialog sheets and toast behavior despite approved shared owners.
- Mobile bottom geometry was split across 68px navigation, 76px shell reserve, 82px toast offset and 104px route repair.
- `MobileShellContract` mixed route padding, broad dialog repair, Accounts `body:has()` and transaction-dialog dark styles.
- Root viewport had no explicit edge-to-edge decision.
- App Shell retained dead `/insights` active-state branches.
- `MinimumTargetSizeContract` remains wider migration debt and is not a Phase 3 deletion target.

### Implemented candidate on PR #300

- App Shell directly renders canonical main-branch `BrandLockup`; draft logo PR #119 is excluded.
- Capture and More compose Phase 2 `Sheet`; shell feedback composes `ToastRegion`.
- Important shell actions compose Button, LinkButton and IconButton while destinations remain real links.
- Root typed viewport uses `viewportFit: "cover"`.
- App Shell owns one nav height, safe-area reserve, focus clearances, feedback offset and normal layer map.
- Accounts passes `showPrimaryActionOnMobile` explicitly; `body:has()` is removed.
- Active `/insights` branches and the signed-in logo guardrail are removed.
- `MobileShellContract` now contains only the transaction-dialog dark amount-field remainder, owned for removal by Phase 5.
- Source-contract tests lock the new ownership boundaries.

### Ownership matrix

| Concern | Phase 3 owner/result |
|---|---|
| Signed-in identity | canonical `BrandLockup` in App Shell |
| Mobile nav height/reserve | `app-shell.module.css` variables |
| Focus clearance | document root while App Shell is mounted plus focused-element scroll margins |
| Capture/More | Phase 2 modal `Sheet` |
| Shell feedback | Phase 2 `ToastRegion`, positioned by App Shell |
| Accounts mobile action | explicit capability prop |
| Transaction dark repair | retained Phase 5 compatibility remainder |
| Active `/insights` inference | removed |
| Normal layers | local shell scale; modal remains browser top-layer behavior |

## Research

### Decision question

How should MoneyFlow consolidate App Shell ownership while correctly handling viewport metadata, safe areas, fixed chrome, focus visibility, modal behavior and compatibility debt?

### Primary and authoritative sources

| Source | Decision supported |
|---|---|
| [Next.js viewport API](https://nextjs.org/docs/app/api-reference/functions/generate-viewport) | use the typed root viewport export; no duplicate meta tag |
| [WebKit safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) | pair edge-to-edge viewport fitting with safe-area environment insets |
| [WCAG Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | fixed shell chrome cannot completely hide focus |
| [W3C Technique C43](https://www.w3.org/WAI/WCAG22/Techniques/css/C43.html) | shell reserve and focus `scroll-padding` are separate responsibilities |
| [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | modal focus/Escape/restoration belongs to Sheet/Dialog, not numeric z-index |
| [Selectors Level 4 `:has()`](https://drafts.csswg.org/selectors/#relational) | remove the Accounts rule for wrong ownership, not invalid syntax |

### Research decision

Observed: fixed nav and route-global padding were inconsistent owners; App Shell duplicated Phase 2 primitives; root viewport affects public routes; compatibility debt mixed shell and transaction rules.

Inference: visual height, safe-area reserve, route spacing, focus clearance and toast clearance must remain distinct; modal behavior stays outside the normal z-index map; compatibility deletion occurs by selector group.

Product judgment: preserve current shell/IA, use main B3.2, add no dependency, and never label Playwright emulation physical-device evidence.

## Specification

### Authority and scope

`src/components/layout/app-shell.tsx` and `.module.css` own signed-in chrome and compose canonical Brand and Phase 2 primitives. Routes continue to own route composition and content-end breathing room.

Allowed: shell identity, typed viewport/safe-area geometry, sheets, feedback, actions, IA cleanup, measured shell compatibility retirement and related tests.

Forbidden: route redesign, financial semantics, new identity, broad target-contract retirement, auth/RLS/schema/provider/deployment/production data and Phase 4.

### Brand, viewport and geometry contracts

- Desktop and phone render current `BrandLockup`; no private mark or pseudo-element bridge remains.
- Root viewport remains device-width, scale 1 and typed `viewportFit: "cover"`; generated output and public routes require verification.
- Safe-area top/right/bottom/left values are runtime inputs with zero fallbacks where used.
- App Shell owns:
  - `--mf-shell-mobile-nav-height`;
  - `--mf-shell-mobile-nav-reserve`;
  - top/bottom focus clearances;
  - mobile feedback offset;
  - normal topbar/sidebar/nav/feedback layer values.
- Route spacing must not duplicate shell reserve.

### Focus, modal and primitive contracts

- Root `scroll-padding` applies only while App Shell is mounted; controls use corresponding scroll margins.
- Fixed topbar/nav/feedback cannot entirely obscure focus.
- Capture/More use Phase 2 modal Sheet behavior, including Escape and focus restoration.
- Modal is outside the numeric normal layer map.
- Topbar actions use Button versus LinkButton by semantics; icon-only actions use IconButton; destinations remain links.
- Important shell controls meet the MoneyFlow 44×44 target.
- Feedback uses shared live-region policy and does not steal focus.

### Explicit capability and IA contracts

- Accounts mobile action uses `showPrimaryActionOnMobile`; App Shell never infers route capability from route DOM.
- App Shell contains no active `/insights` branch or `isPlanningPath` inference.
- `/insights` may remain only in separately owned routing compatibility or historical allowlists.

### Compatibility remainder

Phase 3 removes route padding, broad `dialog[open]`, Accounts `body:has()` and all shell rules from `MobileShellContract`. Only transaction-dialog dark amount-field declarations remain, explicitly assigned to Phase 5. The contract is not described as fully retired until that owner moves or removes the remainder.

### Evidence matrix

Before closure verify 320/360/390 portrait, phone landscape, tablet portrait/landscape, 1366/1440 desktop, Light/Dark/System, public light-only, 200% text/reflow, forced colors/reduced motion where affected, keyboard forward/reverse traversal, Sheet open/Escape/cancel/focus return, Accounts mobile action, toast clearance and generated viewport meta.

Physical Android/iOS evidence remains separately labelled and is not inferred from emulation.

### Financial and security constraints

No financial calculations, mutation semantics, advice, provider/database/auth/RLS/deployment/production-data operations or non-synthetic browser fixtures.

## Implementation plan

- **Slice A — inventory/specification:** completed.
- **Slice B — canonical identity/IA:** implemented candidate; browser and forced-colors evidence pending.
- **Slice C — viewport/geometry:** implemented candidate; generated-meta and cross-device evidence pending.
- **Slice D — primitives/layers:** implemented candidate; modal/focus/overlap evidence pending.
- **Slice E — explicit capability/compatibility:** implemented candidate; exact-head gates and owner review pending.

Rollback: viewport metadata and safe-area geometry revert together. The transaction compatibility remainder stays mounted so Phase 3 cannot accidentally alter transaction presentation.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P3-T1 | Inventory DOM, scroll owners, geometry, layers and selector groups | packet/source map | completed |
| P3-T2 | Direct BrandLockup and remove logo bridge | source contracts; browser pending | implemented — verification pending |
| P3-T3 | Typed viewport-fit and safe-area decision | source contract; generated meta/browser pending | implemented — verification pending |
| P3-T4 | One nav height/reserve and separate focus/route spacing | source contract; geometry pending | implemented — verification pending |
| P3-T5 | Capture/More Sheet and ToastRegion | source contract; modal/browser pending | implemented — verification pending |
| P3-T6 | Normal layer map, modal outside numeric z-index | source contract; overlap pending | implemented — verification pending |
| P3-T7 | Explicit Accounts capability, no `body:has()` | source contract; phone pending | implemented — verification pending |
| P3-T8 | Important controls use Phase 2 primitives, links preserved | source contract; target/focus pending | implemented — verification pending |
| P3-T9 | Remove active `/insights` and shell compatibility groups; retain Phase 5 remainder | source contracts; before/after pending | implemented — verification pending |
| P3-T10 | Exact-head policy/static/tests/build/browser/cross-device/security evidence | CI/artifacts and owner review | in progress |

## Evaluation

### Required exact-head gates

Project knowledge/UI migration policy, CSS ownership/architecture, lint, TypeScript, complete tests, production build, browser smoke, Chromium/WebKit audit, CodeQL, secret-history scan, generated viewport assertion and affected geometry evidence.

### Acceptance criteria

- Canonical B3.2 is the only signed-in mark owner.
- One shell owner defines nav/safe-area reserve; reserve, route spacing, focus clearance and feedback offset remain distinct.
- Fixed chrome does not fully obscure focus.
- Capture/More use shared modal behavior and restore focus.
- Feedback uses shared live policy and clears mobile nav.
- App Shell has no active `/insights` or structural `body:has()` capability inference.
- MobileShellContract has no shell rules; transaction remainder is explicitly Phase 5-owned.
- Public/workspace theme behavior and financial/external-system boundaries remain unchanged.

### Stop conditions

Stop if typed viewport output fails, edge-to-edge causes unresolved public regression, transaction compatibility changes behavior, route redesign is required, or any Class 3/external-system change appears.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | researcher | reviewing | “check p3 từ tài liệu gg trước khi làm” | compare sources/current main |
| 2026-08-05 | researcher | planner | specified | official-source review and packet correction | documentation only |
| 2026-08-05 | human_owner | implementer | in_progress | “Triển khai P3” | implement and verify PR #300 |

### Current permission boundary

Authorized: Phase 3 runtime, CSS, source/browser tests and PR records on this branch. Not authorized: ready-for-review transition, merge, deployment, dependency/provider/database/auth/RLS/production data, redesign or Phase 4.

## Delivery record

- Branch: `agent/ui-phase-3-spec-hardening`
- PR: #300, draft
- Base: `main@c11c845cfcd5fe3f588f0564211566bac28f7afd`
- Runtime state: implementation candidate, unmerged
- Dependencies/external systems: unchanged
- Merge and Phase 4: not authorized
