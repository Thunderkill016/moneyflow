# Brand v2 UI foundations

**Status:** candidate
**Execution state:** ready_for_review
**Active role:** owner
**Permission scope:** branch_write
**Owner:** Thunderkill016
**PR:** #266
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns the visual-system refresh only. It does not authorize financial, database, provider, production-data or deployment changes.

## Outcome

MoneyFlow uses the owner-approved brand v2 blue system, harmonized cool supporting colors and unmistakable functional colors across light and dark modes. The merged account-reconciliation workspace is the first production-shaped application of the refreshed tokens.

## Repository reconnaissance

- `src/app/document-theme.css` is the project-wide owner of `--mf-*` color roles and light/dark resolution.
- `src/app/globals.css` is a compatibility alias layer and must not hardcode a second palette.
- `src/components/money-value.module.css` maps income, expense and transfer through shared financial roles.
- `src/components/account-reconciliation-page.module.css` owns only reconciliation layout and consumes shared semantic tokens.
- PR #263 already merged the reconciliation route and behavior into `main`; this PR changes presentation only.

## Research

The owner-approved project artifacts from this session define the direction:

- identity blue `#3B82F6`;
- action blue `#2563EB`;
- supporting sky, cyan, indigo and periwinkle families;
- true green/red/yellow/blue functional colors;
- lighter readable semantic steps in dark mode;
- positive green, negative red and transfer indigo;
- color never replaces labels, icons or state controls.

No external code, dependency, provider, service or architecture pattern is adopted. The HTML prototype is design evidence only; repository code and executable tests remain authoritative.

### Adoption review

Not applicable. This change introduces no package, provider, framework or service.

## Specification

### Visual roles

- Identity blue: `#3B82F6`.
- Primary action blue: `#2563EB`.
- Income/success: true green.
- Expense/danger: true red.
- Warning: true yellow.
- Information/action: true blue.
- Transfer: indigo.
- Light mode uses darker readable text steps.
- Dark mode uses lighter steps of the same hue.

### Reconciliation application

- Pending remains neutral.
- Cleared uses information blue.
- Reconciled uses success green and remains visibly locked.
- Positive differences use green and negative differences red.
- Zero uses the success surface.
- Any nonzero difference still blocks completion.
- Boundary notes use warning yellow.
- Focus states use the shared blue focus ring.
- Phone widths down to 320–390px must not overflow horizontally.

### Architecture and safety boundaries

- Route CSS consumes shared `--mf-*` roles and does not create a second palette.
- No calculation, balance, transaction, reconciliation state or mutation changes.
- No database schema, migration, RPC, RLS, grant, provider or production-data changes.
- State remains understandable without color through copy, labels, icons, dots and disabled/locked controls.

## Implementation plan

1. Create a current-main branch and PR.
2. Replace the old shared brand ramp with the approved brand v2 ramp.
3. Add harmonized supporting tokens and explicit semantic borders.
4. Add readable true functional roles for light and dark modes.
5. Refresh the reconciliation module CSS using only shared roles.
6. Preserve JSX, accessible names and domain behavior.
7. Add the required packet and PR memory.
8. Run exact-head static, build, browser and security checks.
9. Correct verification findings without weakening financial or accessibility contracts.

## Acceptance criteria

- [x] Shared brand ramp matches approved brand v2.
- [x] Supporting sky/cyan/indigo/periwinkle tokens exist in the shared authority.
- [x] Green, red, yellow and blue functional roles are visually unmistakable.
- [x] Dark mode maps to readable lighter steps instead of reusing dark text colors.
- [x] Positive/negative/transfer money roles remain semantically distinct.
- [x] Reconciliation pending, cleared and reconciled states retain text labels.
- [x] Positive and negative difference surfaces follow signed money tone.
- [x] Exact-zero completion logic is unchanged.
- [x] CSS ownership and architecture checks pass on implementation head.
- [x] Lint, typecheck, unit/static RLS and production build pass on implementation head.
- [x] Desktop/mobile browser and cross-device UI audit pass on implementation head.
- [x] CodeQL and secret-history scan pass on implementation head.
- [ ] Evidence-only final head passes the same required workflows.
- [ ] Owner decides whether to merge PR #266.

## Evaluation

### Findings corrected without weakening tests

1. CI #1364 exposed missing mandatory packet and PR-memory fields. The repository contract remained unchanged; the documentation was corrected.
2. CI #1368 exposed tests that still locked the superseded palette. They were updated to assert brand v2 and true functional roles.
3. CI #1382 exposed six real dark-login contrast failures around `4.2:1`. Auth dark secondary copy was mapped to the primary readable text role; the `4.5:1` audit threshold was not changed.
4. The following run then exposed a stale browser assertion for the old dark canvas and surfaces. The test was updated to the approved brand v2 values while retaining exact computed-color checks.

### Verified implementation candidate

Implementation head `0d85d4ba1f4f150358bf1c22beeb651b78a651bc` passed:

- CI #1385;
- diff hygiene and project-knowledge contract;
- deployment configuration, CSS ownership and architecture contracts;
- lint, typecheck, unit tests/static RLS and production build;
- Chromium and WebKit expense/Auth CAPTCHA smoke;
- full production cross-device UI audit;
- database stable job with database checks correctly not required;
- CodeQL #523;
- secret-history scan #523.

Playwright evidence:

- artifact: `8867711647`;
- name: `playwright-evidence-30842570802-1`;
- digest: `sha256:327ecd9a9bcfa7e93934aa5e593bac2c748cf1dab54252d70729b40217702577`.

The only remaining verification step is the required rerun after this evidence-only packet/memory update.

## Risks and defenses

| Risk | Defense |
|---|---|
| Global token changes regress unrelated screens | full production build and cross-device UI audit passed |
| Bright colors reduce text contrast | darker light-mode text roles, lighter dark-mode roles and automated contrast audit |
| Positive difference appears complete | completion stays disabled until domain difference equals exactly zero |
| Color becomes the only state signal | labels, icons, dots, copy and locked controls remain present |
| Route CSS becomes a second token authority | CSS ownership and architecture contracts passed |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | create current-main branch and PR | `style/brand-v2-reconciliation-ui`, PR #266 | done |
| T2 | update shared semantic theme | `src/app/document-theme.css` | done |
| T3 | refresh reconciliation workspace CSS | `src/components/account-reconciliation-page.module.css` | done |
| T4 | add bounded packet and PR memory | this file + `PR-266.md` | done |
| T5 | fix knowledge-contract findings | CI #1364 | done |
| T6 | update brand contract tests | CI #1368 | done |
| T7 | fix dark Auth contrast | CI #1382 audit evidence | done |
| T8 | align computed-color audit with brand v2 | CI #1385 | done |
| T9 | verify implementation head | CI #1385, CodeQL/secret #523 | done |
| T10 | verify evidence-only final head | workflows | pending |
| T11 | owner merge decision | PR #266 | pending |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | approved UI Foundations direction | prototype not in repository | port tokens and reconciliation styling |
| 2026-08-04 | implementer | evaluator | candidate | PR #266 implementation | verification findings | evaluate and correct without weakening gates |
| 2026-08-04 | evaluator | owner | ready_for_review | implementation head passed CI #1385, CodeQL #523, secret #523 | final evidence-only head workflow rerun | review after final checks |

## Permission boundary

Granted: focused branch writes, PR metadata, repository tests and CI inspection.

Forbidden without a separate owner command: merge, production deployment, provider/config changes, production schema/data writes and production acceptance claims.
