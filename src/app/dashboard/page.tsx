import type { Metadata } from "next";
import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { requireViewer } from "@/server/auth";
import { getDashboardPageWorkspace } from "@/server/dashboard";

export const metadata: Metadata = {
  title: "Tổng quan — MoneyFlow",
  description: "Số dư, thu–chi tháng, danh mục chi tiêu và trạng thái kế hoạch.",
};

/**
 * Canonical signed-in home: balances, monthly income/expense/net, category
 * distribution, recent transactions and lightweight planning signals.
 *
 * Detailed planning stays behind its dedicated routes so the daily ledger does
 * not hydrate secondary planning UI on every dashboard visit.
 *
 * A numeric safe-to-spend guide stays withdrawn until MoneyFlow can prove a
 * complete income-based plan or a next-payday plan with protected cash.
 */
export default async function DashboardPage() {
  const viewer = await requireViewer();
  const { workspace, budgets, commitments, pendingInboxCount } =
    await getDashboardPageWorkspace(viewer);

  return (
    <MoneyFlowDashboard
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      initialInboxCount={pendingInboxCount}
      budgets={budgets}
      commitments={commitments}
    />
  );
}
