import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  env?: unknown;
  build?: { env?: unknown };
  buildCommand?: string;
};
const siteUrlSource = readFileSync("src/lib/site-url.ts", "utf8");
const proxySource = readFileSync("src/proxy.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const deploymentGuard = readFileSync("scripts/check-deployment-env.mjs", "utf8");

test("Vercel configuration contains behavior only, never deployment values", () => {
  assert.equal(vercelConfig.env, undefined);
  assert.equal(vercelConfig.build?.env, undefined);
  assert.equal(
    vercelConfig.buildCommand,
    "npm run check:deployment-env && npm run build",
  );
});

test("site routing code contains no project-specific deployment hostname", () => {
  assert.doesNotMatch(siteUrlSource, /\.vercel\.app|\.supabase\.co/i);
  assert.doesNotMatch(proxySource, /\.vercel\.app|\.supabase\.co/i);
  assert.match(siteUrlSource, /process\.env\.NEXT_PUBLIC_SITE_URL/);
  assert.match(siteUrlSource, /process\.env\.LEGACY_SITE_HOSTS/);
});

test("the documented and validated environment contract stays aligned", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
    "LEGACY_SITE_HOSTS",
  ]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
    assert.match(deploymentGuard, new RegExp(name));
  }
});

test("deployment validation fails instead of supplying application defaults", () => {
  assert.doesNotMatch(deploymentGuard, /mfvn|moneyflow-vn|fwpldsdkpzhswpuctbke/i);
  assert.match(deploymentGuard, /process\.exit\(1\)/);
  assert.match(deploymentGuard, /Configure deployment values in Vercel Project Settings/);
});
