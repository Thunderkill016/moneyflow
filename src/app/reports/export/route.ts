import { normalizeReportPeriod, transactionsToCsv } from "@/lib/reports";
import { getReportsWorkspace } from "@/server/reports";

export async function GET(request: Request) {
  const period = normalizeReportPeriod(new URL(request.url).searchParams.get("period"));
  const workspace = await getReportsWorkspace(period);
  if (workspace.dataError) return new Response(workspace.dataError, { status: 503 });
  const { currentStart, currentEnd } = workspace.report.range;
  const rows = workspace.transactions.filter((item) => item.occurredOn >= currentStart && item.occurredOn <= currentEnd);
  return new Response(transactionsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moneyflow-${currentStart}-${currentEnd}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
