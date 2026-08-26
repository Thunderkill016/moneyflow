import type { Metadata } from "next";
import { GoalsPage } from "@/components/planning/goals-page";
import { requireViewer } from "@/server/auth";
import { getGoalsWorkspace } from "@/server/goals";
import "../safe-ux-planning.css";

export const metadata: Metadata = {
  title: "Mục tiêu tiết kiệm — MoneyFlow",
  description: "Dành tiền cho mục tiêu mà vẫn thấy đúng số có thể chi.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getGoalsWorkspace();
  return (
    <GoalsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialGoals={workspace.goals}
      reserveInputs={
        workspace.reserve
          ? {
              balance: workspace.reserve.balance,
              protectedForBills: workspace.reserve.protectedForBills,
            }
          : null
      }
      today={workspace.today}
      dataError={workspace.dataError}
    />
  );
}
