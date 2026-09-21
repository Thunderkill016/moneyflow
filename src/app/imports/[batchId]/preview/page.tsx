import type { Metadata } from "next";
import { ImportPreviewPage } from "@/components/inbox/import-preview-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

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
  const [viewer, workspace] = await Promise.all([
    requireViewer(),
    getFinanceWorkspace(),
  ]);
  return (
    <ImportPreviewPage
      batchId={batchId}
      accounts={workspace.accounts}
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
