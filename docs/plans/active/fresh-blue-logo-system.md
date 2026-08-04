# Fresh-blue logo system rollout

**Status:** candidate
**Execution state:** exact_head_verification
**Active responsibility:** evaluator
**Permission scope:** branch write, PR metadata, exact-head verification, owner-authorized merge
**Owner:** Thunderkill016
**PR:** #277
**Baseline:** `main@105d6e6e3d77b6efbae385f83f7fe54d2393724b`
**Branch:** `style/fresh-blue-logo-system`
**Implementation commit:** `599fb59cc1df61acbce2acaddb9ec6492777aa19`
**Last updated:** 2026-08-04

## Outcome

Replace the retired green M identity and trust-blue brand role with the owner-approved B3.2 Neutral symbol and fresh-blue identity across shared product lockups, favicon/PWA assets, social preview, browser metadata and project-wide semantic tokens.

## Repository reconnaissance

- Landing and authentication already render one shared `BrandLockup`, while the signed-in shell uses a deliberately narrow `/icon.svg` compatibility bridge.
- The previous canonical component, favicon, installed-app icons, manifest and Open Graph image still used the retired green M identity.
- `src/app/document-theme.css` is the project-wide semantic color authority; route-level palettes consume its `--mf-*` roles.
- Brand identity and interactive action colors must remain separate because vivid `#0EA5E9` is suitable for the symbol but white normal text on it does not meet the required `4.5:1` contrast threshold.
- Income, expense, warning, transfer and info already have independent semantic roles and must not be recolored as decoration.

## Research

The implementation is based on the owner-approved B3.2 vector master and current repository behavior. No external code, asset, dependency or provider was adopted.

Accessibility review measured the actual color pairs rather than inferring readability. The identity remains `#0EA5E9`; light-mode filled actions use `#0369A1` with white text, while dark-mode actions use `#38BDF8` with `#082F49` text. Both action pairs remain above `4.5:1` for normal text.

## Specification

### Canonical symbol

- viewBox `0 0 160 160`;
- stroke width `16.18` with rounded caps and joins;
- upper flow `M22.80 64.20C22.80 40.40 42.10 28.00 66.40 28.00H128.20`;
- lower flow `M137.20 95.80C137.20 119.60 117.90 132.00 93.60 132.00H31.80`;
- centered control gate with a true negative-space slot.

### Color and variants

- light/default flow: `#0EA5E9`;
- light/default gate and wordmark: `#101828`;
- dark flow: `#38BDF8`;
- dark gate and wordmark: `#FFFFFF`;
- inverse: all white;
- installed-app icon: fresh-blue rounded background with all-white B3.2 geometry;
- functional info remains true blue and financial semantic roles remain unchanged.

### Surface coverage

The same geometry must appear in the shared product lockup, signed-in shell icon asset, favicon, 192/512 PWA icons and Open Graph image. Binary assets must decode successfully and match the canonical SVG geometry.

## Scope

- canonical B3.2 vector geometry in `BrandMark` and `src/app/icon.svg`;
- light, dark and inverse color behavior;
- app icon PNGs at 192 and 512 pixels;
- Open Graph image and PWA/browser metadata;
- project-wide fresh-blue brand ramp centered on `#0EA5E9`;
- separate functional info blue;
- permanent source contracts and logo documentation.

## Explicitly unchanged

- financial calculations and money semantics;
- database schema, migrations, RLS, RPCs and production data;
- authentication providers and deployment settings;
- landing/auth information architecture and product copy;
- income, expense, transfer and warning semantic meaning.

## Acceptance criteria

- [x] landing and auth render the shared B3.2 mark;
- [x] signed-in shell renders the same canonical icon asset;
- [x] favicon, installed app and social preview use B3.2;
- [x] light mode uses fresh-blue flow with dark gate/wordmark;
- [x] dark mode uses lighter fresh-blue flow with white gate/wordmark;
- [x] inverse uses all-white geometry;
- [x] brand ramp is fresh blue and info blue remains separate;
- [x] light and dark filled action pairs meet normal-text contrast;
- [x] old green M geometry and `#0B6B3A` do not remain in canonical assets;
- [ ] all binary assets decode in the production build;
- [ ] full UI-selected exact-head CI, CodeQL and secret scan pass;
- [ ] owner-authorized merge uses the verified head SHA.

## Implementation plan

1. Replace the shared component and canonical app icon with exact B3.2 geometry.
2. Separate identity, interaction and functional color roles in the semantic theme authority.
3. Regenerate favicon, PWA icons and social-preview rendering from the canonical geometry.
4. Update metadata, documentation and permanent source/contrast contracts.
5. Run risk-selected exact-head application, browser, responsive, CodeQL and secret-history gates.
6. Inspect generated visual evidence, resolve findings and merge only the verified final SHA.

## Risks and defenses

| Risk | Defense |
|---|---|
| parallel symbol geometries | one shared component plus one canonical `/icon.svg` asset |
| dark-mode gate disappears | gate follows `--mf-text`; inverse is explicitly white |
| brand and info roles collapse | independent semantic tokens and source tests |
| vivid identity color weakens button text | use contrast-safe darker action steps and lock ratios in tests |
| stale or corrupt installed icons | regenerate every binary asset and require production decoding |
| merge wrong PR | resolve PR by branch and verify expected head SHA before merge |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | audit current logo and color ownership | done | shared lockup, shell bridge, assets and semantic theme |
| T2 | implement B3.2 shared/component assets | done | component, app icon, OG and installed icons |
| T3 | apply fresh-blue semantic roles | done | identity/action/info separation in `document-theme.css` |
| T4 | add source, geometry and contrast contracts | done | brand, dark-mode and SEO tests |
| T5 | correct packet and diff hygiene | done | required sections and whitespace cleanup |
| T6 | replace corrupt favicon and verify raster assets | in_progress | production build exposed corrupt ICO |
| T7 | run exact-head CI and inspect browser evidence | blocked | waits for T6 final head |
| T8 | merge exact verified head | blocked | owner authorization exists; checks still required |

## Evaluation

The first candidate was not acceptable for merge. Exact-head gates found trailing Markdown whitespace, missing packet sections, a stale SEO assertion and a corrupt favicon that Turbopack could not decode. Audit also found that using `#0284C7` directly behind white normal text would fall below `4.5:1`, so action roles were moved to the darker `#0369A1` step while the logo identity remains vivid `#0EA5E9`.

These findings are being fixed without weakening any gate. The candidate remains unverified until the regenerated binary assets build, unit/policy shards pass, browser and cross-device audits complete and the generated evidence is reviewed.

## Verification plan

- repository knowledge and CI policy;
- CSS ownership, architecture, lint, typecheck, unit tests and production build;
- browser smoke and cross-device UI audit;
- CodeQL and secret-history scan;
- visual review of generated evidence before merge.

## Handoff record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | authorized | request to replace logo/colors everywhere, then explicit `merge` | implement and open the real PR |
| 2026-08-04 | implementer | evaluator | candidate | PR #277, implementation commit `599fb59` | run exact-head gates |
| 2026-08-04 | evaluator | implementer | findings | CI exposed packet, SEO, contrast and favicon defects | fix defects and re-evaluate final head |
