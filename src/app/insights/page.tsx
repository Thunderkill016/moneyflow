import type { Metadata } from "next";
import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getBudgetsWorkspace } from "@/server/budgets";
import { getCommitmentsWorkspace } from "@/server/commitments";
import { getGoalsWorkspace } from "@/server/goals";
import { getIncomeTemplatesWorkspace } from "@/server/income-templates";

export const metadata: Metadata = {
  title: "Tổng quan — Money Flow",
  description: "Số dư, thu–chi tháng, danh mục chi tiêu và gợi ý có thể chi hôm nay.",
};

/**
 * Tổng quan thu chi (G5): số dư / thu / chi / ròng + top categories + recent +
 * safe-to-spend secondary + planning cards. Default logged-in home.
 */
export default async function Page() {
  const viewer = await requireViewer();
  const [
    workspace,
    budgetWorkspace,
    commitmentWorkspace,
    incomeWorkspace,
    goalWorkspace,
  ] = await Promise.all([
    getFinanceWorkspace(),
    getBudgetsWorkspace(),
    getCommitmentsWorkspace(),
    getIncomeTemplatesWorkspace(),
    getGoalsWorkspace(),
  ]);

  return (
    <MoneyFlowDashboard
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={{
        ...workspace,
        dataError:
          workspace.dataError ??
          budgetWorkspace.dataError ??
          commitmentWorkspace.dataError ??
          incomeWorkspace.dataError ??
          goalWorkspace.dataError,
      }}
      budgets={budgetWorkspace.budgets}
      commitments={commitmentWorkspace.commitments}
      incomeTemplates={incomeWorkspace.templates}
      goals={goalWorkspace.goals}
    />
  );
}
