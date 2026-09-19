import { expect } from "@playwright/test";
import { HARNESS_USER } from "./harness";

const DOUBLE = `http://127.0.0.1:${process.env.SUPABASE_DOUBLE_PORT || 3301}`;
const ACCOUNT_ID = "00000000-0000-4000-8000-0000000000a1";
const CATEGORY_ID = "00000000-0000-4000-8000-0000000000c1";

/**
 * Shared synthetic authenticated fixture for ledger-trust presentation tests.
 *
 * The database contract itself is owned by pgTAP. This fixture intentionally
 * seeds only the browser boundary so phone and desktop presentation tests grade
 * the same deterministic trust payload without reaching a real Supabase project.
 */
export async function seedLimitedLedgerTrust() {
  const account = {
    id: ACCOUNT_ID,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 925_000,
    is_archived: false,
  };
  const category = {
    id: CATEGORY_ID,
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
  };
  const balance = {
    account_id: ACCOUNT_ID,
    balance_minor: 925_000,
    currency_code: "VND",
  };

  const response = await fetch(`${DOUBLE}/__control/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: HARNESS_USER,
      inbox_candidates: [],
      import_batches: [],
      transaction_feed: [],
      transaction_review_feed: [],
      accounts: [account],
      categories: [category],
      account_balances: [balance],
      dashboard_bundle: {
        transactions: [],
        accounts: [account],
        categories: [category],
        balances: [balance],
        budgets: [],
        commitments: [],
        commitment_occurrences: [],
        income_templates: [],
        income_occurrences: [],
        goals: [],
        pending_inbox_count: 1,
        ledger_trust: {
          trusted_through: "2026-08-19",
          base_reconciliation_through: "2026-08-31",
          status: "trusted_limited",
          reason: "known_unresolved_work",
          active_account_count: 1,
          clean_reconciled_account_count: 1,
          pending_inbox_count: 1,
          needs_review_transaction_count: 0,
          unreconciled_account_leg_count: 0,
          earliest_unresolved_on: "2026-08-20",
          coverage_scope: "known_ledger_state_only",
        },
      },
    }),
  });

  expect(response.ok, "seeding the authenticated trust fixture must succeed").toBe(
    true,
  );
}
