import type { Metadata } from "next";
import { CaptureQuickPage } from "@/components/capture-quick-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Thêm nhanh — Capture — Money Flow",
  description: "Ghi nhanh một khoản thu hoặc chi — form ngắn, nhớ tài khoản và danh mục.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <CaptureQuickPage
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
      }}
    />
  );
}
