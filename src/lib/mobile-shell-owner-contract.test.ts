import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const css = readFileSync(
  join(root, "src/components/mobile-shell-contract.module.css"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");

test("mobile routes keep content above fixed navigation and sheet endings reachable", () => {
  assert.match(css, /@media \(max-width: 760px\)/u);
  assert.match(css, /padding-bottom:\s*calc\(104px \+ env\(safe-area-inset-bottom/u);
  assert.match(css, /dialog\[open\]/u);
  assert.match(css, /scroll-padding-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom/u);
});

test("quick-capture amount field owns dark readable foreground and background", () => {
  assert.match(css, /transaction-dialog \.amount-field > div/u);
  assert.match(css, /background:\s*var\(--mf-canvas\)/u);
  assert.match(css, /color:\s*var\(--mf-text\)/u);
  assert.match(css, /placeholder/u);
  assert.match(css, /color:\s*var\(--mf-text-soft\)/u);
});

test("root layout mounts the mobile shell contract once", () => {
  assert.match(
    layout,
    /import \{ MobileShellContract \} from "@\/components\/mobile-shell-contract"/u,
  );
  assert.equal((layout.match(/<MobileShellContract \/>/gu) ?? []).length, 1);
});
