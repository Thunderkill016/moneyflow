import "server-only";

import {
  buildFinancialReport,
  categoryTrendWindowStart,
  resolveReportRange,
  type CustomRangeInput,
  type FinancialReport,
  type ReportPeriod,
} from "@/lib/reports";
import {
  describeReportRangeAdjustment,
  type ReportRangeNotice,
} from "@/lib/report-range-notice";
import {
  balanceEntriesFromTransactions,
  buildBalanceSeries,
  type BalanceSeries,
} from "@/lib/balance-series";
import type { Transaction } from "@/lib/transactions/contracts";
import { sampleTransactionsFor } from "@/lib/demo/transaction-fixtures";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";
import { demoAccountRows, mapAccountRow } from "@/server/accounts";
import { readAllPages } from "@/lib/paginated-read";

const feedColumns =
  "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines,payee";

export type ReportsWorkspace = {
  report: FinancialReport;
  transactions: Transaction[];
  /**
   * Server-stamped "today" used to resolve `report.range` — the chevron
   * navigation clamps against the same clock the range did, so a midnight
   * boundary never shows a forward link to a window the report cannot load.
   */
  todayIso: string;
  /**
   * Per-account and VND net-worth series across the report window, replayed
   * from the current account_balances anchor. `null` when the account/balance
   * read or the replay fails — the spending report still renders without it.
   */
  balanceSeries: BalanceSeries | null;
  dataError: string | null;
  /** Why the resolved custom window differs from the query-string input. */
  rangeNotice: ReportRangeNotice;
};

/**
 * The series never invents a balance: a malformed account row or an unsafe
 * total downgrades the section to its empty state instead of breaking the
 * report that already loaded fine.
 */
function safeBalanceSeries(
  accounts: Parameters<typeof buildBalanceSeries>[0],
  transactions: Transaction[],
  range: FinancialReport["range"],
): BalanceSeries | null {
  try {
    return buildBalanceSeries(accounts, balanceEntriesFromTransactions(transactions), {
      start: range.currentStart,
      end: range.currentEnd,
    });
  } catch {
    return null;
  }
}

export async function getReportsWorkspace(
  period: ReportPeriod,
  custom?: CustomRangeInput,
): Promise<ReportsWorkspace> {
  const today = todayInVietnam();
  const range = resolveReportRange(today, period, custom);
  const rangeNotice = describeReportRangeAdjustment(period, custom, today);
  /*
   * The category strips reach six months back, further than the comparison
   * window for week/month presets. Load from whichever bound is earlier so the
   * strips show real history instead of silently truncating at previousStart.
   *
   * There is deliberately no upper bound: the balance series anchors on the
   * current account_balances value, which already contains every recorded
   * entry — including future-dated ones — so the replay must see all of them
   * to subtract what came after the viewed window. Capping at today would let
   * a future-dated entry inflate every reconstructed point.
   */
  const loadStart =
    range.previousStart < categoryTrendWindowStart(range.currentEnd)
      ? range.previousStart
      : categoryTrendWindowStart(range.currentEnd);
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    const loaded = sampleTransactionsFor(today).filter(
      (item) => item.occurredOn >= loadStart,
    );
    const transactions = loaded.filter((item) => item.occurredOn <= range.currentEnd);
    return {
      report: buildFinancialReport(transactions, range),
      transactions,
      todayIso: today,
      balanceSeries: safeBalanceSeries(demoAccountRows, loaded, range),
      dataError: null,
      rangeNotice,
    };
  }
  const supabase = await createClient();
  if (!supabase) {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      todayIso: today,
      balanceSeries: null,
      dataError: "Không thể kết nối dữ liệu báo cáo.",
      rangeNotice,
    };
  }
  const [feedResult, accountsResult, balancesResult] = await Promise.all([
    readAllPages((from, to) =>
      supabase
        .from("transaction_feed")
        .select(feedColumns)
        .eq("user_id", viewer.id)
        .gte("occurred_on", loadStart)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
    supabase
      .from("accounts")
      .select("id,name,kind,currency_code,initial_balance_minor,is_archived")
      .eq("user_id", viewer.id)
      .order("is_archived")
      .order("created_at"),
    supabase
      .from("account_balances")
      .select("account_id,balance_minor")
      .eq("user_id", viewer.id),
  ]);
  if (feedResult.error) {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      todayIso: today,
      balanceSeries: null,
      dataError: "Chưa tải được báo cáo. Hãy thử lại.",
      rangeNotice,
    };
  }
  try {
    const feedRows = (feedResult.data ?? []).map(mapTransactionFeedRow);
    // Keep the report evidence window unchanged; rows after currentEnd exist
    // only to anchor the reconstructed balance series for past windows.
    const transactions = feedRows.filter(
      (item) => item.occurredOn <= range.currentEnd,
    );
    let balanceSeries: BalanceSeries | null = null;
    if (!accountsResult.error && !balancesResult.error) {
      try {
        const balances = new Map(
          (balancesResult.data ?? []).map((item) => [item.account_id, item.balance_minor]),
        );
        const accounts = (accountsResult.data ?? []).map((row) =>
          mapAccountRow(row, balances.get(row.id)),
        );
        balanceSeries = safeBalanceSeries(accounts, feedRows, range);
      } catch {
        balanceSeries = null;
      }
    }
    return {
      report: buildFinancialReport(transactions, range),
      transactions,
      todayIso: today,
      balanceSeries,
      dataError: null,
      rangeNotice,
    };
  } catch {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      todayIso: today,
      balanceSeries: null,
      dataError: "Dữ liệu báo cáo không đúng định dạng.",
      rangeNotice,
    };
  }
}
