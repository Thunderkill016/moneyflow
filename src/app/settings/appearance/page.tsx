import type { Metadata } from "next";
import { AppearanceSettingsPage } from "@/components/appearance-settings-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Giao diện — Money Flow",
  description: "Chọn chế độ sáng, tối hoặc theo hệ thống trên thiết bị này.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <AppearanceSettingsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
