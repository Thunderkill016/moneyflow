import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  capabilityAnonRateKey,
  capabilityApiRateKey,
} from "./rate-limit.ts";

const root = process.cwd();
const route = readFileSync(
  join(root, "src/app/api/capabilities/[id]/route.ts"),
  "utf8",
);
const supabaseServer = readFileSync(
  join(root, "src/lib/supabase/server.ts"),
  "utf8",
);
const auth = readFileSync(join(root, "src/server/auth.ts"), "utf8");

test("capability API route authenticates through the shared viewer seam", () => {
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /viewer\.isDemo/);
  assert.match(route, /www-authenticate/);
  assert.match(route, /runCapability\(id, input/);
  assert.match(route, /buildCapabilityContext\(viewer\.id\)/);
  assert.doesNotMatch(route, /requireViewer|serviceRole|SERVICE_ROLE_KEY/);
});

test("capability API route maps errors to codes, never payload detail", () => {
  assert.match(route, /invalid_json/);
  assert.match(route, /invalid_input/);
  assert.match(route, /not_found/);
  assert.match(route, /rate_limited/);
  assert.match(route, /retry-after/);
  assert.match(route, /cache-control": "no-store/);
});

test("Bearer credential flows through the single auth seam", () => {
  assert.match(supabaseServer, /bearerToken\(headerStore\.get\("authorization"\)\)/);
  assert.match(supabaseServer, /global: \{ headers: \{ Authorization: `Bearer \$\{token\}` \} \}/);
  assert.match(supabaseServer, /persistSession: false/);
  assert.match(auth, /supabase\.auth\.getClaims\(bearer\)/);
  assert.doesNotMatch(supabaseServer, /serviceRole|SERVICE_ROLE_KEY/);
});

test("capability rate keys are stable, namespaced and bounded", () => {
  assert.equal(capabilityApiRateKey("user-1"), "capability:user-1");
  assert.equal(capabilityApiRateKey(""), "capability:unknown");
  assert.equal(capabilityAnonRateKey("1.2.3.4"), "capability-anon:1.2.3.4");
  assert.equal(capabilityAnonRateKey(""), "capability-anon:unknown");
  const long = "x".repeat(200);
  assert.ok(capabilityApiRateKey(long).length <= "capability:".length + 80);
  assert.ok(capabilityAnonRateKey(long).length <= "capability-anon:".length + 80);
});
