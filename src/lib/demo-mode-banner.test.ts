/**
 * TASK-113 — Demo mode banner in AppShell when viewer.isDemo.
 *
 * It was a *sticky* banner when this file was written. It is not one now; see the
 * note at the foot of this file.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SHELL_PATH = join(
  process.cwd(),
  "src/components/layout/app-shell.tsx",
);

function shell(): string {
  return readFileSync(SHELL_PATH, "utf8");
}

test("AppShell shows demo banner only when viewer.isDemo", () => {
  const source = shell();
  assert.match(source, /viewer\.isDemo\s*\?/);
  assert.match(source, /className=\{styles\.demoBanner\}/);
  assert.ok(
    source.includes("Chế độ demo — dữ liệu lưu trên trình duyệt"),
    "expected sticky demo copy",
  );
  assert.match(source, /href="\/register"/);
  assert.match(source, /Đăng ký/);
});

/*
 * Every CSS test in this file has been removed, and the reason is the finding.
 *
 * They asserted `.demo-mode-banner`, `.demo-mode-banner-text`,
 * `.demo-mode-banner-cta` and a fixed `.mobile-fab` — a sticky top banner that a
 * floating action button had to out-layer on short viewports. A DOM probe across
 * 21 routes at three widths finds zero nodes for any of those classes. The shell
 * renders `styles.demoBanner`, which is `margin: 18px auto 0` in normal flow with
 * no `position` and no `z-index`, and the FAB was removed by the Calm Ledger
 * redesign. The rules these tests guarded never applied to anything.
 *
 * They also kept themselves alive. `check:dead-css` reported `.demo-mode-banner`
 * as referenced because the string ".demo-mode-banner" appears in this file — a
 * test asserting a dead rule is itself the evidence that the rule is used. That
 * loop is why these were the last of the cluster to be found.
 *
 * What replaces them is not obvious and is not a cleanup decision: whether the
 * demo banner should be sticky at all, and what should happen on a short phone
 * viewport now that there is no FAB to collide with, is a design question. The
 * component-level test above still holds — the banner renders only for demo
 * viewers, carries the demo copy and links to registration. Recorded in
 * docs/plans/active/dead-css-endgame.md.
 */
