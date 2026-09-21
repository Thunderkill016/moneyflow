import { OfflineCacheReset } from "@/components/offline-cache-reset";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <OfflineCacheReset />
      {children}
    </>
  );
}
