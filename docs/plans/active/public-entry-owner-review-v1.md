# Public entry owner-review candidate v1

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** provider_write_approved  
**Owner:** human owner  
**Issue/PR:** branch `design/public-entry-owner-review-v1`; PR not opened yet  
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet describes one review candidate. It does not record an owner-selected design direction.

## Outcome

Provide a real, browser-testable preview of a redesigned MoneyFlow landing page and authentication family. The candidate must use natural Vietnamese, avoid generic AI-generated icon-card composition, preserve the existing product and Auth behavior, and remain isolated from production until the owner explicitly approves it.

## Repository reconnaissance

### Current behavior

- `/` renders a proof-led split hero with three product screenshots, repeated workflow explanation and several icon-card sections.
- `/login`, `/register`, `/forgot-password` and password update share one Auth component with a form plus a factual proof rail.
- Email/password, Google OAuth, recovery, CAPTCHA, privacy acceptance, demo behavior and redirects already work and must remain unchanged.
- Existing source-contract tests assert the current copy and composition, so the tests must be updated together with the candidate.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/landing-page.tsx` | Public positioning and page hierarchy | Replace composition and copy; preserve routes and factual claims |
| `src/components/landing-page.module.css` | Landing layout and responsive behavior | Replace visual composition; keep semantic theme bridge |
| `src/components/auth-form.tsx` | Shared login/register/recovery behavior | Preserve actions and field contracts; replace surrounding presentation |
| `src/components/auth-form.module.css` | Auth hierarchy and responsive behavior | Replace proof-rail layout with task-first ledger composition |
| `src/components/public-brand-theme.module.css` | Maps public surfaces to project theme tokens | Reuse unchanged |
| `src/lib/*landing*.test.ts`, `src/lib/auth-*.test.ts`, `src/lib/brand-ui-contract.test.ts` | Durable source contracts | Update only claims invalidated by the new candidate |
| Vercel preview deployment | Direct owner review | Preview only; never promote or alias to production without owner approval |

### Existing tests and constraints

- Related unit tests: landing copy/refresh, Auth copy/refresh and brand UI contracts.
- Browser tests: Auth CAPTCHA, baseline flows and responsive UI audit.
- Product/architecture rules: one primary action per viewport; manual-first; no bank-sync implication; no invented advice; Vietnamese first; 44px controls; color is not the only carrier of meaning.
- Code remains inside the existing Next.js component/CSS-module ownership boundaries.

### Similar implementation and recent history

- PR #213 merged one implementation candidate but did not establish owner approval of its landing, Auth or visual direction.
- `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` and `docs/AI_UIUX_WORKFLOW.md` require owner review and treat implementations as candidates until explicit selection.

### Open questions

- [x] Should the next evaluation be a generated image or a real browser preview? Owner explicitly required a real implementation and preview link.
- [x] May production be changed now? No. Preview only; production requires later explicit approval.
- [ ] Does this candidate feel natural and specific enough to MoneyFlow? Owner review on the preview URL is required.

## Research

### Research scope and source selection

- Decision question: How can the current landing and Auth be made recognizably MoneyFlow, more natural in Vietnamese and less like a generic AI template without changing product behavior?
- Reference map consulted: existing repository research and current public-experience foundation; no additional external source was necessary for this bounded iteration.
- Source budget: four focused internal authorities.
- Expected decision or uncertainty to resolve: whether an editorial digital-ledger composition and task-first Auth are worth refining or should be rejected.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| `docs/product/PRINCIPLES.md` | Current product authority | 2026-08-02 | Vietnamese manual-first ledger; calm, factual, non-judgmental; mobile first | Does not select a visual composition |
| `docs/research/PUBLIC_EXPERIENCE_FOUNDATION.md` | Current research/process | 2026-08-02 | Honest claims, semantic boundaries and owner selection requirement | Its blue/white direction remains a candidate, not owner approval |
| `docs/AI_UIUX_WORKFLOW.md` | UI/UX delivery contract | 2026-08-02 | Real code prototype, multiple-state Auth, owner visual review and responsive evidence | Does not make any candidate final |
| Current landing/Auth source and tests | Executable truth | 2026-08-02 | Existing routes, actions, fields and responsive contracts | Current copy/composition may be replaced on this branch |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep current screenshot-heavy hero and icon cards | Already implemented and tested | Repetition, generic composition and owner rejection signals | Reject for this candidate |
| Continue with generated design-board images | Fast to compare | Does not prove browser feel, responsive behavior or implementation quality | Rejected by owner |
| Editorial digital-ledger page with live HTML/CSS data rows | Specific to MoneyFlow, fewer generic icons, directly testable | May need another iteration if tone feels too stark | Implement as candidate v1 |
| Marketing-heavy lifestyle landing | More emotional | Risks unsupported claims and weak product evidence | Reject |

### Research decision

Implement one real candidate rather than claiming a final direction. Use natural, concise Vietnamese centered on the everyday problem “ghi để khỏi phải đoán”; use transaction and account rows as the visual language instead of generic feature icons; keep Auth task-first and remove the unconditional proof rail. Preserve all existing Auth behavior and semantic theme ownership.

### Adoption review

Not applicable. No dependency, framework, provider product or architecture pattern is added. The only provider write is one reversible Vercel preview deployment from the focused branch.

## Specification

### Problem

The current public experience is technically complete but reads and looks like a generic generated fintech template: the landing repeats abstract product language and icon-card patterns, while Auth carries a reusable proof rail that competes with the task. The owner cannot evaluate a replacement accurately from generated images.

### User stories

- As a first-time Vietnamese visitor, I can understand what MoneyFlow helps me do from natural language in the first viewport.
- As a cautious visitor, I can see how transactions affect accounts without fake testimonials, user counts or financial promises.
- As a returning user, I can sign in without marketing content competing with the form.
- As the owner, I can open a preview URL on desktop and phone before deciding whether anything should reach production.

### Acceptance criteria

- [ ] Landing first viewport uses natural Vietnamese and one clear primary action.
- [ ] Landing composition avoids generic icon-card grids and uses transaction/account evidence rendered as real HTML/CSS.
- [ ] Landing states manual-first, transfer neutrality, correction/recovery and export boundaries honestly.
- [ ] Login/register/recovery/update preserve all current actions, fields, CAPTCHA, OAuth, redirects and privacy behavior.
- [ ] Auth removes the unconditional proof rail and uses mode-appropriate copy.
- [ ] Password fields provide an accessible show/hide control without breaking password managers or autocomplete.
- [ ] 320px, 390px, tablet and desktop layouts do not overflow.
- [ ] Relevant static, unit, build, browser and responsive gates pass on the exact branch head.
- [ ] A Vercel preview URL is available for owner review.
- [ ] No production deployment, alias, merge or owner-selection claim occurs.

### Required states

- Loading: existing pending text and disabled actions remain.
- Empty: public pages need no user data to render.
- Populated: illustrative transaction/account rows are clearly labeled as sample data.
- Validation/error: existing inline Auth errors and generic messages remain.
- Recovery/undo: forgot/reset routes and links remain reachable.
- Long data / large VND: rows use tabular figures and wrapping/ellipsis without hiding meaning.
- Mobile/tablet/desktop: deliberate single-column mobile layout; no collapsed desktop overlap.
- Accessibility: skip link, semantic headings, visible labels, focus styles, 44px controls and reduced motion.

### Financial and security constraints

- No guessed recommendation, safe-to-spend claim or bank-sync implication.
- Illustrative values are explicitly marked as sample data and do not represent a real user.
- Integer VND formatting and transfer neutrality are represented correctly.
- No database, RLS, Auth action, provider configuration or user-data mutation.

### Out of scope

- Final brand/color approval.
- Changes to the signed-in product UI.
- Auth provider configuration or callback behavior.
- Production promotion, merge or domain alias.
- Conversion analytics conclusions.

## Implementation plan

### Architecture fit

The public route remains owned by `LandingPage`; the shared Auth family remains owned by `AuthForm`; styles remain in their existing CSS modules; the public semantic token bridge remains unchanged. No new component framework or design layer is introduced.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/components/landing-page.tsx` | Replace screenshot/icon-card composition with editorial ledger hierarchy and natural copy | Address owner feedback and make the product evidence specific |
| `src/components/landing-page.module.css` | Implement asymmetric desktop ledger layout and deliberate mobile stack | Create a non-template visual language without new dependencies |
| `src/components/auth-form.tsx` | Replace proof rail with contextual ledger panel; add show/hide password; revise mode copy | Keep form primary and language task-specific |
| `src/components/auth-form.module.css` | Implement split ledger/form desktop and compact mobile header | Distinguish Auth while preserving completion focus |
| Source-contract tests | Update assertions to the candidate behavior | Keep repository tests truthful |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing routes, field names, Server Actions and redirect contracts remain.
- Rollback: delete the preview branch or revert its focused commits; production remains untouched.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Natural copy becomes too casual or vague | Keep product facts explicit and require owner review |
| Illustrative balances look like real claims | Label the panel “Dữ liệu minh hoạ” and avoid outcomes/testimonials |
| Auth redesign breaks CAPTCHA or Server Action forms | Preserve action/form structure and run Auth CAPTCHA browser tests |
| Desktop composition collapses badly on phone | Mobile-first breakpoints, 320px browser audit and overflow checks |
| Tests remain tied to the old candidate | Update only directly affected source-contract assertions |
| Preview accidentally reaches production | Use non-main branch preview only; no promote/production alias action |

### Verification plan

- Static: project knowledge, CI classification, deployment/CSS/architecture contracts, lint and typecheck.
- Unit/domain: landing/Auth/brand source-contract tests and full selected unit suite.
- Database: not applicable; no database contract changes.
- Browser flow: baseline and Auth CAPTCHA tests.
- Responsive/visual: repository UI audit plus direct review at 320/390/768/1366 and light/dark where supported.
- Production/manual: Vercel preview route smoke only. Production is explicitly forbidden.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record candidate scope, permission and rollback | none | this packet | done |
| T2 | Implement landing candidate | T1 | source diff + source-contract tests | doing |
| T3 | Implement Auth candidate | T1 | source diff + Auth tests | todo |
| T4 | Update affected source-contract tests | T2, T3 | unit suite | todo |
| T5 | Evaluate responsive/browser behavior | T2–T4 | CI + screenshots/browser inspection | todo |
| T6 | Deploy exact branch head to Vercel preview | T5 | preview deployment URL and smoke | todo |
| T7 | Owner accepts, rejects or requests another iteration | T6 | explicit owner decision | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher / planner | implementer | implementing | current code audit, existing public research, owner feedback, this packet | visual quality and Vietnamese tone remain unverified until browser review | implement focused landing/Auth candidate on branch |

### Current permission boundary

- Granted scope: one focused GitHub branch plus one Vercel preview deployment.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow`, Vercel project `moneyflow` preview environment.
- Forbidden writes: `main`, merge, production alias/deployment, production provider settings, database, user data and unrelated branches.
- Human approval required before: PR merge, production promotion, final direction status or project-wide visual-token change.
- Rollback or stop condition: revert/delete branch candidate if build, Auth behavior, responsive audit or owner review fails.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Candidate isolated from production | focused branch | pass |
| Remaining criteria | pending implementation and CI | pending |

### Research and adoption evidence

- Selected internal authorities support a manual-first, task-focused and owner-reviewed implementation.
- No source establishes that this candidate is selected or final.
- New tool/dependency/pattern: not applicable.

### Review findings

- Correctness: pending.
- Security/ownership: no intended behavior change; pending exact-head checks.
- UI/UX/accessibility: pending browser review.
- Maintainability/duplication: existing owners retained.
- Scope compliance: preview-only boundary recorded.

### Remaining limitations

- No owner visual decision yet.
- No physical-device claim until the owner or evaluator checks a real phone.
- Preview evidence cannot establish conversion or retention impact.

## Delivery record

- Branch: `design/public-entry-owner-review-v1`
- PR: not opened
- Squash commit: not applicable
- CI run: pending
- Production deployment: forbidden
- Production flow verified: not applicable
- Work packet moved to `docs/plans/completed/`: no