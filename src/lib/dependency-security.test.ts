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
