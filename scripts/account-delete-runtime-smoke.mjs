import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const url = vercel.env?.NEXT_PUBLIC_SUPABASE_URL;
const key = vercel.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing public Supabase configuration in vercel.json.");

const email = `moneyflow-delete-smoke-${randomUUID()}@example.invalid`;
const password = `Mf!${randomUUID()}Aa1`;
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let deleted = false;
let signedIn = false;

try {
  const { data: signUpData, error: signUpError } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: "Readiness Delete Smoke" } },
  });
  if (signUpError || !signUpData.user || !signUpData.session) {
    throw signUpError ?? new Error("Synthetic signup returned no immediate session.");
  }
  signedIn = true;

  const { data: accounts, error: accountError } = await client
    .from("accounts")
    .select("id")
    .eq("is_archived", false)
    .limit(1);
  if (accountError || !accounts?.[0]) {
    throw accountError ?? new Error("Synthetic user has no active account.");
  }

  const { data: categories, error: categoryError } = await client
    .from("categories")
    .select("id")
    .eq("kind", "expense")
    .eq("is_archived", false)
    .limit(1);
  if (categoryError || !categories?.[0]) {
    throw categoryError ?? new Error("Synthetic user has no expense category.");
  }

  const { data: transactionId, error: transactionError } = await client.rpc(
    "create_money_transaction",
    {
      p_account_id: accounts[0].id,
      p_category_id: categories[0].id,
      p_kind: "expense",
      p_amount_minor: 12345,
      p_occurred_on: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      p_note: "Synthetic self-service deletion smoke",
      p_idempotency_key: randomUUID(),
    },
  );
  if (transactionError || !transactionId) {
    throw transactionError ?? new Error("Synthetic transaction was not created.");
  }

  const invalidConfirmation = await client.functions.invoke("delete-account", {
    body: { confirm: "XOA" },
  });
  if (!invalidConfirmation.error) {
    throw new Error("Invalid deletion confirmation was accepted.");
  }

  const { data: stillAuthenticated, error: stillAuthenticatedError } =
    await client.auth.getUser();
  if (stillAuthenticatedError || !stillAuthenticated.user) {
    throw stillAuthenticatedError ?? new Error("Invalid confirmation deleted the user.");
  }

  const deletion = await client.functions.invoke("delete-account", {
    body: { confirm: "XÓA" },
  });
  if (deletion.error || deletion.data?.ok !== true) {
    throw deletion.error ?? new Error("Deletion function did not return ok=true.");
  }
  deleted = true;

  for (const table of [
    "profiles",
    "accounts",
    "categories",
    "financial_transactions",
    "transaction_entries",
  ]) {
    const { count, error } = await client
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error || (count ?? 0) !== 0) {
      throw error ?? new Error(`${table} retained tenant rows after deletion.`);
    }
  }

  const freshClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: signInError } = await freshClient.auth.signInWithPassword({
    email,
    password,
  });
  if (!signInError) {
    throw new Error("Deleted account could still sign in.");
  }

  console.log(
    JSON.stringify({
      invalidConfirmationBlocked: true,
      transactionCreated: true,
      accountDeleted: true,
      tenantRowsRemaining: 0,
      signInRejected: true,
    }),
  );
} finally {
  if (signedIn && !deleted) {
    await client.functions.invoke("delete-account", { body: { confirm: "XÓA" } });
  }
}
