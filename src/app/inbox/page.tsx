import type { Metadata } from "next";
import { InboxPage } from "@/components/inbox/inbox-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Cần xem — Money Flow",
  description: "Duyệt giao dịch cần xử lý trước khi ghi vào sổ.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ candidate?: string }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <InboxPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialCandidateId={params.candidate?.slice(0, 100)}
      workspace={{
        transactions: workspace.transactions,
        accounts: workspace.accounts,
        categories: workspace.categories,
        dataError: workspace.dataError,
      }}
    />
  );
}
