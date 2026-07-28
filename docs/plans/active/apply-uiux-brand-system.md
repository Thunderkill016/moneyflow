# Apply MoneyFlow UI/UX and brand system

**Status:** implementing  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** pending  
**Last updated:** 2026-07-28

## Outcome

Apply the approved MoneyFlow brand guideline and canonical M logo to real product UI through a coherent first vertical slice: public landing, authentication and the signed-in navigation shell. The result must use one reusable identity component, one primary action per viewport, Vietnamese-first product truth and Calm Ledger visual rules without changing financial behavior.

## Repository reconnaissance

### Current behavior

- The canonical M logo exists in `src/app/icon.svg`, but repeated in-product marks are still replaced through broad compatibility selectors in `src/app/ai-uiux-guardrails.css`.
- Landing, auth and app shell each own separate brand-link markup and separate placeholder glyph CSS.
- The public landing currently shows a primary registration button in both the sticky header and hero, creating two competing primary actions in the first viewport.
- Landing and auth are already responsive CSS-module surfaces using Calm Ledger semantic tokens, but prominent copy still mixes feature explanation with the newer brand promise and message hierarchy.
- The signed-in shell already follows the Calm Ledger navigation model and must retain all search, capture, account, toast and mobile navigation behavior.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand foundation, promise, voice and claim limits | Reuse and update canonical implementation reference |
| `docs/design/MONEYFLOW_LOGO.md` | Approved M geometry and misuse rules | Reuse and update in-product source |
| `docs/design/CALM_LEDGER_V2.md` | Controlling visual and interaction contract | Reuse |
| `src/app/icon.svg` | Canonical vector geometry | Reuse exactly |
| `src/app/ai-uiux-guardrails.css` | Temporary global logo compatibility hack | Remove only logo-specific block |
| `src/components/landing-page.tsx` | Public product truth and first conversion flow | Change hierarchy, CTA and shared logo use |
| `src/components/auth-form.tsx` | Registration/login trust and ownership messaging | Change copy and shared logo use; preserve auth actions |
| `src/components/layout/app-shell.tsx` | Signed-in brand/navigation shell | Change only identity component and demo wording |
| `src/components/brand/` | New reusable presentation owner | Add canonical in-product logo component |

### Existing tests and constraints

- Related unit tests inspect app-shell source and mobile navigation contracts.
- Database/RLS tests are not expected to change, but the full CI database job remains required.
- Browser tests cover landing/auth/dashboard, phone-to-desktop layouts, dark mode, WebKit, keyboard focus and 200% text.
- Product and architecture rules: no guessed financial advice, no new global CSS owner, one primary action per viewport, component CSS modules for migrated presentation.

### Similar implementation and recent history

- Existing pattern to reuse: CSS-module ownership in `src/components/layout/app-shell.module.css`, `landing-page.module.css` and `auth-form.module.css`.
- Relevant history: PR #92 shipped Calm Ledger shell/dashboard; PR #106 approved the brand guideline and M logo but intentionally left repeated wrappers for a later component migration.

### Open questions

- [x] Which logo is latest and approved? Canonical M logo v1 in `src/app/icon.svg` and `docs/design/MONEYFLOW_LOGO.md`.
- [x] Should this redesign copy Apple visuals? No; apply purpose, simplicity, familiarity, agency and craft without copying Apple styling.
- [x] Can the whole application be redesigned safely in one PR? No; use a coherent vertical slice and preserve runtime behavior.

## Research

### Questions researched

1. Which internal workflow controls this change?
2. Which identity and message claims are approved?
3. Which UI direction best fits the product and current system?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `docs/AI_UIUX_WORKFLOW.md` | 2026-07-28 | Brief → audit → three directions → selection → vertical slice → verification | Internal workflow authority |
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | 2026-07-28 | Brand promise, voice, primary message and claim boundaries | Does not replace product law |
| `docs/design/MONEYFLOW_LOGO.md` | 2026-07-28 | Approved M geometry, variants and accessibility rules | Geometry must remain unchanged |
| `docs/design/CALM_LEDGER_V2.md` | 2026-07-28 | Neutral-first surfaces, one green accent, one primary CTA, landing/auth requirements | Current UI visual authority |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A — Calm Ledger Entry | Strong hierarchy, neutral-first, one CTA, factual trust proof, shared identity | Less decorative marketing impact | Selected |
| B — Analytics-first Entry | Shows more charts and metrics | Misrepresents a manual-first ledger and crowds phones | Rejected |
| C — Coach-led Entry | More guidance and motivational copy | Risks judgment and unsupported financial advice | Rejected |

### Research decision

Use Calm Ledger Entry. Consolidate the approved M geometry into one CSS-module component, use the brand promise and primary message as hierarchy, retain factual trust proof and preserve all auth, ledger and navigation behavior. This PR is the first real UI implementation slice, not a claim that every feature route has been redesigned.

## Specification

### Problem

The owner requested that the researched UI/UX workflow, latest logo and brand guideline be applied to MoneyFlow. The repository currently has the approved documents and vector, but identity is still injected through a compatibility CSS hack and entry surfaces do not fully embody the selected message/CTA hierarchy.

### User stories

- As a new visitor, I can understand what MoneyFlow does and why it is trustworthy within the first viewport.
- As a user signing in or registering, I see consistent brand identity and factual ownership/security messaging.
- As a signed-in user, I see the same canonical logo without changing navigation or financial workflows.
- As a maintainer, I can update the logo in one component rather than maintaining several CSS drawings.

### Acceptance criteria

- [ ] Landing, auth and app shell render the exact canonical M path through one reusable component.
- [ ] The temporary global logo replacement selectors are removed.
- [ ] Landing first viewport has one primary registration action and one secondary explanatory action.
- [ ] Landing and auth copy follow the approved brand promise, primary message, Vietnamese tone and claim boundaries.
- [ ] Google/email auth actions, search, capture, navigation, account sheet, sign-out, demo state and toast behavior remain unchanged.
- [ ] Brand green remains separate from income/success semantics.
- [ ] Phone, tablet, desktop, dark, WebKit, keyboard and 200% text checks pass.

### Required states

- Loading: existing auth pending state remains unchanged.
- Empty: not introduced by this slice.
- Populated: landing preview and signed-in shell remain populated with existing representative/real data.
- Validation/error: auth field errors and form message behavior remain unchanged.
- Recovery/undo: auth recovery and app-shell toast action remain unchanged.
- Long data / large VND: no financial value layout is changed.
- Mobile/tablet/desktop: shared identity must preserve current breakpoints and minimum targets.
- Accessibility: decorative mark is `aria-hidden`; links keep one explicit accessible name; forced-colors treatment remains visible.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none; no persistence, schema, server action or policy change.

### Out of scope

- Redesigning transaction, account, planning, import, report or settings route bodies.
- Changing financial formulas, data models, auth providers or navigation information architecture.
- Introducing a second logo direction, gradients, glass, gamification or AI advice.

## Implementation plan

### Architecture fit

Reusable cross-surface brand presentation belongs in `src/components/brand/` with CSS-module ownership. Route/component files compose it. The root/global CSS compatibility layer must stop owning logo geometry once the last repeated wrapper migrates.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/brand/brand-lockup.tsx` | Add canonical `BrandMark` and `BrandLockup` | One implementation source |
| `src/components/brand/brand-lockup.module.css` | Add sizes, default/reversed tones and forced-colors support | Component ownership and accessibility |
| `src/components/landing-page.tsx` | Use shared identity; improve first-viewport message and CTA hierarchy | Apply brand + workflow to public entry |
| `src/components/auth-form.tsx` | Use shared identity; align story/copy with brand promise | Apply brand to auth without behavior change |
| `src/components/layout/app-shell.tsx` | Use shared identity; keep shell behavior | Consistency across signed-in product |
| `src/app/ai-uiux-guardrails.css` | Remove temporary logo selectors | End duplicate/global identity source |
| Brand/logo docs | Point canonical in-product implementation to shared component | Keep authority accurate |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: same routes and actions; CSS-module component replaces decorative markup.
- Rollback: revert component adoption and restore compatibility selectors in one PR if browser evidence fails.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| SVG size changes break header/auth layout | Preserve external class names and component size variants; responsive audit |
| Accessible name is duplicated | Mark SVG decorative and keep one link `aria-label` |
| Reversed mark loses contrast | Dedicated inverse tone and forced-colors rules |
| Static tests expect app-shell behavior/source patterns | Preserve functional source sections and run full unit suite |
| Landing still exposes two primary CTAs | Remove header registration button; keep hero primary + secondary explanation |
| Copy overclaims product capability | Use only approved brand guideline claims |

### Verification plan

- Static: knowledge, deployment, architecture, CSS ownership, lint, typecheck.
- Unit/domain: complete test suite.
- Database: fresh reset + pgTAP through CI.
- Browser flow: landing, login/register and dashboard smoke.
- Responsive/visual: production cross-device audit and screenshot artifact review.
- Production/manual: verify landing, auth, dashboard logo and favicon after merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit brand/UI implementation and recent history | none | reconnaissance above | done |
| T2 | Define selected direction and acceptance criteria | T1 | specification above | done |
| T3 | Add reusable canonical identity component | T2 | branch diff | in progress |
| T4 | Apply component and brand hierarchy to landing/auth/shell | T3 | branch diff | todo |
| T5 | Remove compatibility logo hack and update docs | T4 | branch diff | todo |
| T6 | Run CI and review browser evidence | T5 | workflow/artifacts | todo |
| T7 | Independent evaluation and owner review | T6 | evaluation record | todo |
| T8 | Merge and verify production | T7 | exact deployment | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| One reusable canonical identity | pending | pending |
| First-viewport CTA hierarchy | pending | pending |
| Brand-aligned copy | pending | pending |
| Behavior preserved | pending | pending |
| Responsive/accessibility evidence | pending | pending |

### Review findings

- Correctness: pending implementation and CI.
- Security/ownership: no data/security boundary change planned.
- UI/UX/accessibility: pending browser evidence.
- Maintainability/duplication: shared component removes duplicate mark geometry.
- Scope compliance: focused entry-and-shell vertical slice only.

### Remaining limitations

- Feature route bodies remain separate future vertical slices.
- Physical-device acceptance and exact production verification remain required after merge.

## Delivery record

- Branch: `agent/apply-uiux-brand-system`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
