import type { Metadata } from "next";
import { TransactionsTrashPage } from "@/components/transactions/transactions-trash-page";
import { requireViewer } from "@/server/auth";
import { getCategoriesWorkspace } from "@/server/categories";
import { getDeletedTransactions } from "@/server/finance";

export const metadata: Metadata = {
  title: "Giao dịch đã xóa — MoneyFlow",
  description: "Xem lại và khôi phục các giao dịch đã xóa trong MoneyFlow.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const [{ deleted, dataError }, categoriesWorkspace] = await Promise.all([
    getDeletedTransactions(),
    getCategoriesWorkspace(),
  ]);

  return (
    <TransactionsTrashPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialDeleted={deleted}
      categories={categoriesWorkspace.categories}
      dataError={dataError}
    />
  );
}
