import type { Metadata } from "next";
import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { countGoalPaceAttention } from "@/lib/planning/goals";
import { requireViewer } from "@/server/auth";
import { getCategoriesWorkspace } from "@/server/categories";
import { getDashboardPageWorkspace } from "@/server/dashboard";

export const metadata: Metadata = {
  title: "Tổng quan — MoneyFlow",
  description: "Số dư, thu–chi tháng, danh mục chi tiêu và trạng thái kế hoạch.",
};

/**
 * Canonical signed-in home: balances, monthly income/expense/net, category
 * distribution, recent transactions and planning status.
 *
 * A numeric safe-to-spend guide stays withdrawn until MoneyFlow can prove a
 * complete income-based plan or a next-payday plan with protected cash.
 */
export default async function DashboardPage() {
  const viewer = await requireViewer();
  const {
    workspace,
    accountBalances,
    backupState,
    budgets,
    commitments,
    goals,
    incomeTemplates,
    pendingInboxCount,
    ledgerTrust,
  } = await getDashboardPageWorkspace(viewer);
  /*
   * The bundle only carries active categories (pickers). Row icons resolve
   * through this all-categories list so an archived category keeps its stored
   * identity on historical ledger rows.
   */
  const { categories: metaCategories } = await getCategoriesWorkspace();

  /*
   * Only the count crosses into the client boundary — goal objects stay
   * server-side per the dashboard planning-boundary contract.
   */
  const goalPaceAttentionCount = countGoalPaceAttention(
    goals,
    workspace.today,
  );

  return (
    <MoneyFlowDashboard
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      metaCategories={metaCategories}
      accountBalances={accountBalances}
      backupState={backupState}
      initialInboxCount={pendingInboxCount}
      ledgerTrust={ledgerTrust}
      budgets={budgets}
      commitments={commitments}
      goalPaceAttentionCount={goalPaceAttentionCount}
      incomeTemplates={incomeTemplates}
    />
  );
}
