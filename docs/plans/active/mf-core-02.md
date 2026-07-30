# MF CORE-02 — Remove Withdrawn Spending Advice

**Status:** implementing  
**Owner:** MoneyFlow  
**Issue/PR:** #154 / pending  
**Last updated:** 2026-07-30

## Outcome

Remove unsupported daily-spending advice from the active finance core and dashboard orchestration while preserving factual ledger summaries and current visible dashboard values.

## Repository reconnaissance

- `src/lib/finance.ts` exports a daily allowance constant and a spending-guide calculator.
- `calculateDashboardSummary` returns `safeToday`, `dailyAllowance`, `forecast` and `foodExpense`, although the dashboard presentation accepts only `balance`, `income`, `expense` and `net`.
- `MoneyFlowDashboard` computes partial budget remainder, commitment reserves and savings inputs solely for the retired outputs.
- `ARCHITECTURE.md` says withdrawn product behavior must not remain exported from active core modules and total assets are not a spending budget.

## Research

The project already separates ledger facts from planning inputs. Budgets, commitments and goals remain useful in their own UI and attention surfaces, but combining partial planning data with total assets into a recommendation has no approved product contract. The correct action is removal, not replacement with another heuristic.

## Specification

- `calculateDashboardSummary` returns exactly `balance`, `income`, `expense` and `net`.
- Demo and authenticated values for those four fields remain unchanged.
- Remove `DAILY_ALLOWANCE`, `calculateDailySpendingGuide` and advice-specific types/options.
- Remove dashboard computations that only supplied advice inputs.
- Preserve budget progress, category ranking, balance reconciliation and transfer neutrality.

## Implementation plan

1. Simplify the finance summary API and implementation.
2. Remove dead dashboard orchestration imports and calculations.
3. Replace advice tests with exact summary-shape and ledger-invariant coverage.
4. Verify source ownership and run full CI.

## Evaluation

- No active source export or dashboard computation for safe-today, daily allowance or forecast.
- Exact summary object tests pass for demo and authenticated modes.
- Lint, typecheck, unit/static RLS, production build, fresh database/pgTAP and browser audit pass.
- No schema, RPC, RLS, UI layout or copy changes.