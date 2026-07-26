# Cross-device UI audit contract

MoneyFlow treats responsive UI as a release contract, not a visual best-effort.

## Required PR matrix

The PR gate runs these Chromium viewports:

| Project | Viewport | Purpose |
| --- | ---: | --- |
| `chromium-phone-320` | 320×568 | smallest supported phone / reflow boundary |
| `chromium-android-360` | 360×800 | common Android phone |
| `chromium-iphone-390` | 390×844 | modern iPhone-sized layout |
| `chromium-tablet-portrait` | 768×1024 | tablet portrait |
| `chromium-tablet-landscape` | 1024×768 | tablet landscape / small laptop |
| `chromium-desktop-1366` | 1366×768 | common desktop |
| `chromium-wide-1440` | 1440×900 | wide desktop |

Critical routes also run in Chromium dark mode and WebKit phone/tablet projects. A Firefox critical-route audit runs on weekday nights and can be started manually.

## Routes in Phase A

The first audit harness covers:

- landing
- login
- register
- insights
- quick capture
- transactions
- accounts
- settings

Phase B expands this to every user-facing route and adds populated, empty, validation, loading, modal and error states.

## Blocking invariants

A PR fails when the audit finds a P1 defect:

- the document is wider than the supported viewport;
- a visible interactive control is clipped or placed outside the viewport without an intentional horizontal scroller;
- a visible dialog is clipped vertically and cannot scroll;
- a route returns an HTTP error;
- the page is blank;
- a Next.js or Vite error overlay is visible;
- keyboard focus moves outside the viewport or has no visible indicator in the keyboard audit.

The audit records P2 advisories without blocking the PR:

- interactive target below 24×24 CSS pixels;
- icon-only control without an accessible name;
- clipped financial value;
- other findings that need visual review.

Each route/project attaches a full-page PNG and JSON findings file. CI uploads both successful and failing Playwright evidence for three days.

## Commands

```bash
npm run test:e2e
npm run test:ui-audit:pr
npm run test:ui-audit:firefox
```

Install the PR browsers with:

```bash
npm run test:e2e:install
```

## Severity and remediation

- **P0:** financial action incorrect or destructive, data loss, unusable authentication.
- **P1:** core flow blocked, save/submit unavailable, serious overflow, unusable dialog.
- **P2:** hierarchy, target size, focus, contrast, copy or component consistency problem.
- **P3:** polish only.

P0 and P1 block the stabilization release. Fix shared primitives before adding page-specific CSS. Every UI bug fix must add or tighten an assertion at the viewport where it failed.

## Real-device checklist

Emulation does not prove mobile-browser readiness. Before claiming Android or iOS support, record these checks on physical devices:

### Android device

- Open landing, login, insights, quick capture and transactions.
- Rotate portrait ↔ landscape.
- Open the numeric keyboard in quick capture.
- Confirm the amount, category, account, date, note and save controls remain reachable.
- Confirm the browser address bar and keyboard do not cover the primary action.
- Create, edit and delete one synthetic transaction.
- Check light and dark appearance.
- Confirm no whole-page horizontal scrolling.

### iPhone / Safari

- Repeat the Android core flow on Safari.
- Check notch and home-indicator safe areas.
- Check bottom navigation, sheets and sticky actions while the address bar collapses/expands.
- Check date and numeric inputs use usable native controls.
- Confirm no unexpected text zoom on form focus.

### Tablet

- Check portrait and landscape.
- Confirm navigation changes at the intended breakpoint rather than showing a stretched phone layout.
- Confirm cards, tables and filters use the available width without excessive empty space.
- Confirm dialogs remain centered, bounded and scrollable.

Record device model, OS/browser version, date, route and screenshot for every failure.
