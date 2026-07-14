/**
 * TASK-113 — Demo mode sticky banner in AppShell when viewer.isDemo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SHELL_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.tsx",
);
const CSS_PATH = join(process.cwd(), "src/app/globals.css");

function shell(): string {
  return readFileSync(SHELL_PATH, "utf8");
}

function css(): string {
  return readFileSync(CSS_PATH, "utf8");
}

test("AppShell shows demo banner only when viewer.isDemo", () => {
  const source = shell();
  assert.match(source, /viewer\.isDemo\s*\?/);
  assert.match(source, /className="banner-alert info demo-mode-banner"/);
  assert.ok(
    source.includes("Chế độ demo — dữ liệu lưu trên trình duyệt"),
    "expected sticky demo copy",
  );
  assert.match(source, /href="\/register"/);
  assert.match(source, /Đăng ký/);
});

test("demo banner CSS is sticky under topbar", () => {
  const source = css();
  assert.match(source, /\.demo-mode-banner\s*\{/);
  assert.match(source, /position:\s*sticky/);
  assert.match(source, /\.demo-mode-banner-cta\s*\{/);
});
