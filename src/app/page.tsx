import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "./landing/safe-ux-login.css";

const TITLE = "MoneyFlow — Biết tiền ở đâu, vì sao thay đổi";
const DESCRIPTION =
  "Ghi thu, chi và chuyển tiền đúng bản chất; theo dõi từng tài khoản và mở lại giao dịch để kiểm tra — không cần liên kết ngân hàng.";

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
