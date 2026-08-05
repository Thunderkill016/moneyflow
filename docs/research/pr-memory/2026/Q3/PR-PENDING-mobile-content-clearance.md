# PR pending — remove legacy dashboard mobile clearance

- **Status impact:** none
- **Branch:** `agent/fix-mobile-content-clearance`
- **Date:** 2026-08-05

## Scope

Detach the current Tổng quan component from the legacy global `.dashboard` class. The route-owned `.insights-dashboard` CSS already defines desktop and phone padding; the legacy class re-applies `--mobile-content-end`, which still includes clearance for a floating action button removed by the Calm Ledger shell.

## Root cause

`MoneyFlowDashboard` rendered `className="dashboard insights-dashboard"`. On phone, `ui-refresh.css` applies an important bottom padding through `.dashboard`, while `app-shell.module.css` separately reserves the fixed navigation. The two clearances stack and leave excessive blank space after the final dashboard content.

## Change

- render only the current route-owned `insights-dashboard` class;
- add a static regression proving the legacy class cannot return and confirming the route and shell split their spacing responsibilities.

## Boundaries

- No new CSS or `!important` declaration.
- No financial, data, auth, provider or deployment change.
- No claim of browser or physical-device verification before CI/evidence review.

## Verification

Pending draft PR CI: full static/build verification and UI/browser audit selected by the executable UI diff.
