import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Dòng thời gian — Money Flow",
  description: "Giao dịch đã duyệt — dòng thời gian tin cậy cho số dư và insights.",
};

/**
 * Timeline (wireframes-inbox §16): approved ledger list with “đã duyệt” copy.
 * Reuses TransactionsPage; empty state CTAs Inbox / Capture.
 */
export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <TransactionsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      variant="timeline"
    />
  );
}
