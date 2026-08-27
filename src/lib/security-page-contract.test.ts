import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * The public security page.
 *
 * Every commercial product in this category publishes one, and the reason to
 * guard this file is that a security page is exactly where a product drifts
 * into claiming more than it does. These pin the shape that makes it
 * trustworthy rather than its wording.
 */

const page = readFileSync("src/components/security-page.tsx", "utf8");
const styles = readFileSync("src/components/security-page.module.css", "utf8");
const securityPolicy = readFileSync("SECURITY.md", "utf8");

test("it separates what the product does from what the platform provides", () => {
  /*
   * Conflating the two is how these pages become untrustworthy: a product
   * inherits its host's encryption and then writes it as though it built it.
   */
  assert.match(page, /security-product/u);
  assert.match(page, /security-platform/u);
  assert.match(page, /không phải thứ chúng tôi tự kiểm/u);
});

test("it states what does not exist", () => {
  // The most useful section, and the one such pages normally omit.
  assert.match(page, /security-absent/u);
  assert.match(page, /SOC 2/u);
  assert.match(page, /thưởng lỗi/u);
  assert.match(page, /kiểm thử xâm nhập/u);
});

test("it claims no audit, bounty or penetration test as present", () => {
  const absent = page.slice(page.indexOf("security-absent"));
  for (const claim of [/đã đạt SOC 2/u, /chương trình thưởng lỗi đang chạy/u]) {
    assert.ok(!claim.test(absent));
  }
  assert.match(page, /Chưa có chứng nhận kiểm toán bảo mật độc lập/u);
});

test("reporting points at the private channel SECURITY.md already defines", () => {
  /*
   * No email address is invented here. The repository's own policy routes
   * reports through GitHub's private advisory flow, and the page must not open
   * a second, unmonitored channel beside it.
   */
  assert.match(page, /security\/advisories\/new/u);
  assert.match(securityPolicy, /Report a vulnerability/u);
  assert.ok(!/mailto:/u.test(page), "a mailbox nobody owns is worse than none");
});

test("it renders without client JavaScript", () => {
  assert.ok(!/"use client"/u.test(page));
  assert.ok(!/useState|useEffect|onClick/u.test(page));
});

test("it owns its presentation and meets the target size", () => {
  /*
   * The landing and privacy globals survive only through the presentation
   * ownership baseline; adding a caller is what rejected PR #420.
   */
  assert.match(page, /security-page\.module\.css/u);
  assert.ok(!/landing-page|privacy-policy-page/u.test(page));
  assert.match(styles, /min-height:\s*2\.75rem/u);
  assert.match(styles, /focus-visible/u);
});

test("the page is reachable rather than orphaned", () => {
  const landing = readFileSync("src/components/landing-page.tsx", "utf8");
  const privacy = readFileSync("src/components/privacy-policy-page.tsx", "utf8");
  assert.match(landing, /href="\/security"/u);
  assert.match(privacy, /href="\/security"/u);
});
