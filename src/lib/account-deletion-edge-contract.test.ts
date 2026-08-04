import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const edgeFunction = readFileSync(
  join(root, "supabase/functions/delete-account/index.ts"),
  "utf8",
);
const originalPurgeMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260726000100_harden_tenant_deletion.sql",
  ),
  "utf8",
);
const currentPurgeMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260804160000_financial_mutation_audit.sql",
  ),
  "utf8",
);
const purgeMigration = `${originalPurgeMigration}\n${currentPurgeMigration}`;
const actions = readFileSync(join(root, "src/app/(auth)/actions.ts"), "utf8");
const page = readFileSync(
  join(root, "src/components/delete-account-page.tsx"),
  "utf8",
);

const tenantTables = [
  "profiles",
  "accounts",
  "categories",
  "financial_transactions",
  "transaction_entries",
  "financial_mutation_audit_events",
  "transaction_import_provenance",
  "monthly_budgets",
  "recurring_commitments",
  "commitment_occurrences",
  "recurring_income_templates",
  "income_template_occurrences",
  "savings_goals",
  "savings_goal_allocations",
  "import_batches",
  "inbox_candidates",
  "inbox_rules",
  "account_reconciliations",
  "account_reconciliation_events",
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

test("delete-account uses the service-role JWT for privileged operations", () => {
  assert.match(
    edgeFunction,
    /serviceRoleKey = firstEnvironmentValue\("SUPABASE_SERVICE_ROLE_KEY"\)/,
  );
  assert.match(edgeFunction, /createClient\(supabaseUrl, serviceRoleKey/);
  assert.match(edgeFunction, /adminClient\.rpc\(\s*"purge_user_tenant_data"/);
  assert.doesNotMatch(edgeFunction, /SUPABASE_SECRET_KEY/);
});

test("tenant cleanup is one restricted database transaction", () => {
  assert.match(
    currentPurgeMigration,
    /create or replace function public\.purge_user_tenant_data\(p_user_id uuid\)/i,
  );
  assert.match(currentPurgeMigration, /security definer/i);
  assert.match(currentPurgeMigration, /set search_path = ''/i);
  assert.match(
    currentPurgeMigration,
    /revoke all on function public\.purge_user_tenant_data\(uuid\)[\s\S]*from public, anon, authenticated, service_role/i,
  );
  assert.match(
    currentPurgeMigration,
    /grant execute on function public\.purge_user_tenant_data\(uuid\) to service_role/i,
  );

  for (const table of tenantTables) {
    const ownerPredicate = table === "profiles" ? "id" : "user_id";
    assert.match(
      purgeMigration,
      new RegExp(
        `delete from public\\.${table} where ${ownerPredicate} = p_user_id`,
        "i",
      ),
      `missing ${table} from atomic tenant purge`,
    );
    assert.match(
      edgeFunction,
      new RegExp(`table: "${table}"`),
      `missing ${table} from post-purge verification`,
    );
  }

  assert.match(currentPurgeMigration, /tenant_data_purge_incomplete/);
  assert.doesNotMatch(edgeFunction, /removeRemainingTenantRows/);
  assert.doesNotMatch(edgeFunction, /fallbackCleanup/);
});

test("tenant rows are purged and verified before the Auth identity is deleted", () => {
  const purge = edgeFunction.indexOf('"purge_user_tenant_data"');
  const inspection = edgeFunction.indexOf(
    "inspectTenantRows(adminClient, user.id)",
    purge,
  );
  const identityDelete = edgeFunction.indexOf(
    "adminClient.auth.admin.deleteUser",
    inspection,
  );

  assert.ok(purge >= 0, "missing atomic tenant purge RPC");
  assert.ok(inspection > purge, "tenant rows must be inspected after purge");
  assert.ok(
    identityDelete > inspection,
    "Auth identity must be deleted only after tenant cleanup is verified",
  );
  assert.match(edgeFunction, /code: "tenant_cleanup_blocked"/);
  assert.match(edgeFunction, /code: "tenant_cleanup_unverified"/);
  assert.match(edgeFunction, /code: "identity_delete_blocked_after_cleanup"/);
  assert.match(edgeFunction, /retrySafe: true/);
});

test("server action enforces confirmation and honors cleanup verification", () => {
  assert.match(actions, /isDeleteConfirmValid\(confirmText\)/);
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /functions\.invoke<DeleteAccountFunctionResponse>/);
  assert.match(
    actions,
    /body:\s*\{\s*confirm:\s*DELETE_CONFIRM_TEXT\s*\}/,
  );
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
