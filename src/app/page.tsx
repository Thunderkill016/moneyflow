import { MoneyFlowDashboard } from "@/components/moneyflow-dashboard";
import { getViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getBudgetsWorkspace } from "@/server/budgets";
import { getCommitmentsWorkspace } from "@/server/commitments";
import { getGoalsWorkspace } from "@/server/goals";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) {
    return <LandingPage />;
  }
  const [workspace, budgetWorkspace, commitmentWorkspace, goalWorkspace] = await Promise.all([getFinanceWorkspace(), getBudgetsWorkspace(), getCommitmentsWorkspace(), getGoalsWorkspace()]);
  return <MoneyFlowDashboard viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} workspace={{ ...workspace, dataError: workspace.dataError ?? budgetWorkspace.dataError ?? commitmentWorkspace.dataError ?? goalWorkspace.dataError }} budgets={budgetWorkspace.budgets} commitments={commitmentWorkspace.commitments} goals={goalWorkspace.goals} />;
}
