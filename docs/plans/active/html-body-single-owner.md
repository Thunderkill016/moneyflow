# html/body single ownership (Phase 1 follow-up #3)

**Status:** evaluating — implemented, verified in dev; CI and production verification pending
**Owner:** MoneyFlow / Claude Code
**Issue/PR:** #115 (see PR body for full detail)
**Last updated:** 2026-07-28

## Outcome

Follow-up #3 from `docs/plans/active/css-token-single-source-of-truth.md` (PR #114): `document-theme.css` claims sole ownership of `html`/`body`, but `globals.css` still had three separate rule sets touching `background`, `color`, `font-family` and `margin` on `body` — all provably dead (always overridden by `document-theme.css`'s higher-specificity or later-loaded rules) but left in place as confusing, misleading duplication. This is the exact class of bug the audit's P0.2 finding warned about ("AppShell was dark while the document body below it remained light") — the fact that it happened to be dead today didn't mean the risk was gone; a future edit to any of the "dead" declarations would have no effect and confuse whoever made it.

## Repository reconnaissance

### Current behavior

`grep`-enumerated every top-level `html`/`body` selector across `src/app/*.css`. Found:

- `document-theme.css`: sole legitimate owner already, per its own header comment — `html, body { margin, color, scroll-behavior (added here) }`, `html[data-theme] , html[data-theme] body { background !important }`, `body { padding !important, font-family }`.
- `globals.css` line ~191-217 (base reset section): `html { scroll-behavior: smooth }`, `body { margin, background-color, color, font-family, text-rendering, font-smoothing, transition }`, `body::before` (decorative wash, light+dark), `[data-theme="dark"] body { background-color }`.
- `globals.css` ~line 2081 (mobile media query, TASK-112): `html, body { overflow-x: clip }`, `body { padding-bottom: var(--mobile-content-end) }` — different concern (mobile chrome clearance, not theme/canvas), left untouched.
- `globals.css` ~line 6494 ("UI REFRESH" section): `body { background, color, font-size, line-height }`, `[data-theme="dark"] body { background }`.

Verified liveness by cascade specificity + import order (`document-theme.css` is imported after `legacy.css`, which is the file that `@import`s `globals.css`), not by assumption:

- `document-theme.css`'s `html[data-theme="light"], html[data-theme="light"] body { background: ... !important }` has higher specificity (0,1,2) than any plain `body { background }` or `[data-theme="dark"] body { background }` rule (0,0,1 / 0,1,1) in `globals.css` — so those are always overridden regardless of source order or `!important` on the losing side.
- `document-theme.css`'s `color`/`font-family`/`margin` declarations tie on specificity with `globals.css`'s equivalents but load later (later import), so they win by source order.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
| --- | --- | --- |
| `src/app/document-theme.css` | Declared sole owner | Change: added `scroll-behavior: smooth` (previously only in globals.css, needed a home) |
| `src/app/globals.css` | Held dead duplicate declarations | Change: removed dead `background`/`color`/`font-family`/`margin` on `body`; kept the properties with no `document-theme.css` equivalent (`text-rendering`, font smoothing, theme-switch `transition`, `body::before` decorative wash, `font-size`/`line-height` in the UI-REFRESH section, the mobile-chrome media query block) |

### Existing tests and constraints

- No test asserts on the removed declarations (checked via grep).
- `npm run check:knowledge`/`lint`/`typecheck`/`test` (578/578)/`build` all pass.

### Similar implementation and recent history

Direct continuation of PR #114 (`css-token-single-source-of-truth.md`), same session, same methodology (verify liveness via real cascade math and consumer usage, not assumption; visual verification before shipping).

### Open questions

None outstanding for this slice; remaining Phase 1 items (radius token reconciliation, migrating `--color-*` call sites to `--mf-*` directly) are tracked as follow-ups in PR #114's packet, not here.

## Research

### Questions researched

Which `html`/`body` declarations in `globals.css` are actually still live (i.e., would a plausible future edit to them have any visible effect) versus already-dead duplication of `document-theme.css`?

### Sources

Direct cascade specificity calculation against the actual selectors and import order in this repository; no external sources needed.

### Alternatives considered

| Direction | Reason not chosen |
| --- | --- |
| Leave the dead declarations in place, only add a comment | Doesn't fix the actual risk (a later edit to the dead code silently does nothing) and doesn't reduce file size/confusion |
| Also consolidate the mobile-chrome media query's `body` padding into `document-theme.css` | Different concern (route/breakpoint-specific layout clearance, not theme/canvas); out of scope, would blur what "document authority" means |

### Research decision

Remove only the declarations provably dead by cascade math; keep everything with an independent, still-live effect exactly where it is.

## Specification

### Problem

Duplicate, partially-dead `html`/`body` styling across two files contradicts `document-theme.css`'s own stated ownership and risks the same "AppShell dark, body light" class of bug the audit flagged.

### User stories

- As a developer, I can find and change any `html`/`body`-level document styling in exactly one file.
- As a user, there is no light/dark seam anywhere on the page, full height, on any route.

### Acceptance criteria

- [x] No `background`/`color`/`font-family`/`margin` for `html`/`body` remains defined outside `document-theme.css`.
- [x] `scroll-behavior: smooth` still active (verified via `getComputedStyle`).
- [x] Properties with no `document-theme.css` equivalent (text rendering, font smoothing, theme transition, decorative wash, font-size/line-height, mobile chrome clearance) preserved exactly.
- [ ] Production-mode verification (deferred to owner).

### Required states

Light and dark theme, full-page (not just viewport) screenshots, across dashboard/transactions/accounts/budgets/settings.

### Financial and security constraints

None — presentation-only.

### Out of scope

Mobile-chrome media query block (different concern), radius tokens, `--color-*` call-site migration (tracked in PR #114's packet).

## Implementation plan

### Architecture fit

Completes the specific `html`/`body` ownership claim `document-theme.css` already made in its header comment; direct continuation of the token single-source-of-truth fix.

### Planned changes

- `document-theme.css`: add `scroll-behavior: smooth` to the existing `html, body` rule.
- `globals.css`: strip dead `background`/`color`/`font-family`/`margin` from the base `body` rule and the "UI REFRESH" section's `body` rules; delete the fully-dead `[data-theme="dark"] body { background-color }` rule and the "UI REFRESH" section's `[data-theme="dark"] body { background }` rule.

### Data and migration impact

None.

### Risks and counterexamples

| Risk | Control |
| --- | --- |
| Misjudging a declaration as dead when it actually still wins somewhere | Verified via explicit specificity calculation per rule, not assumption; full visual verification afterward |
| Losing `scroll-behavior: smooth` entirely (happened once during editing) | Caught via explicit `getComputedStyle(document.documentElement).scrollBehavior` assertion in a throwaway Playwright test before shipping |

### Verification plan

Static gates, then full-page Playwright screenshots (not just viewport) in both themes across 5 routes, plus an explicit scroll-behavior computed-style check.

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| T1 | Enumerate every html/body selector across all root CSS files | done |
| T2 | Determine liveness of each via cascade specificity + import order | done |
| T3 | Relocate `scroll-behavior` to document-theme.css | done |
| T4 | Remove dead declarations from globals.css (base + UI-REFRESH sections) | done |
| T5 | Run static gates | done |
| T6 | Full-page visual verification, both themes, 5 routes | done |
| T7 | CI, PR review, production verification | pending |

## Evaluation

### Acceptance evidence

`check:knowledge`/`lint`/`typecheck`/`test` (578/578)/`build` all pass. Full-page Playwright screenshots reviewed directly in both themes across dashboard/transactions/accounts/budgets/settings — no seam, no invisible text. `scroll-behavior: smooth` confirmed still computed on `<html>`.

### Review findings

Caught a real self-introduced regression during editing: the first draft of the `body{}` simplification accidentally dropped `html { scroll-behavior: smooth; }` entirely instead of relocating it, because it was matched inside a larger `old_string` replacement. Found by explicitly testing the computed style rather than only checking "does it still build."

### Remaining limitations

Production-mode screenshot pass and CI/owner verification not yet done, per `AGENTS.md`.

## Delivery record

- Branch: `fix/html-body-single-owner`
- PR: #115
- CI: pending at time of writing
- Production deployment: pending merge and owner verification
