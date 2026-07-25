import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync("src/lib/supabase/proxy.ts", "utf8");

test("Supabase SSR proxy propagates session refresh cache headers", () => {
  assert.match(proxySource, /setAll\(cookiesToSet, cacheHeaders\)/);
  assert.match(proxySource, /Object\.entries\(cacheHeaders\)/);
  assert.match(proxySource, /response\.headers\.set\(name, value\)/);

  const responseReset = proxySource.indexOf("response = NextResponse.next({ request })");
  const headerCopy = proxySource.indexOf("Object.entries(cacheHeaders)");
  assert.ok(responseReset >= 0, "proxy must rebuild its response after refreshing request cookies");
  assert.ok(headerCopy > responseReset, "cache headers must be copied onto the rebuilt response");
});
