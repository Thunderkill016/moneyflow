import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const DELETE_CONFIRM_TEXT = "XÓA";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

type TenantTable = {
  table: string;
  ownerColumn: "id" | "user_id";
};

/** Every persisted tenant table in the MoneyFlow schema. */
const TENANT_TABLES: readonly TenantTable[] = [
  { table: "profiles", ownerColumn: "id" },
  { table: "accounts", ownerColumn: "user_id" },
  { table: "categories", ownerColumn: "user_id" },
  { table: "financial_transactions", ownerColumn: "user_id" },
  { table: "transaction_entries", ownerColumn: "user_id" },
  { table: "monthly_budgets", ownerColumn: "user_id" },
  { table: "recurring_commitments", ownerColumn: "user_id" },
  { table: "commitment_occurrences", ownerColumn: "user_id" },
  { table: "recurring_income_templates", ownerColumn: "user_id" },
  { table: "income_template_occurrences", ownerColumn: "user_id" },
  { table: "savings_goals", ownerColumn: "user_id" },
  { table: "savings_goal_allocations", ownerColumn: "user_id" },
  { table: "import_batches", ownerColumn: "user_id" },
  { table: "inbox_candidates", ownerColumn: "user_id" },
] as const;

/** Child-first fallback cleanup if a schema drift prevents an expected cascade. */
const TENANT_CLEANUP_ORDER: readonly TenantTable[] = [
  { table: "transaction_entries", ownerColumn: "user_id" },
  { table: "commitment_occurrences", ownerColumn: "user_id" },
  { table: "income_template_occurrences", ownerColumn: "user_id" },
  { table: "savings_goal_allocations", ownerColumn: "user_id" },
  { table: "inbox_candidates", ownerColumn: "user_id" },
  { table: "financial_transactions", ownerColumn: "user_id" },
  { table: "monthly_budgets", ownerColumn: "user_id" },
  { table: "recurring_commitments", ownerColumn: "user_id" },
  { table: "recurring_income_templates", ownerColumn: "user_id" },
  { table: "savings_goals", ownerColumn: "user_id" },
  { table: "import_batches", ownerColumn: "user_id" },
  { table: "accounts", ownerColumn: "user_id" },
  { table: "categories", ownerColumn: "user_id" },
  { table: "profiles", ownerColumn: "id" },
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

async function removeRemainingTenantRows(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  let cleanupAttemptSucceeded = true;
  for (const { table, ownerColumn } of TENANT_CLEANUP_ORDER) {
    const { error } = await adminClient.from(table).delete().eq(ownerColumn, userId);
    if (error) cleanupAttemptSucceeded = false;
  }
  return cleanupAttemptSucceeded;
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
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
    false,
  );
  if (deleteError) {
    return json(409, { ok: false, code: "account_delete_blocked" });
  }

  let inspection = await inspectTenantRows(adminClient, user.id);
  let fallbackCleanupAttempted = false;
  let fallbackCleanupSucceeded: boolean | null = null;

  if (!inspection.cleanupVerified || inspection.tenantRowsRemaining > 0) {
    fallbackCleanupAttempted = true;
    fallbackCleanupSucceeded = await removeRemainingTenantRows(adminClient, user.id);
    inspection = await inspectTenantRows(adminClient, user.id);
  }

  return json(200, {
    ok: true,
    cleanupVerified:
      inspection.cleanupVerified && inspection.tenantRowsRemaining === 0,
    tenantRowsRemaining: inspection.cleanupVerified
      ? inspection.tenantRowsRemaining
      : null,
    fallbackCleanupAttempted,
    fallbackCleanupSucceeded,
  });
});
