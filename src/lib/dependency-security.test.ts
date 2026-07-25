import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const PATCHED_XLSX_SOURCE =
  "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
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
  assert.equal(packageJson.devDependencies?.["eslint-config-next"], "16.2.11");
  assert.equal(packageJson.overrides?.postcss, "8.5.19");
  assert.equal(packageJson.overrides?.sharp, "0.35.0");

  assert.equal(lock.packages?.["node_modules/next"]?.version, "16.2.11");
  assert.equal(lock.packages?.["node_modules/postcss"]?.version, "8.5.19");
  assert.equal(lock.packages?.["node_modules/sharp"]?.version, "0.35.0");

  for (const [path, installed] of Object.entries(lock.packages ?? {})) {
    if (/(?:^|\/)node_modules\/postcss$/.test(path)) {
      assert.equal(installed.version, "8.5.19");
    }
    if (/(?:^|\/)node_modules\/sharp$/.test(path)) {
      assert.equal(installed.version, "0.35.0");
    }
  }
});
