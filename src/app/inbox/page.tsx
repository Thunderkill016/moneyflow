import type { Metadata } from "next";
import { InboxPage } from "@/components/inbox/inbox-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Cần xem — Money Flow",
  description: "Duyệt giao dịch cần xử lý trước khi ghi vào sổ.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <InboxPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={{
        transactions: workspace.transactions,
        accounts: workspace.accounts,
        categories: workspace.categories,
        dataError: workspace.dataError,
      }}
    />
  );
}
