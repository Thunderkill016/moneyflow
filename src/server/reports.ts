import "server-only";

import {
  buildFinancialReport,
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
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    const transactions = sampleTransactionsFor(today).filter(
      (item) =>
        item.occurredOn >= range.previousStart &&
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
  const { data, error } = await supabase
    .from("transaction_feed")
    .select(feedColumns)
    .eq("user_id", viewer.id)
    .gte("occurred_on", range.previousStart)
    .lte("occurred_on", range.currentEnd)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
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
