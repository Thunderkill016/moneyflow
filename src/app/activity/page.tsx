import type { Metadata } from "next";
import { ActivityWorkspace } from "@/components/activity/activity-workspace";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Hoạt động — MoneyFlow",
  description:
    "Theo dõi giao dịch đã vào sổ và dữ liệu đang chờ xử lý trong một dòng hoạt động.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <ActivityWorkspace
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={{
        transactions: workspace.transactions,
        accounts: workspace.accounts,
        categories: workspace.categories,
        dataError: workspace.dataError,
        reviewAvailable: workspace.reviewFeatureAvailable === true,
      }}
    />
  );
}
