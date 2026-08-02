# Public entry reference-led candidate v2

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** human owner  
**Issue/PR:** branch `design/public-entry-reference-led-v2`; PR pending  
**Last updated:** 2026-08-02

This packet describes an unapproved candidate. It does not record owner selection of landing, authentication, copy, color or visual direction.

## Outcome

Create a browser-testable landing and authentication candidate based on patterns observed in real personal-finance products rather than an invented named concept. The result must use natural Vietnamese, real MoneyFlow product screens, task-based sections and a focused authentication form. Production remains unchanged until explicit owner approval.

## Repository reconnaissance

### Current behavior

- Landing uses a proof-led hero with three overlapping product screenshots, repeated trace/control sections and decorative icons.
- Authentication uses a form plus an unconditional proof rail.
- Email/password, Google OAuth, CAPTCHA, privacy acceptance, recovery and intended-route redirects already work and must remain unchanged.
- Existing source and browser tests lock the current copy and structure and must be updated with the candidate.

### Relevant areas

| Area | Use |
|---|---|
| `src/components/landing-page.tsx` | Landing content and product-screen composition |
| `src/components/landing-page.module.css` | Responsive landing hierarchy |
| `src/components/auth-form.tsx` | Shared auth family and behavior |
| `src/components/auth-form.module.css` | Focused auth presentation |
| `src/components/public-brand-theme.module.css` | Existing semantic-token bridge; reuse unchanged |
| `src/lib/*landing*.test.ts`, `src/lib/auth-*.test.ts`, `src/lib/brand-ui-contract.test.ts` | Source contracts |
| `e2e/audit/critical-browser.audit.spec.ts` | Browser and dark-mode evidence |

## Research

### Decision question

Which recurring patterns from human-produced personal-finance product pages can MoneyFlow apply without copying their unsupported features or marketing claims?

### Source record

See `docs/research/PUBLIC_ENTRY_REFERENCE_STUDY_2026-08.md`.

Reviewed official surfaces from Money Lover, Monefy, Spendee, Lunch Money, Copilot Money and Monarch. The retained lessons are:

- one understandable first promise;
- one main real product screen in the hero;
- later sections tied to specific user jobs;
- restrained styling that lets product imagery and copy lead;
- authentication treated as a task rather than another marketing page;
- credibility limited to evidence the product actually has.

Bank sync, AI categorization, investments, collaboration, pricing, user counts, ratings and savings outcomes are not imported.

## Specification

### Problem

Previous candidates looked AI-generated because they relied on oversized slogans, repeated equal-card structures, generic fintech color treatment, decorative icons and a marketing rail beside authentication. The owner explicitly rejected those patterns.

### User stories

- As a visitor, I can understand what MoneyFlow does from one ordinary Vietnamese sentence.
- As a visitor, I can see actual MoneyFlow screens paired with the task they support.
- As a returning user, I can sign in without marketing content competing with the form.
- As the owner, I can inspect a real preview before deciding whether the direction should continue.

### Acceptance criteria

- [ ] Hero copy is direct Vietnamese and avoids slogan cadence.
- [ ] Hero contains one main MoneyFlow product screen, not a collage.
- [ ] Landing explains capture, accounts and transaction history in separate product-led sections.
- [ ] No generic feature-icon grid, testimonials, user counts or unsupported outcomes.
- [ ] Auth is one focused form surface with mode-specific copy.
- [ ] Existing Google, email/password, CAPTCHA, privacy, recovery and redirect behavior remains.
- [ ] Password fields include an accessible show/hide control.
- [ ] 320px, 390px, tablet and desktop layouts do not overflow.
- [ ] Light/dark, keyboard focus, 200% text and reduced-motion behavior remain usable.
- [ ] Static, unit, build, browser and responsive gates pass on the exact branch head.
- [ ] Preview links are opened and verified before being sent to the owner.
- [ ] No merge, production deployment or design-approval claim occurs without owner approval.

### Out of scope

- Signed-in product redesign.
- New product features.
- Bank integration or provider changes.
- Database, RLS, financial calculations or production data.
- Final color/brand decision.
- Production promotion.

## Implementation plan

| File/area | Change |
|---|---|
| Landing component | Replace collage/icon-card narrative with one hero screen and alternating product-job sections |
| Landing CSS | Use restrained spacing, real screenshot frames and responsive alternation |
| Auth component | Remove proof rail; simplify mode copy; add show/hide password |
| Auth CSS | Center a single form card and preserve mobile targets |
| Research and tests | Record sources and keep source/browser contracts truthful |

### Rollback

Close the draft PR and delete or abandon the focused branch. Production is untouched.

### Verification

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- affected browser smoke and UI audit selected by CI
- direct preview smoke for `/`, `/login`, `/register`, `/forgot-password`

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Research official comparable products and record applicable limits | done |
| T2 | Implement landing candidate | done |
| T3 | Implement focused auth family | done |
| T4 | Update source and browser contracts | doing |
| T5 | Open draft PR and add mandatory PR-memory record | todo |
| T6 | Resolve exact-head CI findings | todo |
| T7 | Deploy and manually verify preview routes | todo |
| T8 | Owner accepts, rejects or requests changes | todo |

## Permission boundary

- Allowed: focused branch, draft PR, CI inspection and one preview deployment.
- Forbidden: `main`, merge, production alias, provider configuration, database and production data.
- Human approval required before: merge, production promotion or recording a selected design direction.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | implementing | official-source study, current code audit, this packet | browser quality and copy tone not yet owner-reviewed | finish tests and open draft PR |
