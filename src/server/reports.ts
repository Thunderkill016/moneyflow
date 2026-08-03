import "server-only";

import {
  buildFinancialReport,
  normalizeCustomRange,
  resolveReportRange,
  type CustomRangeInput,
  type FinancialReport,
  type ReportPeriod,
} from "@/lib/reports";
import type { Transaction } from "@/lib/transactions/contracts";
import { sampleTransactions } from "@/lib/demo/transaction-fixtures";
import { createClient } from "@/lib/supabase/server";
import { todayInVietnam } from "@/lib/vietnam-date";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";

const feedColumns = "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines";

export type ReportsWorkspace = {
  report: FinancialReport;
  transactions: Transaction[];
  dataError: string | null;
  /**
   * How a custom window was adjusted before it was used, so the page can say so
   * instead of quietly showing different dates than the reader typed.
   */
  rangeNotice: "invalid" | "swapped" | "clamped" | null;
};

export async function getReportsWorkspace(
  period: ReportPeriod,
  custom?: CustomRangeInput,
): Promise<ReportsWorkspace> {
  const today = todayInVietnam();
  const range = resolveReportRange(today, period, custom);
  const rangeNotice = describeRangeAdjustment(period, custom, today);
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    const transactions = sampleTransactions.filter((item) => item.occurredOn >= range.previousStart && item.occurredOn <= range.currentEnd);
    return { report: buildFinancialReport(transactions, range), transactions, dataError: null, rangeNotice };
  }
  const supabase = await createClient();
  if (!supabase) return { report: buildFinancialReport([], range), transactions: [], dataError: "Không thể kết nối dữ liệu báo cáo.", rangeNotice };
  const { data, error } = await supabase.from("transaction_feed").select(feedColumns)
    .gte("occurred_on", range.previousStart).lte("occurred_on", range.currentEnd)
    .order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) return { report: buildFinancialReport([], range), transactions: [], dataError: "Chưa tải được báo cáo. Hãy thử lại.", rangeNotice };
  try {
    const transactions = (data ?? []).map(mapTransactionFeedRow);
    return { report: buildFinancialReport(transactions, range), transactions, dataError: null, rangeNotice };
  } catch {
    return { report: buildFinancialReport([], range), transactions: [], dataError: "Dữ liệu báo cáo không đúng định dạng.", rangeNotice };
  }
}

/**
 * Why the rendered window differs from what was asked for, if it does.
 *
 * Silence here would be the wrong default: a clamped three-year request and an
 * honoured one look identical on screen, and a reader comparing totals needs to
 * know which they are looking at.
 */
function describeRangeAdjustment(
  period: ReportPeriod,
  custom: CustomRangeInput | undefined,
  today: string,
): ReportsWorkspace["rangeNotice"] {
  if (period !== "custom") return null;
  const normalized = normalizeCustomRange(custom ?? {}, today);
  if (!normalized) return "invalid";
  if (normalized.clamped) return "clamped";
  if (normalized.swapped) return "swapped";
  return null;
}
