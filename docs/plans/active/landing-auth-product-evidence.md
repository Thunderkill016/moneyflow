# Landing and authentication product-evidence redesign

**Status:** ready for owner review
**Execution state:** ready_for_review
**Active role:** evaluator / handoff
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** PR #213
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet records the design decision, implementation scope, exact evidence and remaining owner decision.

## Outcome

A first-time Vietnamese user can understand that MoneyFlow is a manual-first personal income-and-expense ledger, see sanitized product evidence instead of fabricated financial claims, and reach registration or login through a focused public experience. Authentication preserves the existing Supabase, OAuth, recovery, privacy and CAPTCHA behavior while making the form the primary task.

## Repository reconnaissance

### Starting state

- `main` rendered a landing narrative derived from the rejected Signal Ledger concept.
- The old public product stage used fabricated demonstration balances and planning-oriented language.
- Authentication mixed the form with a concept-led presentation panel.
- PR #208 contained useful product screenshots and a simplified auth experiment, but predated the cumulative research ledger and formal rejection of Signal Ledger.

### Relevant boundaries

| Area | Ownership and decision |
|---|---|
| `src/components/landing-page.tsx` | Public narrative, CTA hierarchy and product proof rebuilt around current MoneyFlow behavior |
| `src/components/landing-page.module.css` | Responsive public composition owned locally; no new global design framework |
| `src/components/auth-form.tsx` | Existing server actions and mode behavior preserved; copy and hierarchy simplified |
| `src/components/auth-form.module.css` | Form-first auth layout, responsive proof rail, validation and dark mode |
| `src/app/page.tsx` | Public metadata restricted to verified product claims |
| `public/landing/*` | Sanitized test-environment product evidence |
| landing/auth unit and Playwright tests | Copy, behavior, responsive and accessibility contracts |

### Constraints confirmed

- Manual-first; no bank-sync implication.
- No AI advice, OCR, automatic categorization certainty or unsupported financial recommendation.
- No fake balance, testimonial, user count, savings result or pricing claim.
- One dominant registration action per viewport; Login remains available.
- Primary touch controls target at least 44 px.
- Light/dark, keyboard, reduced motion, 200% text and phone widths remain release evidence.
- No database, RLS, auth-provider, OAuth, Turnstile, callback or financial-rule change.

## Research

### Decision question

Which public composition communicates MoneyFlow truth and trust without inheriting a rejected visual concept or turning authentication into a marketing page?

### Sources used

| Source | What it establishes | Boundary |
|---|---|---|
| Current MoneyFlow product and browser evidence | Real tasks, current capabilities and mobile constraints | One owner/product is not broad market validation |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Trust before novelty, real evidence, fast capture, explicit transaction types, recovery and accessibility | Does not prescribe palette or layout |
| Actual Budget and Firefly III evidence retained in the ledger | Register-first provenance, ownership, transfer correctness and export trust | Do not copy envelope methodology, accounting density or code |
| GOV.UK and WCAG sources retained in the ledger | Task-first content, accurate labels, focus, validation and target size | Do not copy public-service visual identity |
| Money Lover, MISA, Copilot, Monarch, YNAB and related public references | Concrete language, product imagery and outcome-oriented structure | Do not copy brands, automation claims or social proof |

### Alternatives considered

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Product evidence: direct value statement, real MoneyFlow screens and traceable workflow | Strongest product truth and manual-first differentiation | Screens can become visually busy | **Implemented as candidate** |
| Lifestyle story with stock photography or illustration | Emotional and visually distinctive | Generic fintech marketing and weak evidence | Rejected |
| Dense analytics showcase with charts and KPIs | Demonstrates breadth quickly | Fabricated values, chart-first hierarchy and poor mobile fit | Rejected |

### Decision

Use a concept-neutral product-evidence composition. The landing explains `ghi giao dịch → cập nhật tài khoản → mở sổ đối chiếu`; the auth surface remains form-first with a compact factual proof rail. No named aesthetic becomes product law.

## Specification

### User stories

- As a first-time visitor, I can tell that MoneyFlow records income, expense and transfers manually before I register.
- As a cautious user, I can see real product evidence and explicit data boundaries instead of invented authority.
- As a returning user, I can log in, recover access or update my password without a marketing panel competing with the form.
- As a phone user, I can reach every action, validation message and CAPTCHA state without overflow or hidden controls.

### Acceptance criteria

- [x] Hero states the manual-first ledger value without bank-sync, AI-advice or outcome claims.
- [x] Landing uses sanitized MoneyFlow test-environment screenshots and identifies them as illustrative test data.
- [x] No fabricated balances, testimonials, user counts, savings claims or unsupported pricing claims remain in public source.
- [x] Landing explains the trace from transaction entry to account update and ledger verification.
- [x] Registration is the dominant action while Login remains visible and tappable.
- [x] At 320 px the brand becomes mark-only so Login and registration do not collide.
- [x] Login, registration, recovery and password-update modes preserve existing actions, OAuth, privacy and CAPTCHA behavior.
- [x] Auth headings and buttons describe the exact task.
- [x] Light/dark, target phone widths, tablet/desktop, keyboard and 200% text pass the UI audit.
- [x] Expense and Auth CAPTCHA browser smokes pass.
- [x] Agent visual review covered representative mobile, tablet, desktop, light, dark and WebKit screenshots.
- [ ] Human owner accepts the visual direction.
- [ ] Human owner merges the PR.

### Required states

- Loading: pending buttons retain explicit processing state and `aria-busy`.
- Validation/error: inline field messages, form alert and CAPTCHA configuration failure remain visible.
- Recovery: forgot-password and update-password routes remain reachable.
- Mobile: 320, 360 and 390 px preserve actions and product evidence without horizontal overflow.
- Accessibility: skip link, semantic headings, focus, label-in-name, non-color cues, reduced motion and 44 px primary controls.

### Out of scope

- Auth provider, Supabase, Turnstile, OAuth callback or deployment configuration.
- Dashboard, ledger workflow or global signed-in design-system redesign.
- New dependency, tracking, illustration system or marketing claim.
- Agent merge or production deployment.

## Implementation plan

1. Read current product principles, design-direction status and cumulative research ledger.
2. Audit `main`, PR #208 and its Playwright evidence.
3. Select a product-evidence information model after comparing three alternatives.
4. Create a focused branch and work packet.
5. Rebuild landing narrative, product proof, auth hierarchy and public metadata.
6. Preserve auth behavior and update unit/browser contracts.
7. Run exact-head static, build, database, browser, cross-device, CodeQL and secret-history gates.
8. Review generated screenshots and repair visual defects found outside automated assertions.
9. Hand off PR #213 for owner visual approval; do not merge.

## Implemented changes

| File/area | Result |
|---|---|
| `src/components/landing-page.tsx` | Direct Vietnamese positioning, one primary CTA, real product evidence, traceable workflow and ownership section |
| `src/components/landing-page.module.css` | Responsive light/dark composition with bounded motion and 44 px primary targets |
| `src/components/auth-form.tsx` | Task-specific login/register/recovery copy while preserving all actions and modes |
| `src/components/auth-form.module.css` | Form-first card and compact proof rail across phone/tablet/desktop |
| `src/app/page.tsx` | Verified metadata; removed unsupported structured-data price claim |
| `public/landing/*.svg` | Sanitized test-environment accounts, quick-capture and transaction screenshots |
| `src/app/landing/safe-ux-login.css` | Keeps Login tappable and collapses the brand to mark-only at 320–360 px to prevent collision |
| unit/E2E contracts | Updated public copy, rejected-direction, performance, CAPTCHA and landing-to-product flow assertions |
| `docs/design/PUBLIC_EXPERIENCE_RESEARCH_2026.md` | Research provenance, source limits, positioning and acceptance contract |

## Verification evidence

### Full implementation run

Exact implementation head `984bfaa3dd3038b9fae84927be85ac042c184ce2` passed CI run `30736800417`:

- project knowledge, deployment, CSS ownership and architecture contracts;
- lint, typecheck, unit tests/static RLS and production build;
- fresh local Supabase reset and pgTAP;
- Expense and Auth CAPTCHA browser smoke;
- production cross-device UI audit;
- CodeQL and secret-history scan.

Playwright artifact:

- artifact ID: `8829998922`;
- digest: `sha256:7ffeef005eaf640b690177dd0c8525934ec1d287972c1cdb7bb7708a777db339`;
- report: 509 total tests, 384 expected, 125 skipped, 0 unexpected, 0 flaky.

### Visual artifact review

Representative screenshots reviewed:

- landing: Chromium 320, 390, tablet 768, desktop 1366, desktop dark and WebKit iPhone 390;
- auth: login 320/390/768/1366 and registration 320/1366.

Findings:

- Landing hierarchy, product proof and CTA remain readable across reviewed widths.
- Auth form remains dominant; the proof rail does not compete with the form.
- No screenshot showed horizontal overflow, hidden submit action or proof-card overlap.
- The 320 px landing header initially clipped the MoneyFlow wordmark because a legacy SAFE-02 repair forced Login visible. The final repair keeps Login and registration visible while using the canonical mark only at the narrowest breakpoint.
- The header repair and documentation cleanup must receive exact-head CI before owner handoff is considered final.

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Reconnaissance, alternatives and specification | done |
| T2 | Create focused current-main branch and work packet | done |
| T3 | Implement landing product-evidence composition and assets | done |
| T4 | Implement focused auth presentation without changing actions | done |
| T5 | Update unit and browser contracts | done |
| T6 | Open PR and run full exact-head CI | done |
| T7 | Review screenshot artifacts and repair mobile header | done |
| T8 | Obtain final exact-head CI after visual repair and documentation hygiene | doing |
| T9 | Human owner visual review and merge decision | todo |

## Risks and rollback

| Risk | Mitigation |
|---|---|
| Product screenshots expose user information | Only sanitized test-environment SVG captures are committed |
| Claims drift into automation or advice | Source contracts reject bank-sync, AI-advice, fake outcome and pricing language |
| Mobile header actions collide | Login contract plus mark-only 320–360 px repair; cross-device screenshot review |
| Auth behavior regresses | Existing server actions untouched; CAPTCHA and expense path browser smoke |
| Public CSS leaks into product routes | CSS Modules plus route-scoped compatibility repair only |

Rollback is a normal PR revert. No provider, schema, data or migration rollback is required.

## Handoff record

| Date | From | To | State | Evidence | Remaining decision |
|---|---|---|---|---|---|
| 2026-08-02 | researcher / implementer / evaluator | human owner | ready_for_review after final exact-head gates | PR #213, this packet, CI run 30736800417, artifact 8829998922 | Accept, request visual changes or reject the candidate |

### Permission boundary

- Granted: branch and PR writes for the focused landing/auth slice.
- Not granted: merge, `main`, branch protection, production, provider or user-data writes.
- Human approval required before merge and deployment.

## Delivery record

- Branch: `design/landing-auth-product-evidence`
- PR: #213
- Full implementation evidence head: `984bfaa3dd3038b9fae84927be85ac042c184ce2`
- Full CI: `30736800417`
- Playwright artifact: `8829998922`
- Final exact-head check after visual repair: pending
- Merge: pending owner decision
- Production deployment: pending owner decision
