import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const guard = readFileSync(join(root, "scripts/check-deployment-env.mjs"), "utf8");
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
  buildCommand?: string;
};

test("Vercel build blocks silent demo fallback", () => {
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(guard, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(guard, /Authenticated deployment blocked/);
  assert.match(vercel.buildCommand ?? "", /check-deployment-env\.mjs/);
});

test("deployment guard never prints environment values", () => {
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*required/);
  assert.doesNotMatch(guard, /console\.(?:log|error)\([^\n]*process\.env\.NEXT_PUBLIC/);
});
