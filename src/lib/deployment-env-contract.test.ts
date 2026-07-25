import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const guard = readFileSync(join(root, "scripts/check-deployment-env.mjs"), "utf8");
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
  buildCommand?: string;
  env?: Record<string, string>;
  build?: { env?: Record<string, string> };
};

test("Vercel build blocks implicit mode, missing backend config and insecure callbacks", () => {
  assert.match(guard, /NEXT_PUBLIC_APP_MODE/);
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(guard, /NEXT_PUBLIC_SITE_URL/);
  assert.match(guard, /requiresHttps/);
  assert.match(guard, /siteUrl\.protocol !== "https:"/);
  assert.match(guard, /Vercel production must use NEXT_PUBLIC_APP_MODE/);
  assert.match(guard, /process\.exit\(1\)/);
  assert.equal(vercel.buildCommand, "npm run check:deployment-env && npm run build");
});

test("Vercel source config contains no canonical project URL or provider value", () => {
  assert.equal(vercel.env, undefined);
  assert.equal(vercel.build?.env, undefined);
  assert.doesNotMatch(JSON.stringify(vercel), /\.vercel\.app|\.supabase\.co/i);
});

test("deployment guard never prints environment values", () => {
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*process\.env\.NEXT_PUBLIC/);
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*publishableKey/);
});
