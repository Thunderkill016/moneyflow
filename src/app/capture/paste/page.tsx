import type { Metadata } from "next";
import { CapturePastePage } from "@/components/inbox/capture-paste-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Dán text — Capture — Money Flow",
  description:
    "Dán tin nhắn hoặc ghi chú giao dịch, phân tích thành ứng viên trong Inbox.",
};

export default async function Page() {
  const [viewer, workspace] = await Promise.all([
    requireViewer(),
    getFinanceWorkspace(),
  ]);
  return (
    <CapturePastePage
      accounts={workspace.accounts}
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
