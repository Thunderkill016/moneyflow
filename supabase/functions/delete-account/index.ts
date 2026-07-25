import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const DELETE_CONFIRM_TEXT = "XÓA";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const TENANT_TABLES = [
  { table: "profiles", ownerColumn: "id" },
  { table: "accounts", ownerColumn: "user_id" },
  { table: "categories", ownerColumn: "user_id" },
  { table: "financial_transactions", ownerColumn: "user_id" },
  { table: "transaction_entries", ownerColumn: "user_id" },
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

  let cleanupVerified = true;
  let tenantRowsRemaining = 0;
  for (const { table, ownerColumn } of TENANT_TABLES) {
    const { count, error } = await adminClient
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(ownerColumn, user.id);
    if (error) {
      cleanupVerified = false;
      continue;
    }
    tenantRowsRemaining += count ?? 0;
  }

  return json(200, {
    ok: true,
    cleanupVerified,
    tenantRowsRemaining: cleanupVerified ? tenantRowsRemaining : null,
  });
});
