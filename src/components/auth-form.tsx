"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { ArrowRightLeft, Search, ShieldCheck } from "lucide-react";
import {
  login,
  register,
  requestPasswordReset,
  signInWithGoogle,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Icon } from "@/components/icons";
import { getPublicAuthCaptchaConfig } from "@/lib/auth-captcha";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { AuthPasswordField } from "./auth-password-field";
import styles from "./auth-form.module.css";
import themeStyles from "./public-brand-theme.module.css";

type Mode = "login" | "register" | "forgot" | "update";

type ModeCopy = {
  eyebrow: string;
  title: string;
  description: string;
  submit: string;
  proofEyebrow: string;
  proofTitle: string;
};

const copy = {
  login: {
    eyebrow: "Quay lại sổ của bạn",
    title: "Đăng nhập vào MoneyFlow",
    description:
      "Tiếp tục từ giao dịch gần nhất và kiểm tra dòng tiền của bạn.",
    submit: "Đăng nhập",
    proofEyebrow: "Tiếp tục từ sổ của bạn",
    proofTitle: "Quay lại đúng dữ liệu bạn đã ghi.",
  },
  register: {
    eyebrow: "Bắt đầu một sổ có thể đối chiếu",
    title: "Tạo tài khoản MoneyFlow",
    description:
      "Ghi thu, chi và chuyển tiền đúng bản chất ngay từ đầu.",
    submit: "Tạo tài khoản",
    proofEyebrow: "Bắt đầu từ giao dịch đầu tiên",
    proofTitle: "Tạo một sổ mà mỗi con số có chỗ kiểm tra.",
  },
  forgot: {
    eyebrow: "Khôi phục quyền truy cập",
    title: "Đặt lại mật khẩu",
    description:
      "Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn tạo mật khẩu mới.",
    submit: "Gửi liên kết",
    proofEyebrow: "Khôi phục quyền truy cập",
    proofTitle: "Lấy lại đường vào sổ mà không thay đổi dữ liệu.",
  },
  update: {
    eyebrow: "Bảo mật tài khoản",
    title: "Tạo mật khẩu mới",
    description:
      "Mật khẩu mới cần ít nhất 12 ký tự và chỉ nên được dùng cho MoneyFlow.",
    submit: "Lưu mật khẩu mới",
    proofEyebrow: "Bảo vệ quyền truy cập",
    proofTitle: "Tạo mật khẩu mới để tiếp tục với sổ của bạn.",
  },
} satisfies Record<Mode, ModeCopy>;

const reauthCopy: ModeCopy = {
  eyebrow: "Xác thực lại trước thao tác vĩnh viễn",
  title: "Xác nhận đây là bạn",
  description:
    "Đăng nhập lại để mở quyền xóa tài khoản trong thời gian ngắn. Sau đó bạn sẽ quay lại bước xác nhận xóa.",
  submit: "Xác thực lại",
  proofEyebrow: "Bảo vệ thao tác không thể hoàn tác",
  proofTitle: "Phiên đang đăng nhập chưa đủ cho việc xóa vĩnh viễn.",
};

const proofPoints = [
  {
    icon: ArrowRightLeft,
    title: "Thu, chi và chuyển tiền tách biệt",
    body: "Chuyển nội bộ không bị tính nhầm thành chi tiêu.",
  },
  {
    icon: Search,
    title: "Mỗi số tổng đều có chỗ kiểm tra",
    body: "Mở sổ để xem đúng giao dịch đứng sau thay đổi số dư.",
  },
  {
    icon: ShieldCheck,
    title: "Không cần mật khẩu ngân hàng",
    body: "Bạn chủ động quyết định dữ liệu nào được ghi vào MoneyFlow.",
  },
] as const;

const initialState: AuthState = {};

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.[0]) return null;
  return (
    <small className={styles.fieldError} id={id} role="alert">
      {messages[0]}
    </small>
  );
}

export function AuthForm({
  mode,
  next = POST_AUTH_REDIRECT,
  demoMode = false,
  reauth = false,
}: {
  mode: Mode;
  next?: string;
  demoMode?: boolean;
  reauth?: boolean;
}) {
  const action =
    mode === "login"
      ? login
      : mode === "register"
        ? register
        : mode === "forgot"
          ? requestPasswordReset
          : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaConfig = getPublicAuthCaptchaConfig();
  const captchaApplies =
    mode === "login" || mode === "register" || mode === "forgot";
  const captchaEnabled = captchaApplies && captchaConfig.enabled;
  const captchaBlocked =
    captchaEnabled && (!captchaConfig.ready || !captchaToken);
  const isReauth = reauth && mode === "login";
  const content = isReauth ? reauthCopy : copy[mode];
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const fullNameErrorId = `${baseId}-fullName-error`;
  const emailErrorId = `${baseId}-email-error`;
  const passwordErrorId = `${baseId}-password-error`;
  const confirmPasswordErrorId = `${baseId}-confirm-password-error`;
  const privacyErrorId = `${baseId}-privacy-error`;

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
          <Link href={isReauth ? next : "/"} className={styles.homeLink}>
            {isReauth ? "← Quay lại xóa tài khoản" : "← Trang chủ"}
          </Link>
        </header>

        <div className={styles.authStage}>
          <section className={styles.card} aria-labelledby={titleId}>
            <header className={styles.cardHeader}>
              <p className={styles.eyebrow}>{content.eyebrow}</p>
              <h1 id={titleId}>{content.title}</h1>
              <p className={styles.description}>{content.description}</p>
            </header>

            {demoMode && mode === "login" && !isReauth && (
              <div className={styles.demoNotice} role="status">
                <strong>Đang ở chế độ demo</strong>
                <span>Dữ liệu demo chỉ được lưu trong trình duyệt này.</span>
                <Link href="/dashboard">Tiếp tục bản demo</Link>
              </div>
            )}

            {(mode === "login" || mode === "register") && (
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="reauth" value={isReauth ? "1" : "0"} />
                <button
                  className={styles.googleButton}
                  type="submit"
                  disabled={pending}
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                  >
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.6z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.97 10.7a5.4 5.4 0 0 1 0-3.4V4.98H.95a9 9 0 0 0 0 8.04l3.02-2.32z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.3A9 9 0 0 0 .95 4.98l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z"
                    />
                  </svg>
                  {isReauth ? "Xác thực lại với Google" : "Tiếp tục với Google"}
                </button>
              </form>
            )}

            {(mode === "login" || mode === "register") && (
              <div className={styles.divider}>
                <span>hoặc tiếp tục bằng email</span>
              </div>
            )}

            <form className={styles.form} action={formAction} noValidate>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="reauth" value={isReauth ? "1" : "0"} />

              {mode === "register" && (
                <label>
                  <span>Họ và tên</span>
                  <input
                    id={`${baseId}-fullName`}
                    name="fullName"
                    autoComplete="name"
                    placeholder="Nguyễn Minh Anh"
                    aria-invalid={Boolean(state.errors?.fullName)}
                    aria-describedby={
                      state.errors?.fullName ? fullNameErrorId : undefined
                    }
                    disabled={pending}
                  />
                  <FieldError
                    id={fullNameErrorId}
                    messages={state.errors?.fullName}
                  />
                </label>
              )}

              {mode !== "update" && (
                <label>
                  <span>Email</span>
                  <input
                    id={`${baseId}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ban@example.com"
                    aria-invalid={Boolean(state.errors?.email)}
                    aria-describedby={
                      state.errors?.email ? emailErrorId : undefined
                    }
                    disabled={pending}
                  />
                  <FieldError id={emailErrorId} messages={state.errors?.email} />
                </label>
              )}

              {(mode === "login" || mode === "register" || mode === "update") && (
                <AuthPasswordField
                  id={`${baseId}-password`}
                  name="password"
                  label="Mật khẩu"
                  /* Proving an existing password on login and re-auth; setting a
                     new one on registration and update. */
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Ít nhất 12 ký tự"
                  invalid={Boolean(state.errors?.password)}
                  describedBy={
                    state.errors?.password ? passwordErrorId : undefined
                  }
                  disabled={pending}
                  labelAccessory={
                    mode === "login" && !isReauth ? (
                      <Link href="/forgot-password">Quên mật khẩu?</Link>
                    ) : null
                  }
                >
                  <FieldError
                    id={passwordErrorId}
                    messages={state.errors?.password}
                  />
                </AuthPasswordField>
              )}

              {mode === "register" && (
                <AuthPasswordField
                  id={`${baseId}-confirm-password`}
                  name="confirmPassword"
                  label="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  placeholder="Nhập lại đúng mật khẩu ở trên"
                  invalid={Boolean(state.errors?.confirmPassword)}
                  describedBy={
                    state.errors?.confirmPassword ? confirmPasswordErrorId : undefined
                  }
                  disabled={pending}
                >
                  <FieldError
                    id={confirmPasswordErrorId}
                    messages={state.errors?.confirmPassword}
                  />
                </AuthPasswordField>
              )}

              {mode === "register" && (
                <div className={styles.privacy}>
                  <label className={styles.privacyLabel}>
                    <input
                      id={`${baseId}-privacy`}
                      name="privacyAccepted"
                      type="checkbox"
                      value="1"
                      aria-invalid={Boolean(state.errors?.privacyAccepted)}
                      aria-describedby={
                        state.errors?.privacyAccepted ? privacyErrorId : undefined
                      }
                      disabled={pending}
                    />
                    <span>
                      Tôi đồng ý với{" "}
                      <Link href="/privacy">chính sách quyền riêng tư</Link>
                    </span>
                  </label>
                  <FieldError
                    id={privacyErrorId}
                    messages={state.errors?.privacyAccepted}
                  />
                </div>
              )}

              {captchaEnabled && captchaConfig.siteKey && (
                <div className={styles.captchaBlock}>
                  <AuthTurnstile
                    className={styles.captcha}
                    siteKey={captchaConfig.siteKey}
                    token={captchaToken}
                    pending={pending}
                    onTokenChange={setCaptchaToken}
                  />
                  <small>
                    Xác minh bảo mật có thể hoàn tất tự động mà không hiện ô tích.
                  </small>
                </div>
              )}

              {captchaEnabled && !captchaConfig.ready && (
                <div className={styles.message} role="alert">
                  Xác minh bảo mật chưa được cấu hình. Hãy thử lại sau.
                </div>
              )}

              {state.message && (
                <div
                  className={`${styles.message} ${
                    state.success ? styles.messageSuccess : ""
                  }`}
                  role={state.success ? "status" : "alert"}
                >
                  {state.message}
                </div>
              )}

              <button
                className={styles.submit}
                disabled={pending || captchaBlocked}
                type="submit"
                aria-busy={pending}
              >
                {pending ? "Đang xử lý…" : content.submit}
                {!pending && <Icon name="arrowRight" />}
              </button>
            </form>

            {mode === "login" && isReauth && (
              <p className={styles.switchLink}>
                <Link href={next}>← Hủy và quay lại xóa tài khoản</Link>
              </p>
            )}
            {mode === "login" && !isReauth && (
              <p className={styles.switchLink}>
                Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
              </p>
            )}
            {mode === "register" && (
              <p className={styles.switchLink}>
                Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
              </p>
            )}
            {(mode === "forgot" || mode === "update") && (
              <p className={styles.switchLink}>
                <Link href="/login">← Quay lại đăng nhập</Link>
              </p>
            )}
          </section>

          <aside className={styles.proofRail} aria-label="Điều MoneyFlow cam kết">
            <p className={styles.proofEyebrow}>{content.proofEyebrow}</p>
            <h2>{content.proofTitle}</h2>
            <div className={styles.proofList}>
              {proofPoints.map((point) => (
                <article key={point.title}>
                  <point.icon size={20} aria-hidden="true" />
                  <div>
                    <h3>{point.title}</h3>
                    <p>{point.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>

        <p className={styles.securityNote}>
          <ShieldCheck size={15} aria-hidden="true" />
          {isReauth
            ? "MoneyFlow yêu cầu xác thực lại trước thao tác xóa vĩnh viễn."
            : "MoneyFlow không yêu cầu mật khẩu ngân hàng."}
        </p>
      </div>
    </main>
  );
}
