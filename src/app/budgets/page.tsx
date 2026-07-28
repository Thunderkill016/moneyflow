import type { Metadata } from "next";
import { BudgetsPage } from "@/components/planning/budgets-page";
import { requireViewer } from "@/server/auth";
import { getBudgetsWorkspace } from "@/server/budgets";

export const metadata: Metadata = { title: "Ngân sách — MoneyFlow", description: "Quản lý hạn mức chi tiêu theo danh mục." };

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getBudgetsWorkspace();
  return <BudgetsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} initialBudgets={workspace.budgets} categories={workspace.categories} monthStart={workspace.monthStart} dataError={workspace.dataError} />;
}
