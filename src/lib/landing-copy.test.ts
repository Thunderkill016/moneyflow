/**
 * Signal Ledger — public landing positioning, ownership and structure contracts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const LANDING_SOURCE_PATH = join(
  process.cwd(),
  "src/components/landing-page.tsx",
);
const LANDING_CSS_PATH = join(
  process.cwd(),
  "src/components/landing-page.module.css",
);

const FORBIDDEN_LANDING_PHRASES = [
  "Hộp thư cho mọi giao dịch",
  "Universal Financial Inbox",
  "có thể chi hôm nay",
  "người dùng tin tưởng",
  "tiết kiệm trung bình",
] as const;

function readLandingSource(): string {
  return readFileSync(LANDING_SOURCE_PATH, "utf8");
}

function readLandingCss(): string {
  return readFileSync(LANDING_CSS_PATH, "utf8");
}

test("landing source exists and remains a Server Component", () => {
  const source = readLandingSource();
  assert.ok(source.length > 100, "landing-page.tsx should have content");
  assert.match(source, /export function LandingPage/);
  assert.equal(/^\s*["']use client["']/.test(source), false);
});

test("landing positions MoneyFlow as an owner-controlled financial system", () => {
  const source = readLandingSource();
  assert.match(source, /Đừng quản lý tiền bằng trí nhớ/);
  assert.match(source, /Hãy nhìn nó thành một hệ thống/);
  assert.match(source, /Không liên kết ngân hàng/);
  assert.match(source, /bạn chủ động ghi hoặc xác nhận/);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one conversion CTA and one in-page explainer CTA", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.trustRow", start);
  assert.ok(start >= 0 && end > start, "hero actions precede trust row");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="#san-pham"/);
  assert.equal(block.includes('href="/dashboard"'), false);
  assert.equal((block.match(/href="\/register"/g) ?? []).length, 1);
});

test("landing states the financial and ownership rules honestly", () => {
  const source = readLandingSource();
  assert.match(source, /không yêu cầu mật khẩu ngân hàng/i);
  assert.match(source, /xuất CSV/i);
  assert.match(source, /Chuyển nội bộ[\s\S]*tổng thu và tổng chi không bị phóng đại/i);
  assert.match(source, /không cố thay bạn ra quyết định/i);
  assert.match(source, /sửa và phục hồi/i);
});

test("landing includes product stage, decision hierarchy, workflow and FAQ", () => {
  const source = readLandingSource();
  assert.match(source, /styles\.productStage/);
  assert.match(source, /styles\.signalStrip/);
  assert.match(source, /styles\.clarityGrid/);
  assert.match(source, /styles\.workflowList/);
  assert.match(source, /styles\.principlesGrid/);
  assert.match(source, /id="faq-title"/);
  assert.match(source, /<details key=\{item\.question\}>/);
  assert.equal(source.includes("Monarch"), false);
});

test("landing preserves Thu, Chi and Chuyển semantics", () => {
  const source = readLandingSource();
  assert.match(source, /Thu tháng này/);
  assert.match(source, /Chi tháng này/);
  assert.match(source, /Chuyển nội bộ được ghi thành một luồng riêng/);
  assert.match(source, /tổng thu và tổng chi không bị phóng đại/);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.productStage\b/);
  assert.match(css, /\.signalStrip\b/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});
