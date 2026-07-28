import type { Metadata } from "next";
import { DirectCsvImportPage } from "@/components/inbox/direct-csv-import-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Import CSV vào sổ — Money Flow",
  description:
    "Power-user: map cột CSV, ghi thu/chi đã duyệt thẳng vào sổ, bỏ qua Inbox, dedupe fingerprint.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
  return (
    <DirectCsvImportPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
    />
  );
}
