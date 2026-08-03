import type { Metadata } from "next";
import { RulesPage } from "@/components/inbox/rules-page";
import { requireViewer } from "@/server/auth";
import { getCategoriesWorkspace } from "@/server/categories";
import { getRulesWorkspace } from "@/server/rules";

export const metadata: Metadata = {
  title: "Quy tắc — Money Flow",
  description:
    "Quy tắc phân loại xác định, có xem trước và lưu phiên bản áp dụng trên ứng viên Inbox.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const [categoryWorkspace, rulesWorkspace] = await Promise.all([
    getCategoriesWorkspace(),
    getRulesWorkspace(),
  ]);
  return (
    <RulesPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      initialRules={rulesWorkspace.rules}
      categories={categoryWorkspace.categories}
      featureAvailable={rulesWorkspace.featureAvailable}
      dataError={rulesWorkspace.dataError ?? categoryWorkspace.dataError}
    />
  );
}
