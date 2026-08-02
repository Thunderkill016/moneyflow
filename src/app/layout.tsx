import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { MinimumTargetSizeContract } from "@/components/minimum-target-size-contract";
import { MobileShellContract } from "@/components/mobile-shell-contract";
import { PrivacySafeSpeedInsights } from "@/components/privacy-safe-speed-insights";
import { RouteScrollReset } from "@/components/route-scroll-reset";
import { normalizeSiteOrigin } from "@/lib/site-url";
import "./legacy.css";
import "./document-theme.css";

/**
 * UI text is LCP critical. Inter covers Vietnamese product copy while the
 * ledger uses the system mono stack exposed by the document/theme authority.
 */
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
  preload: true,
});

const TITLE = "MoneyFlow — Sổ thu chi cá nhân";
const DESCRIPTION =
  "Ghi thu chi nhanh, theo dõi nhiều ví, ngân sách và báo cáo tháng. Xuất CSV bất cứ lúc nào.";

// Non-throwing lookup: metadata is evaluated at module load, so a missing/invalid
// env var here must degrade (Next.js infers metadataBase) rather than fail the build.
const siteOrigin = normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const metadata: Metadata = {
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "sổ thu chi cá nhân",
    "quản lý chi tiêu",
    "ứng dụng quản lý tài chính cá nhân",
    "ghi chép thu chi",
    "quản lý ngân sách",
    "theo dõi chi tiêu",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "MoneyFlow",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0D111B" },
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
        <RouteScrollReset />
        <MobileShellContract />
        <MinimumTargetSizeContract />
        {children}
        <Analytics />
        <PrivacySafeSpeedInsights />
      </body>
    </html>
  );
}
