import "server-only";

import { z } from "zod";

import type { LedgerTrustSummary } from "@/lib/ledger-trust";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export const ledgerTrustSchema = z.object({
  trusted_through: z.string().nullable(),
  base_reconciliation_through: z.string().nullable(),
  status: z.enum(["trusted", "trusted_limited", "blocked"]),
  reason: z.enum([
    "clean_reconciliation_boundary",
    "known_unresolved_work",
    "missing_clean_reconciliation",
    "no_active_accounts",
  ]),
  active_account_count: z.union([z.number(), z.string()]),
  clean_reconciled_account_count: z.union([z.number(), z.string()]),
  pending_inbox_count: z.union([z.number(), z.string()]),
  needs_review_transaction_count: z.union([z.number(), z.string()]),
  unreconciled_account_leg_count: z.union([z.number(), z.string()]),
  earliest_unresolved_on: z.string().nullable(),
  coverage_scope: z.literal("known_ledger_state_only"),
});

function safeInteger(value: number | string, errorCode: string) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error(errorCode);
  return amount;
}

function safeCount(value: number | string, errorCode: string) {
  const count = safeInteger(value, errorCode);
  if (count < 0) throw new Error(errorCode);
  return count;
}

export function mapLedgerTrust(
  value: z.infer<typeof ledgerTrustSchema> | null | undefined,
): LedgerTrustSummary | null {
  if (!value) return null;
  return {
    trustedThrough: value.trusted_through,
    baseReconciliationThrough: value.base_reconciliation_through,
    status: value.status,
    reason: value.reason,
    activeAccountCount: safeCount(
      value.active_account_count,
      "invalid_dashboard_ledger_trust_active_accounts",
    ),
    cleanReconciledAccountCount: safeCount(
      value.clean_reconciled_account_count,
      "invalid_dashboard_ledger_trust_clean_accounts",
    ),
    pendingInboxCount: safeCount(
      value.pending_inbox_count,
      "invalid_dashboard_ledger_trust_pending_inbox",
    ),
    needsReviewTransactionCount: safeCount(
      value.needs_review_transaction_count,
      "invalid_dashboard_ledger_trust_needs_review",
    ),
    unreconciledAccountLegCount: safeCount(
      value.unreconciled_account_leg_count,
      "invalid_dashboard_ledger_trust_unreconciled_legs",
    ),
    earliestUnresolvedOn: value.earliest_unresolved_on,
    coverageScope: value.coverage_scope,
  };
}

/**
 * Standalone read of the database `ledger_trust_summary()` contract for
 * consumers outside the bundled dashboard RPC (capabilities, future
 * transports). It withholds trust on any failure — returning null with a
 * logged error — rather than fabricating a coverage boundary.
 */
export async function getLedgerTrust(): Promise<LedgerTrustSummary | null> {
  const viewer = await requireViewer();
  // Demo data is browser-local and has no authenticated reconciliation truth.
  if (viewer.isDemo) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("ledger_trust_summary");
  if (error || data == null) {
    console.error("ledger_trust_summary_unavailable", {
      code: error?.code ?? "missing_data",
    });
    return null;
  }

  try {
    const rows = z.array(ledgerTrustSchema).parse(data);
    return mapLedgerTrust(rows[0]);
  } catch {
    console.error("ledger_trust_summary_invalid_response");
    return null;
  }
}
