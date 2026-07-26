import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PrivacySafeSpeedInsights } from "@/components/privacy-safe-speed-insights";
import "./globals.css";
import "./ui-refresh.css";
import "./benchmark-ux.css";
import "./safe-to-spend-withdrawal.css";
import "./cross-device-stabilization.css";
import "./ai-uiux-refresh.css";
import "./ai-uiux-guardrails.css";
import "./calm-ledger-tokens.css";

/**
 * UI text is LCP critical. Inter covers Vietnamese product copy while the
 * ledger uses the system mono stack exposed by the Calm Ledger tokens.
 */
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

export const metadata: Metadata = {
  title: "MoneyFlow — Sổ thu chi cá nhân",
  description:
    "Ghi thu chi nhanh, theo dõi nhiều ví, ngân sách và báo cáo tháng. Xuất CSV bất cứ lúc nào.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1511" },
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
      <body>
        {children}
        <PrivacySafeSpeedInsights />
      </body>
    </html>
  );
}
