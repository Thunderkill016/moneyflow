/**
 * Registration password confirmation.
 *
 * Pure so the rule can be tested directly. `actions.ts` cannot be imported by a
 * unit test — it pulls in `next/cache`, `next/headers` and `next/navigation` —
 * so keeping the decision here is what makes "a mismatch never reaches Supabase"
 * an assertion rather than a claim.
 */

export const PASSWORD_MISMATCH_MESSAGE = "Hai mật khẩu chưa khớp." as const;

/**
 * True only when the confirmation reproduces the password exactly.
 *
 * Deliberately an exact comparison: no trimming and no case folding, because
 * both are legal password characters and "helpfully" normalising here would
 * accept a confirmation that does not match what gets stored.
 */
export function passwordConfirmationMatches(
  password: unknown,
  confirmPassword: unknown,
): boolean {
  return typeof password === "string" && typeof confirmPassword === "string" && password === confirmPassword;
}
