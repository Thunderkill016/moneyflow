# Neon Blue brand system rollout

**Status:** implementation candidate
**Execution state:** evaluating
**Active responsibility:** evaluator
**Permission scope:** branch write, PR metadata, exact-head verification
**Owner:** MoneyFlow owner
**Baseline:** `main@26a5c8e1d78ae48189668349eeac7a461a3f3efa`
**Branch:** `style-neon-blue-brand`
**Last updated:** 2026-08-04

## Outcome

Replace Fresh Blue as MoneyFlow's canonical identity with Neon Blue across semantic tokens, the B3.2 logo, public entry surfaces, workspace interactions, browser/install metadata and social preview.

## Owner decision

The owner explicitly selected Neon Blue as the main color and required the logo color to change with it. This authorizes a system-level color replacement, not a geometry redesign.

## Color contract

| Role | Light | Dark |
|---|---|---|
| Identity/action | `#3445FB` | `#7583FF` |
| Hover | `#2938E8` | `#ADB5FF` |
| Pressed | `#202DC4` | `#3445FB` |
| Subtle surface | `#F3F4FF` | `#141E78` |
| On brand | `#FFFFFF` | `#0B1044` |

White normal text on `#3445FB` exceeds WCAG AA. Financial semantic colors remain independent.

## Scope

- project-wide `--mf-brand-*` authority;
- public landing/auth semantic overrides;
- B3.2 flow-arm color in shared lockups;
- canonical app/browser SVG icon;
- maskable PWA SVG icon and manifest theme color;
- Open Graph background;
- contrast and dark-mode source contracts;
- logo documentation.

## Explicitly unchanged

- B3.2 geometry and wordmark;
- public Light-only route behavior;
- workspace Light/Dark/System choice;
- landing/auth information architecture and copy;
- financial calculations, semantic meaning, database, RLS and production data;
- authentication providers and deployment settings.

## Acceptance criteria

- [x] identity and primary actions use `#3445FB` in light mode;
- [x] logo flow arms consume the Neon Blue identity token;
- [x] browser/PWA/social vector assets use Neon Blue;
- [x] stale Fresh Blue raster assets are removed from the active asset graph;
- [x] dark mode uses the lighter Neon Blue ramp;
- [x] semantic income, expense, transfer, warning and info colors remain separate;
- [x] source contracts assert the new values and contrast pairs;
- [ ] exact-head static, unit, build and browser gates pass;
- [ ] owner visual review is complete;
- [ ] merge is explicitly authorized.

## Risks and defenses

| Risk | Defense |
|---|---|
| route-level colors remain Fresh Blue | one semantic authority plus permanent source tests |
| white CTA text loses contrast | lock `#3445FB` / `#FFFFFF` ratio in tests |
| dark Neon Blue becomes unreadable | use `#7583FF` with `#0B1044` on-brand text |
| semantic transfer/info colors collapse into branding | preserve independent functional roles |
| stale browser/install logo remains visible | use canonical SVG favicon/install assets and remove old rasters |

## Verification plan

- diff hygiene and project knowledge contract;
- CSS ownership and architecture boundaries;
- lint, typecheck, unit/static RLS and production build;
- Chromium browser smoke;
- Chromium/WebKit cross-device audit;
- CodeQL and secret-history scan;
- owner visual review before merge.
