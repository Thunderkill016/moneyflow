"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { POST_AUTH_REDIRECT, safeNextPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  message?: string;
  success?: boolean;
  errors?: Record<string, string[]>;
};

const emailSchema = z.email("Email chưa đúng định dạng.").trim().toLowerCase();
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
  .max(72, "Mật khẩu không được dài quá 72 ký tự.");
const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự.").max(80),
  email: emailSchema,
  password: passwordSchema,
  privacyAccepted: z
    .string()
    .refine((value) => value === "1" || value === "on" || value === "true", {
      message: "Bạn cần đồng ý với chính sách quyền riêng tư.",
    }),
});
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Nhập mật khẩu.") });

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function configurationError(): AuthState {
  return {
    message: "Supabase chưa được cấu hình. Sao chép .env.example thành .env.local và thêm project URL cùng publishable key.",
  };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "Email hoặc mật khẩu không đúng." };

  redirect(safeNextPath(String(formData.get("next") ?? ""), POST_AUTH_REDIRECT));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    privacyAccepted: formData.get("privacyAccepted") ?? "",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(POST_AUTH_REDIRECT)}`,
    },
  });
  if (error) return { message: "Không thể tạo tài khoản. Email có thể đã được sử dụng." };

  return { success: true, message: "Kiểm tra email để xác nhận tài khoản MoneyFlow." };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(POST_AUTH_REDIRECT)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { errors: { email: parsed.error.issues.map((issue) => issue.message) } };

  const supabase = await createClient();
  if (!supabase) return configurationError();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/update-password`,
  });

  // Keep the response identical whether the email exists or not.
  return { success: true, message: "Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { errors: { password: parsed.error.issues.map((issue) => issue.message) } };

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { message: "Liên kết đã hết hạn. Hãy yêu cầu một liên kết mới." };
  redirect(POST_AUTH_REDIRECT);
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
