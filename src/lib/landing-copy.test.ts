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
  "Biết tiền đang ở đâu. Biết vì sao nó thay đổi.",
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

test("landing uses natural Vietnamese and a specific product promise", () => {
  const source = readLandingSource();
  assert.match(source, /Ghi một lần\./);
  assert.match(source, /Cuối tháng khỏi đoán\./);
  assert.match(source, /Mỗi khoản thu, chi hay chuyển tiền đều nằm đúng tài khoản/);
  assert.match(source, /Cần kiểm tra khoản nào thì mở lại khoản đó/);
  assert.match(source, /MoneyFlow không cần mật khẩu ngân hàng/);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one primary registration action and a returning-user route", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.heroNote", start);
  assert.ok(start >= 0 && end > start, "hero actions precede the factual note");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="\/login"/);
  assert.equal(block.includes('href="/dashboard"'), false);
  assert.equal((block.match(/href="\/register"/g) ?? []).length, 1);
  assert.equal((block.match(/href="\/login"/g) ?? []).length, 1);
});

test("landing states ownership and accounting boundaries honestly", () => {
  const source = readLandingSource();
  assert.match(source, /Chuyển nội bộ không tính vào chi tiêu/i);
  assert.match(source, /Có thể sửa, phục hồi/i);
  assert.match(source, /xuất lịch sử giao dịch ra CSV/i);
  assert.match(source, /Bạn quyết định khoản nào được ghi/i);
  assert.match(source, /Không liên kết tài khoản ngân hàng/i);
});

test("landing renders a MoneyFlow-specific ledger instead of generic icon cards", () => {
  const source = readLandingSource();
  assert.doesNotMatch(source, /next\/image/);
  assert.doesNotMatch(source, /lucide-react/);
  assert.match(source, /styles\.ledgerDemo/);
  assert.match(source, /styles\.entryList/);
  assert.match(source, /styles\.questionList/);
  assert.match(source, /Dữ liệu minh hoạ/);
  assert.match(source, /\+15\.000\.000 ₫/);
  assert.match(source, /Chuyển sang ví chi tiêu/);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /\.hero\b/);
  assert.match(css, /\.ledgerDemo\b/);
  assert.match(css, /\.questionList\b/);
  assert.match(css, /\.flowTrack\b/);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});

test("public redesign remains grounded in the explicit competitor research brief", () => {
  const research = readFileSync(RESEARCH_PATH, "utf8");
  assert.match(research, /Money Lover/);
  assert.match(research, /MISA MoneyKeeper/);
  assert.match(research, /Copilot Money/);
  assert.match(research, /Monarch Money/);
  assert.match(research, /YNAB/);
  assert.match(research, /Actual Budget/);
});
