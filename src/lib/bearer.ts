/**
 * Extracts the credential from an HTTP `Authorization` header value.
 * Returns null when the header is absent, uses a scheme other than Bearer,
 * or carries anything other than exactly one credential — callers treat a
 * malformed header as "no token", never as a token.
 */
export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const parts = authorization.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1] || null;
}
