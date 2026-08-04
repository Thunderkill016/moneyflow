import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
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
};

/**
 * Public home: always renders the static landing for logged-out visitors,
 * in both production and demo mode, matching /landing. Authenticated users
 * are redirected in proxy so the public narrative stays focused on first visits.
 */
export default function Home() {
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
