import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_SITE_ORIGIN,
  hostWithoutPort,
  isLegacySiteHost,
  normalizeSiteOrigin,
  resolveSiteOrigin,
} from "./site-url.ts";

test("production replaces the retired MoneyFlow hostname", () => {
  assert.equal(
    resolveSiteOrigin("https://moneyflow-vn.vercel.app", "production"),
    CANONICAL_SITE_ORIGIN,
  );
  assert.equal(resolveSiteOrigin(undefined, "production"), CANONICAL_SITE_ORIGIN);
});

test("production keeps a valid canonical or future custom origin", () => {
  assert.equal(
    resolveSiteOrigin("https://mfvn.vercel.app/old/path", "production"),
    CANONICAL_SITE_ORIGIN,
  );
  assert.equal(
    resolveSiteOrigin("https://money.example.vn/path", "production"),
    "https://money.example.vn",
  );
});

test("development accepts a configured local origin and has a safe fallback", () => {
  assert.equal(resolveSiteOrigin("http://localhost:4000/path", "development"), "http://localhost:4000");
  assert.equal(resolveSiteOrigin(undefined, "development"), "http://localhost:3000");
});

test("legacy hostname detection ignores ports and forwarded-host suffixes", () => {
  assert.equal(hostWithoutPort("moneyflow-vn.vercel.app:443"), "moneyflow-vn.vercel.app");
  assert.equal(isLegacySiteHost("moneyflow-vn.vercel.app:443, proxy.internal"), true);
  assert.equal(isLegacySiteHost("mfvn.vercel.app"), false);
});

test("origin normalization rejects malformed or credentialed URLs", () => {
  assert.equal(normalizeSiteOrigin("not-a-url"), null);
  assert.equal(normalizeSiteOrigin("ftp://mfvn.vercel.app"), null);
  assert.equal(normalizeSiteOrigin("https://user:pass@mfvn.vercel.app"), null);
});
