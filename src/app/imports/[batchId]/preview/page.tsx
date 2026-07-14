import type { Metadata } from "next";
import { ImportPreviewPage } from "@/components/import-preview-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Import Preview — Money Flow",
  description:
    "Xem map cột và preview sao kê trước khi đưa giao dịch vào Inbox.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const viewer = await requireViewer();
  return (
    <ImportPreviewPage
      batchId={batchId}
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
