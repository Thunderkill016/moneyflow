import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * Guards the 404 a visitor actually lands on.
 *
 * Before this page existed, production served Next's built-in English fallback
 * in a system font, with no route back into the product. Deleting the file
 * would silently restore that, and nothing else in the suite would notice — a
 * 404 is not on any happy path.
 */

const PAGE = "src/app/not-found.tsx";
const STYLES = "src/components/not-found-page.module.css";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("the root not-found boundary exists and is Vietnamese", () => {
  const source = read(PAGE);

  assert.match(source, /export default function NotFound/u);
  assert.match(source, /Không tìm thấy trang này/u);
  assert.ok(
    !/This page could not be found/iu.test(source),
    "the English fallback copy must not appear",
  );
});

test("it offers a route back for both signed-in and signed-out visitors", () => {
  const source = read(PAGE);

  /*
   * `/` is the one destination correct for both: the proxy sends an
   * authenticated visitor to /dashboard and everyone else to the public page.
   * A hard-coded /dashboard link would strand a signed-out visitor at a login
   * redirect, which is not a way back.
   */
  assert.match(source, /href="\/"/u);
  assert.ok(
    !/href="\/dashboard"/u.test(source),
    "leading with /dashboard would strand a signed-out visitor",
  );
});

test("it renders without client JavaScript", () => {
  const source = read(PAGE);

  // A 404 is reached on a path the app does not serve, so it has to render
  // from the HTML alone rather than waiting on hydration.
  assert.ok(!/"use client"/u.test(source));
  assert.ok(!/useState|useEffect|onClick/u.test(source));
});

test("it owns its presentation instead of extending the baselined globals", () => {
  const source = read(PAGE);

  /*
   * `.route-error` and friends survive only through
   * presentation-ownership-baseline.json. Reusing them for a new caller would
   * fail check:code-css-ownership, which is exactly how PR #420 was rejected.
   */
  assert.match(source, /not-found-page\.module\.css/u);
  assert.ok(!/route-error/u.test(source));
});

test("its pressable targets meet the 44px minimum", () => {
  const css = read(STYLES);

  // 2.75rem = 44px at the default root size. The cross-device audit measures
  // this for real; the unit test keeps the intent visible next to the markup.
  assert.match(css, /min-height:\s*2\.75rem/u);
  assert.match(css, /focus-visible/u);
});
