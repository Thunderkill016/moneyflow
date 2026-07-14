import type { Metadata } from "next";
import { ExportSettingsPage } from "@/components/export-settings-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Xuất dữ liệu — Money Flow",
  description:
    "Tải giao dịch đã duyệt và ứng viên Inbox dạng CSV hoặc JSON trên thiết bị của bạn.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
  return (
    <ExportSettingsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={{
        transactions: workspace.transactions,
        today: workspace.today,
        dataError: workspace.dataError,
      }}
    />
  );
}
