import type { Metadata } from "next";
import { ReportsPage } from "@/components/reports-page";
import { normalizeReportPeriod } from "@/lib/reports";
import { requireViewer } from "@/server/auth";
import { getReportsWorkspace } from "@/server/reports";

export const metadata: Metadata = { title: "Báo cáo — MoneyFlow", description: "Xem xu hướng thu chi và xuất dữ liệu tài chính." };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const period = normalizeReportPeriod(params.period);
  const custom = { from: params.from ?? null, to: params.to ?? null };
  const viewer = await requireViewer();
  const workspace = await getReportsWorkspace(period, custom);
  return (
    <ReportsPage
      viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }}
      workspace={workspace}
      period={period}
    />
  );
}
