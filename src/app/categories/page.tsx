import type { Metadata } from "next";
import { CategoriesPage } from "@/components/categories-page";
import { requireViewer } from "@/server/auth";
import { getCategoriesWorkspace } from "@/server/categories";

export const metadata: Metadata = {
  title: "Danh mục — MoneyFlow",
  description: "Quản lý danh mục thu chi trong MoneyFlow.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getCategoriesWorkspace();
  return (
    <CategoriesPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialCategories={workspace.categories}
      dataError={workspace.dataError}
    />
  );
}
