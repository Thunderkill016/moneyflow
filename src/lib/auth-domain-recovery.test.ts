import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/app/(auth)/actions.ts", "utf8");
const proxy = readFileSync("src/proxy.ts", "utf8");

test("OAuth, signup and recovery use the configured site origin helper", () => {
  assert.match(actions, /import \{ getSiteOrigin \} from "@\/lib\/site-url"/);
  assert.match(actions, /redirectTo: `\$\{getSiteOrigin\(\)\}\/auth\/callback/);
  assert.match(actions, /emailRedirectTo: `\$\{getSiteOrigin\(\)\}\/auth\/callback/);
  assert.doesNotMatch(actions, /function siteUrl\(/);
});

test("logout always removes the local Supabase session", () => {
  assert.match(actions, /signOut\(\{ scope: "local" \}\)/);
  assert.match(actions, /cookieStore\.delete\(cookie\.name\)/);
  assert.match(actions, /revalidatePath\("\/", "layout"\)/);
});

test("legacy host migration uses environment configuration and expires stale auth cookies", () => {
  assert.match(proxy, /getLegacySiteHosts/);
  assert.match(proxy, /getSiteOrigin/);
  assert.match(proxy, /isLegacySiteHost\(host, getLegacySiteHosts\(\)\)/);
  assert.doesNotMatch(proxy, /CANONICAL_SITE_ORIGIN|LEGACY_SITE_HOST/);
  assert.match(proxy, /status = request\.method === "GET" \|\| request\.method === "HEAD" \? 308 : 303/);
  assert.match(proxy, /maxAge: 0/);
  assert.match(proxy, /Cache-Control", "private, no-store"/);
});
