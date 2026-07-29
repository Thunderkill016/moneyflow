# Build MoneyFlow coin-rice logo with Lucide

**Status:** evaluating  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** pending  
**Last updated:** 2026-07-29

## Outcome

Replace the generated M logo candidate with a reviewable vector logo built from the web icon library already installed in MoneyFlow. The symbol must remain one rice stalk whose seven grains are coin forms, work at favicon size, and use the same geometry across React UI and `src/app/icon.svg`.

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

### Open questions

- [x] Library: use existing `lucide-react`, no new dependency.
- [x] Construction: Lucide `Circle` primitives plus native SVG stalk/branch paths.
- [x] Coin count: one top coin plus three balanced pairs.
- [ ] Owner visual approval after browser screenshots.

## Research

### Questions researched

1. Does the current repository already include a suitable icon library?
2. Does that library support composing icons with native SVG elements?
3. Can the result remain tree-shakable and scalable?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `package.json` | 2026-07-29 | `lucide-react` is already installed | Repository-specific |
| Lucide React guide | 2026-07-29 | Icons render optimized inline SVG, are customizable and tree-shakable | Implementation guidance |
| Lucide combining-icons guide | 2026-07-29 | Multiple icon components and native SVG elements can be combined | Keep coordinates within the outer viewBox |
| Lucide `wheat` and `coins` references | 2026-07-29 | Confirms relevant nature/finance primitives and React imports | Stock icons are references, not the final brand logo |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A — Install another logo/icon library | More assets | Adds dependency and generic style | Rejected |
| B — Continue generated image boards | Fast visual output | Geometry drift, unusable production assets | Rejected |
| C — Existing Lucide primitives + custom SVG arrangement | Clean vector, editable, no new dependency | Requires careful small-size testing | Selected |

### Research decision

Use Lucide as the construction system, not as a stock logo. Repeat Lucide `Circle` components for coin grains and connect them with native rounded SVG paths. Mirror the same geometry in the static app icon.

## Specification

### Problem

Generated logo images repeatedly changed the approved concept and produced presentation artifacts rather than a reusable production logo. MoneyFlow needs a deterministic vector source that can be reviewed and edited in code.

### User stories

- As the owner, I see exactly one rice-stalk concept rather than new unrelated symbols.
- As a user, I recognize a simple money-and-rice mark at favicon and navigation sizes.
- As a maintainer, I can edit geometry in one typed React component and one matching SVG asset.
- As a browser/PWA user, I see the same logo as the web UI.

### Acceptance criteria

- [x] No new package is installed.
- [x] React mark imports `Circle` from `lucide-react`.
- [x] Mark contains one stalk, six branches and seven coin outlines.
- [x] `src/app/icon.svg` mirrors the same layout.
- [x] Generated-image effects, M/F/O letters, currency signs and outer badge rings are absent.
- [x] Shared landing/auth/shell integration remains unchanged.
- [ ] Static, unit, build and browser checks pass.
- [ ] Owner reviews phone, desktop, dark and favicon evidence.

### Required states

- Default: green rounded container with white mark.
- Inverse: monochrome mark on dark/brand surfaces.
- Forced colors: system color remains visible.
- Micro: center dots may be hidden while coin outlines and stalk remain legible.
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

The shared identity remains in `src/components/brand/`. Lucide is already a product dependency and its standalone import remains tree-shakable. The static app icon mirrors the component geometry because browser/PWA metadata cannot render React components.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/brand/brand-lockup.tsx` | Compose seven Lucide circles with native stalk/branch paths | Deterministic vector mark |
| `src/components/brand/brand-lockup.module.css` | Add stroke/fill and micro-size rules | Component-owned presentation |
| `src/app/icon.svg` | Mirror candidate geometry | Favicon/PWA consistency |
| `src/lib/brand-ui-contract.test.ts` | Enforce Lucide import, coin count and shared paths | Prevent drift |
| `docs/design/MONEYFLOW_LOGO.md` | Record candidate and owner approval gate | Accurate authority |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Runtime behavior: presentation only.
- Rollback: revert this branch before approval.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Seven coins become unreadable at 16px | Browser favicon and 16px screenshot review |
| Mark looks like berries instead of coins | Outline plus center point; balanced branches |
| React and static icon drift | Source-contract checks common paths and counts |
| Nested SVG causes build/browser issue | Full Next build and Chromium/WebKit audit |
| Owner did not approve final silhouette | Draft PR only; explicit approval required |

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
| T2 | Build shared coin-rice component | T1 | branch diff | done |
| T3 | Mirror app icon and CSS states | T2 | branch diff | done |
| T4 | Update contract test and logo spec | T2,T3 | branch diff | done |
| T5 | Open draft PR and run CI | T4 | PR/workflow | todo |
| T6 | Review browser evidence with owner | T5 | screenshots | todo |
| T7 | Merge only after approval | T6 | merge record | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Existing library only | `package.json` unchanged | pass by inspection |
| Lucide construction | `Circle` import and seven-item geometry | pass by inspection |
| Static/component consistency | shared stem/branch paths and count test | pending CI |
| Small-size clarity | browser evidence | pending |
| Owner approval | explicit conversation decision | pending |

### Review findings

- Correctness: intended rice-stalk/coin concept is encoded directly rather than inferred by an image generator.
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
- PR: pending
- CI run: pending
- Owner approval: pending
- Merge commit: pending
- Production deployment: pending
