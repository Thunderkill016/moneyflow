import type { Metadata } from "next";
import { CapturePage } from "@/components/inbox/capture-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Capture — Money Flow",
  description: "Đưa giao dịch vào hộp thư — dán text, tải sao kê hoặc thêm nhanh.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <CapturePage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
