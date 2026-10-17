import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * Trash-purge contract: the trash page must expose an explicit permanent
 * delete affordance (per-row + empty-trash sweep) gated behind a confirm
 * dialog, wired to the owner-scoped `permanently_delete_money_transaction`
 * RPC. A trash that only restores is a trash that fills forever.
 */

const trashPage = readFileSync(
  "src/components/transactions/transactions-trash-page.tsx",
  "utf8",
);
const actions = readFileSync("src/app/actions/transactions.ts", "utf8");

test("trash page calls the permanent-delete server action", () => {
  assert.ok(
    trashPage.includes("permanentlyDeleteTransactionAction"),
    "trash page must use permanentlyDeleteTransactionAction",
  );
  assert.ok(
    actions.includes('supabase.rpc(\n    "permanently_delete_money_transaction"'),
    "the action must call permanently_delete_money_transaction",
  );
});

test("permanent delete is confirmed before it runs", () => {
  assert.ok(
    trashPage.includes('title="Xóa vĩnh viễn?"'),
    "per-row purge must open a confirm dialog",
  );
  assert.ok(
    trashPage.includes('title="Dọn sạch thùng rác?"'),
    "bulk purge must open a confirm dialog",
  );
  assert.ok(
    trashPage.includes('confirmIntent="destructive"'),
    "the confirm must use the destructive intent",
  );
});

test("the action maps ledger guards instead of swallowing them", () => {
  const body = /permanentlyDeleteTransactionAction[\s\S]*?\n\}/u.exec(
    actions,
  )?.[0];
  assert.ok(body, "permanentlyDeleteTransactionAction must exist");
  assert.ok(
    body.includes("recurring_payment_locked"),
    "recurring-lock error must surface its own message",
  );
  assert.ok(
    body.includes("transaction_reconciled"),
    "reconciled error must surface its own message",
  );
  assert.ok(
    body.includes("data !== true"),
    "a false RPC result must not report success",
  );
});
