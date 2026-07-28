import type { Metadata } from "next";
import { CapturePastePage } from "@/components/inbox/capture-paste-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Dán text — Capture — Money Flow",
  description:
    "Dán tin nhắn hoặc ghi chú giao dịch, phân tích thành ứng viên trong Inbox.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <CapturePastePage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
