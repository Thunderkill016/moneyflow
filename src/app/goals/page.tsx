import type { Metadata } from "next";
import { GoalsPage } from "@/components/planning/goals-page";
import { requireViewer } from "@/server/auth";
import { getGoalsWorkspace } from "@/server/goals";

export const metadata: Metadata = { title: "Mục tiêu tiết kiệm — MoneyFlow", description: "Dành tiền cho mục tiêu và theo dõi tiến độ tách biệt với số dư." };
export default async function Page() { const viewer = await requireViewer(); const workspace = await getGoalsWorkspace(); return <GoalsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} initialGoals={workspace.goals} today={workspace.today} dataError={workspace.dataError} />; }
