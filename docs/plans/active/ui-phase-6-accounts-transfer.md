# MoneyFlow UI-system Phase 6 — Accounts and Transfer

**Status:** active
**Execution state:** ready_for_review
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Base main:** `f6cea659030397e21d4287912faef173bc7a0966`
**Branch:** `feat/ui-phase-6-accounts-transfer`
**Pull request:** #307
**Last updated:** 2026-08-06

The owner instructed **`Làm đi`** after Phase 6 repository reconnaissance and official-source research. This authorized bounded specification correction, product-code work and verification on the focused branch. It did not authorize merge, deployment, database/schema/Auth/RLS/provider writes, production-data access, a new visual direction or later UI phases.

## Outcome

Accounts, account creation/editing, archive/restore review and transfer presentation now form one coherent locally owned candidate boundary. Existing account balances, archive RPCs, transfer mutations, reconciliation contracts and financial calculations remain unchanged.

## Repository reconnaissance

At authorization:

- `/accounts` used `src/components/accounts-page.tsx` plus global `dashboard`, `accounts-workspace`, `accounts-summary`, `account-card`, action and feedback classes.
- `accounts-page.module.css` used `:global(...)` bridges and a token redirect to survive a legacy `!important` rule.
- account layout, cards, archive rows, mobile reflow and dark mode were jointly owned by compatibility stylesheets.
- `AccountDialog` duplicated native `<dialog>` lifecycle and exposed only form-level error feedback.
- `TransferDialog` already used Phase 2 primitives but borrowed Phase 5 transaction-form presentation.
- account register/detail already had a local owner and remained outside calculation changes.
- project memory incorrectly described merged Phase 5 as unauthorized.

Verified candidate:

- `/accounts` uses `accounts/accounts-workspace.tsx` and its local CSS Module.
- active totals are explicitly named and unlike currencies are never aggregated.
- archived accounts retain visible balances, register access and restore actions.
- account cards compose shared Alert, Button, LinkButton, EmptyState and MoneyValue contracts.
- account create/edit composes shared Dialog, TextField, SelectField, Button and Alert contracts with field-specific focus recovery.
- credit-card debt is edited as an absolute input while its stored initial balance remains negative.
- archive review initially focuses the non-destructive action and explains the effects on active totals, new-transaction choices, history and restore.
- Transfer retains `executeTransferMutation` and domain preparation while using a dedicated presentation module and review summary.
- retired `accounts-page.tsx` and `accounts-page.module.css` were deleted after route replacement.
- evidence and regression contracts use stable semantic slots rather than retired presentation classes.
- project memory records P5 merged truth and P6 candidate-only status.

Preserved invariants:

- money remains integer minor units; VND remains integer đồng;
- account currency remains immutable after creation;
- credit-card balances remain negative financial values;
- transfers remain same-currency, balanced, idempotent and excluded from income/expense;
- existing Server Actions, RPCs, tenant ownership and RLS remain unchanged;
- archive remains reversible;
- reconciliation remains a separate merged boundary;
- Fresh Blue/B3.2 and signed-in Light/Dark/System behavior remain unchanged.

## Research

| Source | Authority/type | Applied decision |
|---|---|---|
| [WAI-ARIA APG Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | W3C WAI | shared Dialog owns focus entry/containment/return and Escape; archive review initially focuses the least destructive action |
| [WCAG 2.2 Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html) | W3C WAI | account archive must be reversible or checked/confirmed with clear consequences |
| [G168 confirmation technique](https://www.w3.org/WAI/WCAG22/Techniques/general/G168) | W3C WAI | confirmation names the selected account and explains the consequence of continuing |
| [MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | web-platform reference | retain native modal/top-layer semantics through the shared owner |
| [Actual Budget: Accounts](https://actualbudget.org/docs/accounts/) | established open-source PFM documentation | mature account closing preserves history and handles non-zero balances explicitly |
| [Actual Budget API reference](https://actualbudget.org/docs/api/reference/) | official product/API documentation | non-zero closure is a financial lifecycle contract, not a presentation-only change |

Observed:

- MoneyFlow calculates headline totals from active accounts while archived accounts retain balances and history.
- requiring zero balance or creating a balancing transfer would change financial lifecycle behavior.
- the old reversible archive flow did not adequately explain its effect on active totals.

Decision:

- preserve the current mutation and total calculation;
- label totals as active-account totals and display archived balances separately;
- show account identity, balance and consequences before archive;
- require a separate owner-approved Class 3 packet for any future zero-balance or balancing-transfer rule.

## Specification

```text
/accounts
  -> AccountsWorkspace + existing account/transfer owners
       -> accounts-workspace.module.css
       -> active totals by currency
       -> active cards and archived rows
       -> shared feedback/actions/empty state/money primitives
       -> shared AccountDialog lifecycle
       -> reversible AccountArchiveDialog
       -> dedicated Transfer presentation owner
```

Accounts contracts:

- active and archived totals remain explicit and currency-safe;
- complete financial values remain inside their measured boxes at supported widths;
- cards expose register, edit and archive actions with stable accessible names;
- archived rows expose register and restore actions;
- empty/error states do not invent balances;
- no active Accounts element registers retired global account/action classes.

Account form contracts:

- shared Dialog owns modal lifecycle and focus return;
- name is initial focus and invalid fields regain focus;
- pending state prevents duplicate submit and dismissal;
- currency is selectable only on create;
- phone geometry is a full-width bottom sheet with contained inputs and reachable actions.

Transfer contracts:

- existing mutation/domain preparation remains authoritative;
- only active same-currency pairs are selectable;
- source and destination cannot match;
- amount is a positive safe integer;
- idempotency prevents duplicates;
- review names source, destination and complete amount and states total assets do not change;
- no FX, fees, conversion or income/expense classification is introduced.

Stable evidence slots:

- `account-overview-workspace`, `accounts-summary`, `accounts-active-list`, `account-card`;
- `accounts-archived-list`, `archived-account-row`;
- `account-form`, `account-archive-review`;
- `transfer-form`, `transfer-review`;
- shared `dialog`, `dialog-content`, `alert`, `empty-state` and money markers.

## Implementation plan

1. Reconcile P5 truth and authorize P6.
2. Move `/accounts` behind a local workspace.
3. Compose Accounts states from Phase 2 primitives.
4. Migrate account form lifecycle and validation.
5. Replace `window.confirm` with reviewable archive confirmation.
6. Move Transfer presentation to a dedicated owner.
7. Add source and browser contracts.
8. remove retired Accounts component/module after route replacement.
9. run exact-head policy, static, unit, build, browser, cross-device and security gates.
10. stop for explicit owner merge decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| P6-T1 memory reconciliation and packet | completed and verified |
| P6-T2 local Accounts workspace owner | completed and verified |
| P6-T3 shared account form | completed and verified |
| P6-T4 archive/restore review states | completed and verified |
| P6-T5 transfer presentation owner and review | completed and verified |
| P6-T6 preserve account-register integration | completed without calculation rewrite |
| P6-T7 stable source/browser evidence | completed and verified |
| P6-T8 retired Accounts owner removal | component/module removed; unrelated historical global selectors remain bounded until zero-consumer proof |
| P6-T9 full verification matrix | completed on implementation head `4aa6e91c950be0883236be47216873f25a868ea9` |
| P6-T10 owner approval and merge | blocked pending explicit owner decision |

## Evaluation

Evaluation found and corrected real defects without weakening thresholds:

1. the first evidence slot matched a retired global class and was renamed instead of allowlisted;
2. stale tests still read the removed Accounts owner and were moved to the new boundary while preserving shell, MVP and transfer invariants;
3. the transfer amount input and review value had ambiguous accessible names and were separated;
4. the modal audit still targeted retired account-dialog classes and now uses the shared Dialog slot;
5. account inputs exceeded the 320px viewport because the flex input retained intrinsic width; the local form owner now contains it;
6. tablet-landscape card actions compressed initial-balance MoneyValue boxes while their text painted outside; the local card owner now stacks that footer at the measured breakpoint and gives the value stable geometry.

Implementation-head evidence:

- head: `4aa6e91c950be0883236be47216873f25a868ea9`;
- CI #1855, run `31077021628`: success;
- policy, knowledge, deployment, CSS ownership, architecture, lint and typecheck: success;
- complete unit/static RLS suite: success;
- production build: success;
- database classification: success, checks correctly not required;
- browser smoke: success; artifact `browser-smoke-evidence-31077021628-1`, ID `8958019900`, SHA-256 `5857dc544e13452c18d2b3209b0de4c875a1a222d8d16412aa175214d348039a`;
- cross-device audit: success across selected Chromium/WebKit phone, tablet, desktop, dark mode, 200% text and keyboard projects; artifact `ui-audit-evidence-31077021628-1`, ID `8958146545`, SHA-256 `7ff1280677b3c2d83128e05159c4970d0f826c2b2a58a09270c39817a82395ab`;
- final browser aggregation: success;
- CodeQL #972, run `31077021643`: success;
- secret-history scan #972, run `31077021613`: success.

The documentation commit after this implementation head does not change runtime behavior. Its cumulative PR diff still requires exact-head checks before owner review.

## Verification plan

Completed implementation-head proof covers policy, static quality, unit/static RLS, build, focused account/transfer behavior, supported responsive geometry, Chromium/WebKit audit, CodeQL and secret history. No database, provider or production boundary was selected or attempted.

## Explicitly out of scope

- zero-balance archive or automatic balancing transfer;
- reconciliation UI/state/database changes;
- account deletion, bank sync, FX or cross-currency transfer;
- changing balances, formulas, RPCs, RLS, schema or production data;
- deployment, provider configuration or production acceptance;
- Phase 7 Planning or later UI phases.

## Merge and deployment boundary

Merge and deployment remain owner decisions. Ready-for-review and green checks are not authorization to merge, deploy or mutate production/provider state.
