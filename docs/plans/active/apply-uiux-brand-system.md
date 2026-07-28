# Apply MoneyFlow UI/UX and brand system

**Status:** evaluating  
**Owner:** MoneyFlow / OpenAI agent  
**Issue/PR:** pending  
**Last updated:** 2026-07-28

## Outcome

Apply the approved MoneyFlow brand guideline and canonical M logo to real product UI through a coherent first vertical slice: public landing, authentication and signed-in identity. The result uses a reusable identity component on migrated surfaces, one primary action in the landing first viewport, Vietnamese-first product truth and Calm Ledger rules without changing financial behavior.

## Repository reconnaissance

### Current behavior

- `src/app/icon.svg` is the approved M logo, but landing, auth and app shell previously rendered placeholder glyph markup that was broadly replaced by global CSS.
- Landing showed a primary registration action in both the sticky header and hero.
- Landing/auth already used responsive CSS modules and Calm Ledger tokens, but their primary copy did not fully follow the newer brand message hierarchy.
- The signed-in shell already follows Calm Ledger navigation and must retain search, capture, account, toast and mobile navigation behavior.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | Brand promise, voice and claim limits | Reuse |
| `docs/design/MONEYFLOW_LOGO.md` | Approved M geometry and misuse rules | Reuse and update implementation record |
| `docs/design/CALM_LEDGER_V2.md` | Controlling visual/interaction contract | Reuse |
| `src/app/icon.svg` | Canonical vector geometry | Reuse exactly |
| `src/components/brand/` | Reusable presentation owner | Add canonical lockup component |
| `src/components/landing-page.tsx` | First product decision and conversion flow | Change hierarchy, copy, CTA and logo |
| `src/components/auth-form.tsx` | Trust, registration and recovery | Change copy and logo; preserve actions |
| `src/app/ai-uiux-guardrails.css` | Legacy shell identity bridge | Narrow to one exact signed-in selector and canonical asset |

### Existing tests and constraints

- Unit tests inspect app-shell and mobile navigation source contracts.
- Browser tests cover entry/auth/dashboard, phone-to-desktop, dark mode, WebKit, keyboard and 200% text.
- No new global CSS owner is allowed.
- One primary action per viewport; no guessed financial advice; brand green is not income/success.

### Similar implementation and recent history

- Existing pattern: CSS-module ownership in landing, auth and app shell.
- PR #92 shipped the Calm Ledger signed-in shell/dashboard.
- PR #106 approved the brand guideline and M logo but left a broad compatibility implementation for later migration.

### Open questions

- [x] Latest logo: canonical M v1 in `src/app/icon.svg`.
- [x] Visual direction: Calm Ledger Entry, not an Apple visual imitation.
- [x] Safe scope: migrate entry surfaces now; do not combine every feature route into one risky redesign PR.
- [x] Signed-in shell source migration: defer the large component rewrite; narrow its bridge to the exact canonical asset so behavior remains untouched.

## Research

### Questions researched

1. Which internal workflow controls the change?
2. Which brand statements and identity geometry are approved?
3. Which direction fits a manual-first ledger?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `docs/AI_UIUX_WORKFLOW.md` | 2026-07-28 | Brief → audit → three directions → selection → vertical slice → verification | Internal workflow |
| `docs/brand/MONEYFLOW_BRAND_GUIDELINES.md` | 2026-07-28 | Promise, message, voice and claim boundaries | Product law remains higher authority |
| `docs/design/MONEYFLOW_LOGO.md` | 2026-07-28 | Approved M geometry and accessibility | Geometry cannot drift |
| `docs/design/CALM_LEDGER_V2.md` | 2026-07-28 | Neutral-first UI, one green accent, landing/auth requirements | Current visual authority |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A — Calm Ledger Entry | Clear hierarchy, factual trust proof, one CTA | Less decorative | Selected |
| B — Analytics-first | More metrics/charts | Crowds phones and misstates product identity | Rejected |
| C — Daily Coach | Strong guidance | Risks judgment and unsupported advice | Rejected |

### Research decision

Use Calm Ledger Entry. Make the brand promise and primary message the hierarchy, use the exact approved M asset, retain factual trust proof and preserve all financial/auth/navigation behavior. This is a real production slice, not a claim that every feature route is redesigned.

## Specification

### Problem

The project had approved design/process documents and a logo asset, but entry UI still used duplicated placeholder marks, broad CSS replacement and competing primary actions. The design system had not been applied as an implementation decision.

### User stories

- As a visitor, I understand what MoneyFlow does and why it is trustworthy within the first viewport.
- As a person signing in/registering, I see consistent identity and factual ownership/security messaging.
- As a signed-in user, I see the same canonical logo without changed navigation behavior.
- As a maintainer, migrated surfaces reuse one tested logo component rather than redrawing the mark.

### Acceptance criteria

- [x] Landing and auth render the exact canonical M path through one reusable component.
- [x] Signed-in identity loads the exact canonical `/icon.svg` through one deliberately narrow temporary bridge.
- [x] The old broad `aria-label^=` and CSS polygon logo replacement are removed.
- [x] Landing first viewport has one primary registration action and one secondary explanation action.
- [x] Landing/auth copy follows the approved primary message, promise, tone and claim boundaries.
- [x] Google/email auth, recovery, search, capture, navigation, account, sign-out and toast logic are unchanged.
- [ ] Static, unit, database and browser checks pass.
- [ ] Screenshot evidence is reviewed.

### Required states

- Loading: existing auth pending state preserved.
- Empty: no new empty state.
- Populated: representative ledger preview and signed-in content preserved.
- Validation/error: field-local auth errors and form messages preserved.
- Recovery/undo: password recovery and shell toast action preserved.
- Long data / large VND: no financial-value layout changed.
- Mobile/tablet/desktop: existing breakpoints and 44px targets preserved.
- Accessibility: decorative SVG is hidden; link has one accessible name; forced-colors treatment exists.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- No persistence, schema, server action, RLS or policy change.

### Out of scope

- Feature-route body redesigns for transactions, accounts, planning, imports, reports and settings.
- Auth provider, financial formula, information architecture or data-model changes.
- A second logo direction, gradients, glass, gamification or AI financial advice.
- Rewriting the large signed-in shell component solely to replace decorative markup.

## Implementation plan

### Architecture fit

Reusable cross-surface brand presentation belongs in `src/components/brand/` with CSS-module ownership. Landing and auth compose it directly. The existing signed-in wrapper remains behaviorally unchanged and its global bridge is reduced to one exact selector that displays the canonical SVG asset; a later shell slice can remove that final bridge.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/brand/brand-lockup.tsx` | Add canonical `BrandMark` and `BrandLockup` | Shared implementation |
| `src/components/brand/brand-lockup.module.css` | Sizes, reversed tone and forced-colors | Component ownership |
| `src/components/landing-page.tsx` | Shared logo, brand message and single first-viewport CTA | Public UI/UX application |
| `src/components/auth-form.tsx` | Shared logo and approved trust copy | Auth UI/UX application |
| `src/app/ai-uiux-guardrails.css` | Remove broad polygon replacement; narrow shell bridge to `/icon.svg` | Preserve shell behavior without identity drift |
| `src/lib/brand-ui-contract.test.ts` | Enforce path equality, component use and CTA/bridge contracts | Prevent regression |
| `docs/design/MONEYFLOW_LOGO.md` | Record component and temporary bridge | Accurate authority |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: same routes/actions; presentation-only changes.
- Rollback: revert component adoption and bridge narrowing if browser evidence fails.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Logo path drifts from app icon | Source-contract test extracts and compares both paths |
| Duplicate accessible name | SVG decorative; link owns label |
| Reversed logo loses contrast | Dedicated inverse class and forced-colors rules |
| Header/hero compete | Header registration button removed |
| Shell behavior changes during logo migration | Shell TSX untouched; exact selector bridge only |
| Copy overclaims capability | Approved guideline claims only |

### Verification plan

- Static: knowledge, deployment, architecture, CSS ownership, lint, typecheck.
- Unit/domain: complete test suite including brand contract.
- Database: fresh reset + pgTAP in CI.
- Browser flow: landing, login/register and dashboard smoke.
- Responsive/visual: cross-device audit and screenshot artifact review.
- Production/manual: verify landing, auth, dashboard identity and favicon after merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Audit current UI, constraints and history | none | reconnaissance | done |
| T2 | Compare three directions and select Calm Ledger Entry | T1 | research/spec | done |
| T3 | Add canonical brand component | T2 | branch diff | done |
| T4 | Apply brand hierarchy to landing and auth | T3 | branch diff | done |
| T5 | Narrow shell bridge and add regression contract | T3 | branch diff | done |
| T6 | Open PR and run CI | T4,T5 | PR/workflow | in progress |
| T7 | Review browser evidence and evaluate diff | T6 | artifacts/evaluation | todo |
| T8 | Merge and verify production | T7 | exact deployment | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Canonical path shared on migrated surfaces | `brand-ui-contract.test.ts` + diff | pending CI |
| One first-viewport primary CTA | landing source contract | pending CI |
| Brand-aligned copy | landing/auth diff against guideline | pass by inspection |
| Runtime behavior preserved | no action/domain changes; full CI pending | pending |
| Responsive/accessibility quality | Playwright artifacts pending | pending |

### Review findings

- Correctness: implementation matches selected direction; automated evidence pending.
- Security/ownership: no data/security boundary change.
- UI/UX/accessibility: component has inverse/forced-colors support; browser review pending.
- Maintainability/duplication: landing/auth no longer draw separate marks; broad global replacement removed.
- Scope compliance: focused entry-and-identity vertical slice.

### Remaining limitations

- Feature-route bodies remain future vertical slices.
- Signed-in shell still needs a later component-source migration to remove its final narrow bridge.
- Physical-device and exact production verification remain required after merge.

## Delivery record

- Branch: `agent/apply-uiux-brand-system`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
