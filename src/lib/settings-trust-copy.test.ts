/**
 * R8 — Settings privacy / export / delete trust copy pass (G5).
 * JTBD: “Data của tao, mang đi / xóa được không?”
 * Core: ownership, no bank password, export anytime, honest delete limits.
 * Lab (inbox/parser) must not brand these trust surfaces.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

const HUB = join(ROOT, "src/components/settings-hub-page.tsx");
const PRIVACY = join(ROOT, "src/components/privacy-settings-page.tsx");
const EXPORT = join(ROOT, "src/components/export-settings-page.tsx");
const DELETE = join(ROOT, "src/components/delete-account-page.tsx");
const EXPORT_LIB = join(ROOT, "src/lib/export-data.ts");
const DELETE_LIB = join(ROOT, "src/lib/delete-account.ts");
const GLOBALS = join(ROOT, "src/app/globals.css");

const FORBIDDEN_INBOX_BRAND = [
  "hộp thư giao dịch",
  "Universal Financial Inbox",
  "Đưa dữ liệu vào Inbox",
] as const;

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assertNoInboxBrand(source: string, label: string) {
  for (const phrase of FORBIDDEN_INBOX_BRAND) {
    assert.equal(
      source.includes(phrase),
      false,
      `${label} must not use inbox brand: ${JSON.stringify(phrase)}`,
    );
  }
}

test("settings hub leads with ownership + G5 trust promises", () => {
  const s = read(HUB);
  assert.match(s, /Dữ liệu của bạn thuộc về bạn/);
  assert.match(s, /mật khẩu ngân hàng|mật khẩu NH/i);
  assert.match(s, /Xuất CSV|xuất CSV|Xuất dữ liệu/i);
  assert.match(s, /settings-trust-bar/);
  // Hub primary heading actions must not push Lab Inbox as brand
  assert.equal(
    /page-heading-actions[\s\S]*href=["']\/inbox["']/.test(s),
    false,
    "settings hub must not put /inbox in page-heading-actions",
  );
  assertNoInboxBrand(s, "settings hub");
});

test("settings hub link blurbs are core-first (privacy/export/delete)", () => {
  const s = read(HUB);
  assert.match(s, /["']\/settings\/privacy["']/);
  assert.match(s, /["']\/settings\/export["']/);
  assert.match(s, /["']\/settings\/delete-account["']/);
  // Privacy blurb: trust, not only parser lab jargon as the whole story
  assert.ok(
    s.includes("Không mật khẩu") || s.includes("không mật khẩu"),
    "privacy hub blurb should mention no bank password",
  );
  assert.ok(
    s.includes("CSV") || s.includes("thiết bị"),
    "export hub blurb should mention CSV or on-device file",
  );
});

test("privacy settings trust panel: no bank, export/delete, policy link", () => {
  const s = read(PRIVACY);
  assert.match(s, /mật khẩu ngân hàng|mật khẩu NH/i);
  assert.match(s, /["']\/settings\/export["']/);
  assert.match(s, /["']\/settings\/delete-account["']/);
  assert.match(s, /["']\/privacy["']/);
  assert.match(s, /Dữ liệu của bạn|dữ liệu của bạn/);
  assert.equal(
    /page-heading-actions[\s\S]*href=["']\/inbox["']/.test(s),
    false,
    "privacy settings must not put /inbox in page-heading-actions",
  );
  assertNoInboxBrand(s, "privacy settings");
});

test("export settings ownership copy + no inbox heading brand", () => {
  const s = read(EXPORT);
  assert.match(s, /thiết bị|trên thiết bị/i);
  assert.match(s, /Dữ liệu của bạn|dữ liệu của bạn|thuộc về bạn/i);
  assert.equal(
    /page-heading-actions[\s\S]*href=["']\/inbox["']/.test(s),
    false,
    "export settings must not put /inbox in page-heading-actions",
  );
  // Empty state: one primary CTA, not dual Inbox + Timeline as dual primaries
  assert.match(s, /export-empty/);
  assert.equal(
    s.includes('href="/inbox"') && s.includes("Vào Inbox"),
    false,
    "export empty must not primary-CTA into Inbox brand",
  );
  assertNoInboxBrand(s, "export settings");
});

test("export kind options lead with sổ thu chi core", () => {
  const s = read(EXPORT_LIB);
  assert.match(s, /Sổ thu chi|giao dịch đã ghi/i);
  // Lab candidates labeled secondary / Nâng cao, not primary brand
  assert.ok(
    s.includes("Nâng cao") || s.includes("nâng cao") || s.includes("tùy chọn"),
    "candidates export option should frame as advanced/optional",
  );
});

test("delete account recommends export and honest server limit", () => {
  const s = read(DELETE);
  assert.match(s, /["']\/settings\/export["']/);
  assert.match(s, /Không hoàn tác|không hoàn tác/i);
  assertNoInboxBrand(s, "delete account");

  const lib = read(DELETE_LIB);
  assert.ok(lib.includes("SERVER_DELETE_LIMITATION_VI"));
  assert.match(lib, /support@moneyflow\.app/);
  assert.ok(
    lib.includes("chưa tự phục vụ") || lib.includes("chưa có trong app"),
    "server wipe limitation must be honest for users",
  );
  // Product copy stays calm VN — avoid dumping raw admin jargon as the only sentence
  assert.ok(
    !lib.includes("service_role") || lib.includes("support@moneyflow.app"),
    "if technical terms remain, user contact path must stay",
  );
});

test("settings trust bar CSS exists", () => {
  const css = read(GLOBALS);
  assert.match(css, /\.settings-trust-bar\b/);
});
