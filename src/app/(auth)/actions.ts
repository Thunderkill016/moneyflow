"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import {
  ACCOUNT_DELETION_PATH,
  ACCOUNT_DELETION_REAUTH_COOKIE_MAX_AGE_SECONDS,
  ACCOUNT_DELETION_REAUTH_USER_COOKIE,
  REAUTH_ACCOUNT_MISMATCH_MESSAGE,
} from "@/lib/account-deletion-reauth";
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
import {
  PASSWORD_MISMATCH_MESSAGE,
  passwordConfirmationMatches,
} from "@/lib/auth-password-confirmation";
import { DELETE_CONFIRM_TEXT, isDeleteConfirmValid } from "@/lib/delete-account";
import { ONBOARDING_PATH } from "@/lib/onboarding";
import { getSiteOrigin } from "@/lib/site-url";
import { getBackendProvider } from "@/lib/backend/provider";
import { getNeonAuth } from "@/lib/neon/server";
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
const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự.").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    privacyAccepted: z
      .string()
      .refine((value) => value === "1" || value === "on" || value === "true", {
        message: "Bạn cần đồng ý với chính sách quyền riêng tư.",
      }),
  })
  /*
   * The server is the authority on the confirmation match. The form checks it
   * too, but a client check alone would let a mistyped password reach Supabase
   * signUp and create an account nobody can sign in to.
   */
  .refine(
    (value) => passwordConfirmationMatches(value.password, value.confirmPassword),
    { path: ["confirmPassword"], message: PASSWORD_MISMATCH_MESSAGE },
  );
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

async function setExpectedDeletionReauthUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_DELETION_REAUTH_USER_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: ACCOUNT_DELETION_REAUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

async function clearExpectedDeletionReauthUser() {
  const cookieStore = await cookies();
  cookieStore.set(ACCOUNT_DELETION_REAUTH_USER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 0,
    expires: new Date(0),
  });
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

  const nextPath = safeNextPath(
    String(formData.get("next") ?? ""),
    POST_AUTH_REDIRECT,
  );
  const reauth =
    formData.get("reauth") === "1" && nextPath === ACCOUNT_DELETION_PATH;

  /*
   * Neon backend (#774): managed Better Auth email sign-in. Sign-in must
   * resolve through getNeonAuth() alone — the data client requires an
   * existing session JWT, which a logged-out user does not have by
   * definition. The step-up re-auth flow for account deletion has no Neon
   * equivalent yet — the deletion path itself is still Supabase-only (see
   * finalizeAccountDeletion and the migration packet's deletion design).
   */
  if (getBackendProvider() === "neon") {
    const auth = getNeonAuth();
    if (!auth) return configurationError();
    const { error: neonError } = await auth.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (neonError) return { message: "Email hoặc mật khẩu không đúng." };
    redirect(nextPath);
  }

  const supabase = await createClient();
  if (!supabase) return configurationError();

  let expectedReauthUserId: string | null = null;
  if (reauth) {
    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabase.auth.getUser();
    if (currentUserError || !currentUser) {
      return {
        message:
          "Phiên đăng nhập đã hết hạn. Hãy đăng nhập bình thường rồi mở lại bước xóa tài khoản.",
      };
    }
    if (
      !currentUser.email ||
      currentUser.email.trim().toLowerCase() !== parsed.data.email
    ) {
      return { message: REAUTH_ACCOUNT_MISMATCH_MESSAGE };
    }
    expectedReauthUserId = currentUser.id;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: captcha.token ? { captchaToken: captcha.token } : undefined,
  });
  if (isCaptchaError(error)) return captchaFailure();
  if (error) return { message: "Email hoặc mật khẩu không đúng." };

  if (expectedReauthUserId && data.user?.id !== expectedReauthUserId) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: REAUTH_ACCOUNT_MISMATCH_MESSAGE };
  }

  redirect(nextPath);
}

export async function register(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword") ?? "",
    privacyAccepted: formData.get("privacyAccepted") ?? "",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const captcha = readCaptchaToken(formData);
  if (!captcha.ok) return captcha.state;

  const nextPath = safeNextPath(
    String(formData.get("next") ?? ""),
    ONBOARDING_PATH,
  );

  /*
   * Neon backend (#774): managed Better Auth sign-up provisions
   * neon_auth."user" (uuid) and auto-signs-in; the profile/category trigger
   * migrated in db/neon supplies the same onboarding state Supabase's
   * auth.users trigger does today.
   */
  if (getBackendProvider() === "neon") {
    const auth = getNeonAuth();
    if (!auth) return configurationError();
    const { error: neonError } = await auth.signUp.email({
      email: parsed.data.email,
      name: parsed.data.fullName,
      password: parsed.data.password,
    });
    if (neonError) {
      // Same non-enumerating response as the Supabase path.
      return {
        message:
          "Không thể tạo tài khoản lúc này. Kiểm tra thông tin hoặc thử lại sau.",
      };
    }
    redirect(nextPath);
  }

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
  const reauth =
    formData?.get("reauth") === "1" && nextPath === ACCOUNT_DELETION_PATH;

  /*
   * Neon backend (#774): managed Better Auth social sign-in. The step-up
   * re-auth flow has no Neon equivalent — fail closed rather than silently
   * degrading a deletion guard into a plain sign-in.
   */
  if (getBackendProvider() === "neon") {
    if (reauth) {
      redirect(
        `/login?next=${encodeURIComponent(nextPath)}&error=reauth-unsupported`,
      );
    }
    const auth = getNeonAuth();
    if (!auth) redirect("/login?error=config");
    const { data, error } = await auth.signIn.social({
      provider: "google",
      callbackURL: `${getSiteOrigin()}${nextPath}`,
      errorCallbackURL: `${getSiteOrigin()}/login?error=oauth`,
    });
    if (error || !data?.url) redirect("/login?error=oauth");
    redirect(data.url);
  }

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=config");

  if (reauth) {
    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabase.auth.getUser();
    if (currentUserError || !currentUser) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}&error=reauth-session`);
    }
    await setExpectedDeletionReauthUser(currentUser.id);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}${reauth ? "&reauth=1" : ""}`,
      ...(reauth ? { queryParams: { max_age: "0" } } : {}),
    },
  });
  if (error || !data.url) {
    if (reauth) await clearExpectedDeletionReauthUser();
    redirect("/login?error=oauth");
  }
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

  /*
   * Neon backend (#774): managed Better Auth reset-request. Response stays
   * identical whether the email exists or delivery is configured — upstream
   * errors are intentionally swallowed for the same non-enumerating contract
   * as the Supabase path. Whether the managed service can actually deliver
   * mail is a tracked cutover blocker, not an app-side guarantee.
   */
  if (getBackendProvider() === "neon") {
    const auth = getNeonAuth();
    if (!auth) return configurationError();
    await auth.requestPasswordReset({
      email: parsed.data,
      redirectTo: `${getSiteOrigin()}/update-password`,
    });
    return {
      success: true,
      message:
        "Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu.",
    };
  }

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

  /*
   * Neon backend (#774): managed Better Auth reset completion. The token
   * arrives on /update-password?token=… from the upstream reset link —
   * without it the request cannot be bound to a reset grant, so fail to the
   * expired-link path instead of attempting anything.
   */
  if (getBackendProvider() === "neon") {
    const token = String(formData.get("token") ?? "");
    const auth = getNeonAuth();
    if (!auth) return configurationError();
    if (!token) {
      return {
        message: "Liên kết đã hết hạn. Hãy yêu cầu một liên kết mới.",
      };
    }
    const { error: neonError } = await auth.resetPassword({
      newPassword: parsed.data,
      token,
    });
    if (neonError) {
      return {
        message: "Liên kết đã hết hạn. Hãy yêu cầu một liên kết mới.",
      };
    }
    /*
     * Better Auth's reset-password does not guarantee an authenticated
     * session afterwards — send the user to an explicit sign-in rather
     * than dropping them onto a protected route they cannot see.
     */
    redirect("/login?reset=success");
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
  /*
   * Neon backend (#774): the SDK's signOut clears the upstream session and
   * both neon-auth cookies; nothing else must be swept locally.
   */
  if (getBackendProvider() === "neon") {
    try {
      await getNeonAuth()?.signOut();
    } catch {
      // Stale or already-deleted sessions can reject server-side sign-out.
    }
    revalidatePath("/", "layout");
    redirect("/login");
  }

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
      requiresLogin?: false;
    }
  | {
      ok: false;
      message: string;
      requiresReauthentication: true;
      requiresLogin?: false;
    }
  | {
      ok: false;
      message: string;
      requiresReauthentication?: false;
      requiresLogin: true;
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

  /*
   * Neon backend (#774): managed-auth user deletion (plus tenant cleanup)
   * is not implemented on the Neon path — fail closed with an honest
   * message rather than surfacing a misleading configuration error or
   * attempting partial deletion.
   */
  if (getBackendProvider() === "neon") {
    return {
      ok: false,
      message:
        "Xóa tài khoản chưa được hỗ trợ trên bản thử Neon. Dữ liệu chưa bị thay đổi.",
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
      requiresLogin: true,
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