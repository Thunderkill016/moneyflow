import type { Metadata } from "next";
import {
  CaptureQuickPage,
  type QuickCaptureMode,
} from "@/components/inbox/capture-quick-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Thêm nhanh — Capture — Money Flow",
  description: "Ghi nhanh một khoản thu, chi hoặc chuyển tiền với lựa chọn gần nhất.",
};

function normalizeMode(value: string | undefined): QuickCaptureMode | undefined {
  return value === "expense" || value === "income" || value === "transfer"
    ? value
    : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <CaptureQuickPage
      initialMode={normalizeMode(params.kind)}
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
