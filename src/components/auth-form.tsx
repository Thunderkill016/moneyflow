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
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Icon } from "@/components/icons";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { getPublicAuthCaptchaConfig } from "@/lib/auth-captcha";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import styles from "./auth-form.module.css";

type Mode = "login" | "register" | "forgot" | "update";

const copy = {
  login: {
    eyebrow: "Mở lại sổ của bạn",
    title: "Đăng nhập",
    description: "Tiếp tục từ số dư và giao dịch gần nhất của bạn.",
    submit: "Đăng nhập",
  },
  register: {
    eyebrow: "Bắt đầu từ khoản đầu tiên",
    title: "Tạo tài khoản",
    description: "Tạo một sổ riêng để ghi thu, chi và chuyển tiền rõ ràng.",
    submit: "Tạo tài khoản",
  },
  forgot: {
    eyebrow: "Khôi phục truy cập",
    title: "Quên mật khẩu?",
    description: "Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.",
    submit: "Gửi liên kết",
  },
  update: {
    eyebrow: "Bảo vệ tài khoản",
    title: "Đặt mật khẩu mới",
    description: "Chọn mật khẩu mới có ít nhất 12 ký tự.",
    submit: "Cập nhật mật khẩu",
  },
} satisfies Record<
  Mode,
  { eyebrow: string; title: string; description: string; submit: string }
>;

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
  const captchaConfig = getPublicAuthCaptchaConfig();
  const captchaApplies =
    mode === "login" || mode === "register" || mode === "forgot";
  const captchaEnabled = captchaApplies && captchaConfig.enabled;
  const captchaBlocked =
    captchaEnabled && (!captchaConfig.ready || !captchaToken);
  const content = copy[mode];
  const baseId = useId();
  const fullNameErrorId = `${baseId}-fullName-error`;
  const emailErrorId = `${baseId}-email-error`;
  const passwordErrorId = `${baseId}-password-error`;
  const privacyErrorId = `${baseId}-privacy-error`;

  return (
    <main className={styles.page}>
      <section className={styles.story} aria-label="Giới thiệu MoneyFlow">
        <BrandLockup
          className={styles.brand}
          href="/"
          ariaLabel="MoneyFlow, trang chủ"
          size="standard"
        />
        <div className={styles.storyBody}>
          <span className={styles.storyIcon} aria-hidden="true">
            <Icon name="book" size={26} />
          </span>
          <p className={styles.storyKicker}>Rõ từng dòng tiền</p>
          {/*
            Two-tone headline, the same shape the landing hero uses: neutral
            first sentence, brand-green second, separated by a real space so it
            reads correctly at any width. Keep the leading space inside the span.
          */}
          <h1>
            Ghi đúng từng khoản.
            <span> Nhìn rõ tiền của bạn.</span>
          </h1>
          <p>
            MoneyFlow là sổ thu chi manual-first: dữ liệu đến từ những gì bạn
            chủ động ghi, có thể sửa, phục hồi và xuất ra bất cứ lúc nào.
          </p>
        </div>
        <ul className={styles.trustList}>
          <li>
            <Icon name="check" size={17} />
            Thu, chi và chuyển tiền tách bạch
          </li>
          <li>
            <Icon name="check" size={17} />
            Xuất CSV bất cứ lúc nào
          </li>
          <li>
            <Icon name="check" size={17} />
            Không cần mật khẩu ngân hàng
          </li>
        </ul>
      </section>

      <section className={styles.panel}>
        <div className={styles.card}>
          <BrandLockup
            className={`${styles.brand} ${styles.mobileBrand}`}
            href="/"
            ariaLabel="MoneyFlow, trang chủ"
            size="compact"
          />
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p className={styles.description}>{content.description}</p>

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
            {(mode === "login" || mode === "register" || mode === "update") && (
              <label>
                <span>Mật khẩu</span>
                <input
                  id={`${baseId}-password`}
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Ít nhất 12 ký tự"
                  aria-invalid={Boolean(state.errors?.password)}
                  aria-describedby={
                    state.errors?.password ? passwordErrorId : undefined
                  }
                  disabled={pending}
                />
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
            {mode === "login" && (
              <Link className={styles.forgotLink} href="/forgot-password">
                Quên mật khẩu?
              </Link>
            )}
            {captchaEnabled && captchaConfig.siteKey && (
              <AuthTurnstile
                className={styles.captcha}
                siteKey={captchaConfig.siteKey}
                token={captchaToken}
                pending={pending}
                onTokenChange={setCaptchaToken}
              />
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
        </div>
        <p className={styles.panelNote}>
          MoneyFlow không yêu cầu mật khẩu hoặc thông tin đăng nhập ngân hàng.
        </p>
      </section>
    </main>
  );
}
