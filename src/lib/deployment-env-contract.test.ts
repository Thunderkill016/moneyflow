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

const PRODUCTION_SITE_URL = "https://moneyflow-vn.vercel.app";

test("Vercel build blocks silent demo fallback and localhost callbacks", () => {
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(guard, /NEXT_PUBLIC_SITE_URL/);
  assert.match(guard, /parsed\.protocol !== "https:"/);
  assert.match(guard, /parsed\.hostname === "localhost"/);
  assert.match(guard, /Authenticated deployment blocked/);
  assert.match(vercel.buildCommand ?? "", /check-deployment-env\.mjs/);
});

test("Vercel uses one canonical HTTPS production origin for auth callbacks", () => {
  assert.equal(vercel.env?.NEXT_PUBLIC_SITE_URL, PRODUCTION_SITE_URL);
  assert.equal(vercel.build?.env?.NEXT_PUBLIC_SITE_URL, PRODUCTION_SITE_URL);
  assert.doesNotMatch(PRODUCTION_SITE_URL, /localhost|127\.0\.0\.1/);
});

test("deployment guard never prints environment values", () => {
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*required/);
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*process\.env\.NEXT_PUBLIC/);
});
