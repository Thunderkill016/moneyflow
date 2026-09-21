import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { OAUTH_SCOPE_LABELS } from "@/lib/connected-apps";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";
import {
  approveOAuthAuthorization,
  denyOAuthAuthorization,
} from "./actions";
import styles from "@/components/auth-form.module.css";
import themeStyles from "@/components/public-brand-theme.module.css";

export const metadata: Metadata = {
  title: "Cho phép truy cập — MoneyFlow",
  robots: { index: false },
};

/*
 * OAuth 2.1 consent screen — the authorization path Supabase redirects the
 * browser to after validating a client's authorize request. The user must be
 * signed in (sent through /login first otherwise); Supabase then issues the
 * authorization code only after an explicit approve here.
 *
 * Honest by construction: the card says exactly what the client gets — a
 * token that reads the user's own MoneyFlow data through the capability
 * API — and where the browser goes next.
 */
const SCOPE_LABELS = OAUTH_SCOPE_LABELS;

function shell(children: React.ReactNode) {
  return (
    <main className={`${styles.page} ${themeStyles.authTheme}`}>
      <div className={styles.pageShell}>
        <header className={styles.topbar}>
          <BrandLockup
            className={styles.brand}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="standard"
          />
          <Link href="/" className={styles.homeLink}>
            ← Trang chủ
          </Link>
        </header>
        <div className={styles.authStage}>{children}</div>
      </div>
    </main>
  );
}

function errorCard(title: string, description: string) {
  return shell(
    <section className={styles.card} aria-labelledby="oauth-error-title">
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>Kết nối ứng dụng</p>
        <h1 id="oauth-error-title">{title}</h1>
        <p className={styles.description}>{description}</p>
      </header>
    </section>,
  );
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>;
}) {
  const params = await searchParams;
  const authorizationId =
    typeof params.authorization_id === "string" &&
    params.authorization_id.length > 0
      ? params.authorization_id
      : null;

  if (!authorizationId) {
    return errorCard(
      "Yêu cầu không hợp lệ",
      "Liên kết ủy quyền này thiếu mã yêu cầu. Hãy khởi động lại từ ứng dụng muốn kết nối.",
    );
  }

  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) {
    redirect(
      `/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = supabase
    ? await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
    : { data: null, error: new Error("no client") };

  if (error || !data) {
    return errorCard(
      "Không tải được yêu cầu",
      "Yêu cầu ủy quyền đã hết hạn hoặc không tồn tại. Hãy khởi động lại từ ứng dụng muốn kết nối.",
    );
  }

  // Consent was already granted for these scopes — Supabase returns a ready
  // redirect carrying the code; nothing left to ask the user about.
  if ("redirect_url" in data) redirect(data.redirect_url);

  const scopes = data.scope.split(/\s+/).filter(Boolean);
  const redirectHost = (() => {
    try {
      return new URL(data.redirect_uri).host;
    } catch {
      return data.redirect_uri;
    }
  })();

  return shell(
    <section className={styles.card} aria-labelledby="oauth-consent-title">
      <header className={styles.cardHeader}>
        <p className={styles.eyebrow}>Kết nối ứng dụng</p>
        <h1 id="oauth-consent-title">Cho phép truy cập</h1>
        <p className={styles.description}>
          <strong>{data.client.name}</strong> muốn kết nối với tài khoản
          MoneyFlow của bạn.
        </p>
      </header>

      <div className={styles.form}>
        {params.error === "consent_failed" ? (
          <div className={styles.message} role="alert">
            Không ghi nhận được lựa chọn. Vui lòng thử lại.
          </div>
        ) : null}

        <p className={styles.description}>
          Sau khi cho phép, ứng dụng có thể <strong>đọc</strong> dữ liệu
          MoneyFlow của bạn — số dư, giao dịch và báo cáo — qua các công cụ đã
          kết nối, đúng phạm vi tài khoản của bạn.
        </p>

        {scopes.length > 0 ? (
          <ul>
            {scopes.map((scope) => (
              <li key={scope}>{SCOPE_LABELS[scope] ?? scope}</li>
            ))}
          </ul>
        ) : null}

        <p className={styles.description}>
          Bạn sẽ được chuyển về <strong>{redirectHost}</strong>.
        </p>

        <form action={approveOAuthAuthorization} noValidate>
          <input
            type="hidden"
            name="authorization_id"
            value={authorizationId}
          />
          <button type="submit" className={styles.submit}>
            Cho phép truy cập
          </button>
        </form>

        <form action={denyOAuthAuthorization} noValidate>
          <input
            type="hidden"
            name="authorization_id"
            value={authorizationId}
          />
          <button type="submit" className={styles.googleButton}>
            Từ chối
          </button>
        </form>
      </div>
    </section>,
  );
}
