# MoneyFlow UI migration — Phase 1 no-new-debt guardrails

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Parent packet:** PR #296, `docs/plans/active/ui-system-migration.md`  
**Phase 0 evidence:** PR #297  
**Last updated:** 2026-08-05

The owner approved continuing after Phase 0 on 2026-08-05. This is interpreted as permission for Phase 1 only: implement diff-based no-new-debt policy, verify it, and decide whether to add a component-state harness. It does not authorize primitive, App Shell, route, CSS, visual-direction, merge or deployment changes.

## Outcome

Current presentation debt remains temporarily compatible, but every new pull request is checked so it cannot silently add another global CSS layer, new unreviewed `!important`, unknown CSS token, stale `/insights` route reference or known legacy global class registration.

The gate evaluates added lines rather than imposing an immediate zero-debt requirement. Existing debt can therefore be migrated incrementally without making current `main` unbuildable.

## Implementation

### Gate entrypoint

- `scripts/check-ui-migration-diff.mjs`
- npm command: `npm run check:ui-migration`
- enforced by `scripts/classify-ci-changes.mjs` before CI risk classification
- diff source: GitHub event base/head on pull requests; current commit on non-PR runs
- source-of-truth token scan: definitions found across current `src` CSS and runtime custom-property declarations

### Blocking rules

| Rule | Blocks | Allowed path |
|---|---|---|
| `no-new-route-global-css` | New non-module stylesheet under `src/app` | Use a route/component CSS Module |
| `no-new-global-css-import` | New plain `.css` import from product TS/JS outside the frozen root owners | Use `.module.css`; existing root imports remain frozen |
| `no-new-css-import-chain` | New local CSS `@import` extending the cascade | Import the owning module/component directly |
| `no-new-important` | Added `!important` in product CSS | Remove the ownership conflict; exceptional vendor repair requires inline reason |
| `known-token-reference` | Added `var(--token)` with no source definition | Define the semantic/local token or document an external runtime token inline |
| `canonical-dashboard-route` | Added `/insights` in current source/tests | Use `/dashboard`; compatibility redirect file remains allowed |
| `no-new-legacy-class-registration` | Added known legacy global classes in route/component code | Use local module/component ownership |

### Narrow exception syntax

Exceptions are visible on the same changed line and require a reason:

```text
ui-migration: allow-important -- <reason>
ui-migration: allow-runtime-token -- <reason>
ui-migration: allow-legacy-class -- <reason>
```

Exceptions are not automatic approval. They remain reviewable debt and should be paired with an owner/removal plan.

### Current legacy class set

The initial diff-only set prevents new registrations of:

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

The set does not remove current consumers. It expands only with repository evidence and tests.

## Storybook decision

Installation is deferred until Phase 2. The repository already has strong page/browser coverage, while the primitive APIs that would own stable stories have not yet been approved. Adding Storybook now would create configuration and story churn around components still rescued by global CSS.

Decision record: `docs/research/UI_STORYBOOK_ADOPTION_DECISION_2026-08-05.md`.

A bounded development-only spike may be reopened in Phase 2 after at least five high-value primitive states are identified. No hosted provider is authorized.

## Task state

| ID | Task | Evidence | Status |
|---|---|---|---|
| P1-T1 | Prevent new root/global stylesheet imports | diff gate + fixtures | candidate complete |
| P1-T2 | Prevent new unreviewed `!important` | diff gate + exception fixture | candidate complete |
| P1-T3 | Validate token references in added CSS declarations | source token inventory + fixtures | candidate complete |
| P1-T4 | Prevent new `/insights` UI/test references | redirect exception + fixtures | candidate complete |
| P1-T5 | Prevent new known legacy class registrations | initial legacy set + fixtures | candidate complete |
| P1-T6 | Decide Storybook/equivalent spike | adoption decision | deferred to Phase 2; no dependency added |
| P1-T7 | Owner accepts guardrails before Phase 2 | exact-head PR evidence | pending |

## Verification

Required on exact head:

- UI migration gate fixture suite;
- CI classifier/retry policy tests;
- project knowledge and diff hygiene;
- CSS ownership and architecture contracts;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- database classification gate;
- browser smoke;
- Chromium/WebKit cross-device audit;
- CodeQL;
- all-ref secret scan, noting the independently tracked pre-existing Penpot finding until PR #295 is resolved.

Because this PR changes CI policy, the classifier must select every gate.

## Risks and controls

| Risk | Control |
|---|---|
| False positive from third-party runtime CSS variables | Known Base UI, Radix, Next and Tailwind prefixes; explicit reason for other runtime tokens |
| A current legacy class is blocked before migration | Diff-only behavior; existing source is not rejected |
| Exception comments become a bypass | Same-line reason, code review and future removal inventory |
| Gate misses multiline/dynamic registration | Initial gate covers common source forms; Phase 2 inventory can expand fixtures and parsing based on actual counterexamples |
| Policy script disables itself | Policy files are classified as full-risk and exercise every CI gate |
| Storybook becomes a second application too early | No installation in Phase 1; bounded Phase 2 adoption gate |

## Rollback

Revert the Phase 1 PR. No product CSS, component, route, database, provider or production state requires rollback.

## Current permission boundary

- Granted: Phase 1 policy scripts, fixtures, package command and documentation on `agent/ui-phase-1-no-new-debt`.
- Forbidden: product/runtime UI code, CSS changes, dependencies, Storybook installation, existing PR/issue mutation, merge and deployment.
- Stop condition: exact-head evidence is presented to the owner.
- Next phase: Phase 2 token and primitive ownership requires a new explicit approval.
