# MoneyFlow UI-system Phase 6 — Accounts and Transfer

**Status:** active
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `f6cea659030397e21d4287912faef173bc7a0966`
**Branch:** `feat/ui-phase-6-accounts-transfer`
**Pull request:** #307
**Last updated:** 2026-08-06

The owner instructed **`Làm đi`** after the Phase 6 reconnaissance and Google/official-source review on 2026-08-06. This authorizes bounded Phase 6 specification correction, product-code work and verification on the focused branch. It does not authorize merge, deployment, database/schema/Auth/RLS/provider writes, production-data access, a new visual direction or later UI phases.

## Outcome

Accounts, account creation/editing, archive/restore review and transfer presentation become one coherent locally owned interface boundary. Existing financial calculations, transfer invariants, account lifecycle RPCs and reconciliation contracts remain unchanged.

## Repository reconnaissance

At authorization:

- `/accounts` used `src/components/accounts-page.tsx`, a small CSS Module and global classes including `dashboard`, `accounts-workspace`, `accounts-summary`, `account-card`, `secondary-button`, `data-alert` and `font-mono`.
- `accounts-page.module.css` depended on `:global(...)` bridges and a local token redirect to survive a legacy `!important` card rule.
- Accounts layout, cards, archive rows, mobile reflow and dark mode were jointly owned by several compatibility stylesheets.
- `AccountDialog` duplicated native `<dialog>` lifecycle, used raw controls/global classes and exposed only a form-level error.
- `TransferDialog` already used shared Dialog/field/action contracts and preserved same-currency/idempotent transfer behavior, but its presentation was owned by the Phase 5 transaction form module.
- account register/detail already had a local owner and MoneyValue composition, so its financial projection is preserved.
- `CURRENT_PROJECT_MEMORY.md` incorrectly said Phase 5 remained unauthorized after PR #306 had merged.

Implemented candidate:

- `/accounts` now uses `accounts/accounts-workspace.tsx` and a local CSS Module.
- active totals are explicitly labeled and never aggregate unlike currencies.
- archived accounts remain visible with retained balances, register access and restore actions.
- account cards compose shared Alert, Button, LinkButton, EmptyState and MoneyValue contracts.
- account creation/editing composes shared Dialog, TextField, SelectField, Button and Alert contracts with field-specific focus recovery.
- archive review initially focuses the non-destructive action and explains balance/history consequences.
- Transfer retains existing mutation/domain owners but has a dedicated presentation module and review summary.
- retired `accounts-page.tsx` and `accounts-page.module.css` are deleted after route replacement.
- project memory records P5 merged truth and P6 candidate-only status.

Preserved invariants:

- VND remains integer đồng and supported non-VND currencies remain integer minor units.
- account currency remains immutable after creation.
- credit-card balances remain negative financial values.
- transfers remain same-currency, balanced, idempotent and excluded from income/expense.
- account balances continue to derive from existing account/ledger owners.
- existing Server Actions, RPCs, tenant ownership and RLS remain unchanged.
- account archive remains reversible through restore.
- reconciliation database/domain/UI contracts remain separate and unchanged.
- Fresh Blue/B3.2 and signed-in Light/Dark/System behavior remain unchanged.

## Research

| Source | Authority/type | Applied decision |
|---|---|---|
| [WAI-ARIA APG Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | shared Dialog owns focus entry/containment/return and Escape; destructive confirmation initially focuses the least destructive action |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | account archive must be reversible or reviewed/confirmed with clear consequences |
| [G168 confirmation technique](https://www.w3.org/WAI/WCAG22/Techniques/general/G168) | W3C WAI | confirmation names the selected account and explains the consequence of continuing |
| [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | web-platform reference | retain native modal/top-layer semantics through the shared Dialog owner |
| [Actual Budget: Accounts](https://actualbudget.org/docs/accounts/) | established open-source PFM documentation | mature account-closing flows preserve history and explicitly handle non-zero balances |
| [Actual Budget API reference](https://actualbudget.org/docs/api/reference/) | official product/API documentation | non-zero account closure is a financial lifecycle contract, not a presentation-only CSS decision |

Observed:

- MoneyFlow calculates headline totals from active accounts while archived accounts retain balances and history.
- Requiring a zero balance or creating a balancing transfer would alter financial lifecycle behavior and cross a Class 3 boundary.
- The existing archive mutation is reversible, but the previous `window.confirm` did not explain that archived balances leave active totals.

Decision:

- preserve the existing archive mutation and total calculation;
- label totals as active-account totals and display archived balances separately;
- show account identity, balance and consequences before archive;
- require a separate owner-approved Class 3 packet for any future zero-balance or balancing-transfer rule.

## Specification

```text
/accounts
  -> AccountsWorkspace + existing account/transfer owners
       -> local Accounts CSS Module
       -> active totals by currency
       -> active account cards
       -> archived accounts and retained balances
       -> shared Alert, Button, LinkButton, EmptyState and MoneyValue
       -> AccountDialog using shared Dialog/field/action contracts
       -> AccountArchiveDialog using shared Dialog and reversible lifecycle
       -> TransferDialog with its own presentation owner
```

Accounts contracts:

- active totals are named as active totals;
- unlike currencies are never aggregated;
- complete values remain visible at 320–390 CSS pixels;
- account cards expose register, edit and archive actions with stable accessible names;
- archived rows expose register and restore actions;
- empty/error states do not invent balances;
- archive review shows account identity, complete balance and exact consequences;
- no active Accounts element registers retired global account/action classes.

Account form contracts:

- shared Dialog owns modal lifecycle and focus return;
- account name is initial focus;
- invalid name/amount returns focus to the affected field;
- pending state prevents duplicate submit and dismissal;
- currency is selectable only on create and explicitly immutable on edit;
- credit-card input displays absolute debt while storing a negative initial balance;
- phone geometry is a full-width bottom sheet with reachable final actions.

Transfer contracts:

- `executeTransferMutation` and domain preparation remain authoritative;
- only active same-currency account pairs are selectable;
- source and destination cannot match;
- amount is a positive safe integer in the source currency minor unit;
- idempotency prevents duplicate transfers;
- review names source, destination and complete amount and states total assets do not change;
- no FX, fee, conversion or income/expense classification is introduced.

Stable evidence slots:

- `account-overview-workspace`, `accounts-summary`, `accounts-active-list`, `account-card`;
- `accounts-archived-list`, `archived-account-row`;
- `account-form`, `account-archive-review`;
- `transfer-form`, `transfer-review`;
- shared `dialog`, `dialog-content`, `alert`, `empty-state` and money markers.

## Implementation plan

1. Reconcile P5 merged truth and authorize this bounded packet.
2. Move `/accounts` behind a local workspace and remove active global class registration.
3. Compose totals/cards/actions/empty/error states from Phase 2 primitives.
4. Replace AccountDialog with shared lifecycle/field contracts.
5. Replace `window.confirm` with reviewable archive confirmation.
6. Move Transfer presentation to a transfer-owned module and add review.
7. Add source and focused browser contracts.
8. Remove retired Accounts files after route replacement.
9. Run exact-head policy, static, unit, build, browser, Chromium/WebKit, CodeQL and secret-history gates.
10. Record truthful evidence and stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P6-T1 memory reconciliation and packet | completed for candidate state |
| P6-T2 local Accounts workspace owner | implemented; evaluation in progress |
| P6-T3 shared account form | implemented; evaluation in progress |
| P6-T4 archive/restore review states | implemented; evaluation in progress |
| P6-T5 transfer presentation owner and review | implemented; evaluation in progress |
| P6-T6 preserve account-register integration | completed without calculation rewrite |
| P6-T7 stable source/browser evidence | added; exact-head execution in progress |
| P6-T8 retired Accounts owner removal | component/module removed; broader global deletion requires zero-consumer proof |
| P6-T9 exact-head verification matrix | in progress |
| P6-T10 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

The first draft classifier rejected `data-slot="accounts-workspace"` because the string matched a retired global class name. The implementation renamed the evidence surface to `account-overview-workspace`; the no-new-debt guardrail was not weakened or bypassed.

The first ready-for-review policy run then identified two documentation-contract defects: the packet lacked this Evaluation heading, and PR memory announced a snapshot update without modifying `CURRENT_PROJECT_MEMORY.md`. Both findings are being corrected directly. Draft/skipped jobs are not accepted as implementation evidence.

Evaluation must continue through static/type/build, focused browser behavior and the full selected cross-device matrix. Any financial, database, RLS or provider discovery stops this presentation slice and returns to specification.

## Verification plan

- policy/knowledge/diff hygiene and CSS ownership/debt gates;
- lint, TypeScript, complete unit/static RLS and production build;
- source contracts proving local ownership, shared primitives and preserved domain owners;
- browser flows for validation, archive cancel/confirm/restore and transfer review/success;
- 320/360/390 phone, tablet and desktop overflow/complete-money evidence;
- signed-in light/dark/system behavior, 200% text, keyboard and forced-colors where selected;
- CodeQL and secret-history scan;
- database checks must report not required unless a real domain/schema change is discovered.

## Explicitly out of scope

- requiring zero-balance archive or automatically creating a balancing transfer;
- reconciliation UI/state/database changes;
- account deletion or bank synchronization;
- FX conversion, exchange rates or cross-currency transfers;
- changing balances, ledger formulas, RPCs, RLS, schema or production data;
- deployment, provider configuration or production acceptance;
- Phase 7 Planning or later UI phases.

## Merge and deployment boundary

Merge and deployment remain owner decisions. Ready-for-review activates verification only; it is not authorization to merge, deploy or mutate production/provider state.
