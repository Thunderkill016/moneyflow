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

Accounts, account creation/editing, archive/restore review, transfer presentation and account-register integration become one coherent locally owned interface boundary. Existing financial calculations, transfer invariants, account lifecycle RPCs and reconciliation contracts remain unchanged.

## Repository reconnaissance

At authorization:

- `/accounts` rendered `src/components/accounts-page.tsx`, which mixed a small CSS Module with global classes including `dashboard`, `accounts-workspace`, `accounts-summary`, `account-card`, `secondary-button`, `data-alert` and `font-mono`.
- `accounts-page.module.css` used `:global(...)` bridges and locally redirected a token to survive a legacy `!important` card rule.
- account layout, cards, archive rows, mobile reflow and dark mode were still jointly owned by `globals.css`, `ui-refresh.css`, `cross-device-stabilization.css` and later compatibility layers.
- `AccountDialog` duplicated native `<dialog>` lifecycle, used raw controls/global classes and exposed only a form-level error.
- `TransferDialog` already used the Phase 2 Dialog/field/action contracts and preserved same-currency/idempotent transfer behavior, but its presentation was owned by the Phase 5 transaction form module.
- account register/detail already had a strong local module and MoneyValue composition; remaining global action/feedback bridges are bounded separately from the Accounts list migration.
- `CURRENT_PROJECT_MEMORY.md` still described Phase 5 as unauthorized even though PR #306 was squash-merged as `f6cea659030397e21d4287912faef173bc7a0966`.

Implemented candidate:

- `/accounts` now uses `accounts/accounts-workspace.tsx` and a local CSS Module.
- active totals are explicitly labeled as active-account totals and never aggregate unlike currencies.
- archived accounts remain visible with retained balances, register access and restore actions.
- account cards compose shared Alert, Button, LinkButton, EmptyState and MoneyValue contracts.
- account creation/editing composes shared Dialog, TextField, SelectField, Button and Alert contracts with field-specific focus recovery.
- archive review uses a shared Dialog, initially focuses the non-destructive action and explains balance/history consequences.
- Transfer retains existing mutation/domain owners but has a dedicated presentation module and review summary.
- retired `accounts-page.tsx` and `accounts-page.module.css` are deleted after route replacement.
- the first draft CI classifier found that `accounts-workspace` was also a retired global class name; the evidence slot was renamed to `account-overview-workspace` instead of weakening the guardrail.

Preserved invariants:

- VND remains integer đồng and other supported currencies remain minor-unit integers.
- account currency remains immutable after creation.
- credit-card balances remain negative financial values.
- transfers remain same-currency, balanced, idempotent and excluded from income/expense.
- account balances continue to derive from the existing account/ledger owners.
- existing Server Actions, RPCs, tenant ownership and RLS remain unchanged.
- account archive remains reversible through restore.
- reconciliation database/domain contracts remain separate and unchanged.
- Fresh Blue/B3.2 and signed-in Light/Dark/System behavior remain unchanged.

## Research

| Source | Authority/type | Applied decision |
|---|---|---|
| [WAI-ARIA APG Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | shared Dialog owns focus entry/containment/return and Escape; destructive confirmation initially focuses the least destructive action |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | account archive must be reversible or reviewed/confirmed with clear consequences |
| [G168 confirmation technique](https://www.w3.org/WAI/WCAG22/Techniques/general/G168) | W3C WAI | confirmation names the selected account and explains the consequence of continuing |
| [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | web-platform reference | retain native modal/top-layer semantics through the shared Dialog owner |
| [Actual Budget: Accounts](https://actualbudget.org/docs/accounts/) | established open-source PFM documentation | mature account-closing flows preserve history and explicitly handle non-zero balances instead of silently discarding meaning |
| [Actual Budget API: closing accounts](https://actualbudget.org/docs/api/reference/) | official product/API documentation | non-zero account closure is a financial lifecycle contract, not a presentation-only CSS decision |

Observed:

- MoneyFlow currently calculates the headline totals from active accounts only, while archived accounts retain their balances and history.
- Changing archive rules to require a zero balance or create a balancing transfer would alter financial lifecycle behavior and cross a Class 3 boundary.
- The existing archive mutation is reversible, but the previous `window.confirm` did not explain that archived balances leave the active-account totals.

Decision:

- Phase 6 preserves the existing archive mutation and total calculation.
- The Accounts workspace labels totals as active-account totals and keeps archived balances visibly available in the archived group.
- The archive confirmation names the account, shows its balance and explains that history is preserved while the account leaves new-transaction choices and active totals.
- A future rule requiring zero balance or a balancing transfer before archive requires a separate owner-approved Class 3 packet, database/domain review and migration/RPC/browser evidence.

## Specification

```text
/accounts
  -> AccountsWorkspace + existing account/transfer owners
       -> accounts-workspace.module.css
       -> active totals by currency
       -> active account cards
       -> archived accounts and retained balances
       -> shared Alert, Button, LinkButton, IconButton, EmptyState and MoneyValue
       -> AccountDialog using shared Dialog/field/action contracts
       -> AccountArchiveDialog using shared Dialog and reversible lifecycle
       -> TransferDialog with its own transfer presentation owner

/accounts/[accountId]
  -> existing account register/detail domain projection
       -> local account-detail module
       -> no mutation or reconciliation redesign
```

Accounts workspace contracts:

- total cards state explicitly that they cover active accounts;
- currencies are never aggregated across unlike currency codes;
- complete values remain visible at 320–390 CSS pixels;
- active and archived account names, types, currencies and balances remain readable;
- account cards expose register, edit and archive actions with stable accessible names;
- archived rows expose register and restore actions;
- true empty and data-error states do not invent balances;
- archive review shows account identity, complete balance and exact consequences;
- restore remains available and produces status feedback;
- no active Accounts element registers retired global account/action classes.

Account form contracts:

- shared Dialog owns modal lifecycle and focus return;
- account name is initial focus;
- invalid name returns focus to the name field;
- invalid balance returns focus to the balance field;
- field errors are attached to their controls;
- pending state prevents duplicate submit and dismissal;
- account currency is selectable only on create and clearly immutable on edit;
- credit-card amount editing displays an absolute debt input while storing a negative initial balance;
- phone geometry is a full-width bottom sheet with reachable final actions.

Transfer contracts:

- existing `executeTransferMutation` and domain preparation remain authoritative;
- only active same-currency account pairs are selectable;
- source and destination cannot match;
- amount is a positive safe integer in the source currency minor unit;
- idempotency prevents duplicate demo or authenticated transfers;
- transfer review names source, destination and complete amount and states total assets do not change;
- no FX, fee, cross-currency conversion or income/expense classification is introduced.

Stable evidence slots:

- `account-overview-workspace`, `accounts-summary`, `accounts-active-list`, `account-card`;
- `accounts-archived-list`, `archived-account-row`;
- `account-form`, `account-archive-review`;
- `transfer-form`, `transfer-review`;
- shared `dialog`, `dialog-content`, `alert`, `empty-state` and money markers.

## Implementation plan

1. Record Phase 5 merged truth and authorize this bounded Phase 6 packet.
2. Move `/accounts` behind a locally owned Accounts workspace and remove active global class registration.
3. Compose account totals/cards/actions/empty/error states from Phase 2 primitives.
4. Replace `AccountDialog` with shared Dialog/TextField/SelectField/Button/Alert contracts and field-specific focus recovery.
5. Replace `window.confirm` with a reviewable reversible archive dialog that explains active-total consequences.
6. Move Transfer presentation from the transaction form module to a transfer-owned module and add a clear transfer review.
7. Preserve the existing account-register calculation owner; defer any remaining integration-only bridge cleanup if it would broaden the reviewed boundary.
8. Add source contracts and focused browser coverage for create/edit/archive/restore/transfer states.
9. Remove retired Accounts files after active-consumer proof.
10. Run exact-head policy, static, unit, build, browser, Chromium/WebKit, CodeQL and secret-history gates.
11. Record truthful PR memory and stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P6-T1 merged-memory reconciliation and packet | packet and PR memory created; current project memory pending final candidate evidence |
| P6-T2 local Accounts workspace owner | implemented; evaluation pending |
| P6-T3 shared account form | implemented; evaluation pending |
| P6-T4 archive/restore review states | implemented; evaluation pending |
| P6-T5 transfer presentation owner and review | implemented; evaluation pending |
| P6-T6 account-register integration cleanup | bounded to preserve existing local owner; no calculation rewrite |
| P6-T7 stable source/browser evidence | source and focused Playwright contracts added; exact-head execution pending |
| P6-T8 zero-consumer legacy retirement | retired Accounts component/module removed; global selector deletion pending zero-consumer proof |
| P6-T9 exact-head verification matrix | pending ready-for-review heavy gates |
| P6-T10 owner approval and merge | blocked pending explicit owner decision |

## Verification plan

- policy/knowledge/diff hygiene and CSS ownership/debt gates;
- lint, TypeScript, complete unit/static RLS and production build;
- source contracts proving local ownership, shared primitives and preserved domain owners;
- browser flows for account create/edit validation, archive cancel/confirm/restore, transfer validation/success and account register navigation;
- 320/360/390 phone, tablet and desktop overflow/complete-money evidence;
- signed-in light/dark/system behavior, 200% text, keyboard and forced-colors where selected by the audit matrix;
- CodeQL and secret-history scan;
- database checks must report not required unless implementation discovers a real domain/schema change, in which case Phase 6 stops and returns to specification.

## Explicitly out of scope

- requiring zero-balance archive or automatically creating a balancing transfer;
- reconciliation UI/state/database changes;
- account deletion;
- bank synchronization;
- FX conversion, exchange rates or cross-currency transfers;
- changing balances, ledger formulas, RPCs, RLS, schema or production data;
- deployment, provider configuration or production acceptance;
- Phase 7 Planning or later UI phases.

## Merge and deployment boundary

Merge and deployment remain owner decisions. This branch may create a draft/ready-for-review PR and collect exact-head evidence, but it must not merge, deploy or mutate production/provider state without a separate explicit instruction.
