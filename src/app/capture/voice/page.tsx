import type { Metadata } from "next";
import { ImportPreviewPage } from "@/components/inbox/import-preview-page";
import { requireViewer } from "@/server/auth";
import { getDashboardFinanceWorkspace } from "@/server/finance";

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
  // This page only consumes workspace.accounts; the bounded dashboard scope
  // avoids scanning the full ledger and review feed for data it never reads.
  const [viewer, workspace] = await Promise.all([
    requireViewer(),
    getDashboardFinanceWorkspace(),
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
