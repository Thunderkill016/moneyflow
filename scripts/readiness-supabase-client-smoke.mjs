import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const url = process.env.READINESS_SUPABASE_URL;
const key = process.env.READINESS_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.READINESS_EMAIL;
const password = process.env.READINESS_PASSWORD;

if (!url || !key || !email || !password) {
  throw new Error("Missing readiness Supabase client environment variables.");
}

const outputDir = "output/readiness-supabase-client";
await mkdir(outputDir, { recursive: true });

const evidence = {
  projectHost: new URL(url).host,
  startedAt: new Date().toISOString(),
  authenticated: false,
  accountVisible: false,
  categoryVisible: false,
  transactionCreated: false,
  transactionReadBack: false,
  softDeleteHidden: false,
  restoreVisible: false,
};

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const note = `Readiness public-client expense ${Date.now()}`;
let transactionId = null;

try {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    throw authError ?? new Error("No authenticated user returned.");
  }
  evidence.authenticated = true;

  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id,name")
    .eq("is_archived", false)
    .limit(1);
  if (accountError || !accounts?.[0]) {
    throw accountError ?? new Error("No active account visible.");
  }
  evidence.accountVisible = true;

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("kind", "expense")
    .eq("is_archived", false)
    .limit(1);
  if (categoryError || !categories?.[0]) {
    throw categoryError ?? new Error("No active expense category visible.");
  }
  evidence.categoryVisible = true;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: createdId, error: createError } = await supabase.rpc(
    "create_money_transaction",
    {
      p_account_id: accounts[0].id,
      p_category_id: categories[0].id,
      p_kind: "expense",
      p_amount_minor: 12345,
      p_occurred_on: today,
      p_note: note,
      p_idempotency_key: randomUUID(),
    },
  );
  if (createError || !createdId) {
    throw createError ?? new Error("Transaction RPC returned no id.");
  }
  transactionId = createdId;
  evidence.transactionCreated = true;

  const { data: createdRow, error: readError } = await supabase
    .from("transaction_feed")
    .select("id,note,amount_minor")
    .eq("id", transactionId)
    .single();
  if (readError || createdRow?.note !== note || Number(createdRow.amount_minor) !== 12345) {
    throw readError ?? new Error("Created transaction did not read back exactly.");
  }
  evidence.transactionReadBack = true;

  const { data: deleted, error: deleteError } = await supabase.rpc(
    "soft_delete_money_transaction",
    { p_transaction_id: transactionId },
  );
  if (deleteError || deleted !== true) {
    throw deleteError ?? new Error("Soft delete did not return true.");
  }

  const { data: hiddenRows, error: hiddenError } = await supabase
    .from("transaction_feed")
    .select("id")
    .eq("id", transactionId);
  if (hiddenError || (hiddenRows?.length ?? 0) !== 0) {
    throw hiddenError ?? new Error("Soft-deleted transaction remained visible.");
  }
  evidence.softDeleteHidden = true;

  const { data: restored, error: restoreError } = await supabase.rpc(
    "restore_money_transaction",
    { p_transaction_id: transactionId },
  );
  if (restoreError || restored !== true) {
    throw restoreError ?? new Error("Restore did not return true.");
  }

  const { data: restoredRow, error: restoredError } = await supabase
    .from("transaction_feed")
    .select("id,note,amount_minor")
    .eq("id", transactionId)
    .single();
  if (
    restoredError ||
    restoredRow?.note !== note ||
    Number(restoredRow.amount_minor) !== 12345
  ) {
    throw restoredError ?? new Error("Restored transaction was not visible exactly.");
  }
  evidence.restoreVisible = true;
} catch (error) {
  evidence.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  await supabase.auth.signOut();
  evidence.transactionIdRecorded = Boolean(transactionId);
  evidence.finishedAt = new Date().toISOString();
  await writeFile(
    `${outputDir}/evidence.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}
