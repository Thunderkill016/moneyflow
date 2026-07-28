# MoneyFlow brand identity and logo exploration

**Status:** evaluating — brand foundation documented; logo not approved  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** #106  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow now has a discoverable brand guideline covering strategy, story, messaging, voice, color, typography, visual language, applications, accessibility and governance.

The logo outcome remains open. The M-based SVG/CSS currently on this branch is an implementation candidate only and must not be treated as canonical or merged without owner approval and visual evidence.

## Repository reconnaissance

### Current behavior

- Landing, auth and app shell repeat the same brand structure.
- The original open-ring glyph was generic and resembled loading/refresh.
- This branch introduced an M-based candidate, shared identity CSS and `src/app/icon.svg`.
- Owner review rejected the current direction as insufficiently distinctive.
- Product truth, Calm Ledger v2 and the new brand guideline now provide the criteria for a new exploration.

### Relevant repository areas

| Area | Role |
|---|---|
| `docs/product/PRINCIPLES.md` | Product and financial truth. |
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand foundation, messaging, visual and governance rules. |
| `docs/design/MONEYFLOW_LOGO.md` | Provisional logo exploration/approval contract. |
| `docs/design/CALM_LEDGER_V2.md` | Current UI visual and interaction authority. |
| `src/app/brand-logo.css` | Current unapproved implementation candidate. |
| `src/app/icon.svg` | Current unapproved app-icon candidate. |
| `src/app/manifest.ts` | PWA identity metadata. |

### Existing constraints

- MoneyFlow is a calm manual-first ledger, not investment, payment or advice software.
- VND, transfers and user ownership semantics cannot be distorted by branding.
- Brand green and financial semantic colors have separate roles.
- Logo must work in one color and at small sizes before visual polish.
- No feature/fix commits directly to `main`.

## Research

### Questions

1. What brand foundation must exist before refining a logo?
2. What makes a young digital-product identity usable across product and marketing?
3. Which logo conventions create generic fintech results?
4. How should unapproved logo code be governed?

### Evidence used

| Source | What it establishes |
|---|---|
| MoneyFlow product principles | Audience, core jobs, financial honesty and non-goals. |
| Calm Ledger v2 | Neutral-first visual language, one brand accent, no decorative fintech effects. |
| Adobe logo guidance | Strategy first, one distinctive idea, small/monochrome testing, vector source. |
| Apple HIG principles/app icons | Purposeful simplicity, strong recognizable geometry, consistency across appearances. |
| Owner feedback in this design iteration | Current M, O, F, ledger-line and flow-ring explorations are not distinctive enough. |

### Alternatives considered

| Direction | Result |
|---|---|
| Generic open ring | Rejected: loading/refresh association. |
| Continuous M monogram | Implemented as candidate; rejected by owner as too generic. |
| M/F combination | Rejected: forced letter construction. |
| M plus ledger lines/chart | Rejected: icon illustration/template effect. |
| Stylized O/flow ring | Rejected: generic fintech/circulation symbol. |
| Golden-ratio flow ring | Rejected: geometric rationale did not create brand distinction. |
| Brand foundation before next logo pass | Selected. |

### Research decision

Stop polishing isolated letter combinations. Establish the complete brand system first, mark all current logo code provisional, and require the next exploration to start from three genuinely different black-and-white territories evaluated by a fixed rubric.

## Specification

### Problem

MoneyFlow had visual/product rules but no single brand guideline. Logo experiments therefore repeatedly attempted to encode every product idea into one mark, producing generic fintech symbols and long post-hoc explanations.

### User stories

- As the owner, I can evaluate brand and logo work against one documented strategy instead of subjective mockup preference.
- As a designer, I know the audience, promise, personality, voice, palette, typography and application rules before drawing a logo.
- As a developer, I can distinguish an approved asset from an implementation experiment.
- As a reviewer, I can block a merge when identity is unapproved even if code exists.

### Acceptance criteria

- [x] Brand foundation, story, positioning, promise and personality are documented.
- [x] Messaging, claim boundaries, voice and Vietnamese UI writing rules are documented.
- [x] Color, typography, composition, iconography, data visualization, imagery and motion are documented.
- [x] Product, landing, auth, social, presentation and app-icon applications are documented.
- [x] Accessibility, localization, asset governance, scorecards and release checklist are documented.
- [x] Brand guideline is linked from `README.md` and `AGENTS.md`.
- [x] Logo contract says the current candidate is provisional.
- [ ] Owner selects a final logo territory.
- [ ] Approved geometry and wordmark replace or confirm the candidate implementation.
- [ ] Static and browser/PWA evidence pass.

### Out of scope for this documentation step

- Declaring the current M mark final.
- Trademark registration or formal legal opinion.
- Generating production PNG/app-store asset sets before logo approval.
- Redesigning unrelated product screens.

## Implementation plan

### Completed documentation changes

| File | Change |
|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Added the cross-channel brand system and governance. |
| `docs/design/MONEYFLOW_LOGO.md` | Converted from a final-looking contract to a provisional approval contract. |
| `README.md` | Added brand-guideline discovery. |
| `AGENTS.md` | Added task-specific brand/logo read order. |
| This work packet | Recorded owner rejection and reopened the logo decision. |

### Candidate implementation state

The following remain on the branch for comparison but are unapproved:

- `src/app/brand-logo.css`
- `src/app/icon.svg`
- related layout/manifest wiring

Before merge, either:

1. replace them with the approved identity and verify it; or
2. remove/revert the candidate runtime changes and merge documentation separately.

### Risks

| Risk | Prevention |
|---|---|
| Documentation legitimizes an unapproved logo | Explicit provisional status in both guideline and logo contract. |
| Next exploration repeats minor M/O/F variants | Require three genuinely different territories and black/white silhouettes. |
| Mockups hide weak geometry | Score large, 32px, 16px and monochrome before applications. |
| Brand green conflicts with financial semantics | Separate brand and semantic tables/rules. |
| Long guideline becomes competing UI law | Authority table points to product principles, Calm Ledger and design system. |
| PR merges runtime candidate accidentally | Keep PR draft until owner approval and CI/browser review. |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Audit product, UI and logo constraints | Source docs and current implementation | done |
| T2 | Research logo/app-icon principles | Research table | done |
| T3 | Create initial M implementation candidate | CSS/SVG/manifest diff | done but unapproved |
| T4 | Collect owner critique across explorations | Conversation decision record | done |
| T5 | Build brand guideline | `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | done |
| T6 | Link guideline from repo entrypoints | `README.md`, `AGENTS.md` | done |
| T7 | Mark logo contract/candidate provisional | `docs/design/MONEYFLOW_LOGO.md` | done |
| T8 | Explore three new black-and-white identity territories | Comparative board/source vectors | todo |
| T9 | Owner selects one territory | Explicit approval | todo |
| T10 | Implement approved identity or revert runtime candidate | Code/assets | todo |
| T11 | Run knowledge/static/browser/PWA verification | CI and screenshots | todo |

## Evaluation

### Current result

| Area | Result |
|---|---|
| Brand strategy and story | pass |
| Messaging and voice | pass |
| Visual-system rules | pass |
| Application/governance rules | pass |
| Logo concept | pending/rejected candidate |
| Runtime identity | pending replacement or revert |
| CI/browser evidence | pending |

### Review findings

- The brand guideline is useful even before the final logo because it stabilizes product positioning, voice and visual rules.
- The previous logo contract overstated the maturity of the M candidate; this has been corrected.
- A logo must not be approved through code completion alone.
- Runtime changes should not merge until visual approval and evidence are complete.

## Delivery record

- Branch: `agent/moneyflow-logo-redesign`
- PR: #106
- PR state: should remain draft until identity approval
- Approved logo: pending
- CI: pending after final runtime scope is decided
- Production deployment: not applicable before merge
- Work packet completion: pending logo decision and delivery