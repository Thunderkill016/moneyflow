"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  login,
  register,
  requestPasswordReset,
  signInWithGoogle,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type Mode = "login" | "register" | "forgot" | "update";

const copy = {
  login: { eyebrow: "Chào mừng trở lại", title: "Đăng nhập MoneyFlow", description: "Tiếp tục quản lý dòng tiền của bạn.", submit: "Đăng nhập" },
  register: { eyebrow: "Bắt đầu rõ ràng hơn", title: "Tạo tài khoản", description: "Biết hôm nay có thể chi bao nhiêu chỉ trong vài giây.", submit: "Tạo tài khoản" },
  forgot: { eyebrow: "Khôi phục truy cập", title: "Quên mật khẩu?", description: "Nhập email và chúng tôi sẽ gửi liên kết đặt lại.", submit: "Gửi liên kết" },
  update: { eyebrow: "Bảo vệ tài khoản", title: "Đặt mật khẩu mới", description: "Chọn mật khẩu mới có ít nhất 8 ký tự.", submit: "Cập nhật mật khẩu" },
} satisfies Record<Mode, { eyebrow: string; title: string; description: string; submit: string }>;

const initialState: AuthState = {};

export function AuthForm({ mode, next = "/", demoMode = false }: { mode: Mode; next?: string; demoMode?: boolean }) {
  const action = mode === "login" ? login : mode === "register" ? register : mode === "forgot" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialState);
  const content = copy[mode];

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Giới thiệu MoneyFlow">
        <Link className="brand auth-brand" href="/"><span className="brand-mark"><span /></span><span>MoneyFlow</span></Link>
        <div>
          <span className="auth-orbit"><Icon name="spark" /></span>
          <h1>Tiền của bạn.<br />Rõ ràng mỗi ngày.</h1>
          <p>MoneyFlow biến những con số phức tạp thành một quyết định đơn giản: hôm nay bạn có thể chi bao nhiêu.</p>
        </div>
        <blockquote>“Không phán xét. Không làm bạn rối. Chỉ giúp bạn đi đúng hướng.”</blockquote>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <Link className="brand auth-mobile-brand" href="/"><span className="brand-mark"><span /></span><span>MoneyFlow</span></Link>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p className="auth-description">{content.description}</p>

          {demoMode && mode === "login" && (
            <div className="demo-notice"><strong>Đang ở chế độ demo</strong><span>Thêm Supabase credentials để bật tài khoản thật.</span><Link href="/">Tiếp tục bản demo</Link></div>
          )}

          {(mode === "login" || mode === "register") && (
            <form action={signInWithGoogle}>
              <button className="google-button" type="submit">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.6z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.7a5.4 5.4 0 0 1 0-3.4V4.98H.95a9 9 0 0 0 0 8.04l3.02-2.32z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.3A9 9 0 0 0 .95 4.98l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                Tiếp tục với Google
              </button>
            </form>
          )}

          {(mode === "login" || mode === "register") && <div className="auth-divider"><span>hoặc dùng email</span></div>}

          <form className="auth-form" action={formAction}>
            <input type="hidden" name="next" value={next} />
            {mode === "register" && (
              <label><span>Họ và tên</span><input name="fullName" autoComplete="name" placeholder="Nguyễn Minh Anh" aria-invalid={Boolean(state.errors?.fullName)} />{state.errors?.fullName && <small>{state.errors.fullName[0]}</small>}</label>
            )}
            {mode !== "update" && (
              <label><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="ban@example.com" aria-invalid={Boolean(state.errors?.email)} />{state.errors?.email && <small>{state.errors.email[0]}</small>}</label>
            )}
            {(mode === "login" || mode === "register" || mode === "update") && (
              <label><span>Mật khẩu</span><input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Ít nhất 8 ký tự" aria-invalid={Boolean(state.errors?.password)} />{state.errors?.password && <small>{state.errors.password[0]}</small>}</label>
            )}
            {mode === "login" && <Link className="forgot-link" href="/forgot-password">Quên mật khẩu?</Link>}
            {state.message && <div className={state.success ? "auth-message success" : "auth-message"} role="status">{state.message}</div>}
            <Button className="auth-submit" disabled={pending} type="submit">{pending ? "Đang xử lý..." : content.submit}<Icon name="arrowRight" /></Button>
          </form>

          {mode === "login" && <p className="auth-switch">Chưa có tài khoản? <Link href="/register">Đăng ký miễn phí</Link></p>}
          {mode === "register" && <p className="auth-switch">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>}
          {(mode === "forgot" || mode === "update") && <p className="auth-switch"><Link href="/login">← Quay lại đăng nhập</Link></p>}
        </div>
      </section>
    </main>
  );
}
