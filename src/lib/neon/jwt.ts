import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTPayload,
} from "jose";

/*
 * Pure Neon JWT verification core (#774), kept free of server-only/Next
 * imports so it is unit-testable offline. The server seam supplies the
 * managed-auth origin as both issuer and audience (verified on the scratch
 * project: iss == aud == auth origin, EdDSA, 900s TTL).
 */
export type NeonJwtVerifyOptions = {
  jwksUrl: string;
  issuer: string;
  audience: string;
  /** Injectable for tests; jose calls it with (url, {headers, method, redirect, signal}). */
  fetchImpl?: (
    url: string,
    options: {
      headers: Headers;
      method: "GET";
      redirect: "manual";
      signal: AbortSignal;
    },
  ) => Promise<Response>;
};

/** Verifies a managed-Auth JWT; returns claims or null on any failure. */
export async function verifyNeonJwtClaims(
  token: string,
  options: NeonJwtVerifyOptions,
): Promise<JWTPayload | null> {
  const jwks = createRemoteJWKSet(new URL(options.jwksUrl), {
    [customFetch]: options.fetchImpl,
  });
  try {
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["EdDSA"],
      issuer: options.issuer,
      audience: options.audience,
    });
    return payload;
  } catch {
    return null;
  }
}
