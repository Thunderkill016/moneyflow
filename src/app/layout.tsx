import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./ui-refresh.css";
import "./landing-refresh.css";

/**
 * UI text — LCP critical.
 * Variable Inter (no static weight list) = one/few files vs many weight files.
 * Still latin + vietnamese for product copy.
 *
 * Money mono uses the system stack in globals.css (no second webfont).
 * That cuts transfer/CSS on every route; digits stay tabular via .font-mono.
 */
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

export const metadata: Metadata = {
  title: "MoneyFlow — Quản lý thu chi cá nhân",
  description:
    "Ghi thu chi nhanh, nhiều ví, ngân sách danh mục, báo cáo tháng. Biết hôm nay có thể chi bao nhiêu. Xuất CSV. Không quảng cáo trong luồng chính.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${inter.className}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Theme before paint — suppressHydrationWarning on <html> avoids data-theme mismatch. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('moneyflow-theme') || 'system';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
