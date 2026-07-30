import "server-only";

import { buildFinancialReport, reportRange, type FinancialReport, type ReportPeriod } from "@/lib/reports";
import { sampleTransactions, type Transaction } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";

const feedColumns = "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines";

export type ReportsWorkspace = {
  report: FinancialReport;
  transactions: Transaction[];
  dataError: string | null;
};

export async function getReportsWorkspace(period: ReportPeriod): Promise<ReportsWorkspace> {
  const range = reportRange(todayInVietnam(), period);
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    const transactions = sampleTransactions.filter((item) => item.occurredOn >= range.previousStart && item.occurredOn <= range.currentEnd);
    return { report: buildFinancialReport(transactions, range), transactions, dataError: null };
  }
  const supabase = await createClient();
  if (!supabase) return { report: buildFinancialReport([], range), transactions: [], dataError: "Không thể kết nối dữ liệu báo cáo." };
  const { data, error } = await supabase.from("transaction_feed").select(feedColumns)
    .gte("occurred_on", range.previousStart).lte("occurred_on", range.currentEnd)
    .order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) return { report: buildFinancialReport([], range), transactions: [], dataError: "Chưa tải được báo cáo. Hãy thử lại." };
  try {
    const transactions = (data ?? []).map(mapTransactionFeedRow);
    return { report: buildFinancialReport(transactions, range), transactions, dataError: null };
  } catch {
    return { report: buildFinancialReport([], range), transactions: [], dataError: "Dữ liệu báo cáo không đúng định dạng." };
  }
}
