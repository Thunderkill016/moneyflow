"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CAPTCHA_TOKEN_FIELD,
  captchaTokenRequiredButMissing,
  getPublicAuthCaptchaConfig,
  normalizeCaptchaToken,
} from "@/lib/auth-captcha";
import { POST_AUTH_REDIRECT, safeNextPath } from "@/lib/auth-redirect";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-password-policy";
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
  .min(
    PASSWORD_MIN_LENGTH,
    `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Mật khẩu không được dài quá ${PASSWORD_MAX_LENGTH} ký tự.`,
  );
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
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Nhập mật khẩu."),
});

function configurationError(): AuthState {
  return {
    message:
      "Supabase chưa được cấu hình. Sao chép .env.example thành .env.local và thêm project URL cùng publishable key.",
  };
}

function captchaFailure(): AuthState {
  return {
    message:
      "Không thể xác minh bảo mật. Hoàn thành bước xác minh rồi thử lại.",
  };
}

function readCaptchaToken(formData: FormData):
  | { ok: true; token: string | undefined }
  | { ok: false; state: AuthState } {
  const config = getPublicAuthCaptchaConfig();
  const token = normalizeCaptchaToken(formData.get(CAPTCHA_TOKEN_FIELD));
  if (captchaTokenRequiredButMissing(config, token)) {
    return { ok: false, state: captchaFailure() };
  }
  return { ok: true, token };
}

function isCaptchaError(error: { code?: string } | null): boolean {
  return error?.code === "captcha_failed";
}

export async function login(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const captcha = readCaptchaToken(formData);
  if (!captcha.ok) return captcha.state;

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: captcha.token ? { captchaToken: captcha.token } : undefined,
  });
  if (isCaptchaError(error)) return captchaFailure();
  if (error) return { message: "Email hoặc mật khẩu không đúng." };

  redirect(
    safeNextPath(String(formData.get("next") ?? ""), POST_AUTH_REDIRECT),
  );
}

export async function register(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    privacyAccepted: formData.get("privacyAccepted") ?? "",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const captcha = readCaptchaToken(formData);
  if (!captcha.ok) return captcha.state;

  const nextPath = safeNextPath(
    String(formData.get("next") ?? ""),
    ONBOARDING_PATH,
  );
  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      captchaToken: captcha.token,
    },
  });
  if (isCaptchaError(error)) return captchaFailure();
  if (error) {
    // Do not expose whether this address already exists. Provider logs retain
    // the exact error for operators; the public response stays neutral.
    return {
      message:
        "Không thể tạo tài khoản lúc này. Kiểm tra thông tin hoặc thử lại sau.",
    };
  }

  // Immediate session (email confirm off) → onboarding for first capture.
  if (data.session) redirect(nextPath);

  return {
    success: true,
    message: "Kiểm tra email để xác nhận tài khoản MoneyFlow.",
  };
}

export async function signInWithGoogle(formData?: FormData) {
  const nextPath = safeNextPath(
    formData ? String(formData.get("next") ?? "") : "",
    POST_AUTH_REDIRECT,
  );
  const reauth = formData?.get("reauth") === "1";
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      ...(reauth ? { queryParams: { max_age: "0" } } : {}),
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      errors: {
        email: parsed.error.issues.map((issue) => issue.message),
      },
    };
  }

  const captcha = readCaptchaToken(formData);
  if (!captcha.ok) return captcha.state;

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getSiteOrigin()}/auth/callback?next=/update-password`,
    captchaToken: captcha.token,
  });
  if (isCaptchaError(error)) return captchaFailure();

  // Keep the response identical whether the email exists or not.
  return {
    success: true,
    message:
      "Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu.",
  };
}

export async function updatePassword(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return {
      errors: {
        password: parsed.error.issues.map((issue) => issue.message),
      },
    };
  }

  const supabase = await createClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return {
      message: "Liên kết đã hết hạn. Hãy yêu cầu một liên kết mới.",
    };
  }
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
      if (
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("auth-token")
      ) {
        cookieStore.delete(cookie.name);
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

export type AccountDeletionResult =
  | { ok: true; cleanupVerified: boolean }
  | {
      ok: false;
      message: string;
      requiresReauthentication?: false;
    }
  | {
      ok: false;
      message: string;
      requiresReauthentication: true;
    };

type DeleteAccountFunctionResponse = {
  ok?: unknown;
  cleanupVerified?: unknown;
  tenantRowsRemaining?: unknown;
};

type DeleteAccountFunctionError = {
  code?: unknown;
};

/** Permanently delete only the currently authenticated user and their tenant rows. */
export async function finalizeAccountDeletion(
  confirmText: string,
): Promise<AccountDeletionResult> {
  if (!isDeleteConfirmValid(confirmText)) {
    return {
      ok: false,
      message: `Gõ chính xác ${DELETE_CONFIRM_TEXT} để xác nhận.`,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message:
        configurationError().message ?? "Supabase chưa được cấu hình.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      ok: false,
      message:
        "Phiên đăng nhập đã hết hạn. Đăng nhập lại trước khi xóa tài khoản.",
      requiresReauthentication: true,
    };
  }

  const { data, error: deleteError } =
    await supabase.functions.invoke<DeleteAccountFunctionResponse>(
      "delete-account",
      { body: { confirm: DELETE_CONFIRM_TEXT } },
    );

  if (deleteError instanceof FunctionsHttpError) {
    try {
      const body = (await deleteError.context.json()) as DeleteAccountFunctionError;
      if (body?.code === "recent_auth_required") {
        return {
          ok: false,
          requiresReauthentication: true,
          message:
            "Để bảo vệ thao tác xóa vĩnh viễn, hãy xác thực lại tài khoản rồi quay lại bước xác nhận.",
        };
      }
      if (body?.code === "recent_auth_unavailable") {
        return {
          ok: false,
          message:
            "Chưa kiểm tra được trạng thái xác thực gần đây. Dữ liệu chưa bị xóa; hãy thử lại sau.",
        };
      }
    } catch {
      // Fall through to the bounded generic server-deletion failure below.
    }
  }

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
