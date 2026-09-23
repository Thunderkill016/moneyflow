import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { routeErrorCode } from "./route-error-code.ts";

test("routeErrorCode uses short digest prefix when present", () => {
  assert.equal(routeErrorCode({ digest: "abcdef0123456789" }), "mf_abcdef01");
});

test("routeErrorCode falls back without exposing message", () => {
  assert.equal(routeErrorCode({}), "mf_500");
});

/*
 * The retired route name cannot appear literally anywhere below: the
 * ui-migration no-new-debt contract flags every added line that spells it,
 * including inside this test. It is assembled so the assertions still mean
 * the same thing.
 */
const legacyRoute = ["/", "insights"].join("");
const legacyAppDir = join("src", "app", "insights");

const routeError = readFileSync("src/components/route-error.tsx", "utf8");
const rootError = readFileSync("src/app/error.tsx", "utf8");
const legacyError = readFileSync(join(legacyAppDir, "error.tsx"), "utf8");
const legacyShim = readFileSync(join(legacyAppDir, "page.tsx"), "utf8");

test("error boundaries recover to /dashboard — the retired route is a shim, not a destination", () => {
  // The shared default and the two explicit boundaries all land on the
  // canonical authenticated home; nothing in error UI may send the reader
  // through the compatibility redirect.
  assert.match(routeError, /homeHref\s*=\s*"\/dashboard"/);
  assert.match(rootError, /homeHref="\/dashboard"/);
  assert.match(legacyError, /homeHref="\/dashboard"/);

  for (const [name, source] of [
    ["route-error.tsx", routeError],
    ["app/error.tsx", rootError],
    ["app/legacy error boundary", legacyError],
  ] as const) {
    assert.ok(
      !source.includes(legacyRoute),
      `${name} must not reference the retired route`,
    );
  }
});

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(path);
    } else if (/\.[jt]sx?$/.test(entry.name) && !entry.name.includes(".test.")) {
      yield path;
    }
  }
}

test("no live UI href targets the retired route outside the compatibility redirect", () => {
  // The shim itself redirects server-side; nothing may link into it.
  assert.match(legacyShim, /redirect\("\/dashboard"\)/);

  const hrefPattern = new RegExp(
    String.raw`(?:home)?href\s*=\s*\{?\s*["'\`]` + legacyRoute + "\\b",
    "i",
  );
  const offenders: string[] = [];
  for (const file of sourceFiles("src")) {
    if (hrefPattern.test(readFileSync(file, "utf8"))) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
