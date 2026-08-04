import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const DELETE_CONFIRM_TEXT = "XÓA";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

type TenantTable = {
  table: string;
  ownerColumn: "id" | "user_id";
};

/** Every persisted tenant table in the current MoneyFlow schema. */
const TENANT_TABLES: readonly TenantTable[] = [
  { table: "profiles", ownerColumn: "id" },
  { table: "accounts", ownerColumn: "user_id" },
  { table: "categories", ownerColumn: "user_id" },
  { table: "financial_transactions", ownerColumn: "user_id" },
  { table: "transaction_entries", ownerColumn: "user_id" },
  { table: "financial_mutation_audit_events", ownerColumn: "user_id" },
  { table: "transaction_import_provenance", ownerColumn: "user_id" },
  { table: "monthly_budgets", ownerColumn: "user_id" },
  { table: "recurring_commitments", ownerColumn: "user_id" },
  { table: "commitment_occurrences", ownerColumn: "user_id" },
  { table: "recurring_income_templates", ownerColumn: "user_id" },
  { table: "income_template_occurrences", ownerColumn: "user_id" },
  { table: "savings_goals", ownerColumn: "user_id" },
  { table: "savings_goal_allocations", ownerColumn: "user_id" },
  { table: "import_batches", ownerColumn: "user_id" },
  { table: "inbox_candidates", ownerColumn: "user_id" },
  { table: "inbox_rules", ownerColumn: "user_id" },
  { table: "account_reconciliations", ownerColumn: "user_id" },
  { table: "account_reconciliation_events", ownerColumn: "user_id" },
] as const;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function firstEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

async function inspectTenantRows(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  let cleanupVerified = true;
  let tenantRowsRemaining = 0;

  for (const { table, ownerColumn } of TENANT_TABLES) {
    const { count, error } = await adminClient
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(ownerColumn, userId);
    if (error) {
      cleanupVerified = false;
      continue;
    }
    tenantRowsRemaining += count ?? 0;
  }

  return { cleanupVerified, tenantRowsRemaining };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json(405, { ok: false, code: "method_not_allowed" });
  }

  const authorization = request.headers.get("Authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { ok: false, code: "authentication_required" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, code: "invalid_json" });
  }

  const confirm =
    typeof payload === "object" && payload !== null && "confirm" in payload
      ? (payload as { confirm?: unknown }).confirm
      : null;
  if (confirm !== DELETE_CONFIRM_TEXT) {
    return json(400, { ok: false, code: "confirmation_required" });
  }

  const supabaseUrl = firstEnvironmentValue("SUPABASE_URL");
  const publishableKey = firstEnvironmentValue(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );
  // GoTrue admin endpoints require the service-role JWT. A project secret key can
  // authenticate Data API calls, but must not replace this JWT for auth.admin.*.
  const serviceRoleKey = firstEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(500, { ok: false, code: "function_not_configured" });
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);
  if (userError || !user) {
    return json(401, { ok: false, code: "authentication_required" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  // Purge every tenant table inside one Postgres transaction. If any statement
  // or the final zero-row verification fails, the RPC raises and Postgres rolls
  // the whole purge back. The Auth identity is deliberately deleted only after
  // this step has been verified, so a cleanup failure remains retryable.
  const { data: purgedRows, error: purgeError } = await adminClient.rpc(
    "purge_user_tenant_data",
    { p_user_id: user.id },
  );
  if (purgeError) {
    return json(409, { ok: false, code: "tenant_cleanup_blocked" });
  }

  const inspection = await inspectTenantRows(adminClient, user.id);
  if (!inspection.cleanupVerified || inspection.tenantRowsRemaining !== 0) {
    return json(409, {
      ok: false,
      code: "tenant_cleanup_unverified",
      cleanupVerified: inspection.cleanupVerified,
      tenantRowsRemaining: inspection.cleanupVerified
        ? inspection.tenantRowsRemaining
        : null,
    });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
    false,
  );
  if (deleteError) {
    // The user's financial data is already gone, but the Auth identity remains,
    // so the user can retry this same operation instead of becoming an orphaned
    // data owner with no identity capable of signing in.
    return json(409, {
      ok: false,
      code: "identity_delete_blocked_after_cleanup",
      cleanupVerified: true,
      tenantRowsRemaining: 0,
      retrySafe: true,
    });
  }

  return json(200, {
    ok: true,
    cleanupVerified: true,
    tenantRowsRemaining: 0,
    purgedRows: typeof purgedRows === "number" ? purgedRows : null,
  });
});
