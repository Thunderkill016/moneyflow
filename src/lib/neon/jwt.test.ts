import assert from "node:assert/strict";
import test from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { verifyNeonJwtClaims } from "./jwt.ts";

/*
 * Offline proof for the Bearer path's fail-closed contract (#774): a locally
 * generated EdDSA keypair stands in for the managed-auth signer and an
 * injected fetch serves its public JWKS — no network, no provider calls.
 */
const ISSUER = "https://ep-scratch.neonauth.example.aws.neon.tech";

async function makeSigner() {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
    extractable: true,
  });
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "EdDSA";
  const jwks = { keys: [jwk] };
  const fetchImpl = async () =>
    new Response(JSON.stringify(jwks), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const sign = (
    claims: Record<string, unknown>,
    opts: { iss?: string; aud?: string; exp?: string } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
      .setIssuedAt()
      .setIssuer(opts.iss ?? ISSUER)
      .setAudience(opts.aud ?? ISSUER)
      .setExpirationTime(opts.exp ?? "15m")
      .sign(privateKey);
  return { sign, fetchImpl };
}

const OPTIONS = (fetchImpl: () => Promise<Response>) => ({
  jwksUrl:
    "https://ep-scratch.neonauth.example.aws.neon.tech/.well-known/jwks.json",
  issuer: ISSUER,
  audience: ISSUER,
  fetchImpl,
});

test("accepts a correctly signed, iss/aud-pinned token", async () => {
  const { sign, fetchImpl } = await makeSigner();
  const token = await sign({ sub: "user-1", role: "authenticated" });
  const payload = await verifyNeonJwtClaims(token, OPTIONS(fetchImpl));
  assert.equal(payload?.sub, "user-1");
  assert.equal(payload?.iss, ISSUER);
});

test("rejects a token signed by a foreign key", async () => {
  const honest = await makeSigner();
  const attacker = await makeSigner();
  // Attacker signs with their own key; the resolver only knows the honest JWKS.
  const forged = await attacker.sign({ sub: "victim" });
  assert.equal(
    await verifyNeonJwtClaims(forged, OPTIONS(honest.fetchImpl)),
    null,
  );
});

test("rejects wrong issuer even when the signature is trusted", async () => {
  const { sign, fetchImpl } = await makeSigner();
  const token = await sign({ sub: "user-1" }, { iss: "https://attacker.example" });
  assert.equal(await verifyNeonJwtClaims(token, OPTIONS(fetchImpl)), null);
});

test("rejects wrong audience even when the signature is trusted", async () => {
  const { sign, fetchImpl } = await makeSigner();
  const token = await sign({ sub: "user-1" }, { aud: "https://other-api.example" });
  assert.equal(await verifyNeonJwtClaims(token, OPTIONS(fetchImpl)), null);
});

test("rejects an expired token", async () => {
  const { sign, fetchImpl } = await makeSigner();
  const token = await sign({ sub: "user-1" }, { exp: "0s" });
  // Issue time and expiry coincide; allow a tick to pass for expiry edge.
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(await verifyNeonJwtClaims(token, OPTIONS(fetchImpl)), null);
});

test("rejects a garbage token", async () => {
  const { fetchImpl } = await makeSigner();
  assert.equal(
    await verifyNeonJwtClaims("not-a-jwt", OPTIONS(fetchImpl)),
    null,
  );
});
