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
- [x] old green M geometry and `#0B6B3A` do not remain in canonical assets;
- [ ] full UI-selected exact-head CI, CodeQL and secret scan pass;
- [ ] owner-authorized merge uses the verified head SHA.

## Risks and defenses

| Risk | Defense |
|---|---|
| parallel symbol geometries | one shared component plus one canonical `/icon.svg` asset |
| dark-mode gate disappears | gate follows `--mf-text`; inverse is explicitly white |
| brand and info roles collapse | independent semantic tokens and source tests |
| stale installed icons | regenerate both raster sizes from the canonical SVG |
| merge wrong PR | resolve PR by branch and verify expected head SHA before merge |

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
| 2026-08-04 | implementer | evaluator | candidate | PR #277, implementation commit `599fb59` | add PR memory and run exact-head gates |
