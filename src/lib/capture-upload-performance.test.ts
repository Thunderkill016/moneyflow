import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uploadPage = readFileSync(
  "src/components/inbox/capture-upload-page.tsx",
  "utf8",
);

test("capture upload defers heavy Excel and PDF parsers until selected", () => {
  assert.doesNotMatch(
    uploadPage,
    /^import .*parse-(?:xlsx|pdf)/m,
    "Excel/PDF parsers must not be part of the initial upload-page bundle",
  );
  assert.match(
    uploadPage,
    /await import\("@\/lib\/inbox\/parse-xlsx"\)/,
    "SheetJS parser must load only for Excel files",
  );
  assert.match(
    uploadPage,
    /await import\("@\/lib\/inbox\/parse-pdf"\)/,
    "PDF parser must load only for PDF files",
  );
  assert.match(
    uploadPage,
    /parseCsvStatement\(await file\.text\(\)/,
    "CSV should remain on the lightweight direct path",
  );
});
