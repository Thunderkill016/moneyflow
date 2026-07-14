import type { Metadata } from "next";
import { RulesPage } from "@/components/rules-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Quy tắc — Money Flow",
  description: "Quy tắc tự động gợi ý danh mục khi dán / phân tích giao dịch.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <RulesPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
