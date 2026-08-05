# MoneyFlow UI migration — Phase 2 tokens and primitives

**Status:** evaluating
**Execution state:** closure verification
**Active role:** evaluator
**Permission scope:** branch_write_and_owner_authorized_closure
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 1 evidence:** merged PR #298
**Current PR:** #299
**Last updated:** 2026-08-05

The owner instructed **“Bắt đầu p2”**, requested external-standards corrections, instructed those corrections to be applied and then explicitly instructed **“hoàn tất p2 đi”** on 2026-08-05. The final instruction authorizes Phase 2 closure and merge when the exact PR head passes the protected repository gates. It does not authorize Phase 3 App Shell work, deployment, provider operations, production-data access or a new visual direction.

## Outcome

Establish MoneyFlow-native token and primitive contracts so actions, form controls, overlays, feedback, empty states and financial values own their semantics, accessibility and target behavior directly. Preserve the current B3.2/Fresh Blue identity, public light-only behavior, workspace Light/Dark/System behavior and all financial-domain semantics.

Phase 2 does not attempt a big-bang route migration or remove `MinimumTargetSizeContract`. It creates the owned primitives, proves bounded composition, inventories remaining global rescues and leaves route-by-route retirement to later phases.

## Standards and project-policy boundary

### External standards and official behavior

| Source | Phase 2 consequence |
|---|---|
| WCAG 2.2 SC 2.5.8 | AA target baseline is 24×24 CSS px or a defined exception |
| WCAG 2.2 SC 2.5.5 | 44×44 CSS px is the enhanced AAA target, not universal AA |
| WAI-ARIA APG | Native semantics first; custom composites must own applicable role/state/keyboard/focus behavior |
| WCAG 1.4.1 | Financial/status meaning is not color-only |
| WCAG 3.3.1 and 3.3.3 | Errors are identified in text and correction is suggested when known |
| WCAG 3.3.4 | Consequential financial/stored-data actions require reversible, checked or confirmed protection |
| WCAG 4.1.3 | Routine status updates are announced without moving focus; not every toast is assertive |
| WCAG 1.4.4 and 1.4.10 | 200% text resize, equivalent 320 CSS-pixel reflow and actual mobile viewport are separate evidence |
| WCAG 2.4.11 | Focus must remain not entirely obscured by author-created UI |
| Next.js App Router CSS docs | Next.js permits global CSS; MoneyFlow's freeze is a repository migration policy |
| Storybook docs | Isolated state review is useful but installation and a five-state threshold are not external requirements |

### MoneyFlow policy

- `document-theme.css` remains the sole executable semantic theme/color authority during this migration.
- No new root/global CSS layer is allowed while existing compatibility layers are retired.
- The 1,200 `!important` ceiling is an internal regression budget.
- `/dashboard`, legacy-class and route restrictions remain repository-specific controls.
- Important financial, destructive, confirmation, icon-only, mobile-navigation and frequent-capture actions use an actual target of at least 44×44 CSS px.
- Other controls meet WCAG AA target-size/spacing or a valid exception.
- Compatibility API and CSS remain only while their consumers are measured and migrated.

## Implemented primitive contracts

### Actions

`src/components/ui/button.tsx` now retains the previous variant/size inputs while adding:

- semantic intent: primary, secondary, quiet and destructive;
- semantic density: standard and compact;
- target policy: compat, AA and important;
- pending label, `aria-busy` and duplicate-activation prevention;
- `LinkButton` with real link semantics;
- `IconButton` with a required accessible name and important target by default;
- an explicit unstyled compatibility bridge for route-owned visual treatments.

The desired Button contract no longer treats invalid as a generic button state.

### Forms

| Primitive | Ownership |
|---|---|
| TextField | label, description, error, correction suggestion, input value, prefix/suffix, pending and target policy |
| SelectField | native-first select, label/description/error/placeholder and target policy |
| CheckboxField | native checkbox, label target, description/error and indeterminate state |
| RadioGroup | native fieldset/legend grouping, native radio keyboard model, controlled/uncontrolled values and option descriptions |

No custom combobox or custom roving-tabindex radio implementation was added because current product requirements do not justify replacing valid native behavior.

### Overlays

| Primitive | Ownership |
|---|---|
| Dialog | native modal dialog, accessible title, optional description, initial focus, Escape/cancel policy, focus restoration, scrolling and accessible 44px close action |
| Sheet | explicit modal/non-modal mode; modal composes Dialog, non-modal does not claim modal semantics or trap focus |

### Feedback, surfaces and empty states

| Primitive | Ownership |
|---|---|
| Card | existing noninteractive surface retained; clickability is not implied |
| Badge | compatibility variants plus neutral/info/income/warning/expense/transfer semantic tones |
| Alert | semantic tones and explicit off/polite/assertive announcement policy |
| Toast/ToastRegion | polite routine messages, urgent-only alerts, deduplication, no automatic focus and optional normal-flow action |
| EmptyState | title, explanation, one primary-action slot and optional secondary-action slot |

### Financial presentation

`MoneyValue` composes the existing helpers in `src/lib/money.ts`. It owns full-value formatting, explicit sign/kind policy, tabular numerals, unavailable treatment and accessible labels without inferring transaction meaning or changing amount semantics.

## Token normalization result

- No rendered token value changed.
- New semantic components consume canonical income, expense, transfer, warning and info roles.
- New TSX references incorrectly using nonexistent `--mf-*-soft` names were corrected to canonical `--mf-*-subtle` roles.
- Success and danger aliases remain compatibility boundaries pending zero-reference evidence.
- Phase 1 token validation remains a guardrail rather than a complete TSX/CSS compiler.

## Bounded proof consumers

Phase 2 proves composition through a deliberately small shared-consumer set:

1. Dialog consumes IconButton for its named important close action.
2. Modal Sheet consumes Dialog and inherits the modal focus/dismissal contract.
3. Non-modal Sheet consumes IconButton without claiming modal behavior.
4. Badge, Alert and Toast consume canonical semantic token roles.
5. MoneyValue consumes existing domain formatting helpers.

No broad route default, App Shell or financial mutation workflow changed. This is the lowest-risk proof boundary for Phase 2.

## MinimumTargetSizeContract result

The global contract remains mounted because it still combines target sizing, action discoverability and route-specific responsive repairs.

Remaining selector groups are classified as:

| Group | Classification |
|---|---|
| universal button/link/role/tab/summary/select rule | overbroad route compatibility debt mixing AA, important and exception cases |
| checkbox/radio labels | mixed AA/important compatibility debt |
| Inbox select-all and edit/delete/recurring controls | important checkbox/icon-only targets |
| onboarding, landing CTA, login and capture navigation | important action/navigation targets |
| commitment, budget and goal actions | important financial targets plus route layout debt |
| CSV export and privacy action-list links | explicit action targets rather than prose links |
| filters, toolbar selects and attention chips | mixed AA or route-specific debt requiring per-consumer evidence |
| mobile wrapping/full-width repairs | route responsive debt, not primitive ownership |

No selector is removed on grep/scanner evidence alone. Final removal requires route owners, zero-consumer proof and physical-device acceptance in a later phase.

## Storybook reassessment

The internal five-high-value-state condition has been reached. Storybook remains deferred because the current source contracts, unit/static tests and existing Playwright route/device matrix cover the initial slice, while a second build/configuration surface has not demonstrated lower review cost. No dependency, lockfile, hosted provider or production bundle changed.

## Financial mutation boundary

The new primitives contain no mutation logic and the bounded proof consumers do not create, update or delete stored financial data. Future route adoption must identify an existing reversible, checked or confirmed safeguard and use pending state to prevent duplicate mutations. Domain-behavior changes remain separately governed.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P2-T1 | Define primitive API/state/keyboard/accessibility matrix | this packet | done |
| P2-T2 | Normalize token vocabulary and inventory aliases without value changes | completed inventory | done |
| P2-T3 | Implement Button, LinkButton and IconButton | source + contract tests | done |
| P2-T4 | Implement TextField, SelectField, CheckboxField and RadioGroup | source + contract tests | done |
| P2-T5 | Implement Dialog and Sheet | source + contract tests | done |
| P2-T6 | Establish Card, Badge, Alert, Toast and EmptyState contracts | source + contract tests | done |
| P2-T7 | Stabilize MoneyValue and finance-status presentation | existing money helpers + MoneyValue contract | done |
| P2-T8 | Migrate a bounded low-risk consumer set | Dialog/IconButton, Sheet/Dialog and semantic-token/domain-helper composition | done |
| P2-T9 | Inventory remaining MinimumTargetSizeContract rescues | selector-group classification in inventory | done |
| P2-T10 | Owner approves completion and closure boundary | explicit “hoàn tất p2 đi”; exact-head gates still required | authorized, verification pending |

## Verification contract

Before merge, the exact final head must pass:

- UI migration no-new-debt policy;
- diff hygiene and project knowledge;
- primitive contract tests and complete unit/static suite;
- CSS ownership, architecture, lint and TypeScript;
- production build;
- browser smoke;
- Chromium/WebKit cross-device audit, including existing text-200 and keyboard projects;
- CodeQL;
- all-ref secret history scan.

Database/provider/production-data gates are not selected because this phase changes none of those boundaries.

## Risks and controls

| Risk | Control |
|---|---|
| Shared Button defaults alter existing routes | compatibility defaults remain; semantic API is additive |
| Universal 44px sizing harms dense layouts | two-level target policy; no new global selector |
| TSX arbitrary token references bypass CSS scanner | source contract and manual authority reconciliation |
| Native form controls are replaced unnecessarily | native-first primitives |
| Overlay abstraction changes mutation behavior | primitives own presentation/focus only |
| Toasts create announcement spam | polite default, urgent-only alert and ID deduplication |
| MoneyValue guesses meaning | explicit kind/sign inputs and existing domain helpers |
| Global target contract is removed too early | retain until route migration and zero-consumer proof |
| Tool adoption becomes unbounded | Storybook remains separately approved and deferred |

## Handoff and permission record

| Date | From | To | State | Evidence | Next action |
|---|---|---|---|---|---|
| 2026-08-05 | human_owner | planner | specified | “Bắt đầu p2” | define matrix and inventory |
| 2026-08-05 | human_owner | implementer | implementing | standards corrections requested | harden contract before runtime writes |
| 2026-08-05 | human_owner | evaluator | evaluating | “hoàn tất p2 đi” | move PR from draft, run exact-head gates, fix failures, record closure and merge if green |

### Current boundary

- Authorized: finish Phase 2 verification, closure records and merge PR #299 when exact-head protected gates are green.
- Forbidden: Phase 3, broad route redesign, new identity, Storybook/dependency installation, database/auth/RLS/provider changes, deployment and production-data access.
- Stop condition: any required domain mutation, provider or production-data change.

## Delivery record

- Branch: `agent/ui-phase-2-primitives`
- PR: #299
- Starting main: `8688d95160579eacb908f0162994edba4901fc0c`
- Runtime scope: shared presentation primitives only
- Financial-domain behavior change: none
- Provider/production operation: none
- Phase 3 authorization: not granted
