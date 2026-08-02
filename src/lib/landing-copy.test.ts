/**
 * Public landing positioning, ownership and reference-led composition contracts.
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
  "docs/research/PUBLIC_ENTRY_REFERENCE_STUDY_2026-08.md",
);

const FORBIDDEN_LANDING_PHRASES = [
  "Hộp thư cho mọi giao dịch",
  "Universal Financial Inbox",
  "có thể chi hôm nay",
  "Đừng quản lý tiền bằng trí nhớ",
  "Hãy nhìn nó thành một hệ thống",
  "Biết tiền đang ở đâu",
  "Biết vì sao nó thay đổi",
  "Ghi một lần",
  "Cuối tháng khỏi đoán",
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

test("landing opens with a direct Vietnamese product statement", () => {
  const source = readLandingSource();
  assert.match(source, /Ghi thu chi, xem tiền còn ở đâu\./);
  assert.match(source, /ghi từng khoản thu, chi và chuyển tiền theo đúng/);
  assert.match(source, /tìm lại, sửa hoặc xuất dữ liệu/);
  for (const phrase of FORBIDDEN_LANDING_PHRASES) {
    assert.equal(source.includes(phrase), false, `forbidden: ${phrase}`);
  }
});

test("hero has one account-creation action and one sign-in action", () => {
  const source = readLandingSource();
  const start = source.indexOf("styles.heroActions");
  const end = source.indexOf("styles.heroNote", start);
  assert.ok(start >= 0 && end > start, "hero actions should precede hero note");
  const block = source.slice(start, end);
  assert.match(block, /href="\/register"/);
  assert.match(block, /href="\/login"/);
  assert.equal(block.includes('href="/dashboard"'), false);
  assert.equal((block.match(/href="\/register"/g) ?? []).length, 1);
});

test("landing states MoneyFlow boundaries honestly", () => {
  const source = readLandingSource();
  assert.match(source, /Không cần liên kết ngân hàng/i);
  assert.match(source, /Chuyển tiền giữa hai tài khoản không bị tính thành chi tiêu/i);
  assert.match(source, /sửa, xoá mềm và phục hồi/i);
  assert.match(source, /xuất lịch sử giao dịch ra CSV/i);
  assert.match(source, /MoneyFlow không cần mật khẩu ngân hàng/i);
});

test("landing uses one real product screen per user job", () => {
  const source = readLandingSource();
  assert.match(source, /import Image from "next\/image"/);
  assert.match(source, /moneyflow-quick-capture\.svg/);
  assert.match(source, /moneyflow-accounts\.svg/);
  assert.match(source, /moneyflow-transactions\.svg/);
  assert.match(source, /styles\.heroProduct/);
  assert.match(source, /styles\.productSection/);
  assert.doesNotMatch(source, /ShieldCheck|WalletCards|ReceiptText|Undo2/);
  assert.doesNotMatch(source, /styles\.proofStage|styles\.traceGrid/);
});

test("landing module defines responsive, readable and reduced-motion layout", () => {
  const css = readLandingCss();
  assert.match(css, /min-height:\s*calc\(100svh - 72px\)/);
  assert.match(css, /\.heroProduct\b/);
  assert.match(css, /\.productSection\b/);
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(css.includes("!important"), false);
});

test("public redesign is grounded in official product references", () => {
  const research = readFileSync(RESEARCH_PATH, "utf8");
  assert.match(research, /Money Lover/);
  assert.match(research, /Monefy/);
  assert.match(research, /Spendee/);
  assert.match(research, /Lunch Money/);
  assert.match(research, /Copilot Money/);
  assert.match(research, /Monarch/);
  assert.match(research, /Authentication is a task, not a second landing page/);
});
