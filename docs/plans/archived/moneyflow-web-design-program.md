# MoneyFlow web design program

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** #282
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet applies the merged Webflow, UX Pilot and Framer research to MoneyFlow. Repository code, permanent tests and explicit owner decisions remain authoritative.

## Outcome

Execute one repeatable design process across MoneyFlow: product truth and user jobs first, then journey/content, multiple low-fidelity structures, owner selection, system application, bounded implementation, responsive/accessibility evidence and post-release learning.

The first slice covers the public landing and authentication entry journey. The owner selected **Direction B — Guided story**.

## Repository reconnaissance

### Current branch behavior

- MoneyFlow remains a Vietnamese manual-first personal income-and-expense ledger.
- Public routes remain Light-only; Light/Dark/System remains workspace-only.
- The selected landing uses a centered value-led hero followed by three linear story bands:
  1. `Bạn vừa ghi gì?`
  2. `Số dư nào thay đổi?`
  3. `Con số đến từ đâu?`
- Each story band uses one real test-environment product image with explicit dimensions and truthful alt text.
- The old overlapping hero collage and route-local green/dark palette declarations are removed.
- Login, registration, recovery and password update now have mode-specific proof-rail copy.
- Temporary `/design-preview/*` routes and prototype components are deleted.
- Financial behavior, database contracts, authentication actions, CAPTCHA behavior, providers and production data are unchanged.

### Relevant repository areas

| Area | Current role |
|---|---|
| `src/components/landing-page.tsx` | Selected Guided-story public narrative |
| `src/components/landing-page.module.css` | Responsive centered hero and linear story layout |
| `src/components/auth-form.tsx` | Existing auth behavior plus mode-specific supporting copy |
| `src/components/public-brand-theme.module.css` | Single public Light-only Fresh Blue authority |
| `src/app/document-theme.css` | Workspace semantic theme authority |
| `src/lib/brand-ui-contract.test.ts` | Brand, landing entry and auth-copy contracts |
| `src/lib/landing-copy.test.ts` | Product truth and Guided-story structure contracts |
| `src/lib/landing-refresh.test.ts` | Conversion, responsive and public-light contracts |
| `src/lib/performance-budgets.test.ts` | Stable image-space and LCP/CLS contracts |

### Existing constraints

- B3.2 logo geometry and Fresh Blue remain canonical.
- Financial semantic colors remain separate from brand color.
- No invented social proof, bank connectivity, savings claim or conversion uplift.
- One primary conversion action per viewport.
- Public routes cannot inherit the saved workspace dark preference.
- Merge and production rollout require owner approval after visual evidence.

## Research

### Sources

| Source | What it establishes | Limit |
|---|---|---|
| `docs/research/WEBFLOW_DESIGN_CATEGORY_SYNTHESIS.md` | content-first hierarchy, systems, accessibility and verification | does not select an aesthetic |
| `docs/research/UXPILOT_DESIGN_CORPUS_INVENTORY.md` | journeys, wireframes, prototypes and evaluation | UX Pilot itself is not required |
| `docs/research/FRAMER_DESIGN_CORPUS_INVENTORY.md` | responsive layout, components and delivery | no Framer migration |
| `docs/research/WEB_DESIGN_PROCESS_CONVERGENCE.md` | unified process from brief through learning | owner and code remain superior |

### Alternatives considered

| Direction | Strength | Decision |
|---|---|---|
| A — Proof-first split | fastest claim-to-evidence path | rejected for this slice; first viewport was too dense |
| B — Guided story | clearest education and strongest mobile linearity | selected by owner |
| C — Task-led tour | strongest onboarding reuse | rejected for this slice; higher interaction and analytics cost |

### Research decision

Implement Direction B as the production candidate. Preserve the sequence `record → account change → ledger verification`. Do not silently mix A/C back into the branch. External tool failures are not delivery blockers; the selected implementation lives in the existing Next.js/React/CSS stack.

### Adoption review

No dependency, provider, framework or architecture pattern was added.

## Specification

### Problem

The prior landing compressed multiple screenshots into one overlapping hero composition. It looked product-rich but weakened evidence readability at 320–390 px. Auth supporting copy also described only login even on registration and recovery routes. Route-local legacy palette declarations competed with the semantic public theme authority.

### User stories

- As a first-time visitor, I understand MoneyFlow through a three-step story without accounting language.
- As a mobile visitor, I read one full-width product proof at a time.
- As a returning, registering or recovering user, I see supporting copy matching the task I am performing.
- As the owner, I can review one selected production candidate rather than parallel concepts.

### Acceptance criteria

- [x] Public journey and evidence gaps audited.
- [x] Three structurally different directions recorded.
- [x] Owner selected Direction B.
- [x] Centered value-led hero implemented.
- [x] Three story bands implemented in the selected order.
- [x] Product proof becomes linear below the responsive breakpoint.
- [x] Auth proof copy is mode-specific.
- [x] Legacy landing palette declarations removed.
- [x] Temporary preview routes/components removed.
- [x] Permanent tests updated to the selected contract.
- [ ] Exact-head static, unit, build, CodeQL, secret and browser gates pass.
- [ ] Owner performs visual review at desktop and phone widths.
- [ ] Approved candidate is merged and verified on production.

### Required states

- Mobile/tablet/desktop: 320, 360, 390, tablet and desktop.
- Long Vietnamese content: wrapping without clipping or horizontal overflow.
- Accessibility: semantic headings, named navigation, focus visibility, 200% text and reduced motion.
- Product evidence: existing test-environment images only, with explicit width/height and truthful alt text.
- Auth states: login, register, forgot and update each retain their existing action/security behavior.

### Financial and security constraints

- No amount, balance, transaction, transfer, report, reconciliation or mutation logic changes.
- No authentication action, authorization, RLS, CAPTCHA or provider behavior changes.
- No production data or provider configuration writes.

### Out of scope

- Bank sync, AI advice, OCR identity, investment or household-finance expansion.
- New design/runtime framework.
- Workspace redesign in this PR.
- Conversion targets before a privacy-safe event baseline exists.

## Implementation plan

### Architecture fit

The existing Server Component, CSS Module, shared B3.2 lockup, public semantic theme and product media remain the implementation owners. No parallel theme or prototype route remains.

### Implemented changes

| File/area | Change |
|---|---|
| `landing-page.tsx` | Centered hero, three Guided-story bands, control and final CTA |
| `landing-page.module.css` | Linear responsive evidence, semantic Fresh Blue variables, focus/reduced-motion rules |
| `auth-form.tsx` | Four mode-specific proof eyebrow/title pairs |
| four permanent test files | Replace obsolete collage assertions with Guided-story contracts |
| design docs | Record audit, alternatives and owner selection |

### Data and migration impact

- Schema/migration/backfill: none.
- Existing URLs and auth actions: unchanged.
- Rollback: revert the focused landing/auth/test commits.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Story page becomes too long | concise copy and one proof per band |
| Mobile image becomes merely visible, not readable | full-width linear sequence below 980 px |
| Old concept returns through tests | permanent tests reject `proofStage` and require story structure |
| Auth copy change affects security | only static supporting copy changed; actions remain untouched |
| Public theme drifts | landing CSS contains no route-local identity palette |

### Verification plan

- Static: diff hygiene, knowledge contract, CSS ownership, architecture, lint and typecheck.
- Unit: brand, landing copy, refresh, performance and full suite.
- Build: production Next.js build.
- Browser: landing → register/login, auth family, no overflow and heading/link checks.
- Responsive: 320/360/390/tablet/desktop, Chromium and WebKit.
- Manual: owner desktop/phone visual review before merge.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Lock scope and audit current public entry | audit document | done |
| T2 | Produce three structural directions | direction document | done |
| T3 | Build coded comparison prototypes | branch history | done |
| T4 | Record owner selection B | selection document | done |
| T5 | Implement selected landing/auth slice | production component diff | done |
| T6 | Remove temporary prototypes | changed-file list | done |
| T7 | Update permanent contracts | four test files | done |
| T8 | Exact-head CI and browser evaluation | workflow evidence | in_progress |
| T9 | Owner visual review | desktop/phone evidence | blocked on T8 |
| T10 | Merge, production verification and archive | merge/deployment record | blocked on T9 |

## Handoff record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-04 | researcher | planner | specified | PR #281 and audit | generate alternatives |
| 2026-08-04 | planner | implementer | implementing | three coded directions | request owner choice |
| 2026-08-04 | owner | implementer | selected | Direction B decision | apply selected slice |
| 2026-08-04 | implementer | evaluator | evaluating | landing/auth/test diff; previews removed | exact-head verification |

### Current permission boundary

- Granted: branch and PR implementation/evaluation.
- Repository/branch: `Thunderkill016/moneyflow`, `design/moneyflow-web-design-program`.
- Forbidden: direct `main`, provider configuration, production data, database/auth behavior changes.
- Human approval required before merge and production rollout.
- Stop condition: unsupported product claims, financial/auth behavior changes or reintroduction of rejected directions.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Guided-story hierarchy | landing source and selection record | pass |
| Linear mobile product proof | CSS responsive contract | pass pending browser evidence |
| Mode-specific auth copy | auth source and brand test | pass pending exact-head suite |
| Single public theme authority | CSS diff and ownership gate | pass |
| Exact-head CI/browser evidence | active workflow | pending |
| Owner visual approval | pending | pending |

### Remaining limitations

- Vercel is intentionally configured to deploy `main` only, so branch preview deployment is unavailable without changing deployment policy.
- Container DNS cannot clone GitHub; GitHub Actions is the authoritative execution environment for this PR.
- A privacy-safe conversion event contract is not part of this slice.

## Delivery record

- Branch: `design/moneyflow-web-design-program`
- PR: #282
- Squash commit: pending
- Exact-head CI: pending final run
- Preview deployment: unavailable by repository policy
- Production deployment: not requested
- Work packet archive: pending merge
