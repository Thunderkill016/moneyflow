# Landing and authentication product-evidence redesign

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** pending  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet records the design decision, implementation scope and evidence required before owner review.

## Outcome

A first-time Vietnamese user should understand within seconds that MoneyFlow is a manual-first personal income-and-expense ledger, see real product evidence instead of fabricated financial claims, and reach registration or login through a focused, trustworthy and mobile-ready public experience. Authentication must preserve every existing Supabase, OAuth, recovery, privacy and CAPTCHA behavior while making the task itself visually primary.

## Repository reconnaissance

### Current behavior

- `main` still renders the rejected Signal Ledger landing narrative with numbered editorial sections, fabricated demonstration balances and a planning-oriented product stage.
- The current authentication surface mixes the form with a large concept-led presentation panel.
- PR #208 contains a later candidate that replaces fabricated dashboard content with real MoneyFlow screenshots and simplifies authentication, but it was built before the cumulative research ledger and before Signal Ledger was formally rejected on `main`.
- Playwright evidence from PR #208 was reviewed across phone, tablet, desktop, light and dark themes. It proves the product-evidence composition is implementable without overflow, but it remains a candidate requiring a fresh branch, current-main validation and owner visual approval.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Public narrative, CTA hierarchy and product proof | Replace concept-led copy and fabricated financial stage |
| `src/components/landing-page.module.css` | Public responsive visual system | Rebuild within component ownership; avoid root override layers |
| `src/components/auth-form.tsx` | Login, registration, recovery and password update behavior | Preserve actions and states; simplify information hierarchy |
| `src/components/auth-form.module.css` | Auth layout, validation, responsive and dark mode | Preserve form usability; remove decorative dominance |
| `src/app/page.tsx` | Metadata and public entry behavior | Align claims with product truth |
| `public/landing/*` | Durable product evidence | Use sanitized MoneyFlow test-environment screenshots only |
| `src/lib/*landing*`, `src/lib/*auth*` tests | Copy, structure and regression contracts | Update to current approved claims and task labels |
| `e2e/*` | Login/CAPTCHA and responsive evidence | Preserve behavior selectors and add current visible-text expectations |

### Existing tests and constraints

- Related unit tests: landing copy/refresh/dark-mode/brand contracts and auth copy/refresh contracts.
- Database/RLS tests: unchanged; no schema or ownership behavior is in scope.
- Browser tests: expense path, authentication CAPTCHA smoke and cross-device UI audit.
- Product/architecture rules: manual-first, no bank-sync implication, no AI advice, no fake recommendations, one primary action per viewport, 44px primary targets, light/dark support and physical-phone review before mobile-ready claims.

### Similar implementation and recent history

- Existing pattern to reuse: PR #208 real MoneyFlow screenshot assets, task-first auth copy and validated responsive structure.
- Relevant decisions: `docs/design/DESIGN_DIRECTION_STATUS.md` rejects Signal Ledger; `docs/research/UI_UX_RESEARCH_LEDGER.md` makes research cumulative while design concepts remain provisional.

### Open questions

- [x] Can real product evidence replace fabricated dashboard values without exposing user information? Yes: use sanitized test-environment captures already reviewed in PR #208.
- [x] Does login need a second marketing surface? Only a restrained factual proof rail on wide screens; the form remains the dominant task and the rail collapses below it on smaller screens.
- [x] Is a new dependency or design framework needed? No.

## Research

### Research scope and source selection

- Decision question: Which public composition best communicates MoneyFlow truth and trust without inheriting a rejected visual concept or turning login into a marketing page?
- Reference map consulted: `docs/research/UI_UX_RESEARCH_LEDGER.md` and task-relevant entries from `docs/research/REPOSITORY_REFERENCE_MAP.md`.
- Source budget: four focused sources already preserved in the ledger.
- Expected decision: select an information and interaction model, not a permanent named aesthetic.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Current MoneyFlow product behavior and browser evidence | Primary product evidence | 2026-08-02 | Real tasks, screenshots, mobile constraints and what users can actually do | Does not prove broad market preference |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Cumulative internal synthesis | 2026-08-02 | Trust before novelty, real evidence over fabricated claims, fast capture, explicit transaction types, recovery and accessibility | Does not prescribe a palette or layout |
| Actual Budget / Firefly III patterns preserved in ledger | Product references | previously accessed | Register-first provenance, ownership, transfer correctness and export trust | Do not copy envelope methodology, accounting density or code |
| GOV.UK / WCAG patterns preserved in ledger | Primary standards and service-design reference | previously accessed | Task-first content, visible focus, accurate labels, target size and clear validation | Do not copy public-service visual identity |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| A. Product evidence: direct value statement, real MoneyFlow screens, transaction-to-balance-to-ledger explanation | Strongest product truth, no fake social proof, clear manual-first differentiation, reusable in landing and auth | Requires careful screenshot sanitization and can become visually busy | **Implement as candidate** |
| B. Human lifestyle story with illustration or stock photography | Emotionally warm and visually distinctive | Weak evidence, generic fintech marketing, asset/licensing burden and risk of implying outcomes | Reject |
| C. Dense analytics showcase with multiple charts and KPIs | Demonstrates breadth quickly | Chart-first, fabricated values, poor mobile hierarchy and conflicts with daily-ledger identity | Reject |

### Research decision

Implement Option A as a candidate for owner review. The composition will use MoneyFlow’s current brand mark and factual manual-first message, but it will not establish green, card geometry, typography or any named concept as permanent product law. The selected slice uses real test-environment product captures, a single dominant registration CTA, a secondary in-page explanation link and a focused authentication form. Lifestyle marketing, invented balances, testimonials, user counts, savings claims, bank-sync language and advice are excluded.

### Adoption review

Not applicable. No dependency, provider, service, framework or architecture change.

## Specification

### Problem

The public landing and authentication surfaces on `main` are anchored to a rejected design concept and contain fabricated demonstration values that can be mistaken for product evidence. First-time users need a direct explanation of what MoneyFlow does, why manual-first matters and how a recorded transaction becomes a trustworthy balance. Returning users need an authentication surface that prioritizes completing the task, not reading a design narrative.

### User stories

- As a first-time visitor, I can understand that MoneyFlow records income, expense and transfers manually, so I know what the product is before registering.
- As a cautious user, I can see real MoneyFlow interface evidence and clear data-ownership limits, so I do not have to trust invented claims.
- As a returning user, I can log in, recover access or update my password without a decorative panel competing with the form.
- As a phone user, I can reach every action, validation message and CAPTCHA state without overflow or a hidden submit button.

### Acceptance criteria

- [ ] Landing hero states the manual-first ledger value without bank-sync, AI-advice or financial-outcome claims.
- [ ] Landing uses sanitized MoneyFlow test-environment screenshots and labels them as illustrative test data.
- [ ] No fabricated balances, user counts, testimonials, savings claims or unsupported recommendations remain in landing source.
- [ ] Landing explains the trace: record transaction → update account → open ledger to verify.
- [ ] One primary registration action dominates each viewport; login remains available.
- [ ] Login, registration, forgot-password and password-update modes preserve existing server actions, OAuth, privacy and CAPTCHA behavior.
- [ ] Auth headings and button labels describe the exact task.
- [ ] Light/dark, 200% text, keyboard focus and 320/360/390px layouts pass the repository UI audit.
- [ ] Existing expense and Auth CAPTCHA browser smokes pass.
- [ ] Owner reviews browser screenshots before merge.

### Required states

- Loading: pending buttons keep explicit `Đang xử lý…` state and `aria-busy`.
- Empty: not applicable to public landing; auth fields begin empty with useful examples.
- Populated: browser autofill and existing values remain legible.
- Validation/error: inline field messages, form-level alerts and CAPTCHA configuration failure remain visible.
- Recovery/undo: forgot-password and update-password routes remain reachable; no new destructive action.
- Long data / large VND: public screenshots must crop safely and never require reading a fabricated amount.
- Mobile/tablet/desktop: 320, 360, 390, 768, 1024, 1366 and 1440px.
- Accessibility: skip link, semantic headings, visible focus, label-in-name, non-color cues, reduced motion and at least 44px primary controls.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact because no domain calculation changes.
- Ownership/RLS implications: none; authentication actions and database behavior remain unchanged.
- Sanitized screenshots must contain no production account identity or user-owned data.

### Out of scope

- Auth provider configuration, Supabase settings, Turnstile settings or OAuth callback changes.
- Product dashboard, transaction workflow or design-system-wide redesign.
- New analytics, tracking, dependency, illustration system or marketing claim.
- Merge or production deployment by the agent.

## Implementation plan

### Architecture fit

The public presentation remains owned by the existing landing and auth components. Metadata stays in the root public route. No financial rule moves into UI and no new global stylesheet is introduced. Component CSS modules own responsive layout and theme variables for these surfaces.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/landing-page.tsx` | Replace Signal Ledger narrative with product-evidence hierarchy and real product captures | Communicate current product truth |
| `src/components/landing-page.module.css` | Implement responsive proof stage, trace flow, control section and dark mode | Create distinct but bounded public composition |
| `public/landing/*.svg` | Add sanitized test-environment product captures | Durable evidence without production data |
| `src/app/page.tsx` | Update metadata and structured-data description | Prevent unsupported public claims |
| `src/components/auth-form.tsx` | Keep all actions/states while using direct task copy and restrained proof rail | Make authentication primary |
| `src/components/auth-form.module.css` | Focused form card, responsive rail, validation and dark mode | Improve task completion and trust |
| landing/auth unit contracts | Replace old concept/copy expectations | Prevent regression to fabricated or rejected narrative |
| relevant Playwright audits | Preserve critical behavior and current visible labels | Browser-level evidence |
| this work packet | Record selection, constraints, evidence and handoff | Durable cross-session context |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing auth actions and routes remain unchanged.
- Rollback: revert this branch/PR; no provider or data rollback required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Real screenshots contain identifying data | Use sanitized test-environment SVG captures and explicit test-data note |
| Proof stage becomes unreadable on 320px | Recompose as stacked cards; audit all target widths |
| Login proof rail competes with form | Form receives larger column and rail collapses below/away on narrow screens |
| Copy implies automation or advice | Unit tests reject bank-sync, AI advice, daily spending and fabricated outcome language |
| New CSS leaks into product routes | CSS Modules only; no root override stylesheet |
| CAPTCHA or recovery behavior regresses | Auth CAPTCHA E2E and existing server-action contracts |

### Verification plan

- Static: knowledge, deployment environment, architecture, CSS ownership, lint and typecheck in CI.
- Unit/domain: full node test suite, with updated landing/auth source contracts.
- Database: full fresh reset and pgTAP in CI; expected unchanged.
- Browser flow: expense path and Auth CAPTCHA smoke.
- Responsive/visual: cross-device Playwright audit with screenshot artifacts in light/dark and WebKit critical paths.
- Production/manual: owner visual review of preview; exact production verification only after owner merge.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record reconnaissance, alternatives and specification | none | this packet | done |
| T2 | Create focused current-main branch | T1 | branch `design/landing-auth-product-evidence` | done |
| T3 | Implement landing product-evidence composition and assets | T2 | source diff | doing |
| T4 | Implement focused auth presentation without changing actions | T2 | source diff | todo |
| T5 | Update unit and browser contracts | T3, T4 | test diff | todo |
| T6 | Open PR and run exact-head CI | T5 | PR + workflow runs | todo |
| T7 | Review screenshot artifacts against acceptance criteria | T6 | audit artifact notes | todo |
| T8 | Hand off for owner visual review | T7 | ready-for-review PR | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | implementing | research ledger, current code, PR #208 evidence, this packet | owner has not yet visually approved the candidate | Implement focused branch and obtain CI evidence |

### Current permission boundary

- Granted scope: create and update a focused branch and pull request for landing/auth presentation.
- Exact repository: `Thunderkill016/moneyflow`.
- Forbidden writes: `main`, branch protection, providers, production data, Supabase/Vercel/Turnstile configuration.
- Human approval required before: merge and production deployment.
- Rollback or stop condition: any auth behavior, financial rule, user-data boundary or required check changes unexpectedly.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Pending | Exact-head CI and screenshot review | pending |

### Research and adoption evidence

- Selected sources still support the final implementation: pending final evaluation.
- Important source limitations remain respected: no market-generalization or copied competitor assets.
- New tool/dependency/pattern passed adoption review, or not applicable: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: no intended change; pending CI.
- UI/UX/accessibility: pending artifact review.
- Maintainability/duplication: pending diff review.
- Scope compliance: pending.

### Remaining limitations

- This candidate still requires owner visual judgment; automated checks cannot approve aesthetic quality.

## Delivery record

- Branch: `design/landing-auth-product-evidence`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
