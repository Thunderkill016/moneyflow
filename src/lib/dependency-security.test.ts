import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PATCHED_XLSX_SOURCE =
  "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/*
 * Minimum patched versions, asserted as a floor rather than an exact pin.
 *
 * This test used to require `postcss` to equal `8.5.19` exactly. That inverted
 * its own purpose: when a later advisory landed, raising the dependency to the
 * fixed release made the security test fail, so the alert stayed open until
 * someone edited the assertion. A security guard that has to be weakened to
 * apply a security fix is the wrong shape.
 *
 * A floor states the real requirement — no vulnerable copy anywhere in the tree
 * — and lets a patch bump through without a test edit, while still failing if
 * anything ever resolves below it. `next` and `sharp` keep exact pins: neither
 * was involved in this problem, and pinning the framework release is deliberate.
 */
const MIN_POSTCSS = "8.5.23"; // GHSA-6g55-p6wh-862q incomplete-fix follow-up
const MIN_NANOID = "3.3.18"; // nanoid: custom generators can loop indefinitely

function isAtLeast(version: string, minimum: string): boolean {
  const parse = (value: string) => value.split(".").map((part) => Number(part));
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(version);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(minimum);
  if (aMajor !== bMajor) return aMajor > bMajor;
  if (aMinor !== bMinor) return aMinor > bMinor;
  return aPatch >= bPatch;
}

test("untrusted Excel imports use patched SheetJS 0.20.3", () => {
  const packageJson = readJson("package.json") as {
    dependencies?: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const lock = readJson("package-lock.json") as {
    packages?: Record<
      string,
      {
        version?: string;
        resolved?: string;
      }
    >;
  };

  assert.equal(packageJson.dependencies?.xlsx, PATCHED_XLSX_SOURCE);
  assert.equal(packageJson.overrides?.xlsx, PATCHED_XLSX_SOURCE);

  const installed = lock.packages?.["node_modules/xlsx"];
  assert.equal(installed?.version, "0.20.3");
  assert.equal(installed?.resolved, PATCHED_XLSX_SOURCE);
});

test("framework runtime uses patched Next, PostCSS and Sharp releases", () => {
  const packageJson = readJson("package.json") as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const lock = readJson("package-lock.json") as {
    packages?: Record<string, { version?: string }>;
  };

  assert.equal(packageJson.dependencies?.next, "16.2.11");
  assert.equal(packageJson.devDependencies?.["eslint-config-next"], "16.2.12");
  /*
   * The postcss override is load-bearing, not tidiness: removing it lets Next
   * resolve its own nested postcss 8.4.31, far below the patched floor. It must
   * stay, and it must stay patched.
   */
  const postcssOverride = packageJson.overrides?.postcss;
  assert.ok(postcssOverride, "the postcss override must exist");
  assert.ok(
    isAtLeast(postcssOverride, MIN_POSTCSS),
    `postcss override ${postcssOverride} is below the patched floor ${MIN_POSTCSS}`,
  );
  assert.equal(packageJson.overrides?.sharp, "0.35.0");

  assert.equal(lock.packages?.["node_modules/next"]?.version, "16.2.11");
  assert.ok(
    isAtLeast(lock.packages?.["node_modules/postcss"]?.version ?? "0.0.0", MIN_POSTCSS),
  );
  assert.equal(lock.packages?.["node_modules/sharp"]?.version, "0.35.0");

  for (const [path, installed] of Object.entries(lock.packages ?? {})) {
    if (/(?:^|\/)node_modules\/postcss$/.test(path)) {
      assert.ok(
        isAtLeast(installed.version ?? "0.0.0", MIN_POSTCSS),
        `${path} resolves postcss ${installed.version}, below ${MIN_POSTCSS}`,
      );
    }
    /*
     * nanoid rides underneath postcss and carries its own advisory, so it is
     * checked here rather than left to whatever postcss happens to allow.
     */
    if (/(?:^|\/)node_modules\/nanoid$/.test(path)) {
      assert.ok(
        isAtLeast(installed.version ?? "0.0.0", MIN_NANOID),
        `${path} resolves nanoid ${installed.version}, below ${MIN_NANOID}`,
      );
    }
    if (/(?:^|\/)node_modules\/sharp$/.test(path)) {
      assert.equal(installed.version, "0.35.0");
    }
  }
});
