import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PATCHED_XLSX_SOURCE =
  "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/*
 * Minimum patched versions, asserted as floors where the security requirement
 * is broader than one exact package release.
 *
 * A floor states the real requirement — no vulnerable copy anywhere in the tree
 * — and lets a later patch bump through without weakening the guard. Next and
 * eslint-config-next remain aligned to the deliberately vetted framework release;
 * Sharp remains an exact override because native/image behavior is part of the
 * runtime regression surface for this security patch.
 */
const MIN_POSTCSS = "8.5.23"; // GHSA-6g55-p6wh-862q incomplete-fix follow-up
const MIN_NANOID = "3.3.18"; // nanoid: custom generators can loop indefinitely
const MIN_BROWSERLIST = "4.28.7"; // GHSA-c83g-rgw3-j3cx + GHSA-73wf-gq98-2v4g
const MIN_QS = "6.16.0"; // GHSA-x5fp-wj9c-mxmx + GHSA-4mjr-xmp4-gh2g
const VETTED_NEXT = "16.3.4"; // >= 16.3.3 patched floor for the 2026-08-25 Critical advisories
const VETTED_SHARP = "0.35.4";

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

test("framework runtime uses patched Next, PostCSS, Sharp, Browserslist and qs releases", () => {
  const packageJson = readJson("package.json") as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const lock = readJson("package-lock.json") as {
    packages?: Record<string, { version?: string }>;
  };

  assert.equal(packageJson.dependencies?.next, VETTED_NEXT);
  assert.equal(packageJson.devDependencies?.["eslint-config-next"], VETTED_NEXT);
  /*
   * The postcss override is load-bearing, not tidiness: removing it lets Next
   * resolve a nested vulnerable postcss. It must stay, and it must stay patched.
   */
  const postcssOverride = packageJson.overrides?.postcss;
  assert.ok(postcssOverride, "the postcss override must exist");
  assert.ok(
    isAtLeast(postcssOverride, MIN_POSTCSS),
    `postcss override ${postcssOverride} is below the patched floor ${MIN_POSTCSS}`,
  );
  assert.equal(packageJson.overrides?.sharp, VETTED_SHARP);

  const browserslistOverride = packageJson.overrides?.browserslist;
  assert.ok(browserslistOverride, "the browserslist override must exist");
  assert.ok(
    isAtLeast(browserslistOverride, MIN_BROWSERLIST),
    `browserslist override ${browserslistOverride} is below the patched floor ${MIN_BROWSERLIST}`,
  );

  const qsOverride = packageJson.overrides?.qs;
  assert.ok(qsOverride, "the qs override must exist");
  assert.ok(
    isAtLeast(qsOverride, MIN_QS),
    `qs override ${qsOverride} is below the patched floor ${MIN_QS}`,
  );

  assert.equal(lock.packages?.["node_modules/next"]?.version, VETTED_NEXT);
  assert.ok(
    isAtLeast(lock.packages?.["node_modules/postcss"]?.version ?? "0.0.0", MIN_POSTCSS),
  );
  assert.equal(lock.packages?.["node_modules/sharp"]?.version, VETTED_SHARP);

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
      assert.equal(installed.version, VETTED_SHARP);
    }
    if (/(?:^|\/)node_modules\/browserslist$/.test(path)) {
      assert.ok(
        isAtLeast(installed.version ?? "0.0.0", MIN_BROWSERLIST),
        `${path} resolves browserslist ${installed.version}, below ${MIN_BROWSERLIST}`,
      );
    }
    if (/(?:^|\/)node_modules\/qs$/.test(path)) {
      assert.ok(
        isAtLeast(installed.version ?? "0.0.0", MIN_QS),
        `${path} resolves qs ${installed.version}, below ${MIN_QS}`,
      );
    }
  }
});
