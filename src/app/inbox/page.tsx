import type { Metadata } from "next";
import { InboxPage } from "@/components/inbox-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Inbox — Money Flow",
  description: "Hộp thư tài chính — duyệt giao dịch trước khi vào sổ.",
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
