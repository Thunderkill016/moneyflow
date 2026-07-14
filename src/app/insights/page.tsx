import type { Metadata } from "next";
import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getBudgetsWorkspace } from "@/server/budgets";
import { getCommitmentsWorkspace } from "@/server/commitments";
import { getGoalsWorkspace } from "@/server/goals";

export const metadata: Metadata = {
  title: "Insights — Money Flow",
  description: "Có thể chi hôm nay, tóm tắt tháng và cảnh báo — phụ sau Inbox.",
};

/**
 * Insights (wireframes-inbox §17): demoted dashboard.
 * Safe-to-spend + month summary; not the default home.
 */
export default async function Page() {
  const viewer = await requireViewer();
  const [workspace, budgetWorkspace, commitmentWorkspace, goalWorkspace] =
    await Promise.all([
      getFinanceWorkspace(),
      getBudgetsWorkspace(),
      getCommitmentsWorkspace(),
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
          goalWorkspace.dataError,
      }}
      budgets={budgetWorkspace.budgets}
      commitments={commitmentWorkspace.commitments}
      goals={goalWorkspace.goals}
    />
  );
}
