import type { Metadata } from "next";
import { BudgetsPage } from "@/components/planning/budgets-page";
import { requireViewer } from "@/server/auth";
import { getBudgetsWorkspace } from "@/server/budgets";
import "../safe-ux-planning.css";
import "./money-layout.css";

export const metadata: Metadata = {
  title: "Ngân sách — MoneyFlow",
  description: "Quản lý hạn mức chi tiêu theo danh mục.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getBudgetsWorkspace(params.month ?? null);
  return (
    <BudgetsPage
      key={workspace.monthStart}
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
    />
  );
}
