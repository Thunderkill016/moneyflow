# Current UI evolutionary refresh — Slice 2: Manual Capture + Accounts

**Status:** active delivery
**Execution state:** implementation and browser evidence complete; final Class 2 gates and draft-PR delivery pending
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #374
**Last updated:** 2026-08-14

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet is the one bounded,
owner-authorised Class 2 delivery for Manual Capture and Accounts. It does not restart
Phase E, select a territory, begin Phase F, or authorise a broader rebuild.

## Outcome

Manual Capture should make one financial fact—expense, income or transfer—deliberate and
easy to complete. Accounts should make current position and account context easy to read
and inspect. Both retain every current financial, recovery and runtime-mode contract.

## Repository reconnaissance

### Current behavior

- Global capture routes to `/capture/quick`; `CaptureQuickPage` embeds the existing
  `AddTransactionDialog`, while transfer keeps its dedicated `TransferDialog` owner.
- `AccountsWorkspace` owns active/archived account presentation, account create/edit,
  archive/restore, account-history links and reconciliation links; its actions already
  preserve separate demo and authenticated stores.
- Shared `Dialog`/`Sheet` own capped `svh` geometry and a single scroll body. Consumers
  must not create a competing height/overflow owner.
- Slice 1 is completed/archived. Its shell, Overview and Transactions surfaces are not
  redesign targets in this packet.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/components/add-transaction-dialog.tsx` + transaction-form CSS | expense/income capture owner | refine hierarchy without changing mutation contract |
| `src/components/transfer-dialog.tsx` + transfer CSS | balanced transfer owner | preserve source/destination and neutrality |
| `src/components/inbox/capture-quick-page.*` | dedicated quick-capture route | use existing embedded dialog owner |
| `src/components/accounts/accounts-workspace.*` | Accounts position/context/actions owner | refine presentation and retain all actions |
| `src/components/ui/dialog.*`, `sheet.tsx` | shared overlay geometry | reuse; no primitive change unless a real cross-consumer defect is proven |
| `src/app/document-theme.css` | Fresh Blue semantic-token owner | reuse existing token ownership; no global layer |

### Existing tests and constraints

- Related contracts include `ui-phase5-transactions-contract`, `ui-phase6-accounts-contract`,
  demo-persistence, transfer mutation and P3 remediation tests.
- Integer VND, balanced transfers, soft-delete recovery, explicit demo/auth runtime modes
  and canonical Transactions evidence/correction path are non-negotiable.
- The affected diff must be reclassified with `agent:doctor`; expected Class 2 evidence
  includes static, unit, build, browser and responsive UI coverage selected by policy.

### Similar implementation and recent history

- Slice 1 established the current evolutionary visual direction and must be treated as
  completed input, not reopened design work.
- A0 requires replace-and-retire ownership, first-paint evidence and one coherent scroll
  owner for a constrained dialog/sheet consumer.

### Resolved reconnaissance questions

- Capture keeps type, amount, account and category as required decisions for an expense
  or income; date, note and keep-open are secondary. Transfer remains a separate owner
  with source and destination required.
- Accounts retain their current list, account-register, create/edit, archive/restore and
  reconciliation owners. The Slice 2 change may clarify their hierarchy, but does not
  move, remove or replace those actions.

## Research

Not required for a bounded evolutionary refinement: product behavior, visual authority,
financial semantics and component ownership are established by current code, tests,
Phase C, A0 and Slice 1. No external pattern, dependency or provider is being adopted.

### Adoption review

Not applicable: no dependency, provider, service, framework or architecture pattern is
being added.

## Specification

### Problem

Current Manual Capture and Accounts are functional but need the same evidence-led
hierarchy, density, responsive and dark-mode review applied to Slice 1. The work may not
buy visual simplicity by hiding optional detail or account/reconciliation actions.

### User stories

- As a ledger user, I can record an expense, income or transfer by seeing type, amount
  and required account/category decisions in the right order.
- As a ledger user, I can understand an active account's balance and reach its existing
  history, reconciliation and management actions.

### Acceptance criteria

- [ ] **UI2-AC1** Current Manual Capture and Accounts capabilities remain reachable and
  behaviorally unchanged, except a documented contract-preserving bug fix.
- [ ] **UI2-AC2** Capture prioritises type → amount → required account/category; optional
  detail is visibly secondary.
- [ ] **UI2-AC3** Expense, income and transfer remain distinct without color alone.
- [ ] **UI2-AC4** Transfer source/destination and neutrality remain clear.
- [ ] **UI2-AC5** Accounts foreground current position/identity and existing
  history/reconciliation/account actions without becoming a generic dashboard.
- [ ] **UI2-AC6** Demo/auth stores and persistence semantics remain explicit and distinct.
- [ ] **UI2-AC7** 390×844 and 390×568 retain reachable required actions; keyboard/focus
  and overlay scrolling retain one owner.
- [ ] **UI2-AC8** Fresh Blue/current identity remains; no rejected territory or new
  palette enters.
- [ ] **UI2-AC9** Light/dark hierarchy and financial/critical state remain understandable
  without color alone.
- [ ] **UI2-AC10** No route/nav-destination, database/Auth/provider or financial-semantic
  change.
- [ ] **UI2-AC11** Harness V2 artifacts, targeted browser measurement and device evidence
  are labelled separately.
- [ ] **UI2-AC12** A fresh evaluator finds no material capture/account, short-height,
  mode-boundary or financial-invariant regression.

### Required states

- Loading/empty/populated: retain current route and workspace owners.
- Validation/error/recovery: retain existing form errors and account archive/restore flow.
- Long VND: preserve numeric tabular integrity and no color-only meaning.
- Mobile/tablet/desktop: 390×844 and 390×568 are required; constrained overlays must
  keep close, header and final required action reachable.
- Accessibility: labels, keyboard focus, visible focus and touch targets remain valid.

### Financial and security constraints

- Integer VND; no changed calculation, balance, category or transfer semantics.
- Transfers remain balanced movements, never income/expense.
- No schema/RLS/Auth/provider change; demo and authenticated persistence remain separate.

### Out of scope

Phase E/F, any visual territory/palette/type-system work; Slice 1 redesign; Reports,
Plan, Advanced, Inbox/import/rules, Settings or backup/export redesign; route/IA changes;
financial/domain changes; schema/migration/database/Supabase/Auth/provider/production;
CI or Design Harness modification.

## Implementation plan

### Architecture fit

Existing capture, transfer, account, dialog/sheet and token owners remain authoritative.
The slice changes only their local presentation/composition and tests that enforce their
existing contracts.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| capture and transfer local components/CSS | inspect then refine local hierarchy | make financial fact and required decisions clear |
| Accounts workspace/CSS | inspect then refine current-position/action hierarchy | make account context easier to scan/reach |
| focused contracts/browser evidence | extend only for observed regression risk | prove semantics/reachability survive |
| lifecycle docs | active → completed only after evidence/merge staging | retain one current authority |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility/rollback: presentation-only local ownership; revert the focused PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Cleaner form hides a financial decision | behavior tests and evaluator complete all three types |
| Short mobile traps scroll or keyboard hides action | browser measurement at 390×568 with one owner |
| Account action disappears under visual simplification | evaluator checks history/reconciliation/manage/archive paths |
| New identity leaks in | reuse Fresh Blue tokens and compare against Slice 1 authority |

### Verification plan

- Static/unit/build: exact doctor-selected Class 2 commands.
- Browser/responsive: targeted normal/short mobile plus policy-selected audit.
- Visual: Design Harness V2 as-is at its encoded viewport; browser 390×568 clearly
  labelled separately.
- Production/manual: none; no provider or production boundary is in scope.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| UI2-T1 | reconcile base, register packet and audit owners | #374 base | packet, registry, current memory, Trust | complete |
| UI2-T2 | inspect capture/transfer capabilities and current browser behavior | UI2-T1 | source/tests/browser notes | complete |
| UI2-T3 | inspect Accounts capabilities and current browser behavior | UI2-T1 | source/tests/browser notes | complete |
| UI2-T4 | implement bounded local refinement with contracts | UI2-T2, UI2-T3 | focused contracts and typecheck | complete |
| UI2-T5 | Class 2 visual/browser evidence and gates | UI2-T4 | Harness V2/browser proof and local gate record; exact-head provider checks remain future PR evidence | complete locally, provider pending |
| UI2-T6 | fresh evaluation and delivery | UI2-T5 | clean fresh evaluation; draft PR and exact-head CI pending | in_progress |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-14 | human_owner | implementer | implementing | issue #374; reconciled onto `main@dd735700`; packet registered | browser evidence and fresh evaluation remain pending | finish only the bounded Slice 2 flows |
| 2026-08-14 | implementer | fresh evaluator | evaluated | demo expense, income and transfer completed; transfer remained neutral; Accounts list/register/manage/reconcile exercised; 390×844 and targeted 390×568 browser review; Harness V2 `/transactions` and `/accounts` | final gate/PR evidence is still required; 390×568 is browser-targeted only, not Harness or device evidence | run final Class 2 gates, then create one draft PR |

### Current permission boundary

- Granted scope: Slice 2 local UI presentation and contract evidence for Manual Capture
  and Accounts on this branch.
- Forbidden writes: every out-of-scope domain above, especially Phase E/F, Design Harness,
  routes/IA, financial semantics, provider/production/database/Auth and CI.
- Human approval required before: any scope expansion, deployment or merge.
- Stop condition: a needed fix crosses shared overlay behavior, route/IA, financial/domain
  semantics, data/Auth/provider boundaries, or requires a new visual direction.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| UI2-AC1–6 | focused contracts plus live demo expense, income, transfer and Accounts exercise | pass pending final Class 2 gates |
| UI2-AC7 | browser at 390×844 and targeted 390×568; keyboard focus reached every action and the dialog body was the sole effective scroll owner | pass pending final Class 2 gates |
| UI2-AC8–9 | current Fresh Blue semantic ownership retained; live light and dark review | pass pending final Class 2 gates |
| UI2-AC10–11 | focused diff and unchanged Harness V2; targeted short-height browser evidence is explicitly separate | pass pending final Class 2 gates |
| UI2-AC12 | fresh evaluator completed expense/income/transfer, balance neutrality, Accounts/reconciliation, demo boundary, 390×568, light/dark and scope review; no material finding | pass pending final Class 2 gates |

### Research and adoption evidence

No external adoption; current code/tests and the named authority documents own the input.

### Review findings

- Fresh evaluator: no material in-scope finding. It independently verified expense,
  income and transfer save flows; source/destination clarity and transfer neutrality;
  account register and reconciliation reachability; demo labeling; short-height focus and
  scroll ownership; light/dark tokens; and no shell, Overview, Transactions or Phase E/F
  scope leak.
- Design Harness V2, unchanged: `/transactions` and `/accounts` captured at 1440×900 and
  390×844. Fresh visual scores were Transactions 90/86 and Accounts 91/85
  (desktop/phone); density was noted but no material visual defect was found.
- Final local gates: `check:migrations`, `check:knowledge`, `test:ci-policy`,
  `check:architecture`, `typecheck` and focused Capture/Accounts contracts passed.
  `test:e2e` could not start because the owner’s already-running local demo server held
  port 3315. `test:ui-audit:pr` completed non-green with WebKit internal navigation
  errors before assertions; a deeper untouched-main attempt was itself blocked by the
  temporary worktree's external `node_modules` symlink. Neither is classified as a
  Slice 2 regression or as pre-existing. Aggregate `npm test` was invoked once, but this
  terminal transport did not return its final summary after the large parallel output;
  it is deliberately not marked green.
- Independent exact-head review found a P1 demo first-financial-paint defect: the server
  snapshot could be rendered before browser-ledger reconciliation. Accounts now withhold
  snapshot balances, totals and account-register entries behind an explicit live
  reconciliation state until the stored demo ledger is ready. Focused unit/contract tests
  cover a stored-ledger difference, income, expense and both transfer legs, list/detail
  withholding, and unchanged authenticated server ownership. Browser proof at 390×844 and
  targeted 390×568 confirmed the reconciled values and no horizontal or nested-scroll trap;
  Harness V2 was rerun unchanged for `/transactions` and `/accounts`.

### Remaining limitations

- No physical-device evidence is claimed unless an actual device run occurs.

## Delivery record

- Branch: `ui/evolutionary-refresh-slice-2`
- Base: `main@dd735700731c9718f8d2ae8e62488e35df87d859`.
- Browser proof: one demo expense, income and transfer were persisted and visible in the
  ledger; transfer changed its source/destination accounts equally and oppositely without
  changing income/expense totals. Accounts create/edit/archive/restore, register detail
  and reconciliation-path reachability were exercised. No production, provider, database
  or Auth write occurred.
- Responsive proof: 390×844 browser review passed. At targeted browser 390×568, Capture
  and Transfer retained required selectors, validation, close/cancel/save reachability,
  keyboard focus and one effective dialog-body scroll owner with no horizontal overflow.
  This is not Design Harness or physical-device evidence.
- PR/CI/squash/deployment: draft PR #381 exists. Its final exact head, provider checks,
  review and owner merge remain pending; no merge or deployment is authorised. The local
  gate record above contains its two non-green browser-run limitations and the inconclusive
  aggregate-test transport result.
- Packet move to completed: only after accepted exact-head evidence and owner merge.
