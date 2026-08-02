# Landing and authentication product-evidence redesign

**Status:** active structural redesign
**Execution state:** in_progress
**Active role:** researcher / designer
**Permission scope:** branch_write
**Owner:** human owner
**Issue/PR:** PR #213
**Last updated:** 2026-08-02

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

A first-time Vietnamese user can understand that MoneyFlow is a manual-first personal income-and-expense ledger, see verified product evidence, and reach registration or login through a focused public experience. Authentication preserves existing Supabase, OAuth, recovery, privacy and CAPTCHA behaviour while keeping the form as the primary task.

The final visual direction is not selected yet. Low-fidelity wireframes, authentication flows and the project-wide brand color system must be approved before high-fidelity implementation is accepted.

## Repository reconnaissance

### Starting state

- The branch contains a behaviour-preserving landing and authentication candidate.
- Browser evidence confirms the existing routes, responsive behaviour and auth states work.
- Owner review identified that the green visual language should not continue.
- A proposed white-first palette was correctly paused because a project-wide brand system and structural wireframe stage were missing.

### Relevant boundaries

| Area | Decision |
|---|---|
| `docs/design/PUBLIC_ENTRY_WIREFRAME_BLUEPRINT.md` | Structural authority for the next design stage |
| `docs/design/PUBLIC_EXPERIENCE_RESEARCH_2026.md` | Product and market evidence |
| `src/components/landing-page.tsx` | Behaviour-preserving prototype, not final structure |
| `src/components/auth-form.tsx` | Preserve actions and modes during visual redesign |
| landing/auth CSS modules | Do not finalize palette before project brand tokens are approved |
| global theme tokens | Future source of truth for approved project-wide colors |
| unit and Playwright tests | Preserve behaviour, responsiveness and accessibility |

### Confirmed constraints

- Manual-first; no bank-sync implication.
- No AI advice, OCR, automatic categorization certainty or unsupported recommendation.
- No fake balance, testimonial, user count, savings result or pricing claim.
- Registration is primary; Login remains visible and tappable.
- Primary touch controls target at least 44 px.
- No database, RLS, auth-provider, OAuth, Turnstile, callback or financial-rule change.
- Color must not determine structure and must never be the only carrier of meaning.

## Research

### Decision question

Which landing structure, authentication flow and project-wide color system communicate MoneyFlow truth and trust without inheriting rejected visual concepts or reducing finance semantics to decoration?

### Sources used

| Source | Contribution | Boundary |
|---|---|---|
| Current MoneyFlow product and browser evidence | Real tasks, capabilities, states and mobile constraints | Not broad market validation |
| `docs/research/UI_UX_RESEARCH_LEDGER.md` | Cumulative research, trust, accessibility and contradiction record | Does not prescribe one visual style |
| `docs/design/PUBLIC_ENTRY_WIREFRAME_BLUEPRINT.md` | Landing and auth structure, flow, states and review gates | Must still be reviewed by owner |
| Figma prototyping guidance | Multiple flows, early prototypes and feedback loops | Tool guidance, not visual authority |
| GOV.UK patterns | Homepage prioritisation, one primary start action, task-focused accounts, passwords and validation | Do not copy public-service identity |
| OWASP authentication guidance | Generic but actionable auth and recovery responses | Security guidance does not choose composition |
| Finance product references | Product evidence, outcome language and trust patterns | Do not copy unsupported claims or brands |

### Alternatives

| Option | Advantage | Risk | Decision |
|---|---|---|---|
| Proof-led split hero | Strong first-viewport product evidence | Screenshot may overpower proposition | Wireframe candidate A |
| Task-led single column | Clear operating sequence and mobile stack | Can feel text-heavy | Wireframe candidate B |
| Evidence-first stage | Product itself becomes differentiator | Harder to keep first CTA obvious | Wireframe candidate C |
| Form + compact auth trust rail | Adds factual reassurance without full marketing panel | Rail may compete at tablet widths | Auth candidate A |
| Single-column auth only | Maximum task focus and responsive simplicity | Less branded distinction | Auth candidate B |

### Decision

Do not select the final composition or palette yet. Produce and compare grayscale landing and authentication wireframes first. Then research and approve one project-wide brand color system covering light/dark, semantic finance colors and charts before revising code.

## Specification

### User stories

- A first-time visitor can state what MoneyFlow does after the first viewport.
- A cautious user sees real product evidence and explicit product boundaries.
- A returning user can sign in or recover access without marketing competing with the form.
- A phone user can reach every action and validation state without overflow.
- A maintainer can apply one approved semantic color system across public and signed-in routes.

### Acceptance criteria

- [x] Product and authentication behaviour inventory exists.
- [x] Current implementation preserves routes and browser behaviour.
- [x] Wireframe and design-process blueprint exists.
- [ ] Three grayscale landing alternatives exist at phone and desktop widths.
- [ ] Two grayscale authentication compositions exist.
- [ ] Login, registration, recovery and reset flows include required states.
- [ ] Human owner selects the structural direction.
- [ ] Project-wide brand, neutral, semantic, chart and light/dark color roles are researched.
- [ ] Human owner selects the brand color system.
- [ ] Selected color system is applied through global tokens, not route-specific themes.
- [ ] Landing and authentication code are revised to match approved wireframes.
- [ ] Exact-head browser and accessibility evidence pass.
- [ ] Human owner accepts and merges the PR.

### Required states

- Loading buttons retain explicit processing text and `aria-busy`.
- Validation, generic credential error and CAPTCHA failure remain visible.
- Forgot-password and password-update routes remain reachable.
- Recovery confirmation does not reveal whether an account exists.
- Primary controls remain at least 44 px and do not rely on color alone.

### Out of scope

- Provider or deployment configuration.
- Database, RLS or financial rule changes.
- Unsupported product claims or new runtime dependencies.
- Agent merge or production deployment.

## Implementation plan

1. Preserve the cumulative research and verified product behaviour.
2. Build landing content hierarchy and three low-fidelity alternatives.
3. Map login, registration, recovery and reset flows.
4. Build two auth compositions plus loading/error/CAPTCHA/recovery states.
5. Review phone and desktop grayscale boards with owner.
6. Research finance brand psychology, competitor conventions and accessibility.
7. Define project-wide primitive and semantic color tokens.
8. Apply approved tokens to the selected wireframe.
9. Revise landing/auth code without changing auth or finance behaviour.
10. Run exact-head static, browser, cross-device and visual review gates.
11. Hand off without merging.

## Tasks

| ID | Task | Status |
|---|---|---|
| T1 | Product, competitor and accessibility research | done |
| T2 | Behaviour-preserving landing/auth prototype | done |
| T3 | Initial browser and cross-device evidence | done |
| T4 | Wireframe/process research | done |
| T5 | Landing grayscale alternatives | doing |
| T6 | Authentication flow and grayscale compositions | doing |
| T7 | Owner structural decision | todo |
| T8 | Project-wide brand color-system research | doing |
| T9 | Owner color-system decision | todo |
| T10 | Token and implementation revision | todo |
| T11 | Exact-head verification and owner handoff | todo |

## Handoff record

| Date | From | To | State | Evidence | Remaining decision |
|---|---|---|---|---|---|
| 2026-08-02 | implementer / evaluator | researcher / designer | design reopened | PR #213 browser evidence and owner color feedback | Structural and brand-system selection |

### Permission boundary

- Granted: focused branch and PR writes.
- Not granted: merge, `main`, branch protection, production, provider or user-data writes.
- Human approval is required before merge and deployment.

## Evaluation

### Existing implementation evidence

The current branch has already passed lint, typecheck, unit/static RLS, build, browser smoke, cross-device audit, CodeQL and secret scan. That evidence proves behaviour and responsive robustness of the existing candidate; it does not prove the candidate is the correct structural or visual design.

### New evaluation requirement

The next evaluation is owner review of grayscale wireframes, not another polished screenshot. Color and high-fidelity details are explicitly excluded from the structural decision.

## Delivery record

- Branch: `design/landing-auth-product-evidence`
- PR: #213
- Structural blueprint: `docs/design/PUBLIC_ENTRY_WIREFRAME_BLUEPRINT.md`
- Existing behaviour evidence head: `768fb2fc60f04f39c35d8c26bd36bd2a46d6716d`
- New design-stage head: `e3237e6069ce47c4abd310f66110bcce9d694219` and later commits
- Merge: pending owner decisions
- Production deployment: pending owner decision