import assert from "node:assert/strict";
import test from "node:test";
import {
  SiteConfigurationError,
  hostWithoutPort,
  isLegacySiteHost,
  normalizeSiteOrigin,
  parseLegacySiteHosts,
  resolveSiteOrigin,
} from "./site-url.ts";

test("production uses the configured HTTPS origin without product-specific fallbacks", () => {
  assert.equal(
    resolveSiteOrigin("https://finance.example.com", "production"),
    "https://finance.example.com",
  );
});

test("missing, malformed or insecure production origins fail fast", () => {
  assert.throws(() => resolveSiteOrigin(undefined, "production"), SiteConfigurationError);
  assert.throws(() => resolveSiteOrigin("not-a-url", "production"), SiteConfigurationError);
  assert.throws(
    () => resolveSiteOrigin("http://finance.example.com", "production"),
    SiteConfigurationError,
  );
});

test("development accepts an explicitly configured HTTP origin but never invents one", () => {
  assert.equal(
    resolveSiteOrigin("http://localhost:4000", "development"),
    "http://localhost:4000",
  );
  assert.throws(() => resolveSiteOrigin(undefined, "development"), SiteConfigurationError);
});

test("legacy hostname migration is supplied as deployment configuration", () => {
  const hosts = parseLegacySiteHosts(
    "old.example.com, older.example.com\nold.example.com",
  );
  assert.deepEqual(hosts, ["old.example.com", "older.example.com"]);
  assert.equal(isLegacySiteHost("old.example.com:443, proxy.internal", hosts), true);
  assert.equal(isLegacySiteHost("finance.example.com", hosts), false);
  assert.equal(hostWithoutPort("old.example.com:443"), "old.example.com");
});

test("origin normalization rejects paths, credentials and non-http protocols", () => {
  assert.equal(normalizeSiteOrigin("https://finance.example.com"), "https://finance.example.com");
  assert.equal(normalizeSiteOrigin("https://finance.example.com/path"), null);
  assert.equal(normalizeSiteOrigin("ftp://finance.example.com"), null);
  assert.equal(normalizeSiteOrigin("https://user:pass@finance.example.com"), null);
});
