import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const audit = readFileSync(
  join(root, "e2e/audit/minimum-target-size.responsive.audit.spec.ts"),
  "utf8",
);
const shellCss = readFileSync(
  join(root, "src/components/layout/app-shell.module.css"),
  "utf8",
);

const retiredComponent = join(root, "src/components/minimum-target-size-contract.tsx");
const retiredStyles = join(
  root,
  "src/components/minimum-target-size-contract.module.css",
);

test("the root no longer mounts a global target-size repair component", () => {
  assert.equal(existsSync(retiredComponent), false);
  assert.equal(existsSync(retiredStyles), false);
  assert.doesNotMatch(layout, /MinimumTargetSizeContract/);
  assert.doesNotMatch(layout, /minimum-target-size-contract/);
});

test("current shell controls own important target geometry directly", () => {
  assert.match(shellCss, /\.primaryAction\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(shellCss, /\.mobileAccountButton\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px/);
  assert.match(shellCss, /\.mobileNavItem\s*\{[\s\S]*?min-height:\s*56px/);
  assert.match(shellCss, /\.accountAction\s*\{[\s\S]*?min-height:\s*46px/);
});

test("the blocking browser gate remains the authority for product-wide 44px acceptance", () => {
  assert.match(audit, /new Set\(\[320, 390, 1_366\]\)/);
  assert.match(audit, /const MINIMUM_TARGET_SIZE = 44/);
  assert.match(audit, /parentText\.length > ownText\.length/);
  assert.match(audit, /element\.labels\?\.\[0\]/);
  assert.match(audit, /settings-notifications/);
  assert.match(audit, /settings-privacy/);
  assert.match(audit, /toEqual\(\[\]\)/);
});
