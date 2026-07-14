import type { Metadata } from "next";
import { SettingsHubPage } from "@/components/settings-hub-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Cài đặt — Money Flow",
  description:
    "Quyền riêng tư, xuất dữ liệu, giao diện và xóa tài khoản. Dữ liệu của bạn thuộc về bạn.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <SettingsHubPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
