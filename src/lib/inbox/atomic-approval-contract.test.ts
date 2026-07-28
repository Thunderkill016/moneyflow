import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../../..");
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260728171450_atomic_inbox_approval.sql",
  ),
  "utf8",
);
const inboxPage = readFileSync(
  join(root, "src/components/inbox/inbox-page.tsx"),
  "utf8",
);
const inboxActions = readFileSync(
  join(root, "src/app/actions/inbox.ts"),
  "utf8",
);
const clientInbox = readFileSync(
  join(root, "src/hooks/client-inbox.ts"),
  "utf8",
);

test("atomic Inbox approval migration owns one transaction boundary", () => {
  assert.match(
    migration,
    /create\s+(?:or\s+replace\s+)?function\s+public\.approve_inbox_candidate/i,
  );
  assert.match(migration, /for\s+update/i);
  assert.match(migration, /public\.create_money_transaction\s*\(/i);
  assert.match(migration, /public\.create_account_transfer\s*\(/i);
  assert.match(
    migration,
    /status\s*=\s*'approved'[\s\S]*financial_transaction_id\s*=/i,
  );
});

test("atomic approval link and optional tenant FKs preserve ownership", () => {
  assert.match(
    migration,
    /add\s+column\s+financial_transaction_id\s+uuid/i,
  );
  assert.match(
    migration,
    /on\s+delete\s+set\s+null\s*\(\s*financial_transaction_id\s*\)/i,
  );
  assert.match(
    migration,
    /on\s+delete\s+set\s+null\s*\(\s*import_batch_id\s*\)/i,
  );
  assert.match(
    migration,
    /on\s+delete\s+set\s+null\s*\(\s*account_id\s*\)/i,
  );
  assert.match(
    migration,
    /on\s+delete\s+set\s+null\s*\(\s*category_id\s*\)/i,
  );
  assert.doesNotMatch(migration, /on\s+delete\s+set\s+null\s*;/i);
});

test("atomic approval RPC is not exposed to anonymous callers", () => {
  assert.match(
    migration,
    /security\s+definer[\s\S]*set\s+search_path\s*=\s*''/i,
  );
  assert.match(
    migration,
    /revoke\s+all\s+on\s+function\s+public\.approve_inbox_candidate[\s\S]*from\s+public\s*,\s*anon/i,
  );
  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.approve_inbox_candidate[\s\S]*to\s+authenticated/i,
  );
});

test("authenticated single, bulk, and keyboard review share the atomic action", () => {
  assert.match(inboxPage, /approveInboxCandidateAction\s*\(/);
  assert.match(inboxPage, /buildAtomicApprovalInput\s*\(/);
  assert.match(inboxPage, /handleBulkApplyRef\.current/);
  assert.doesNotMatch(
    inboxPage,
    /Đã ghi sổ nhưng chưa cập nhật được trạng thái Inbox/,
  );
  assert.match(inboxActions, /rpc\(\s*["']approve_inbox_candidate["']/);
});

test("demo compensation and import lineage survive candidate serialization", () => {
  assert.match(inboxPage, /deleteTransaction\(result\.transaction\.id\)/);
  assert.match(inboxPage, /financialTransactionId:\s*result\.transaction\.id/);
  assert.match(clientInbox, /sourceRowIndex:\s*c\.sourceRowIndex/);
  assert.match(
    clientInbox,
    /financialTransactionId:\s*c\.financialTransactionId/,
  );
});
