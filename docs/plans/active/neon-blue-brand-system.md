# Neon Blue brand system rollout

**Status:** implementation candidate
**Execution state:** evaluating
**Active responsibility:** evaluator
**Permission scope:** branch write, PR metadata, exact-head verification
**Owner:** MoneyFlow owner
**PR:** #283
**Baseline:** `main@26a5c8e1d78ae48189668349eeac7a461a3f3efa`
**Branch:** `style-neon-blue-brand`
**Last updated:** 2026-08-04

## Outcome

Replace Fresh Blue as MoneyFlow's canonical identity with Neon Blue across semantic tokens, the B3.2 logo, public entry surfaces, workspace interactions, browser/install metadata and social preview.

## Repository reconnaissance

- `src/app/document-theme.css` owns project-wide `--mf-*` color roles.
- Landing and auth use `src/components/public-brand-theme.module.css` to remain Light-only while consuming the same semantic roles.
- The shared B3.2 lockup reads `--mf-brand-identity`; changing the authority recolors the logo without changing geometry.
- The browser/app vector is `src/app/icon.svg`; the signed-in compatibility bridge also points to this asset.
- The previous manifest referenced Fresh Blue PNG/ICO assets that would remain visually stale after a token-only change.
- Financial semantics already use independent income, expense, transfer, warning and info roles.

## Research

This change follows the owner's explicit color decision and the already-approved B3.2 geometry. No external asset, code, dependency or provider is adopted.

Contrast was measured against actual pairs. White normal text on `#3445FB` is above `4.5:1`; dark on-brand text `#0B1044` on dark-mode Neon Blue `#7583FF` is also above `4.5:1`. Therefore Neon Blue can serve as both identity and primary action without retaining a second darker action identity.

## Specification

### Owner decision

The owner selected Neon Blue as the main color and required the logo color to change with it. This authorizes a system-level color replacement, not a geometry redesign.

### Color contract

| Role | Light | Dark |
|---|---|---|
| Identity/action | `#3445FB` | `#7583FF` |
| Hover | `#2938E8` | `#ADB5FF` |
| Pressed | `#202DC4` | `#3445FB` |
| Subtle surface | `#F3F4FF` | `#141E78` |
| On brand | `#FFFFFF` | `#0B1044` |

### Asset contract

- B3.2 geometry remains canonical.
- Light/default flow arms use `#3445FB`.
- Dark flow arms use `#7583FF`.
- Gate and wordmark stay dark in light mode and white in dark mode.
- `src/app/icon.svg` is the browser/app icon authority.
- `public/icon-maskable.svg` is the installed-app maskable authority.
- Open Graph uses a full Neon Blue background with the all-white B3.2 symbol.
- Fresh Blue raster assets are removed from the active asset graph instead of remaining as parallel identities.

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

## Implementation plan

1. Replace the root and public brand ramps with the Neon Blue contract.
2. Recolor canonical logo, browser/app icon and social preview without changing B3.2 geometry.
3. Replace stale raster references with canonical SVG and maskable SVG assets.
4. Update permanent contrast, dark-mode, manifest and logo contracts.
5. Run exact-head policy, static, unit, build, Chromium/WebKit, CodeQL and secret-history gates.
6. Present the verified PR for owner visual review; do not merge automatically.

## Risks and defenses

| Risk | Defense |
|---|---|
| route-level colors remain Fresh Blue | one semantic authority plus permanent source tests |
| white CTA text loses contrast | lock `#3445FB` / `#FFFFFF` ratio in tests |
| dark Neon Blue becomes unreadable | use `#7583FF` with `#0B1044` on-brand text |
| semantic transfer/info colors collapse into branding | preserve independent functional roles |
| stale browser/install logo remains visible | use canonical SVG favicon/install assets and remove old rasters |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | audit token and asset ownership | done | document theme, public theme, shared lockup, icon and manifest |
| T2 | apply Neon Blue semantic ramp | done | `document-theme.css`, public theme |
| T3 | recolor canonical logo and social assets | done | icon SVG and Open Graph source |
| T4 | replace stale install/browser asset graph | done | maskable SVG, manifest and removed rasters |
| T5 | update source and contrast contracts | done | brand and dark-mode tests |
| T6 | update canonical documentation and PR memory | done | logo contract, packet and PR-283 memory |
| T7 | exact-head verification | in_progress | current workflow runs |
| T8 | owner visual review | blocked | waits for verified candidate |
| T9 | merge | blocked | requires explicit owner authorization |

## Evaluation

The first exact-head policy run found only documentation-contract omissions: a missing PR-memory `Verified` field, a status-impact prefix mismatch and missing required packet sections. No product or runtime failure was identified by that gate. The packet and PR memory were corrected without weakening the contract. Application, build and browser results must be taken only from the new exact head.

## Verification plan

- diff hygiene and project knowledge contract;
- CSS ownership and architecture boundaries;
- lint, typecheck, unit/static RLS and production build;
- Chromium browser smoke;
- Chromium/WebKit cross-device audit;
- CodeQL and secret-history scan;
- owner visual review before merge.
