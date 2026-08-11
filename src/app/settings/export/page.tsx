import type { Metadata } from "next";
import { ExportSettingsPage } from "@/components/export-settings-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { listInboxFromServer } from "@/server/inbox";

export const metadata: Metadata = {
  title: "Xuất dữ liệu — Money Flow",
  description:
    "Tải giao dịch đã duyệt và ứng viên Inbox dạng CSV hoặc JSON trên thiết bị của bạn.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  /* An authenticated Inbox lives on the server: local candidate storage is
     cleared once the browser migrates. Export must read the same canonical
     source the Inbox route reads, or the download silently omits it. */
  const inbox = viewer.isDemo ? null : await listInboxFromServer();

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
      serverInbox={
        inbox === null
          ? null
          : inbox.ok
            ? { candidates: inbox.candidates, error: null }
            : { candidates: [], error: inbox.message }
      }
    />
  );
}
