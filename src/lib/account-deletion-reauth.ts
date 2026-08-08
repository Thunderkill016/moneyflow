export const ACCOUNT_DELETION_PATH = "/settings/delete-account";
export const ACCOUNT_DELETION_REAUTH_USER_COOKIE =
  "moneyflow-account-deletion-reauth-user";
export const ACCOUNT_DELETION_REAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
export const REAUTH_ACCOUNT_MISMATCH_MESSAGE =
  "Hãy xác thực lại đúng tài khoản MoneyFlow đang mở trước khi tiếp tục xóa.";

export function accountDeletionLoginUrl(): string {
  const params = new URLSearchParams({ next: ACCOUNT_DELETION_PATH });
  return `/login?${params.toString()}`;
}

export function accountDeletionReauthUrl(): string {
  const params = new URLSearchParams({
    reauth: "1",
    next: ACCOUNT_DELETION_PATH,
  });
  return `/login?${params.toString()}`;
}
