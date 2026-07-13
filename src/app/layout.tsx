import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyFlow — Biết hôm nay có thể chi bao nhiêu",
  description:
    "GPS tài chính cá nhân giúp người Việt hiểu dòng tiền và chi tiêu an toàn mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
