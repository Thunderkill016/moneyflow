/**
 * Calm Ledger — public landing positioning and structure contracts.
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
  "có thể chi",
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

test("landing positions MoneyFlow as a trustworthy manual-first ledger", () => {
  const source = readLandingSource();
  assert.match(source, /Không cần liên kết ngân hàng/);
  assert.match(source, /Sổ thu chi do chính tay bạn kiểm soát/);
  assert.match(source, /bạn chủ động\s+nhập/);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one conversion CTA and one in-page explainer CTA", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.trustList", start);
  assert.ok(start >= 0 && end > start, "hero actions precede trust list");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="#cach-hoat-dong"/);
  assert.equal(block.includes('href="/dashboard"'), false);
});

test("landing states the financial and ownership rules honestly", () => {
  const source = readLandingSource();
  assert.match(source, /không.*(liên kết|đăng nhập).*ngân hàng/i);
  assert.match(source, /ra CSV/);
  assert.match(source, /chuyển nội bộ[\s\S]*tách hẳn khỏi tổng thu và tổng chi/);
  assert.match(source, /không suy diễn một con số chi tiêu an toàn/);
  assert.match(source, /chính xác đến từng đồng/);
});

test("landing includes full product preview, workflow, benefits and FAQ", () => {
  const source = readLandingSource();
  assert.match(source, /styles\.previewWrap/);
  assert.match(source, /styles\.proof/);
  assert.match(source, /from "@\/components\/ui\/card"/);
  assert.match(source, /id="faq-title"/);
  assert.match(source, /from "@\/components\/ui\/accordion"/);
  assert.equal(source.includes("Monarch"), false);
});

test("landing preview preserves Thu, Chi and Chuyển semantics", () => {
  const source = readLandingSource();
  assert.match(source, /Thu tháng này/);
  assert.match(source, /Chi tháng này/);
  assert.match(source, /Chuyển nội bộ · không tính thu chi/);
  assert.match(source, /↔ 2\.000\.000 ₫/);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.previewWrap\b/);
  assert.match(css, /\.proof\b/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});
