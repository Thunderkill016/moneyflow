import type { Metadata } from "next";
import { IncomeTemplatesPage } from "@/components/income-templates-page";
import { requireViewer } from "@/server/auth";
import { getIncomeTemplatesWorkspace } from "@/server/income-templates";

export const metadata: Metadata = {
  title: "Lương định kỳ — MoneyFlow",
  description: "Theo dõi lương và khoản thu định kỳ, tách biệt hóa đơn phải trả.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getIncomeTemplatesWorkspace();
  return (
    <IncomeTemplatesPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialTemplates={workspace.templates}
      accounts={workspace.accounts}
      categories={workspace.categories}
      monthStart={workspace.monthStart}
      today={workspace.today}
      dataError={workspace.dataError}
    />
  );
}
