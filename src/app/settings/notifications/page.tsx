import type { Metadata } from "next";
import { NotificationSettingsPage } from "@/components/notification-settings-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Thông báo cam kết — Money Flow",
  description:
    "Opt-in nhắc khoản định kỳ đến hạn. Không hiện số tiền trong thông báo.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <NotificationSettingsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
