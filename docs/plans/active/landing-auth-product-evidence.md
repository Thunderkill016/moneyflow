# Landing and authentication product-evidence redesign

**Status:** ready for owner review
**Execution state:** ready_for_review
**Active role:** evaluator / handoff
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** PR #213
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

A first-time Vietnamese user can understand that MoneyFlow is a manual-first personal income-and-expense ledger, see sanitized product evidence instead of fabricated financial claims, and reach registration or login through a focused public experience. Authentication preserves the existing Supabase, OAuth, recovery, privacy and CAPTCHA behavior while making the form the primary task.

## Repository reconnaissance

### Starting state

- `main` rendered a public narrative derived from the rejected Signal Ledger concept.
- The old product stage used fabricated balances and planning-oriented language.
- Authentication mixed the form with a concept-led presentation panel.
- PR #208 preserved useful product screenshots, but predated the cumulative research ledger and formal rejection of Signal Ledger.

### Relevant boundaries

| Area | Decision |
|---|---|
| `src/components/landing-page.tsx` | Rebuild public narrative, CTA hierarchy and proof around current product behavior |
| `src/components/landing-page.module.css` | Keep responsive presentation locally owned; no new global framework |
| `src/components/auth-form.tsx` | Preserve actions and modes; simplify copy and hierarchy |
| `src/components/auth-form.module.css` | Form-first auth layout with a compact proof rail |
| `src/app/page.tsx` | Restrict metadata to verified claims |
| `public/landing/*` | Use sanitized test-environment evidence only |
| unit and Playwright tests | Lock copy, behavior, responsive and accessibility contracts |

### Confirmed constraints

- Manual-first; no bank-sync implication.
- No AI advice, OCR, automatic categorization certainty or unsupported recommendation.
- No fake balance, testimonial, user count, savings result or pricing claim.
- Registration is primary; Login remains visible and tappable.
- Primary touch controls target at least 44 px.
- No database, RLS, auth-provider, OAuth, Turnstile, callback or financial-rule change.

## Research

### Decision question

Which public composition communicates MoneyFlow truth and trust without inheriting a rejected visual concept or turning authentication into a marketing page?

### Sources used

| Source | Contribution | Boundary |
|---|---|---|
| Current MoneyFlow product and browser evidence | Real tasks, capabilities and mobile constraints | Not broad market validation |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Trust, real evidence, fast capture, recovery and accessibility | Does not prescribe a visual style |
| Actual Budget and Firefly III evidence | Ownership, provenance, transfer correctness and export trust | Do not copy methodology, density or code |
| GOV.UK and WCAG evidence | Task-first content, focus, validation and target sizing | Do not copy public-service identity |
| Money Lover, MISA, Copilot, Monarch and YNAB public patterns | Concrete language, product imagery and outcome structure | Do not copy brands, automation claims or social proof |

### Alternatives

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Product evidence with real MoneyFlow screens and traceable workflow | Strong product truth and manual-first differentiation | Can become visually busy | **Implemented as candidate** |
| Lifestyle story with stock photography or illustration | Emotional | Generic and weakly evidenced | Rejected |
| Dense analytics showcase | Shows breadth | Fabricated values and chart-first hierarchy | Rejected |

### Decision

Use a concept-neutral product-evidence composition. The landing explains `ghi giao dịch → cập nhật tài khoản → mở sổ đối chiếu`; authentication remains form-first with a compact factual proof rail. No named aesthetic becomes product law.

## Specification

### User stories

- A first-time visitor can tell what MoneyFlow records before registering.
- A cautious user sees real product evidence and explicit data boundaries.
- A returning user can log in or recover access without marketing competing with the form.
- A phone user can reach every action and validation state without overflow.

### Acceptance criteria

- [x] Hero states the manual-first value without bank-sync, AI-advice or outcome claims.
- [x] Product screenshots are sanitized and labelled as test-environment illustrations.
- [x] Public source contains no fake authority, outcome or pricing claim.
- [x] Landing explains transaction entry, account update and ledger verification.
- [x] Registration is primary while Login remains available.
- [x] At 320–360 px the accessible brand link becomes mark-only so actions do not collide.
- [x] Login, registration, recovery and password update preserve actions, OAuth, privacy and CAPTCHA behavior.
- [x] Light/dark, phone, tablet, desktop, keyboard and 200% text pass the audit.
- [x] Expense and Auth CAPTCHA browser smokes pass.
- [x] Agent reviewed representative mobile, tablet, desktop, dark and WebKit screenshots.
- [ ] Human owner accepts the visual direction.
- [ ] Human owner merges the PR.

### Required states

- Loading buttons retain explicit processing text and `aria-busy`.
- Validation, form alert and CAPTCHA failure remain visible.
- Forgot-password and password-update routes remain reachable.
- Primary controls remain at least 44 px and do not rely on color alone.

### Out of scope

- Provider or deployment configuration.
- Dashboard or global signed-in redesign.
- New dependency, tracking, illustration system or marketing claim.
- Agent merge or production deployment.

## Implementation plan

1. Read product principles, design status and cumulative ledger.
2. Audit `main`, PR #208 and prior Playwright evidence.
3. Compare three public information models.
4. Create a focused branch and packet.
5. Rebuild landing, auth hierarchy, product proof and metadata.
6. Preserve behavior and update unit/browser contracts.
7. Run exact-head static, build, database, browser, cross-device, CodeQL and secret gates.
8. Review screenshots and repair defects outside automated assertions.
9. Hand off PR #213 without merging.

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Reconnaissance, research and specification | done |
| T2 | Focused branch and packet | done |
| T3 | Landing, auth, metadata and product evidence | done |
| T4 | Unit and browser contracts | done |
| T5 | Full implementation CI | done |
| T6 | Visual artifact review | done |
| T7 | Repair 320 px header collision | done |
| T8 | Final exact-head knowledge and UI checks | doing |
| T9 | Owner visual decision and merge | todo |

## Handoff record

| Date | From | To | State | Evidence | Remaining decision |
|---|---|---|---|---|---|
| 2026-08-02 | researcher / implementer / evaluator | human owner | ready_for_review after final gates | PR #213, CI `30736800417`, artifact `8829998922` | Accept, request changes or reject |

### Permission boundary

- Granted: focused branch and PR writes.
- Not granted: merge, `main`, branch protection, production, provider or user-data writes.
- Human approval is required before merge and deployment.

## Evaluation

### Full implementation evidence

Exact implementation head `984bfaa3dd3038b9fae84927be85ac042c184ce2` passed CI run `30736800417`:

- knowledge, deployment, CSS ownership and architecture contracts;
- lint, typecheck, unit/static RLS and production build;
- fresh Supabase reset and pgTAP;
- Expense and Auth CAPTCHA smoke;
- cross-device UI audit;
- CodeQL and secret-history scan.

Playwright artifact:

- ID `8829998922`;
- digest `sha256:7ffeef005eaf640b690177dd0c8525934ec1d287972c1cdb7bb7708a777db339`;
- 509 total tests, 384 expected, 125 skipped, 0 unexpected, 0 flaky.

### Visual review

Reviewed landing in Chromium 320/390, tablet 768, desktop 1366, desktop dark and WebKit iPhone 390. Reviewed login at 320/390/768/1366 and registration at 320/1366.

- Landing hierarchy, proof and CTA stayed readable.
- Auth form remained dominant and the proof rail remained secondary.
- No reviewed screen showed horizontal overflow, hidden submit action or proof-card overlap.
- The only visual defect found was a clipped MoneyFlow wordmark at 320 px because the SAFE-02 compatibility rule forced Login visible. The final route repair keeps Login and registration visible while using the canonical mark only at the narrowest breakpoint.

### Remaining limitation

Automated and agent visual review do not replace the human owner's aesthetic decision. Final exact-head checks after the header repair and documentation cleanup remain required before handoff is final.

## Delivery record

- Branch: `design/landing-auth-product-evidence`
- PR: #213
- Full implementation evidence head: `984bfaa3dd3038b9fae84927be85ac042c184ce2`
- Full CI: `30736800417`
- Playwright artifact: `8829998922`
- Final exact-head check after visual repair: pending
- Merge: pending owner decision
- Production deployment: pending owner decision
