import type { Metadata } from "next";
import { DirectCsvImportPage } from "@/components/inbox/direct-csv-import-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getRulesWorkspace } from "@/server/rules";

export const metadata: Metadata = {
  title: "Import CSV vào sổ — Money Flow",
  description:
    "Power-user: map và dry-run CSV, rồi ghi thu/chi đã duyệt qua contract import có provenance; tài khoản đăng nhập commit theo lượt all-or-nothing.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const [workspace, rules] = await Promise.all([
    getFinanceWorkspace(),
    getRulesWorkspace(),
  ]);
  return (
    <DirectCsvImportPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      rules={rules}
    />
  );
}
