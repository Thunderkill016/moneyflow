# Persist demo accounts and categories

**Status:** implemented; PR pending  
**Owner:** Codex  
**Issue/PR:** Local bug fix; roadmap context Issue #53  
**Last updated:** 2026-07-28

## Outcome

Demo accounts and categories survive reloads and are hydrated consistently in
every transaction, inbox, import, and planning flow. Account balances are
rebuilt from a stored ledger-independent base plus the active transaction
ledger, so reload never applies a transaction twice.

## Repository reconnaissance

### Baseline before change

- Demo transactions persist in `moneyflow-demo-transactions-v1`.
- Account and category create/edit/archive only update component state.
- Reload restores server fixtures, leaving persisted transactions able to
  reference account or category IDs that no longer exist.
- Transaction, inbox, import, and planning pages consume separate static
  workspace copies of the demo options.
- Runtime reproduction: a new account appeared with its opening balance, then
  disappeared after page reload while the transaction store remained intact.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/accounts.ts` | Owns ledger-to-account balance effects | Reuse reconciliation |
| `src/lib/transaction-store.ts` | Canonical persisted demo ledger | Reuse active ledger |
| `src/components/accounts-page.tsx` | Account producer and transfer flow | Persist master records |
| `src/components/categories-page.tsx` | Category producer | Persist master records |
| Transaction/inbox/planning clients | Consume account/category options | Hydrate through one hook |
| `src/lib/delete-account.ts` | Clears owned browser data | Register the new stores |

## Research

External research is not required for this defect. The expected behavior is
already explicit in the product's demo banner (“dữ liệu lưu trên trình duyệt”),
and the repository's ledger invariants define the balance model.

### Evidence and decision

| Source | What it establishes | Decision |
|---|---|---|
| Runtime reproduction on `/accounts` | New demo account disappears on reload | Persist account master data |
| `src/lib/transaction-store.ts` | Demo ledger already survives reload | Hydrate master data beside the ledger |
| `src/lib/accounts.ts` | Ledger effects are deterministic by account | Store pre-ledger base balances |
| Product principles | Transfers are not income/expense; money is integer minor units | Reuse the existing ledger reconciliation |

## Specification

### Acceptance criteria

- [x] Creating, editing, archiving, and restoring a demo account survives reload.
- [x] Creating, editing, hiding, and restoring a demo category survives reload.
- [x] The same active account/category options appear in transaction, inbox,
      import, budget, commitment, and recurring-income flows.
- [x] Archived master data remains available for historical rows but cannot be
      selected for new money movements.
- [x] A persisted transaction never loses its referenced demo account/category
      after navigation or reload.
- [x] Opening balances and active transactions affect balance exactly once.
- [x] Malformed or unsafe stored master data is removed and replaced by the
      canonical demo fixtures.
- [x] Account deletion clears both new browser stores.

### Financial and security constraints

- Monetary values remain safe integers in minor units; VND has no decimals.
- Transfers affect source and destination only, never income or expense.
- Currency codes are normalized ISO-style three-letter codes.
- Authenticated Supabase behavior and ownership/RLS boundaries are unchanged.

### Out of scope

- UI or brand redesign.
- Database schema changes.
- Import reconciliation and persistent rules from the broader Issue #53
  roadmap.
- Cross-currency transfer or FX conversion.

## Implementation plan

1. Add validated, versioned account/category browser stores with canonical
   fallbacks.
2. Store a ledger-independent `baseBalance` for each demo account.
3. Add one client hydration hook that returns only active picker options.
4. Persist producers and replace static demo consumers.
5. Add unit contracts and a cross-route browser flow, then run full gates.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Reproduce disappearing demo master data | Browser reload reproduction | done |
| T2 | Add validated account/category stores | Focused unit tests | done |
| T3 | Persist account/category producers | Desktop/mobile create/reload E2E | done |
| T4 | Hydrate transaction, inbox, import, and planning consumers | Shared hook plus source review | done |
| T5 | Verify archive filtering and historical references | Desktop/mobile cross-route E2E | done |
| T6 | Run complete repository gates | Evaluation below | done |

## Verification plan

- Focused unit tests for validation, fallback, round-trip, archival filtering,
  ledger replay, and referential integrity.
- Desktop/mobile Playwright flow: create account/category, reload, record a
  transaction with both, navigate across routes, and verify balance/reference.
- Full unit, lint, typecheck, architecture, knowledge, CSS ownership, build,
  static RLS, and E2E gates.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Create/reload persistence | `demo-master-data.spec.ts` desktop/mobile | pass |
| No double-applied opening balance or ledger row | `demo-master-data-store.test.ts` and Dashboard E2E | pass |
| Archive removes picker options but keeps history | `demo-master-data.spec.ts` | pass |
| Malformed/unsafe storage fallback | `demo-master-data-store.test.ts` | pass |
| Unit/domain suite | 574 passed | pass |
| Full browser suite | 8 desktop/mobile tests passed | pass |
| Static/build gates | lint, typecheck, knowledge, architecture, CSS ownership, static RLS, 43-route build | pass |

### Environment notes

- The production build requires the repository's explicit demo/authenticated
  environment contract. It passed with `NEXT_PUBLIC_APP_MODE=demo`.
- The deployment-guard child-process tests require execution outside the
  restricted sandbox so their stdout/stderr can be asserted; all seven guard
  cases passed there.
- No database schema changed. Static RLS verification passed; local pgTAP was
  not required for this browser-store-only slice.

### Next functionality backlog

Continue Issue #53 in domain-risk order: database invariants, import provenance
and reconciliation, statement reconciliation, then persisted deterministic
rules and audit/performance work. UI/brand redesign remains deferred.
