/**
 * TASK-110 — Static /privacy policy must cover minimum VN topics.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const POLICY_SOURCE_PATH = join(
  process.cwd(),
  "src/components/privacy-policy-page.tsx",
);
const LANDING_SOURCE_PATH = join(process.cwd(), "src/components/landing-page.tsx");
const AUTH_FORM_SOURCE_PATH = join(process.cwd(), "src/components/auth-form.tsx");
const PAGE_ROUTE_PATH = join(process.cwd(), "src/app/privacy/page.tsx");

const REQUIRED_TOPICS = [
  "Dữ liệu chúng tôi thu thập",
  "Không mật khẩu ngân hàng",
  "Row Level Security",
  "Lưu trữ",
  "Xuất dữ liệu",
  "Liên hệ",
  // Not a literal address any more. The page must publish a contact, and that
  // contact must come from the single owned source — pinning the literal here is
  // how `support@moneyflow.app`, on a domain this project does not own, survived
  // in the published policy. `support-contact.test.ts` guards the value itself.
  "SUPPORT_EMAIL",
] as const;

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("privacy policy page route exists", () => {
  const source = read(PAGE_ROUTE_PATH);
  assert.match(source, /PrivacyPolicyPage/);
  assert.match(source, /Quyền riêng tư/);
});

test("privacy policy covers required VN topics", () => {
  const source = read(POLICY_SOURCE_PATH);
  assert.ok(source.length > 400, "policy content should be non-trivial");
  for (const topic of REQUIRED_TOPICS) {
    assert.ok(
      source.includes(topic),
      `privacy policy must mention: ${JSON.stringify(topic)}`,
    );
  }
  assert.ok(
    source.includes("không") && source.includes("ngân hàng"),
    "must state no bank password",
  );
});

test("landing footer links to /privacy", () => {
  const source = read(LANDING_SOURCE_PATH);
  assert.match(source, /href=["']\/privacy["']/);
  assert.ok(
    source.includes("Riêng tư") || source.includes("riêng tư"),
    "footer should label privacy link",
  );
});

test("register privacy checkbox links to /privacy", () => {
  const source = read(AUTH_FORM_SOURCE_PATH);
  assert.match(source, /href=["']\/privacy["']/);
  assert.ok(
    source.includes("chính sách quyền riêng tư"),
    "register should reference privacy policy",
  );
});
