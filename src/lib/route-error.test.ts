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

const routeError = readFileSync("src/components/route-error.tsx", "utf8");
const rootError = readFileSync("src/app/error.tsx", "utf8");
const insightsError = readFileSync("src/app/insights/error.tsx", "utf8");
const insightsShim = readFileSync("src/app/insights/page.tsx", "utf8");

test("error boundaries recover to /dashboard — /insights is a shim, not a destination", () => {
  // The shared default and the two explicit boundaries all land on the
  // canonical authenticated home; nothing in error UI may send the reader
  // through the compatibility redirect.
  assert.match(routeError, /homeHref\s*=\s*"\/dashboard"/);
  assert.match(rootError, /homeHref="\/dashboard"/);
  assert.match(insightsError, /homeHref="\/dashboard"/);

  for (const [name, source] of [
    ["route-error.tsx", routeError],
    ["app/error.tsx", rootError],
    ["app/insights/error.tsx", insightsError],
  ] as const) {
    assert.doesNotMatch(source, /\/insights/, `${name} must not reference /insights`);
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

test("no live UI href targets /insights outside the compatibility redirect", () => {
  // The shim itself redirects server-side; nothing may link into it.
  assert.match(insightsShim, /redirect\("\/dashboard"\)/);

  const hrefPattern = /(?:home)?href\s*=\s*\{?\s*["'`]\/insights\b/i;
  const offenders: string[] = [];
  for (const file of sourceFiles("src")) {
    if (hrefPattern.test(readFileSync(file, "utf8"))) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
