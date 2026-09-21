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
import type { Transaction } from "@/lib/transactions/contracts";
import { sampleTransactionsFor } from "@/lib/demo/transaction-fixtures";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";
import { readAllPages } from "@/lib/paginated-read";

const feedColumns =
  "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines";

export type ReportsWorkspace = {
  report: FinancialReport;
  transactions: Transaction[];
  dataError: string | null;
  /** Why the resolved custom window differs from the query-string input. */
  rangeNotice: ReportRangeNotice;
};

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
   */
  const loadStart =
    range.previousStart < categoryTrendWindowStart(range.currentEnd)
      ? range.previousStart
      : categoryTrendWindowStart(range.currentEnd);
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    const transactions = sampleTransactionsFor(today).filter(
      (item) =>
        item.occurredOn >= loadStart &&
        item.occurredOn <= range.currentEnd,
    );
    return {
      report: buildFinancialReport(transactions, range),
      transactions,
      dataError: null,
      rangeNotice,
    };
  }
  const supabase = await createClient();
  if (!supabase) {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      dataError: "Không thể kết nối dữ liệu báo cáo.",
      rangeNotice,
    };
  }
  const { data, error } = await readAllPages((from, to) =>
    supabase
      .from("transaction_feed")
      .select(feedColumns)
      .eq("user_id", viewer.id)
      .gte("occurred_on", loadStart)
      .lte("occurred_on", range.currentEnd)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to),
  );
  if (error) {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      dataError: "Chưa tải được báo cáo. Hãy thử lại.",
      rangeNotice,
    };
  }
  try {
    const transactions = (data ?? []).map(mapTransactionFeedRow);
    return {
      report: buildFinancialReport(transactions, range),
      transactions,
      dataError: null,
      rangeNotice,
    };
  } catch {
    return {
      report: buildFinancialReport([], range),
      transactions: [],
      dataError: "Dữ liệu báo cáo không đúng định dạng.",
      rangeNotice,
    };
  }
}
