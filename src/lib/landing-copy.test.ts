/**
 * Public landing positioning, ownership and traceability contracts.
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
const RESEARCH_PATH = join(
  process.cwd(),
  "docs/design/PUBLIC_EXPERIENCE_RESEARCH_2026.md",
);

const FORBIDDEN_LANDING_PHRASES = [
  "Hộp thư cho mọi giao dịch",
  "Universal Financial Inbox",
  "có thể chi hôm nay",
  "người dùng tin tưởng",
  "tiết kiệm trung bình",
  "Đừng quản lý tiền bằng trí nhớ",
  "Hãy nhìn nó thành một hệ thống",
  "Nắm rõ tiền của bạn, mỗi ngày",
  "Nâng tầm tài chính",
  "Làm chủ tương lai",
  "AI-powered finance",
  "Cách mạng hóa tài chính",
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

test("landing states a specific guided and traceable product promise", () => {
  const source = readLandingSource();
  const compact = source.replace(/\s+/gu, " ");
  assert.match(compact, /Biết tiền của bạn đang ở đâu/);
  assert.match(compact, /Sổ tài chính cá nhân của bạn/);
  assert.match(compact, /Một nơi để biết điều gì đã xảy ra với tiền của bạn/);
  assert.match(compact, /không cần liên kết ngân hàng/i);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one conversion CTA and secondary login action", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.trustLine", start);
  assert.ok(start >= 0 && end > start, "hero actions precede trust line");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="\/login"/);
  assert.equal(block.includes('href="/dashboard"'), false);
});

test("landing states ownership and accounting boundaries honestly", () => {
  const source = readLandingSource();
  assert.match(source, /Không quảng cáo tài chính/i);
  assert.match(source, /Xuất toàn bộ.*CSV/i);
  assert.match(source, /Chuyển nội bộ không bị tính thành chi tiêu/i);
  assert.match(source, /Dữ liệu của bạn\. Sổ của bạn/i);
  assert.match(source, /chênh lệch bằng đúng 0 ₫/i);
});

test("landing uses authentic product evidence with integer VND numbers", () => {
  const source = readLandingSource();
  assert.match(source, /\+ 32\.000\.000 ₫/);
  assert.match(source, /− 18\.450\.000 ₫/);
  assert.match(source, /Techcombank Inspire Pay/);
  assert.match(source, /Giao diện thật từ môi trường kiểm thử/);
  assert.match(source, /Ghi một khoản chi trước khi bạn quên nó/);
  assert.match(source, /Tiền của bạn nên dễ hiểu hơn/);
});

test("landing uses bento grid layout with modular feature tiles", () => {
  const css = readLandingCss();
  assert.match(css, /\.bentoSection\b/);
  assert.match(css, /\.bentoGrid\b/);
  assert.match(css, /\.bentoTile\b/);
  assert.match(css, /\.bentoA\b/);
  assert.match(css, /\.bentoB\b/);
  assert.match(css, /\.bentoC\b/);
  assert.match(css, /\.bentoD\b/);
  assert.match(css, /\.bentoE\b/);
  assert.match(css, /\.bentoF\b/);

  const source = readLandingSource();
  assert.match(source, /styles\.bentoSection/);
  assert.match(source, /styles\.bentoGrid/);
  assert.match(source, /styles\.bentoTile/);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.productWindow\b/);
  assert.match(css, /\.bentoSection\b/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});

test("public redesign is grounded in an explicit competitor research brief", () => {
  const research = readFileSync(RESEARCH_PATH, "utf8");
  assert.match(research, /Money Lover/);
  assert.match(research, /MISA MoneyKeeper/);
  assert.match(research, /Copilot Money/);
  assert.match(research, /Monarch Money/);
  assert.match(research, /YNAB/);
  assert.match(research, /Actual Budget/);
  assert.match(research, /Biết tiền đang ở đâu\. Biết vì sao nó thay đổi\./);
});
