import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const edgeFunction = readFileSync(
  join(root, "supabase/functions/delete-account/index.ts"),
  "utf8",
);
const actions = readFileSync(join(root, "src/app/(auth)/actions.ts"), "utf8");
const page = readFileSync(join(root, "src/components/delete-account-page.tsx"), "utf8");

const tenantTables = [
  "profiles",
  "accounts",
  "categories",
  "financial_transactions",
  "transaction_entries",
  "monthly_budgets",
  "recurring_commitments",
  "commitment_occurrences",
  "recurring_income_templates",
  "income_template_occurrences",
  "savings_goals",
  "savings_goal_allocations",
  "import_batches",
  "inbox_candidates",
];

test("delete-account Edge Function authenticates and deletes only the caller", () => {
  assert.match(edgeFunction, /request\.method !== "POST"/);
  assert.match(edgeFunction, /confirm !== DELETE_CONFIRM_TEXT/);
  assert.match(edgeFunction, /auth\.getUser\(accessToken\)/);
  assert.match(
    edgeFunction,
    /auth\.admin\.deleteUser\(\s*user\.id,\s*false,?\s*\)/,
  );
  assert.doesNotMatch(edgeFunction, /payload[^\n]*user[_-]?id/i);
  assert.doesNotMatch(edgeFunction, /console\.(?:log|error)/);
});

test("delete-account uses the service-role JWT for GoTrue admin operations", () => {
  assert.match(
    edgeFunction,
    /serviceRoleKey = firstEnvironmentValue\("SUPABASE_SERVICE_ROLE_KEY"\)/,
  );
  assert.match(edgeFunction, /createClient\(supabaseUrl, serviceRoleKey/);
  assert.doesNotMatch(edgeFunction, /SUPABASE_SECRET_KEY/);
});

test("delete-account verifies and can clean every persisted tenant table", () => {
  for (const table of tenantTables) {
    assert.match(
      edgeFunction,
      new RegExp(`table: "${table}"`),
      `missing ${table} from account cleanup contract`,
    );
  }
  assert.match(edgeFunction, /inspectTenantRows\(adminClient, user\.id\)/);
  assert.match(edgeFunction, /removeRemainingTenantRows\(adminClient, user\.id\)/);
  assert.match(edgeFunction, /inspection\.tenantRowsRemaining === 0/);
  assert.match(edgeFunction, /fallbackCleanupAttempted/);
});

test("server action enforces confirmation and honors cleanup verification", () => {
  assert.match(actions, /isDeleteConfirmValid\(confirmText\)/);
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /functions\.invoke<DeleteAccountFunctionResponse>/);
  assert.match(actions, /body:\s*\{\s*confirm:\s*DELETE_CONFIRM_TEXT\s*\}/);
  assert.match(actions, /data\.ok !== true/);
  assert.match(
    actions,
    /data\.cleanupVerified === true && data\.tenantRowsRemaining === 0/,
  );
  assert.match(actions, /auth\.signOut\(\{ scope: "local" \}\)/);
});

test("authenticated UI deletes server account before wiping local data", () => {
  const remoteDelete = page.indexOf("await finalizeAccountDeletion(confirmText)");
  const localWipeAfterRemote = page.indexOf(
    "clearLocalMoneyFlowStores()",
    remoteDelete,
  );
  assert.ok(remoteDelete >= 0, "missing authenticated server deletion call");
  assert.ok(
    localWipeAfterRemote > remoteDelete,
    "local data must be preserved when server deletion fails",
  );
  assert.match(page, /if \(!result\.ok\)/);
  assert.match(page, /localCleanup", "partial"/);
  assert.match(page, /serverCleanup", "unverified"/);
  assert.match(page, /!result\.cleanupVerified/);
});
