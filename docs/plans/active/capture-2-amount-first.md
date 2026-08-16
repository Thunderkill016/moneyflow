# Capture 2.0 — amount-first quick capture

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** owner-authorized ChatGPT implementation
**Issue/PR:** #409 / #410
**Last updated:** 2026-08-16

## Outcome

Make MoneyFlow's high-frequency manual capture path feel like an input tool rather than a long form: for a familiar expense/income, open capture, type the amount, visually confirm remembered account/category, and save without scrolling or re-selecting defaults.

## Repository reconnaissance

### Current behavior

- `AddTransactionDialog` is the shared trusted Expense/Income mutation surface used by Dashboard, Transactions, and `/capture/quick`.
- It already remembers kind/account/category, orders recent categories, focuses the amount field, preserves idempotency, supports deterministic note rules, and supports keep-open repeated entry.
- The current presentation still exposes numbered steps, a full account select, full category grid, date/note fields, and keep-open UI in the common path.
- Transfer uses `TransferDialog` and a separate `addTransfer` mutation boundary; transfer must remain neutral to income/expense.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/add-transaction-dialog.tsx` | shared trusted quick transaction state + submit | reuse logic, redesign presentation |
| `src/components/transactions/transaction-form.module.css` | capture geometry and keyboard constraints | change local owner only |
| `src/components/transfer-dialog.tsx` | trusted transfer boundary | reuse, do not duplicate transfer math |
| `src/components/moneyflow-dashboard.tsx` | in-place Dashboard capture | wire transfer handoff only |
| `src/components/transactions/transactions-workspace.tsx` | in-place ledger capture + transfer | preserve separate trusted owners |
| `src/components/inbox/capture-quick-page.tsx` | `/capture/quick` shared form host | pass initial kind and transfer handoff |
| `src/app/capture/quick/page.tsx` | shortcut/deep-link entry | parse trusted kind query only |
| `src/app/manifest.ts` | installed-PWA quick actions | add progressive shortcuts |

### Existing tests and constraints

- `e2e/expense-path.spec.ts` covers quick add, dashboard dialog, repeated entry and exact ledger effects.
- UI audit covers narrow phones, dark mode and browser keyboard/responsive behavior.
- VND remains integer đồng; idempotency and current mutation functions are unchanged.
- Dialog owns the single scroll body; do not add a nested scroll owner.

### Similar implementation and recent history

- #404 reduced keyboard viewport pressure without changing mutation semantics.
- #408 redesigned the mobile bottom navigation and removed protruding center-action geometry.

### Open questions

- [x] Can the common path be compressed without replacing transaction mutations? Yes: change only presentation around existing state/defaults.
- [x] Can transfer be unified without reimplementing its financial semantics? Yes: hand off to the existing `TransferDialog`/`addTransfer` boundary.

## Research

### Research scope and source selection

- Decision question: how should a manual-first mobile finance app minimize interaction while keeping explicit financial confirmation?
- Reference map consulted: not required; focused product/standards research was completed in the owner conversation immediately before authorization.
- Source budget: four focused sources.
- Expected decision: amount-first, deterministic defaults, progressive disclosure, explicit save, touch-safe controls.

### Questions researched

1. Which transaction data should dominate the first viewport?
2. Which fields can be safely defaulted or progressively disclosed?
3. How should transfer remain distinct from income/expense?
4. Which installed-PWA entry shortcuts are appropriate progressive enhancement?

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Apple Human Interface Guidelines — Entering data / keyboards / accessibility | platform design guidance | 2026-08-16 | minimize entry, use suitable keyboard, keep controls reachable, touch-safe targets | not copied as an iOS visual style |
| YNAB transaction-entry guidance | mature personal-finance product pattern | 2026-08-16 | amount-first entry, remembered/recent categorization patterns | MoneyFlow keeps its own manual-first model and data architecture |
| MDN / web.dev PWA shortcuts and OS integration | web-platform guidance | 2026-08-16 | manifest shortcuts/share target are progressive enhancement | browser/OS support varies; never sole path |
| Existing MoneyFlow code/tests | repository authority | 2026-08-16 | deterministic prefs/rules/idempotency/transfer boundaries already exist | outranks external product patterns |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep current form and only shrink spacing | smallest diff | does not remove cognitive/interaction cost | reject |
| New separate quick-capture mutation implementation | maximum custom UI freedom | duplicates trusted financial logic | reject |
| Re-present existing mutation state with progressive disclosure | faster UX, preserves trusted semantics | requires e2e/UI contract updates | selected |
| Auto-save after amount | fastest tap count | unsafe/ambiguous financial confirmation | reject |

### Research decision

Use amount-first progressive disclosure around the existing transaction mutation path. Defaults remain deterministic and user-visible. Account/category/date/note stay editable but no longer dominate the common path. Transfer is offered through the existing transfer boundary rather than pretending it is a money-transaction kind.

### Adoption review

Not applicable. No dependency/provider/service/framework change.

## Specification

### Problem

Frequent users repeat choices the app already remembers, yet the current UI still presents the capture task as four numbered steps and displays the full category taxonomy, optional date/note fields and repeated-entry control every time. On phones this increases visual scanning and keyboard pressure.

### User stories

- As a frequent user, I can type an amount and save using trusted remembered defaults without scrolling.
- As a user who needs a different account/category/date/note, I can reveal and change it explicitly.
- As a user moving money between accounts, I can switch from quick capture into the existing transfer flow without transfer being counted as income/expense.

### Acceptance criteria

- [ ] Amount is the primary initial focus and visual object.
- [ ] No numbered-step framing remains in quick capture.
- [ ] `Chi`/`Thu` are compact; `Chuyển` hands off to the trusted transfer boundary where supported.
- [ ] Remembered account/category are visible confirmations; full selectors are disclosed on demand.
- [ ] Date/note/keep-open are secondary disclosure, with today's date as default.
- [ ] Common familiar transaction can be saved without scrolling at constrained phone height in browser evidence.
- [ ] Submit remains explicit and idempotent; mutation failure retains entered state.
- [ ] Dashboard, Transactions and `/capture/quick` continue using the same transaction mutation semantics.
- [ ] PWA shortcuts deep-link to supported expense, income and transfer entry paths as progressive enhancement.

### Required states

- Loading: unchanged route loading ownership.
- Empty: existing account/category setup guard remains.
- Populated: remembered/default values shown in compact confirmations.
- Validation/error: amount error returns focus to amount; general errors remain visible.
- Recovery/undo: existing save behavior unchanged; no new destructive action.
- Long data / large VND: labels truncate safely; money uses existing formatter/parser.
- Mobile/tablet/desktop: responsive at 320/360/390 and existing wider audit projects.
- Accessibility: native disclosure semantics, visible labels, keyboard focus, touch targets and forced-colors support.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer neutrality remain intact.
- No RLS/schema/provider boundary changes.

### Out of scope

- AI categorization, bank sync, OCR, background auto-save, new data model, import redesign, broad dashboard redesign.

## Implementation plan

### Architecture fit

`AddTransactionDialog` remains the owner of Expense/Income quick-entry state and submit semantics. CSS stays in the existing transaction-form module. Transfer continues in `TransferDialog`; callers only provide a handoff callback. PWA shortcuts only deep-link to routes that already own those flows.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `add-transaction-dialog.tsx` | amount-first structure, compact disclosures, optional initial kind + transfer handoff | remove common-path friction without duplicate mutation logic |
| `transaction-form.module.css` | compact confirmation/disclosure geometry and mobile footer | keep save/defaults reachable with keyboard pressure |
| dashboard / capture quick hosts | wire transfer handoff and initial kind | consistent daily entry behavior without duplicating transfer math |
| `manifest.ts` | add expense/income/transfer shortcuts | faster installed-PWA entry |
| affected e2e/contracts | open disclosures only when test intentionally changes secondary data | contract new UX instead of old form shape |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing quick-add preference keys remain unchanged.
- Rollback: revert presentation/wiring PR; no stored-data migration required.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Hidden default is wrong | always show selected account/category summary before save |
| User cannot find category | labeled native disclosure + full existing category grid |
| Keyboard still blocks save | compact first viewport + existing dialog footer/one-scroll-owner + UI audit |
| Transfer accidentally uses income/expense mutation | callback hands off only to existing `TransferDialog`/`addTransfer` |
| Deep-link kind is untrusted | only normalize explicit `expense`/`income`/`transfer`; fallback to prefs |

### Verification plan

- Static: CI policy, knowledge, architecture, CSS ownership, lint, typecheck, build.
- Unit/domain: existing finance/money/quick-prefs tests plus refreshed source contracts.
- Database: not expected for presentation-only mutation reuse unless CI classifier selects it.
- Browser flow: expense path, keep-open, transfer handoff, deep-link initial kind.
- Responsive/visual: full PR UI audit including 320/360/390, dark and WebKit.
- Production/manual: owner real-phone check under RRB-08 after merge/deploy.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Record authority + packet | owner approval | #409 + this packet + board | done |
| T2 | Redesign shared quick capture presentation | T1 | focused diff in #410 | done |
| T3 | Wire transfer handoff + deep-link kinds/PWA shortcuts | T2 | route/browser contract | done |
| T4 | Update affected e2e/static contracts | T2/T3 | exact assertions | doing |
| T5 | Independent review + exact-head CI/UI evidence | T4 | PR checks/artifact review | todo |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-16 | human_owner | implementer | implementing | owner authorization + #409 + PR #410 | no local repo runtime; `agent:doctor` cannot run in this chat container because outbound DNS prevents cloning | fix exact-head gate findings, then review CI/browser artifacts |

### Current permission boundary

- Granted scope: Capture 2.0 quick-entry UX and supporting route/PWA entry wiring.
- Exact repositories/providers/resources: `Thunderkill016/moneyflow` branch only.
- Forbidden writes: provider config, production data, schema, main direct push.
- Human approval required before: merge/deployment acceptance remains owner decision unless explicitly authorized in chat.
- Rollback or stop condition: any financial semantic regression, transfer counted as income/expense, unreachable save/required control, or failing exact-head gate.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Amount-first common path | pending exact-head browser evidence | pending |
| Defaults visible and editable | pending exact-head browser evidence | pending |
| Transfer boundary preserved | existing `addTransfer` handoff + pending browser evidence | pending |
| Responsive/browser | pending exact-head UI audit | pending |

### Research and adoption evidence

- Selected sources still support the chosen progressive-disclosure approach.
- External patterns do not override MoneyFlow's current transaction/domain contracts.
- New dependency/pattern adoption: not applicable.

### Review findings

- Correctness: first ready-state run exposed stale source contracts; contracts are being reconciled to the owner-authorized hierarchy without weakening financial assertions.
- Security/ownership: no boundary change planned.
- UI/UX/accessibility: pending exact-head artifact review.
- Maintainability/duplication: reuse existing mutation paths; no duplicate financial logic.
- Scope compliance: pending final diff review.

### Remaining limitations

- Browser/CI evidence will not count as physical-device acceptance.

## Delivery record

- Branch: `capture-2-amount-first-409`
- PR: #410
- Squash commit: pending
- CI run: pending final exact-head run
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: pending
