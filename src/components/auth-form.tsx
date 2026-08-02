"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
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
import { getPublicAuthCaptchaConfig } from "@/lib/auth-captcha";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import styles from "./auth-form.module.css";
import themeStyles from "./public-brand-theme.module.css";

type Mode = "login" | "register" | "forgot" | "update";

const copy = {
  login: {
    eyebrow: "Đăng nhập",
    title: "Mở lại sổ của bạn",
    description: "Dùng Google hoặc email đã đăng ký.",
    submit: "Đăng nhập",
  },
  register: {
    eyebrow: "Tạo tài khoản",
    title: "Bắt đầu một sổ mới",
    description:
      "Tạo tài khoản rồi ghi khoản đầu tiên. Không cần liên kết ngân hàng.",
    submit: "Tạo tài khoản",
  },
  forgot: {
    eyebrow: "Khôi phục tài khoản",
    title: "Quên mật khẩu?",
    description:
      "Nhập email đã đăng ký. MoneyFlow sẽ gửi link để bạn đặt lại.",
    submit: "Gửi liên kết",
  },
  update: {
    eyebrow: "Mật khẩu mới",
    title: "Đặt lại mật khẩu",
    description:
      "Mật khẩu mới cần ít nhất 12 ký tự và chỉ nên dùng cho MoneyFlow.",
    submit: "Lưu mật khẩu mới",
  },
} satisfies Record<
  Mode,
  { eyebrow: string; title: string; description: string; submit: string }
>;

const contextCopy = {
  login: {
    label: "Sổ của bạn vẫn ở đây",
    title: "Đăng nhập rồi xem tiếp từ khoản gần nhất.",
    body: "Giao dịch, tài khoản và báo cáo được giữ nguyên theo dữ liệu bạn đã ghi.",
  },
  register: {
    label: "Bắt đầu từ một khoản",
    title: "Không cần nhập cả cuộc đời tài chính trong ngày đầu.",
    body: "Tạo tài khoản, thêm một tài khoản tiền và ghi khoản gần nhất bạn còn nhớ.",
  },
  forgot: {
    label: "Khôi phục quyền truy cập",
    title: "Chỉ cần email đã đăng ký.",
    body: "MoneyFlow sẽ gửi link đặt lại mật khẩu. Thông báo không tiết lộ tài khoản có tồn tại hay không.",
  },
  update: {
    label: "Tạo mật khẩu mới",
    title: "Đổi mật khẩu, dữ liệu trong sổ vẫn giữ nguyên.",
    body: "Sau khi cập nhật, bạn quay lại đăng nhập và tiếp tục như bình thường.",
  },
} satisfies Record<Mode, { label: string; title: string; body: string }>;

const sampleEntries = [
  { title: "Lương tháng 8", amount: "+15.000.000 ₫", tone: "income" },
  { title: "Tiền nhà", amount: "-4.500.000 ₫", tone: "expense" },
  { title: "Chuyển sang ví chi tiêu", amount: "1.500.000 ₫", tone: "transfer" },
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
}: {
  mode: Mode;
  next?: string;
  demoMode?: boolean;
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const captchaConfig = getPublicAuthCaptchaConfig();
  const captchaApplies =
    mode === "login" || mode === "register" || mode === "forgot";
  const captchaEnabled = captchaApplies && captchaConfig.enabled;
  const captchaBlocked =
    captchaEnabled && (!captchaConfig.ready || !captchaToken);
  const content = copy[mode];
  const context = contextCopy[mode];
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const fullNameErrorId = `${baseId}-fullName-error`;
  const emailErrorId = `${baseId}-email-error`;
  const passwordErrorId = `${baseId}-password-error`;
  const privacyErrorId = `${baseId}-privacy-error`;
  const hasPassword =
    mode === "login" || mode === "register" || mode === "update";

  return (
    <main className={`${styles.page} ${themeStyles.authTheme}`}>
      <div className={styles.shell}>
        <section className={styles.contextPanel} aria-label="Giới thiệu MoneyFlow">
          <BrandLockup
            className={styles.brand}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="standard"
          />

          <div className={styles.contextBody}>
            <p className={styles.contextLabel}>{context.label}</p>
            <h2>{context.title}</h2>
            <p>{context.body}</p>
          </div>

          {(mode === "login" || mode === "register") && (
            <div className={styles.miniLedger} aria-label="Sổ giao dịch minh hoạ">
              <div className={styles.miniLedgerHeading}>
                <span>Tháng 8</span>
                <small>Dữ liệu minh hoạ</small>
              </div>
              {sampleEntries.map((entry) => (
                <div className={styles.miniEntry} key={entry.title}>
                  <span>{entry.title}</span>
                  <strong className={styles[entry.tone]}>{entry.amount}</strong>
                </div>
              ))}
            </div>
          )}

          <p className={styles.contextFoot}>
            MoneyFlow không yêu cầu mật khẩu ngân hàng.
          </p>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.mobileTopbar}>
            <BrandLockup
              className={styles.mobileBrand}
              href="/"
              ariaLabel="MoneyFlow, trang chủ"
              size="compact"
            />
            <Link href="/" className={styles.homeLink}>
              ← Trang chủ
            </Link>
          </div>

          <section className={styles.card} aria-labelledby={titleId}>
            <header className={styles.cardHeader}>
              <p className={styles.eyebrow}>{content.eyebrow}</p>
              <h1 id={titleId}>{content.title}</h1>
              <p className={styles.description}>{content.description}</p>
            </header>

            {demoMode && mode === "login" && (
              <div className={styles.demoNotice} role="status">
                <strong>Đang ở chế độ demo</strong>
                <span>Dữ liệu demo chỉ được lưu trong trình duyệt này.</span>
                <Link href="/dashboard">Tiếp tục bản demo</Link>
              </div>
            )}

            {(mode === "login" || mode === "register") && (
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={next} />
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
                  Tiếp tục với Google
                </button>
              </form>
            )}

            {(mode === "login" || mode === "register") && (
              <div className={styles.divider}>
                <span>hoặc dùng email</span>
              </div>
            )}

            <form className={styles.form} action={formAction} noValidate>
              <input type="hidden" name="next" value={next} />

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

              {hasPassword && (
                <label>
                  <span className={styles.fieldLabelRow}>
                    <span>Mật khẩu</span>
                    {mode === "login" && (
                      <Link href="/forgot-password">Quên mật khẩu?</Link>
                    )}
                  </span>
                  <span className={styles.passwordField}>
                    <input
                      id={`${baseId}-password`}
                      name="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      placeholder={
                        mode === "login" ? "Nhập mật khẩu" : "Ít nhất 12 ký tự"
                      }
                      aria-invalid={Boolean(state.errors?.password)}
                      aria-describedby={
                        state.errors?.password ? passwordErrorId : undefined
                      }
                      disabled={pending}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      aria-pressed={passwordVisible}
                      aria-label={
                        passwordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                      disabled={pending}
                    >
                      {passwordVisible ? "Ẩn" : "Hiện"}
                    </button>
                  </span>
                  <FieldError
                    id={passwordErrorId}
                    messages={state.errors?.password}
                  />
                </label>
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
              </button>
            </form>

            {mode === "login" && (
              <p className={styles.switchLink}>
                Chưa có tài khoản? <Link href="/register">Tạo tài khoản</Link>
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

            <p className={styles.securityNote}>
              Không cần liên kết hay nhập mật khẩu ngân hàng.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
