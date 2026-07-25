"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { POST_AUTH_REDIRECT, safeNextPath } from "@/lib/auth-redirect";
import { DELETE_CONFIRM_TEXT, isDeleteConfirmValid } from "@/lib/delete-account";
import { ONBOARDING_PATH } from "@/lib/onboarding";
import { getSiteOrigin } from "@/lib/site-url";
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

  const nextPath = safeNextPath(String(formData.get("next") ?? ""), ONBOARDING_PATH);
  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });
  if (error) return { message: "Không thể tạo tài khoản. Email có thể đã được sử dụng." };

  // Immediate session (email confirm off) → onboarding for first capture.
  if (data.session) redirect(nextPath);

  return { success: true, message: "Kiểm tra email để xác nhận tài khoản MoneyFlow." };
}

export async function signInWithGoogle(formData?: FormData) {
  const nextPath = safeNextPath(
    formData ? String(formData.get("next") ?? "") : "",
    POST_AUTH_REDIRECT,
  );
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
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
    redirectTo: `${getSiteOrigin()}/auth/callback?next=/update-password`,
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
  try {
    if (supabase) await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Stale or already-deleted sessions can reject server-side sign-out.
    // Local cookie cleanup below is the source of truth for this browser.
  } finally {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
        cookieStore.delete(cookie.name);
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export type AccountDeletionResult =
  | { ok: true; cleanupVerified: boolean }
  | { ok: false; message: string };

type DeleteAccountFunctionResponse = {
  ok?: unknown;
  cleanupVerified?: unknown;
  tenantRowsRemaining?: unknown;
};

/** Permanently delete only the currently authenticated user and their tenant rows. */
export async function finalizeAccountDeletion(
  confirmText: string,
): Promise<AccountDeletionResult> {
  if (!isDeleteConfirmValid(confirmText)) {
    return { ok: false, message: `Gõ chính xác ${DELETE_CONFIRM_TEXT} để xác nhận.` };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: configurationError().message ?? "Supabase chưa được cấu hình." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false,
      message: "Phiên đăng nhập đã hết hạn. Đăng nhập lại trước khi xóa tài khoản.",
    };
  }

  const { data, error: deleteError } = await supabase.functions.invoke<DeleteAccountFunctionResponse>(
    "delete-account",
    { body: { confirm: DELETE_CONFIRM_TEXT } },
  );
  if (deleteError || !data || data.ok !== true) {
    return {
      ok: false,
      message:
        "Không xóa được tài khoản trên máy chủ. Dữ liệu trên thiết bị chưa bị xóa; hãy thử lại.",
    };
  }

  const cleanupVerified =
    data.cleanupVerified === true && data.tenantRowsRemaining === 0;

  // Best effort: remove the local SSR session cookie after the Auth user is gone.
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true, cleanupVerified };
}
