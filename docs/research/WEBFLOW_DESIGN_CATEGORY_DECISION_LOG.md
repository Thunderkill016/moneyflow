# Webflow Design research decision log

**Date:** 2026-08-04
**Status impact:** design process and research navigation only; no runtime or current capability change

## Adopt now

- User/job/evidence before visual work.
- Journey and task-flow distinction.
- Content inventory before high-fidelity styling.
- Multiple low-fidelity structures for material redesigns.
- One clear page purpose and primary action.
- Real MoneyFlow product proof instead of stock fintech imagery.
- Semantic tokens and maintained components as one design authority.
- Native HTML before ARIA.
- Mobile, keyboard, text-zoom, reduced-motion and cross-browser evidence.
- Explicit post-release learning and design-system maintenance.

## Adapt to MoneyFlow

- Dark-mode guidance: workspace choice only; public routes remain Light.
- Social proof: verified evidence only; no invented testimonials, metrics or logos.
- Color psychology: hypothesis and role discipline, not proof of trust.
- Motion: short, explanatory and optional; static/reduced-motion fallback required.
- Conversion measurement: establish a privacy-safe baseline before setting targets.

## Reject for the current product

- Mega-menu public navigation.
- Stock hero imagery.
- Parallax or heavy scrollytelling in authenticated finance flows.
- Critical information or CTA hidden in auto-advancing carousels.
- Trend-led visual replacement without product evidence and owner selection.
- Tool or platform migration justified only by a roundup article.

## Current implementation findings

1. The landing narrative already aligns with value → action → product proof → workflow → trust → final action.
2. Authentication supporting copy must be mode-specific rather than reusing login language for registration or recovery.
3. Route-local legacy palette declarations should not compete with the Fresh Blue semantic authority.
4. Mobile product proof needs evidence-based readability review at 320/360/390 px before redesign.
5. A future measurement contract must define event, denominator, time window and privacy boundary before any conversion claim.

## Authority boundary

This log does not select a new aesthetic. The active visual and process authorities remain the explicit owner decisions and the files linked from `docs/design/DESIGN_DIRECTION_STATUS.md`.
