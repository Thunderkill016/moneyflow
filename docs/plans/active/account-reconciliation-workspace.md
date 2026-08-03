# Account reconciliation workspace

**Status:** candidate
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #262 / #263
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns the user-facing reconciliation slice built on the domain contract merged through PR #261. It does not authorize production DDL or production-data writes.

## Outcome

A MoneyFlow user can open one owned VND account, start a statement session, clear eligible account legs, see the exact live difference, complete only at zero, inspect stable completed history and reopen only the latest completed session. The screen now also consumes the owner-approved MoneyFlow brand v2 and UI Foundations color roles instead of route-local visual choices.

## Repository reconnaissance

- Baseline: `main@2d8550f739f179fcd42a8fb029c1091467b97847`.
- Account register/detail exists at `/accounts/[accountId]` and derives signed account impact through `src/lib/account-register.ts`.
- Viewer-aware reads live in `src/server/**`; authenticated financial writes live in validated Server Actions and ownership-safe RPCs.
- PR #261 merged `pending` / `cleared` / `reconciled`, one open session per account, exact-zero completion, session-stable completed snapshots, latest-only reopen and review/reconciliation separation.
- `src/app/document-theme.css` is the project-wide color authority. Route CSS must consume `--mf-*` roles and must not create a second brand palette.
- Demo mode is browser-local and never calls authenticated Server Actions.

## Research and adoption review

No external dependency, provider, framework, service or architecture layer is introduced. The visual refresh is based on the owner-approved MoneyFlow brand guide and UI Foundations work from this project session:

- identity blue: `#3B82F6`;
- action blue: `#2563EB`;
- true functional colors: green, red, yellow and blue;
- transfer: indigo;
- light/dark roles use different readable steps of the same hue;
- dark logo surfaces invert approved dark artwork to white while retaining blue identity.

The HTML prototype is design evidence only. Repository code and existing executable contracts remain authoritative.

## Specification

### Core flow

1. Open an account register.
2. Enter statement date and integer statement balance without changing account balance.
3. Start one open session for the account.
4. Mark eligible logical account legs pending or cleared.
5. Display statement balance, cleared balance and exact integer difference.
6. Complete only when difference is exactly zero.
7. Display completed history from stored session snapshots.
8. Reopen only the latest completed session; only its owned legs return to cleared.

### UI and visual semantics

- Route: `/accounts/[accountId]/reconcile`.
- Reconciled rows are visibly locked; state is never conveyed by color alone.
- Positive signed money uses true green; negative signed money uses true red; transfer uses indigo.
- A positive difference is visually green and a negative difference red, but either nonzero value still blocks completion.
- Zero difference uses the success surface and explicitly states that completion is allowed.
- Pending remains neutral; cleared uses information blue; reconciled uses success green.
- Warning yellow is reserved for attention and boundary notes, not signed money.
- Buttons, focus rings, panels, badges and dark mode consume shared `--mf-*` semantic tokens.
- Phone widths down to 320–390px must not overflow horizontally.

### Data and security contract

- Preserve `transaction_feed` unchanged.
- Use `account_reconciliation_entry_feed`, grouped by logical account leg.
- Load sessions from `account_reconciliation_summaries`.
- Validate all database payloads with Zod and reject unsafe integer money.
- Authenticated writes call only the four RPCs merged in PR #261.
- Missing server reconciliation schema disables the feature calmly instead of fabricating data.

### Demo contract

- Use stable synthetic entry IDs.
- Persist state in versioned browser local storage.
- Mirror exact-zero, statement-date, latest-reopen and reconciled-lock rules.
- Never invent a discrepancy transaction or mutate account balance.

## Acceptance criteria

- [x] Core start, clear, complete and reopen behavior is implemented.
- [x] Completion remains blocked until exact zero.
- [x] Completed history uses stored session values.
- [x] Companion read model is security-invoker and account scoped.
- [x] Missing production schema degrades safely.
- [x] Brand v2 and fresh functional roles are defined in the shared semantic theme authority.
- [x] Reconciliation CSS consumes shared semantic roles only.
- [x] Positive/negative/transfer/state colors retain text or icon labels.
- [ ] Exact-head lint, typecheck, unit/static RLS and production build pass after the visual refresh.
- [ ] Exact-head database replay and pgTAP pass after the visual refresh.
- [ ] Exact-head desktop/mobile browser and UI audit pass after the visual refresh.
- [ ] Exact-head CodeQL and secret-history scan pass after the visual refresh.
- [x] No production migration or production-data write occurred.

## Implementation plan

1. Preserve the verified reconciliation domain, read model, server actions and demo reducer.
2. Replace the old shared brand/semantic color values in `document-theme.css` with the approved brand v2 roles.
3. Add harmonized supporting-color tokens without creating route-local palette ownership.
4. Refactor the reconciliation module CSS to use fresh semantic surfaces, signed-value colors, state badges, focus rings and responsive layout.
5. Keep JSX behavior and accessible labels unchanged unless a visual requirement cannot be expressed in CSS.
6. Re-run Class 3 exact-head verification.
7. Update this packet and PR memory with final evidence before merge.

## Evaluation

### Previous verified baseline

Head `30d99769735249fe9264f3b5b38d8587813a9f99` passed CI #1329, CodeQL #469 and secret-history scan #469 before the visual refresh.

### Current visual refresh

- `63a369bb868693d2358565d1cf38a1ef21906879`: shared MoneyFlow brand v2 and fresh functional semantic tokens.
- `d0247e2a3d7a1423d928aa5b59df27a4347b2744`: reconciliation workspace consumes those roles and adds sign-aware difference surfaces through existing `data-money-tone` output.
- `d7c5f3985733cfac063dfce97b73d7d0f7fc94bd`: bounded PR memory corrected so prior verification is not overstated.

No exact-head verification is claimed yet for the refreshed candidate.

## Risks and defenses

| Risk | Defense |
|---|---|
| Shared token update causes unrelated visual regressions | run CSS ownership, production build and cross-device UI audit on exact head |
| Bright colors reduce text contrast | use darker 700/600 steps for light-mode text and lighter 300 steps for dark mode |
| Positive difference appears “safe” | copy and disabled completion remain driven solely by exact-zero domain state |
| Color becomes the only state signal | retain labels, dots, icons, locked controls and explanatory copy |
| Application deploys before reconciliation DDL | missing view/RPC renders feature unavailable without false data |
| Local demo diverges from database rules | existing pure reducer and permanent tests remain unchanged |
| Historical summary recalculates | completed UI reads stored summary columns only |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | domain helpers and demo reducer | `src/lib/reconciliation*` | verified baseline |
| T2 | companion read model and pgTAP | migration + database test | verified baseline |
| T3 | server loader and actions | server/action files | verified baseline |
| T4 | route, component and account-detail link | application files | verified baseline |
| T5 | adopt brand v2 semantic theme roles | `src/app/document-theme.css` | implemented |
| T6 | apply UI Foundations to reconciliation CSS | `account-reconciliation-page.module.css` | implemented |
| T7 | exact-head static/build verification | CI | pending |
| T8 | exact-head database verification | CI / pgTAP | pending |
| T9 | exact-head browser and responsive verification | CI / Playwright | pending |
| T10 | CodeQL and secret-history scan | workflows | pending |
| T11 | owner merge decision | explicit owner instruction | already authorized, blocked until exact-head green |
| T12 | production migration and smoke | separate command | blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-03 | evaluator | owner | verified | CI #1329 and security workflows | production DDL absent | owner authorized merge |
| 2026-08-04 | owner | implementer | implementing | explicit approval to apply UI Foundations | visual system not in repository | update shared tokens and reconciliation CSS |
| 2026-08-04 | implementer | evaluator | candidate | commits `63a369b`, `d0247e2`, `d7c5f39` | prior exact-head evidence stale | run full exact-head gates |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, repository tests, CI and owner-authorized merge after current exact-head verification.

Forbidden without a separate owner command: production migration, production data mutation, provider/config changes and production release claims.

## Delivery record

- Branch: `feat/account-reconciliation-workspace`
- Issue: #262
- PR: #263
- Baseline: `2d8550f739f179fcd42a8fb029c1091467b97847`
- Previous verified implementation head: `30d99769735249fe9264f3b5b38d8587813a9f99`
- Current refreshed candidate: exact-head verification pending
- Production DDL: not authorized
- Production data: not accessed or changed
