import type { Metadata } from "next";
import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { requireViewer } from "@/server/auth";
import { getDashboardFinanceWorkspace } from "@/server/finance";
import { getBudgetsWorkspace } from "@/server/budgets";
import { getCommitmentsWorkspace } from "@/server/commitments";
import { getGoalsWorkspace } from "@/server/goals";
import { getIncomeTemplatesWorkspace } from "@/server/income-templates";
import "./calm-ledger-overview.css";

export const metadata: Metadata = {
  title: "Tổng quan — MoneyFlow",
  description: "Số dư, thu–chi tháng, danh mục chi tiêu và trạng thái kế hoạch.",
};

/**
 * Tổng quan thu chi: số dư / thu / chi / ròng + top categories + recent +
 * planning cards. Default logged-in home.
 *
 * A numeric safe-to-spend guide stays withdrawn until MoneyFlow can prove a
 * complete income-based plan or a next-payday plan with protected cash.
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
    getDashboardFinanceWorkspace(),
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
