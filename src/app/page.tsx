import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./landing/safe-ux-login.css";

const TITLE = "MoneyFlow — Sổ thu chi cá nhân cho người Việt";
const DESCRIPTION =
  "Ghi thu, chi và chuyển tiền nhanh trong một sổ rõ ràng. Theo dõi nhiều ví, ngân sách và báo cáo tháng — không cần kết nối ngân hàng, xuất CSV bất cứ lúc nào.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // Next.js shallow-merges metadata: an openGraph/twitter object here fully
  // replaces the layout's, so every field must be repeated, not just the diff.
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "MoneyFlow",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MoneyFlow",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
};

/**
 * Public home: static landing when Supabase is configured (logged-out).
 * Demo (no Supabase) → /insights. Authenticated users redirected in proxy
 * (skip RSC viewer fetch for better LCP — TASK-132).
 */
export default function Home() {
  if (!isSupabaseConfigured()) {
    redirect(POST_AUTH_REDIRECT);
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <LandingPage />
    </>
  );
}
