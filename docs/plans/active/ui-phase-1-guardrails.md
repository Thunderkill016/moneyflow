# MoneyFlow UI migration — Phase 1 no-new-debt guardrails

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** PR #296, `docs/plans/active/ui-system-migration.md`
**Phase 0 evidence:** PR #297
**Current PR:** #298
**Last updated:** 2026-08-05

The owner instructed **“Hoàn thành p1”** on 2026-08-05. This records owner acceptance of the Phase 1 direction and permission to finish verification and merge the no-new-debt guardrails. It does not authorize Phase 2 primitive work, product UI/CSS changes, provider operations, deployment or production-data access.

## Outcome

Current presentation debt remains temporarily compatible, but every new pull request is checked so it cannot silently add another global CSS layer, new unreviewed `!important`, unknown CSS token, stale `/insights` route reference or known legacy global class registration.

The gate evaluates added lines rather than imposing an immediate zero-debt requirement. Existing debt can therefore be migrated incrementally without making current `main` unbuildable.

## Repository reconnaissance

Phase 0 established that current `main` has two root CSS owners, seven legacy imports, nine document-selector allowlist files, 1,112 `!important` declarations against a 1,200 budget and two invisible presentation contract components.

Relevant existing boundaries:

- `scripts/classify-ci-changes.mjs` already runs in a full-history checkout before risk selection.
- `scripts/check-css-ownership.mjs` protects the current global import order and aggregate debt budget, but does not reject each new declaration individually.
- `src/app/legacy.css` is frozen and must shrink rather than gain imports.
- `/insights` survives only as a compatibility redirect while current navigation and tests should use `/dashboard`.
- current route/component code still registers global legacy classes, so enforcement must be diff-based rather than an immediate repository-wide zero rule.
- current Playwright coverage is strong at route level, while shared primitive APIs are not yet stable enough to justify a durable story catalogue.
- PR #298 was created before PRs #295–#297 reached `main`, so final evaluation requires rebuilding its candidate from current `main` plus only the Phase 1 files.

## Research

The selected control is a changed-line gate rather than another aggregate ceiling. Aggregate budgets can stay green while every new PR consumes remaining headroom; a diff rule prevents regression immediately without blocking cleanup of existing debt.

Alternatives rejected:

| Alternative | Reason |
|---|---|
| Raise or retain only the 1,200 `!important` budget | Allows new debt until the ceiling is reached |
| Make all existing debt blocking now | Would stop unrelated delivery before migration owners exist |
| Add another CSS override layer | Deepens the cascade problem the program is meant to remove |
| Install Storybook in Phase 1 | Creates configuration and story churn before primitive APIs are approved |
| Replace CSS Modules/Tailwind/Base UI | Out of scope and does not solve ownership by itself |

Storybook decision: defer installation until Phase 2, when at least five high-value primitive states and their APIs are known. No dependency, lockfile, hosted provider or production bundle change is included. The detailed decision is recorded in `docs/research/UI_STORYBOOK_ADOPTION_DECISION_2026-08-05.md`.

## Specification

### Blocking rules

| Rule | Blocks | Allowed path |
|---|---|---|
| `no-new-route-global-css` | New or renamed non-module stylesheet under `src/app` | Use a route/component CSS Module |
| `no-new-global-css-import` | New static, dynamic or CommonJS plain `.css` import from product TS/JS outside the frozen root owners | Use `.module.css`; existing root imports remain frozen |
| `no-new-css-import-chain` | New local quoted or `url(...)` CSS `@import` extending the cascade | Import the owning module/component directly |
| `no-new-important` | Added `!important` in product CSS | Remove the ownership conflict; exceptional vendor repair requires inline reason |
| `known-token-reference` | Added `var(--token)` with no source definition | Define the semantic/local token or document an external runtime token inline |
| `canonical-dashboard-route` | Added `/insights` in current source/tests | Use `/dashboard`; compatibility redirect file remains allowed |
| `no-new-legacy-class-registration` | Added known legacy global classes in actual class-registration contexts | Use local module/component ownership |

### Narrow exception syntax

Exceptions are visible on the same changed line and require a reason:

```text
ui-migration: allow-important -- <reason>
ui-migration: allow-runtime-token -- <reason>
ui-migration: allow-legacy-class -- <reason>
```

Exceptions are reviewable debt, not automatic approval.

### Initial legacy class set

The diff-only set prevents new registrations of:

- `dashboard`
- `insights-dashboard`
- `accounts-workspace`
- `transaction-manager`
- `manager-row`
- `panel`
- `mobile-fab`
- `mobile-nav`
- `mobile-account-button`
- `demo-mode-banner`
- `safe-card`
- `safe-card-hero`

Detection is limited to `className`, `classList`, `className =` and common class-composition helpers. Plain copy, analytics labels or unrelated string values are not treated as CSS registrations.

### Acceptance criteria

- Existing product code and CSS render unchanged.
- Current debt is not made instantly blocking.
- Every added line in a PR is checked before CI risk classification.
- CSS Modules remain allowed.
- known Base UI, Radix, Next and Tailwind runtime-token prefixes remain allowed.
- new or renamed App Router global stylesheets are blocked.
- static, dynamic, CommonJS and CSS `url(...)` import bypasses are covered.
- plain legacy words outside class-registration contexts do not create false positives.
- policy files classify as full-risk and select every CI gate.
- no dependency or hosted tool is added.

## Implementation plan

### Files

| File | Change |
|---|---|
| `scripts/check-ui-migration-diff.mjs` | Parse unified diff, collect source token definitions and report blocking violations |
| `scripts/check-ui-migration-diff.test.mjs` | Cover global CSS, import variants, renames, `!important`, token, route, class-registration and false-positive cases |
| `scripts/classify-ci-changes.mjs` | Run the no-new-debt check before classification and mark policy files full-risk |
| `scripts/classify-ci-changes.test.mjs` | Verify policy changes select every gate |
| `package.json` | Expose `check:ui-migration` and include fixtures in `test:ci-policy` |
| Phase documentation, project memory and PR memory | Record scope, Storybook decision, evidence, owner acceptance and permission boundary |

### Runtime and data impact

- Application runtime: none.
- Product CSS/components/routes: none.
- Database/RLS/auth/provider/production data: none.
- Dependency and lockfile: none.
- Rollback: revert PR #298.

### Risks and controls

| Risk | Control |
|---|---|
| False positive from third-party runtime CSS variables | Known runtime prefixes and explicit same-line reason for other sources |
| Existing legacy source becomes blocked | Added-line-only evaluation |
| Plain strings are mistaken for class registration | Restrict detection to class-related syntax and keep a negative regression fixture |
| Import or rename syntax bypasses the gate | Cover static, dynamic, CommonJS, quoted/url CSS imports and file renames |
| Exception comments become a bypass | Reason required; review and future removal inventory |
| Parser misses a source shape | Regression fixtures and exact-head self-check |
| Policy disables itself | Policy files trigger full CI |
| Storybook becomes a second application too early | Deferred to a bounded Phase 2 decision |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | Prevent new root/global stylesheet imports | diff gate + rename/import fixtures | done; exact-head verification pending |
| P1-T2 | Prevent new unreviewed `!important` | diff gate + exception fixture | done; exact-head verification pending |
| P1-T3 | Validate token references in added CSS declarations | source token inventory + fixtures | done; exact-head verification pending |
| P1-T4 | Prevent new `/insights` UI/test references | redirect exception + fixtures | done; exact-head verification pending |
| P1-T5 | Prevent new known legacy class registrations without false-positive plain strings | syntax-bounded detector + fixtures | done; exact-head verification pending |
| P1-T6 | Decide Storybook/equivalent spike | adoption decision | done — deferred to Phase 2; no dependency added |
| P1-T7 | Owner accepts guardrails before Phase 2 | explicit instruction on 2026-08-05 | done; Phase 2 remains unauthorized |
| P1-T8 | Rebuild candidate on current `main` and pass protected gates | exact-head workflow runs | evaluating |

## Evaluation

Required exact-head evidence:

- diff hygiene and project knowledge contract;
- UI migration fixture suite and CI classifier/retry tests;
- CSS ownership and architecture contracts;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- database classification gate;
- browser smoke;
- Chromium/WebKit cross-device audit;
- CodeQL;
- all-ref secret scan.

Current findings:

- the classifier successfully ran the guardrail against earlier PR #298 heads;
- the reviewed secret-history fingerprint is now merged through PR #295;
- focused local regression execution after hardening passed 11 of 11 tests;
- the hardening closes rename, dynamic/CommonJS import, CSS `url(...)` import and plain-string false-positive gaps;
- final protected evidence remains pending on a candidate rebuilt from current `main`.

## Handoff record

| Date | From | To | State | Evidence | Next allowed action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | evaluator | evaluating | Explicit instruction: “Hoàn thành p1” | Harden guardrail, synchronize with current `main`, run exact-head gates and merge only if green |

### Current permission boundary

- Granted: finish Phase 1 policy scripts, fixtures, package command, documentation, project memory and PR merge after protected checks pass.
- Forbidden: product/runtime UI code, product CSS, dependencies, Storybook installation, provider writes, deployment and production-data access.
- Stop condition: any protected exact-head gate fails for an unresolved Phase 1 cause.
- Next phase: Phase 2 token and primitive ownership requires a new explicit approval.
