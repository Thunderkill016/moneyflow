import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const url = vercel.env?.NEXT_PUBLIC_SUPABASE_URL;
const key = vercel.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.READINESS_EMAIL;
const password = process.env.READINESS_PASSWORD;
if (!url || !key || !email || !password) {
  throw new Error("Missing public Supabase or synthetic readiness credentials.");
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let deleted = false;
let signedIn = false;

try {
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signInData.user || !signInData.session) {
    throw signInError ?? new Error("Synthetic login returned no session.");
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
  if (
    deletion.data.cleanupVerified !== true ||
    deletion.data.tenantRowsRemaining !== 0
  ) {
    throw new Error("Deletion completed but tenant cascade was not verified cleanly.");
  }
  deleted = true;

  const freshClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: deletedSignInError } = await freshClient.auth.signInWithPassword({
    email,
    password,
  });
  if (!deletedSignInError) {
    throw new Error("Deleted account could still sign in.");
  }

  console.log(
    JSON.stringify({
      invalidConfirmationBlocked: true,
      transactionCreated: true,
      accountDeleted: true,
      cleanupVerified: true,
      tenantRowsRemaining: 0,
      signInRejected: true,
    }),
  );
} finally {
  if (signedIn && !deleted) {
    await client.functions.invoke("delete-account", { body: { confirm: "XÓA" } });
  }
}
