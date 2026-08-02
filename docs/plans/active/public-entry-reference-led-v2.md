# Public entry reference-led candidate v2

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write + provider preview only  
**Owner:** human owner  
**Issue/PR:** PR #225; branch `design/public-entry-reference-led-v2`  
**Last updated:** 2026-08-02

This packet describes an unapproved candidate. It does not record owner selection of landing, authentication, copy, color or visual direction.

## Outcome

Create a browser-testable landing and authentication candidate based on patterns observed in real personal-finance products rather than an invented named concept. The result must use natural Vietnamese, real MoneyFlow product screens, task-based sections and a focused authentication form. Production remains unchanged until explicit owner approval.

## Repository reconnaissance

### Current behavior

- Landing uses a proof-led hero with three overlapping product screenshots, repeated trace/control sections and decorative icons.
- Authentication uses a form plus an unconditional proof rail.
- Email/password, Google OAuth, CAPTCHA, privacy acceptance, recovery and intended-route redirects already work and must remain unchanged.
- Existing source and browser tests lock the current copy and structure and were updated with the candidate.

### Relevant areas

| Area | Use |
|---|---|
| `src/components/landing-page.tsx` | Landing content and product-screen composition |
| `src/components/landing-page.module.css` | Responsive landing hierarchy |
| `src/components/auth-form.tsx` | Shared auth family and behavior |
| `src/components/auth-form.module.css` | Focused auth presentation |
| `src/components/public-brand-theme.module.css` | Existing semantic-token bridge; reused unchanged |
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

- [x] Hero copy is direct Vietnamese and avoids slogan cadence.
- [x] Hero contains one main MoneyFlow product screen, not a collage.
- [x] Landing explains capture, accounts and transaction history in separate product-led sections.
- [x] No generic feature-icon grid, testimonials, user counts or unsupported outcomes.
- [x] Auth is one focused form surface with mode-specific copy.
- [x] Existing Google, email/password, CAPTCHA, privacy, recovery and redirect behavior remains in the Next.js implementation.
- [x] Password fields include an accessible show/hide control.
- [x] Repository-selected responsive and browser gates pass on the exact branch head.
- [x] Static, unit, build, browser, CodeQL and secret-history gates pass on exact head `72a0f15f00811013fbf4eb054dc42b14fcc19a4a`.
- [x] A noindex Vercel review deployment is READY and its landing returns HTTP 200.
- [ ] Owner visual review accepts, rejects or requests revision.
- [x] No merge, production deployment or design-approval claim occurred.

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

### Verification evidence

- CI run `30750648519`: success.
- CodeQL run `30750648487`: success.
- Secret history scan `30750648486`: success.
- Preview deployment `dpl_Cu1t5jGgNwayaPTVVwDRHqzxHwJj`: READY.
- Review bundle is noindex and clearly states that forms do not submit real data.
- The preview mirrors the visual hierarchy/copy of PR #225; the PR contains the real Next.js/Auth implementation and is the executable source of truth.

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Research official comparable products and record applicable limits | done |
| T2 | Implement landing candidate | done |
| T3 | Implement focused auth family | done |
| T4 | Update source and browser contracts | done |
| T5 | Open draft PR and add mandatory PR-memory record | done |
| T6 | Resolve exact-head CI findings | done |
| T7 | Deploy and verify the noindex review bundle | done |
| T8 | Owner accepts, rejects or requests changes | todo |

## Permission boundary

- Allowed: focused branch, draft PR, CI inspection and one preview deployment.
- Forbidden: `main`, merge, production alias, provider configuration, database and production data.
- Human approval required before: merge, production promotion or recording a selected design direction.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher/planner | implementer | implementing | official-source study, current code audit, work packet | browser quality and copy tone not owner-reviewed | implement focused candidate |
| 2026-08-02 | implementer | evaluator/owner | evaluating | PR #225, exact-head green CI/CodeQL/secret scan, READY noindex review deployment | visual quality and Vietnamese tone require human judgment | owner reviews preview and accepts, rejects or requests revision |
