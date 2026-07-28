import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("PWA manifest is G5 thu chi (not inbox-first brand)", () => {
  const source = readFileSync(join(root, "src/app/manifest.ts"), "utf8");
  assert.match(source, /start_url:\s*["']\/dashboard["']/);
  assert.match(source, /thu chi/i);
  assert.doesNotMatch(source, /Hộp thư giao dịch/);
  assert.doesNotMatch(source, /start_url:\s*["']\/inbox["']/);
});
