import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const css = readFileSync(
  join(root, "src/components/minimum-target-size-contract.module.css"),
  "utf8",
);
const component = readFileSync(
  join(root, "src/components/minimum-target-size-contract.tsx"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const audit = readFileSync(
  join(root, "e2e/audit/minimum-target-size.responsive.audit.spec.ts"),
  "utf8",
);

test("the root layout mounts one minimum target size owner", () => {
  assert.match(
    layout,
    /import \{ MinimumTargetSizeContract \} from "@\/components\/minimum-target-size-contract"/u,
  );
  assert.equal((layout.match(/<MinimumTargetSizeContract \/>/gu) ?? []).length, 1);
  assert.match(component, /minimum-target-size-contract\.module\.css/u);
});

test("pressable controls and labelled choices keep a 44px floor", () => {
  assert.match(css, /:global\(button\)/u);
  assert.match(css, /:global\(a\[href\]\)/u);
  assert.match(css, /:global\(\[role="button"\]\)/u);
  assert.match(css, /:global\(\[role="tab"\]\)/u);
  assert.match(css, /:global\(summary\)/u);
  assert.match(css, /:global\(select\)/u);
  assert.match(css, /label:has\(input\[type="checkbox"\]\)/u);
  assert.match(css, /label:has\(input\[type="radio"\]\)/u);
  assert.match(css, /min-width:\s*44px !important/u);
  assert.match(css, /min-height:\s*44px !important/u);
});

test("transaction row actions stay visible on touch and reveal calmly on fine pointers", () => {
  assert.match(css, /\.edit-button/u);
  assert.match(css, /\.delete-button/u);
  assert.match(css, /opacity:\s*1 !important/u);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/u);
  assert.match(css, /opacity:\s*0\.25 !important/u);
  assert.match(css, /:focus-visible/u);
});

test("the browser gate measures 320, 390 and 1366 without treating prose links as buttons", () => {
  assert.match(audit, /new Set\(\[320, 390, 1_366\]\)/u);
  assert.match(audit, /const MINIMUM_TARGET_SIZE = 44/u);
  assert.match(audit, /element\.closest\("p"\)/u);
  assert.match(audit, /element\.labels\?\.\[0\]/u);
  assert.match(audit, /settings-notifications/u);
  assert.match(audit, /settings-privacy/u);
  assert.match(audit, /toEqual\(\[\]\)/u);
});
