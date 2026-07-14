import type { Metadata } from "next";
import { PrivacySettingsPage } from "@/components/privacy-settings-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Quyền riêng tư — Money Flow",
  description:
    "Tùy chọn giữ file gốc, opt-in cải thiện parser và nhật ký xuất/xóa trên thiết bị.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <PrivacySettingsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
