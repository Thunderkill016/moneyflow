# Build MoneyFlow coin-rice logo with Lucide

**Status:** evaluating  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** #119  
**Last updated:** 2026-07-29

## Outcome

Replace the generated M logo candidate with a reviewable vector logo built from the web icon library already installed in MoneyFlow. The symbol must match the owner-selected silhouette: one pointed rice grain at the top, three pairs of oval coin grains on a central stalk, and the same geometry across React UI and `src/app/icon.svg`.

## Repository reconnaissance

### Current behavior

- MoneyFlow already depends on `lucide-react`.
- Landing and auth use the shared `BrandMark` / `BrandLockup` component.
- The signed-in shell loads `/icon.svg` through a narrow compatibility bridge.
- The current canonical asset is an M mark that the owner has rejected for the next logo direction.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `package.json` | Confirms `lucide-react` is already installed | Reuse |
| `src/components/brand/brand-lockup.tsx` | Shared React logo implementation | Change |
| `src/components/brand/brand-lockup.module.css` | Size, tone and forced-color ownership | Change |
| `src/app/icon.svg` | Favicon/PWA vector | Change |
| `src/lib/brand-ui-contract.test.ts` | Prevents geometry drift | Change |
| `docs/design/MONEYFLOW_LOGO.md` | Logo authority and approval gate | Change |

### Existing tests and constraints

- No new global CSS owner.
- Decorative mark must remain hidden from assistive technology when adjacent text names MoneyFlow.
- Signed-in navigation behavior cannot change.
- Brand green cannot be reused as financial success/income semantics.
- Final approval requires actual browser evidence, not a generated brand board.

### Similar implementation and recent history

- PR #110 centralized the current identity in one component and one app icon.
- The current source-contract test protects exact geometry and shared use.
- Recent generated logo experiments drifted into M marks, gold coins, gradients and presentation boards; those are rejected.
- The owner retained the earlier rice silhouette with a pointed top grain and three pairs of tilted oval coins.

### Open questions

- [x] Library: use existing `lucide-react`, no new dependency.
- [x] Construction: Lucide `Leaf` + stretched/rotated Lucide `Circle` primitives with native SVG stalk/branch paths.
- [x] Coin count: three balanced pairs; the top remains a rice grain.
- [ ] Owner visual approval after browser screenshots.

## Research

### Questions researched

1. Does the current repository already include a suitable icon library?
2. Does that library support composing icons with native SVG elements?
3. Can the result remain tree-shakable and scalable?
4. Which of the prior visual explorations did the owner actually retain?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `package.json` | 2026-07-29 | `lucide-react` is already installed | Repository-specific |
| Lucide React guide | 2026-07-29 | Icons render optimized inline SVG, are customizable and tree-shakable | Implementation guidance |
| Lucide combining-icons guide | 2026-07-29 | Multiple icon components and native SVG elements can be combined | Keep coordinates within the outer viewBox |
| Lucide `leaf`, `wheat` and `coins` references | 2026-07-29 | Confirms relevant nature/finance primitives and React imports | Stock icons are construction references, not the final logo |
| Owner-selected rice/coin concept image | 2026-07-29 | Pointed top grain, three tilted oval coin pairs and a straight stalk | Recreate as production vector, not as a generated board |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A — Install another logo/icon library | More assets | Adds dependency and generic style | Rejected |
| B — Continue generated image boards | Fast visual output | Geometry drift, unusable production assets | Rejected |
| C — Seven circular Lucide coins | Simple implementation | Reads as network/berries and diverges from retained concept | Rejected after inspection |
| D — Lucide top leaf + six oval coin grains | Matches retained silhouette, editable, no new dependency | Requires careful small-size testing | Selected |

### Research decision

Use Lucide as the construction system, not as a stock logo. Use `Leaf` for the pointed top grain and six `Circle` components stretched into thick oval coin outlines, rotated outward and connected by native rounded paths. Mirror the same silhouette in the static app icon.

## Specification

### Problem

Generated logo images repeatedly changed the intended concept and produced presentation artifacts rather than a reusable production logo. An initial code prototype with seven circles also looked like a network instead of the retained rice/coin form. MoneyFlow needs a deterministic vector source that matches the selected silhouette.

### User stories

- As the owner, I see the exact retained rice-stalk concept rather than a new interpretation.
- As a user, I recognize a simple money-and-rice mark at favicon and navigation sizes.
- As a maintainer, I can edit geometry in one typed React component and one matching SVG asset.
- As a browser/PWA user, I see the same logo as the web UI.

### Acceptance criteria

- [x] No new package is installed.
- [x] React mark imports `Circle` and `Leaf` from `lucide-react`.
- [x] Mark contains one stalk, six branches, one top grain and six oval coin outlines.
- [x] Left/right coins tilt outward and preserve three balanced rows.
- [x] `src/app/icon.svg` mirrors the same layout.
- [x] Generated-image effects, M/F/O letters, currency signs and outer badge rings are absent.
- [x] Shared landing/auth/shell integration remains unchanged.
- [ ] Static, unit, build and browser checks pass on the final commit.
- [ ] Owner reviews phone, desktop, dark and favicon evidence.

### Required states

- Default: green rounded container with white mark.
- Inverse: monochrome mark on dark/brand surfaces.
- Forced colors: system color remains visible.
- Micro: the pointed top grain, stalk and three paired oval groups remain legible without extra detail.
- Light/dark, phone/tablet/desktop: same geometry.

### Financial and security constraints

- No change to financial calculations, auth, persistence, schema, RLS or ownership.
- The logo must not imply guaranteed growth, investment performance or bank integration.

### Out of scope

- Redesigning product screens or information architecture.
- Adding realistic coins, gold, gradients, 3D or illustration assets.
- Installing a second icon system.
- Merging without owner visual approval.

## Implementation plan

### Architecture fit

The shared identity remains in `src/components/brand/`. Lucide is already a product dependency and its standalone imports remain tree-shakable. The static app icon mirrors the component silhouette because browser/PWA metadata cannot render React components.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/brand/brand-lockup.tsx` | Compose `Leaf` plus six stretched `Circle` components and native stalk/branch paths | Deterministic retained silhouette |
| `src/components/brand/brand-lockup.module.css` | Own tilt, stroke/fill, sizes and forced colors | Component-owned presentation |
| `src/app/icon.svg` | Mirror pointed grain and six tilted oval coins | Favicon/PWA consistency |
| `src/lib/brand-ui-contract.test.ts` | Enforce imports, counts and shared branch paths | Prevent drift |
| `docs/design/MONEYFLOW_LOGO.md` | Record candidate and owner approval gate | Accurate authority |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Runtime behavior: presentation only.
- Rollback: revert PR #119 before approval.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Oval coins become unreadable at 16px | Browser favicon and 16px screenshot review |
| Mark looks like leaves instead of coins | Thick open oval construction and three ordered pairs |
| Mark looks like a network | Preserve pointed top grain and angled rice-grain rhythm |
| React and static icon drift | Source-contract checks shared stalk/branch paths and counts |
| Nested SVG transforms differ by browser | Full Next build and Chromium/WebKit audit |
| Owner did not approve final silhouette | PR remains unmerged; explicit approval required |

### Verification plan

- Static: knowledge, architecture, CSS ownership, lint and typecheck.
- Unit: full suite including brand UI contract.
- Build: Next production build.
- Browser: landing/auth/dashboard smoke plus responsive audit.
- Visual: 16/24/32/64px, phone/desktop, light/dark and favicon review.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Confirm installed library and composition support | none | package/docs | done |
| T2 | Build initial code prototype | T1 | branch diff | done |
| T3 | Compare prototype with retained concept and correct silhouette | T2 | visual inspection | done |
| T4 | Mirror app icon, CSS states and source contract | T3 | branch diff | done |
| T5 | Open PR and run CI | T4 | PR #119/workflow | in progress |
| T6 | Review browser evidence with owner | T5 | screenshots | todo |
| T7 | Merge only after approval | T6 | merge record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Existing library only | `package.json` unchanged | pass by inspection |
| Lucide construction | `Circle` + `Leaf` imports and six-item coin geometry | pass by inspection |
| Retained silhouette | pointed top grain + three tilted oval pairs | pass by source inspection |
| Static/component consistency | shared stem/branch paths and count test | pending final CI |
| Small-size clarity | browser evidence | pending |
| Owner approval | explicit conversation decision | pending |

### Review findings

- Correctness: the revised component now follows the retained concept rather than the discarded seven-circle prototype.
- Security/ownership: no data or permission boundary changes.
- Accessibility: shared decorative behavior and forced-colors ownership are preserved.
- Maintainability: no dependency or duplicated UI integration is added.
- Scope: logo-only candidate.

### Remaining limitations

- The final silhouette still requires owner visual review.
- Physical-device favicon rendering remains required after merge.
- The static icon duplicates geometry because browser metadata cannot import React.

## Delivery record

- Branch: `agent/lucide-coin-rice-logo`
- PR: #119
- CI run: pending final commit
- Owner approval: pending
- Merge commit: pending
- Production deployment: pending
