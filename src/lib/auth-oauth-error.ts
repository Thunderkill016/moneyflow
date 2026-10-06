/**
 * Vietnamese copy for OAuth failure redirects to `/login?error=<code>`.
 *
 * The auth callback (`src/app/auth/callback/route.ts`) and `signInWithGoogle`
 * redirect here when the OAuth round-trip fails (user denied consent, expired
 * code/state mismatch, provider error). The login page renders the mapped
 * message so the failure is visible instead of a silent fresh login form.
 */

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  callback:
    "Đăng nhập bằng Google thất bại. Liên kết đã hết hạn hoặc bạn đã từ chối cấp quyền — hãy thử lại.",
  oauth: "Không thể kết nối Google lúc này. Hãy thử lại sau.",
  config: "Dịch vụ đăng nhập chưa được cấu hình. Hãy thử lại sau.",
  "reauth-session":
    "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để xác thực tiếp.",
};

const DEFAULT_MESSAGE = "Đăng nhập thất bại. Hãy thử lại.";

/** Maps a `?error=` code to a user-facing Vietnamese message. */
export function oauthErrorMessage(code: string | null | undefined): string {
  if (typeof code !== "string" || code.length === 0) return DEFAULT_MESSAGE;
  return OAUTH_ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE;
}
