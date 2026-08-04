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
  assert.match(source, /Từ lúc ghi đến lúc hiểu tiền của mình/);
  assert.match(source, /vừa ghi gì/);
  assert.match(source, /tài khoản\s+nào thay đổi/);
  assert.match(source, /con số đó đến từ đâu/);
  assert.match(source, /không cần liên kết ngân hàng/i);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one conversion CTA and one workflow CTA", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.trustRow", start);
  assert.ok(start >= 0 && end > start, "hero actions precede trust row");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="#cach-hoat-dong"/);
  assert.equal(block.includes('href="/dashboard"'), false);
  assert.equal((block.match(/href="\/register"/g) ?? []).length, 1);
});

test("landing states ownership and accounting boundaries honestly", () => {
  const source = readLandingSource();
  assert.match(source, /Không cần mật khẩu ngân hàng/i);
  assert.match(source, /Xuất lịch sử giao dịch ra CSV/i);
  assert.match(source, /Chuyển nội bộ không bị tính thành chi tiêu/i);
  assert.match(source, /sửa và phục hồi/i);
  assert.match(source, /Bạn quyết định dữ liệu nào được ghi/i);
});

test("landing uses real product evidence as one guided workflow", () => {
  const source = readLandingSource();
  assert.match(source, /import Image from "next\/image"/);
  assert.match(source, /moneyflow-accounts\.svg/);
  assert.match(source, /moneyflow-quick-capture\.svg/);
  assert.match(source, /moneyflow-transactions\.svg/);
  assert.match(source, /Giao diện thật từ môi trường kiểm thử/);
  assert.match(source, /styles\.storySection/);
  assert.match(source, /styles\.storyList/);
  assert.match(source, /styles\.storyBand/);
  assert.match(source, /styles\.storyFigure/);
  assert.match(source, /styles\.controlGrid/);
  assert.doesNotMatch(source, /styles\.proofStage/);
  assert.equal(source.includes("₫"), false);
  assert.equal(source.includes("US$"), false);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.storySection\b/);
  assert.match(css, /\.storyBand\b/);
  assert.match(css, /\.storyFigure\b/);
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
