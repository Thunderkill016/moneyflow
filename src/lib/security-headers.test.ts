import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync("next.config.ts", "utf8");

test("all routes deny framing and unsafe browser capabilities", () => {
  assert.match(config, /source:\s*"\/:path\*"/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /base-uri 'self'/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /X-Frame-Options[\s\S]*DENY/);
  assert.match(config, /X-Content-Type-Options[\s\S]*nosniff/);
  assert.match(config, /Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  assert.match(config, /Permissions-Policy[\s\S]*camera=\(\), microphone=\(\), geolocation=\(\)/);
});
