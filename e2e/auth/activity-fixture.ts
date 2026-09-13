import { expect } from "@playwright/test";
import { HARNESS_USER } from "./harness";

const DOUBLE = `http://127.0.0.1:${process.env.SUPABASE_DOUBLE_PORT || 3301}`;

const CASH_ACCOUNT_ID = "10000000-0000-4000-8000-000000000001";
const BANK_ACCOUNT_ID = "10000000-0000-4000-8000-000000000002";
const FOOD_CATEGORY_ID = "20000000-0000-4000-8000-000000000001";
const INCOME_CATEGORY_ID = "20000000-0000-4000-8000-000000000002";
const REVIEW_TRANSACTION_ID = "30000000-0000-4000-8000-000000000001";
const POSTED_TRANSACTION_ID = "30000000-0000-4000-8000-000000000002";
const READY_CANDIDATE_ID = "40000000-0000-4000-8000-000000000001";
const ATTENTION_CANDIDATE_ID = "40000000-0000-4000-8000-000000000002";

const accounts = [
  {
    id: CASH_ACCOUNT_ID,
    user_id: HARNESS_USER.id,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 2_000_000,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: BANK_ACCOUNT_ID,
    user_id: HARNESS_USER.id,
    name: "Vietcombank",
    kind: "bank",
    currency_code: "VND",
    initial_balance_minor: 8_000_000,
    is_archived: false,
    created_at: "2026-01-02T00:00:00.000Z",
  },
];

const categories = [
  {
    id: FOOD_CATEGORY_ID,
    user_id: HARNESS_USER.id,
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: INCOME_CATEGORY_ID,
    user_id: HARNESS_USER.id,
    name: "Lương",
    kind: "income",
    icon: null,
    color: null,
    is_archived: false,
    created_at: "2026-01-02T00:00:00.000Z",
  },
];

const balances = [
  {
    user_id: HARNESS_USER.id,
    account_id: CASH_ACCOUNT_ID,
    balance_minor: 1_925_000,
    currency_code: "VND",
  },
  {
    user_id: HARNESS_USER.id,
    account_id: BANK_ACCOUNT_ID,
    balance_minor: 9_500_000,
    currency_code: "VND",
  },
];

const reviewTransaction = {
  id: REVIEW_TRANSACTION_ID,
  user_id: HARNESS_USER.id,
  kind: "expense",
  note: "Bữa trưa cần xem lại",
  occurred_on: "2026-09-13",
  created_at: "2026-09-13T04:00:00.000Z",
  amount_minor: -75_000,
  account_id: CASH_ACCOUNT_ID,
  account_name: "Tiền mặt",
  category_id: FOOD_CATEGORY_ID,
  category_name: "Ăn uống",
  destination_account_id: null,
  destination_account_name: null,
  is_recurring_payment: false,
  split_lines: null,
};

const postedTransaction = {
  id: POSTED_TRANSACTION_ID,
  user_id: HARNESS_USER.id,
  kind: "income",
  note: "Lương đã vào sổ",
  occurred_on: "2026-09-12",
  created_at: "2026-09-12T03:00:00.000Z",
  amount_minor: 1_500_000,
  account_id: BANK_ACCOUNT_ID,
  account_name: "Vietcombank",
  category_id: INCOME_CATEGORY_ID,
  category_name: "Lương",
  destination_account_id: null,
  destination_account_name: null,
  is_recurring_payment: false,
  split_lines: null,
};

const readyCandidate = {
  id: READY_CANDIDATE_ID,
  user_id: HARNESS_USER.id,
  kind: "expense",
  amount_minor: 45_000,
  merchant: "Highlands Coffee",
  note: "Cafe sáng",
  occurred_on: "2026-09-13",
  source: "csv",
  confidence: "high",
  status: "pending",
  possible_duplicate: false,
  category_id: FOOD_CATEGORY_ID,
  category_name: "Ăn uống",
  account_id: CASH_ACCOUNT_ID,
  account_name: "Tiền mặt",
  raw_snippet: null,
  import_batch_id: null,
  local_id: null,
  created_at: "2026-09-13T06:00:00.000Z",
  source_row_index: 4,
  source_external_id: "fixture-ready-1",
  source_lifecycle_state: "pending",
  source_predecessor_external_id: null,
  fingerprint_version: 1,
  fingerprint: null,
  parser_version: "csv_import@1.0",
  mapping_version: 1,
  match_status: "would_create",
  match_reason: "fixture_ready",
  match_confidence: 1,
  possible_transfer: false,
  transfer_pair_id: null,
  approved_transaction_id: null,
  approved_at: null,
  applied_rule_id: null,
  applied_rule_version: null,
};

const attentionCandidate = {
  id: ATTENTION_CANDIDATE_ID,
  user_id: HARNESS_USER.id,
  kind: "expense",
  amount_minor: 125_000,
  merchant: "GRAB *TRIP",
  note: "Di chuyển chưa rõ danh mục",
  occurred_on: "2026-09-11",
  source: "paste",
  confidence: "low",
  status: "pending",
  possible_duplicate: false,
  category_id: null,
  category_name: null,
  account_id: BANK_ACCOUNT_ID,
  account_name: "Vietcombank",
  raw_snippet: null,
  import_batch_id: null,
  local_id: null,
  created_at: "2026-09-11T05:00:00.000Z",
  source_row_index: null,
  source_external_id: null,
  source_lifecycle_state: null,
  source_predecessor_external_id: null,
  fingerprint_version: null,
  fingerprint: null,
  parser_version: "paste_text@1.0",
  mapping_version: 1,
  match_status: null,
  match_reason: null,
  match_confidence: null,
  possible_transfer: false,
  transfer_pair_id: null,
  approved_transaction_id: null,
  approved_at: null,
  applied_rule_id: null,
  applied_rule_version: null,
};

function dashboardBundle(transactions: unknown[], candidates: unknown[]) {
  return {
    transactions,
    accounts,
    categories,
    balances,
    budgets: [],
    commitments: [],
    commitment_occurrences: [],
    income_templates: [],
    income_occurrences: [],
    goals: [],
    pending_inbox_count: candidates.length,
  };
}

export async function seedActivityScenario(options?: {
  invalidLedger?: boolean;
  candidateOnly?: boolean;
  invalidReview?: boolean;
}) {
  const transactions = options?.candidateOnly
    ? []
    : options?.invalidLedger
      ? [{ ...reviewTransaction, amount_minor: "invalid-amount" }]
      : [reviewTransaction, postedTransaction];
  const candidates = options?.candidateOnly
    ? [readyCandidate]
    : [readyCandidate, attentionCandidate];
  const transactionReviewFeed = options?.invalidLedger
    ? []
    : options?.invalidReview
      ? [
          {
            id: REVIEW_TRANSACTION_ID,
            user_id: HARNESS_USER.id,
            review_status: "invalid-review-state",
            occurred_on: reviewTransaction.occurred_on,
            created_at: reviewTransaction.created_at,
          },
        ]
      : [
          {
            id: REVIEW_TRANSACTION_ID,
            user_id: HARNESS_USER.id,
            review_status: "needs_review",
            occurred_on: reviewTransaction.occurred_on,
            created_at: reviewTransaction.created_at,
          },
          {
            id: POSTED_TRANSACTION_ID,
            user_id: HARNESS_USER.id,
            review_status: "reviewed",
            occurred_on: postedTransaction.occurred_on,
            created_at: postedTransaction.created_at,
          },
        ];

  const response = await fetch(`${DOUBLE}/__control/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: HARNESS_USER,
      inbox_candidates: candidates,
      import_batches: [],
      transaction_feed: transactions,
      transaction_review_feed: transactionReviewFeed,
      accounts,
      categories,
      account_balances: balances,
      dashboard_bundle: dashboardBundle(transactions, candidates),
    }),
  });

  expect(response.ok, "seeding Activity auth fixture must succeed").toBe(true);
}
