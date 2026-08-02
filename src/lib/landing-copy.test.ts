/**
 * Money Clarity — public landing positioning, ownership and structure contracts.
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
  "Đừng quản lý tiền bằng trí nhớ",
  "Hãy nhìn nó thành một hệ thống",
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

test("landing states the product value directly", () => {
  const source = readLandingSource();
  assert.match(source, /Nắm rõ tiền của bạn, mỗi ngày/);
  assert.match(source, /Ghi thu chi, theo dõi tài khoản và xem dòng tiền/);
  assert.match(source, /Không liên kết ngân hàng/);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one conversion CTA and one product-view CTA", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.trustRow", start);
  assert.ok(start >= 0 && end > start, "hero actions precede trust row");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="#giao-dien"/);
  assert.equal(block.includes('href="/dashboard"'), false);
  assert.equal((block.match(/href="\/register"/g) ?? []).length, 1);
});

test("landing states ownership rules honestly", () => {
  const source = readLandingSource();
  assert.match(source, /Không cần cung cấp mật khẩu ngân hàng/i);
  assert.match(source, /Xuất lịch sử ra CSV/i);
  assert.match(source, /Chuyển nội bộ không bị tính thành chi tiêu/i);
  assert.match(source, /sửa, xoá mềm và phục hồi/i);
  assert.match(source, /Bạn chủ động quyết định dữ liệu nào được ghi/i);
});

test("landing uses real product evidence instead of invented financial figures", () => {
  const source = readLandingSource();
  assert.match(source, /import Image from "next\/image"/);
  assert.match(source, /moneyflow-accounts\.svg/);
  assert.match(source, /moneyflow-quick-capture\.svg/);
  assert.match(source, /moneyflow-transactions\.svg/);
  assert.match(source, /Dữ liệu trong ảnh chỉ dùng để minh[\s\S]*hoạ/);
  assert.match(source, /styles\.benefitsGrid/);
  assert.match(source, /styles\.productStories/);
  assert.match(source, /styles\.ownershipGrid/);
  assert.equal(source.includes("₫"), false);
  assert.equal(source.includes("US$"), false);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.productPreview\b/);
  assert.match(css, /\.benefitsGrid\b/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});
