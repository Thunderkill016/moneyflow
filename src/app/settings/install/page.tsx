import type { Metadata } from "next";
import { InstallAppPage } from "@/components/install-app-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Cài đặt ứng dụng — Money Flow",
  description:
    "Cài MoneyFlow lên màn hình chính và đọc lại tổng quan gần nhất khi ngoại tuyến.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <InstallAppPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
