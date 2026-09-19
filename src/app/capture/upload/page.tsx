import type { Metadata } from "next";
import { CaptureUploadPage } from "@/components/inbox/capture-upload-page";
import { listBankExportCompatibility } from "@/lib/inbox/bank-export-compatibility";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Tải sao kê — Capture — Money Flow",
  description:
    "Tải CSV, Excel hoặc PDF text-layer; xem Import Preview rồi đưa giao dịch vào Inbox để kiểm tra trước khi ghi sổ.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const bankExportGuidance = listBankExportCompatibility().map(
    ({ provider, displayName, guidance }) => ({
      provider,
      displayName,
      guidance,
    }),
  );

  return (
    <CaptureUploadPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      bankExportGuidance={bankExportGuidance}
    />
  );
}
