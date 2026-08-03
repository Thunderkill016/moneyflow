import "server-only";

import { z } from "zod";
import type { AccountRegisterEntry } from "@/lib/account-register";
import {
  buildDemoReconciliationRows,
  emptyReconciliationState,
  type AccountReconciliationSession,
  type AccountReconciliationStateData,
  type ReconciliationEntryStateRow,
} from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const ENTRY_COLUMNS =
  "entry_id,transaction_id,account_id,reconciliation_state,cleared_at,reconciliation_id,entry_count";
const SUMMARY_COLUMNS =
  "id,account_id,statement_date,statement_balance_minor,status,calculated_balance_minor,cleared_balance_minor,difference_minor,pending_account_leg_count,cleared_account_leg_count,reconciled_account_leg_count,started_at,completed_at,last_reopened_at,created_at,updated_at";

const entryRowSchema = z.object({
  entry_id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  account_id: z.string().uuid(),
  reconciliation_state: z.enum(["pending", "cleared", "reconciled"]),
  cleared_at: z.string().nullable(),
  reconciliation_id: z.string().uuid().nullable(),
  entry_count: z.union([z.number(), z.string()]),
});

const sessionRowSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  statement_date: z.string(),
  statement_balance_minor: z.union([z.number(), z.string()]),
  status: z.enum(["open", "completed"]),
  calculated_balance_minor: z.union([z.number(), z.string()]).nullable(),
  cleared_balance_minor: z.union([z.number(), z.string()]),
  difference_minor: z.union([z.number(), z.string()]),
  pending_account_leg_count: z.union([z.number(), z.string()]),
  cleared_account_leg_count: z.union([z.number(), z.string()]),
  reconciled_account_leg_count: z.union([z.number(), z.string()]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  last_reopened_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type QueryError = { code?: string; message?: string } | null;

function safeInteger(value: number | string, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(label);
  return parsed;
}

function safeCount(value: number | string, label: string) {
  const parsed = safeInteger(value, label);
  if (parsed < 0) throw new Error(label);
  return parsed;
}

function mapEntryRow(value: unknown): ReconciliationEntryStateRow {
  const row = entryRowSchema.parse(value);
  return {
    entryId: row.entry_id,
    transactionId: row.transaction_id,
    accountId: row.account_id,
    state: row.reconciliation_state,
    clearedAt: row.cleared_at,
    reconciliationId: row.reconciliation_id,
    entryCount: safeCount(row.entry_count, "invalid_reconciliation_entry_count"),
  };
}

function mapSessionRow(value: unknown): AccountReconciliationSession {
  const row = sessionRowSchema.parse(value);
  return {
    id: row.id,
    accountId: row.account_id,
    statementDate: row.statement_date,
    statementBalance: safeInteger(
      row.statement_balance_minor,
      "invalid_reconciliation_statement_balance",
    ),
    status: row.status,
    calculatedBalance:
      row.calculated_balance_minor === null
        ? null
        : safeInteger(
            row.calculated_balance_minor,
            "invalid_reconciliation_calculated_balance",
          ),
    clearedBalance: safeInteger(
      row.cleared_balance_minor,
      "invalid_reconciliation_cleared_balance",
    ),
    difference: safeInteger(
      row.difference_minor,
      "invalid_reconciliation_difference",
    ),
    pendingAccountLegCount: safeCount(
      row.pending_account_leg_count,
      "invalid_reconciliation_pending_count",
    ),
    clearedAccountLegCount: safeCount(
      row.cleared_account_leg_count,
      "invalid_reconciliation_cleared_count",
    ),
    reconciledAccountLegCount: safeCount(
      row.reconciled_account_leg_count,
      "invalid_reconciliation_reconciled_count",
    ),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastReopenedAt: row.last_reopened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingReconciliationContract(error: QueryError) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST202" ||
    message.includes("account_reconciliation_entry_feed") ||
    message.includes("account_reconciliation_summaries") ||
    message.includes("Could not find the table") ||
    message.includes("Could not find the function")
  );
}

async function loadAuthenticatedState(
  accountId: string,
): Promise<AccountReconciliationStateData> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      ...emptyReconciliationState(false),
      dataError: "Không thể kết nối dữ liệu đối soát.",
    };
  }

  const [entriesResult, sessionsResult] = await Promise.all([
    supabase
      .from("account_reconciliation_entry_feed")
      .select(ENTRY_COLUMNS)
      .eq("account_id", accountId),
    supabase
      .from("account_reconciliation_summaries")
      .select(SUMMARY_COLUMNS)
      .eq("account_id", accountId)
      .order("statement_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (
    isMissingReconciliationContract(entriesResult.error) ||
    isMissingReconciliationContract(sessionsResult.error)
  ) {
    return emptyReconciliationState(false);
  }
  if (entriesResult.error || sessionsResult.error) {
    return {
      ...emptyReconciliationState(true),
      dataError: "Chưa tải được dữ liệu đối soát. Hãy thử lại.",
    };
  }

  try {
    return {
      featureAvailable: true,
      rows: z.array(entryRowSchema).parse(entriesResult.data ?? []).map(mapEntryRow),
      sessions: z
        .array(sessionRowSchema)
        .parse(sessionsResult.data ?? [])
        .map(mapSessionRow),
      dataError: null,
    };
  } catch {
    return {
      ...emptyReconciliationState(true),
      dataError: "Dữ liệu đối soát không đúng định dạng.",
    };
  }
}

export async function getAccountReconciliationState(
  accountId: string,
  registerEntries: AccountRegisterEntry[],
): Promise<AccountReconciliationStateData> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ...emptyReconciliationState(true),
      rows: buildDemoReconciliationRows(registerEntries, accountId),
    };
  }
  return loadAuthenticatedState(accountId);
}

export async function reloadAuthenticatedAccountReconciliationState(
  accountId: string,
) {
  const viewer = await requireViewer();
  if (viewer.isDemo) return emptyReconciliationState(false);
  return loadAuthenticatedState(accountId);
}
