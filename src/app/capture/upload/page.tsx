import type { Metadata } from "next";
import { CaptureUploadPage } from "@/components/capture-upload-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Tải sao kê — Capture — Money Flow",
  description:
    "Tải CSV sao kê, map cột ngày/số tiền/mô tả, đưa ứng viên vào Inbox để duyệt.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <CaptureUploadPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
