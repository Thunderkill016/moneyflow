/*
 * Write-capability client policy (617 spec, S7).
 *
 * First-party callers (cookie session or own-session Bearer token — no
 * `client_id` claim) may always propose candidates: they are the user acting
 * through MoneyFlow itself.
 *
 * Third-party OAuth clients must be explicitly allowlisted via
 * CAPABILITY_WRITE_CLIENT_IDS (comma-separated client ids). Supabase OAuth
 * scopes are fixed (openid/profile/email/phone/offline_access) so per-client
 * write narrowing has to live here. Unset/empty env = deny all third-party
 * writes — fail closed.
 */
export function isWriteClientAllowed(clientId: string | null): boolean {
  if (clientId === null) return true;
  const allowlist = (process.env.CAPABILITY_WRITE_CLIENT_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return allowlist.includes(clientId);
}
