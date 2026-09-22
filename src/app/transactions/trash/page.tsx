import type { Metadata } from "next";
import { TransactionsTrashPage } from "@/components/transactions/transactions-trash-page";
import { requireViewer } from "@/server/auth";
import { getDeletedTransactions } from "@/server/finance";

export const metadata: Metadata = {
  title: "Giao dịch đã xóa — MoneyFlow",
  description: "Xem lại và khôi phục các giao dịch đã xóa trong MoneyFlow.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const { deleted, dataError } = await getDeletedTransactions();

  return (
    <TransactionsTrashPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialDeleted={deleted}
      dataError={dataError}
    />
  );
}
