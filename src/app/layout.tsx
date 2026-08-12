import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PrivacySafeSpeedInsights } from "@/components/privacy-safe-speed-insights";
import { RouteScrollReset } from "@/components/route-scroll-reset";
import { RouteThemeBoundary } from "@/components/route-theme-boundary";
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
  viewportFit: "cover",
  /**
   * The virtual keyboard resizes the layout instead of floating over it.
   *
   * With the default (`resizes-visual`) the layout viewport keeps its full height
   * when the keyboard opens, so a sheet's own footer — the save control — can end
   * up underneath the keyboard with no way to scroll to it. `resizes-content`
   * shrinks the layout viewport, so `svh`-sized sheets and their footers stay
   * reachable while typing.
   */
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0C111D" },
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
                  var pathname = window.location.pathname;
                  var publicLightPaths = ['/', '/landing', '/login', '/register', '/forgot-password', '/reset-password', '/privacy'];
                  var isPublicLight = publicLightPaths.indexOf(pathname) !== -1 || pathname.indexOf('/auth/') === 0;
                  var resolved = 'light';

                  if (!isPublicLight) {
                    var theme = localStorage.getItem('moneyflow-theme') || 'system';
                    resolved = theme;
                    if (theme === 'system') {
                      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                  }

                  document.documentElement.setAttribute('data-theme', resolved);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <RouteThemeBoundary />
        <RouteScrollReset />
        {children}
        <Analytics />
        <PrivacySafeSpeedInsights />
      </body>
    </html>
  );
}
