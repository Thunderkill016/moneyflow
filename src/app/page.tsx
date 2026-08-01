import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./landing/safe-ux-login.css";

const TITLE = "MoneyFlow — Nhìn rõ tiền trước khi quyết định";
const DESCRIPTION =
  "Một không gian tài chính cá nhân để ghi giao dịch, theo dõi tài khoản, ngân sách, khoản định kỳ và mục tiêu — rõ ràng, chủ động và không cần chia sẻ mật khẩu ngân hàng.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
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
 * Demo (no Supabase) redirects into the product. Authenticated users are
 * redirected in proxy so the public narrative stays focused on first visits.
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
