import type { Metadata } from "next";
import { BackupSettingsPage } from "@/components/backup-settings-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Bản sao lưu MoneyFlow — Money Flow",
  description:
    "Tạo bản sao lưu đầy đủ có thể khôi phục và khôi phục dữ liệu vào tài khoản mới.",
};

export default async function Page() {
  const viewer = await requireViewer();

  /* Complete backup and restore is a server-account feature. Demo mode keeps its
     report export and is told plainly that this surface does not apply, rather
     than being given controls that could only ever pretend to work. */
  return (
    <BackupSettingsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
