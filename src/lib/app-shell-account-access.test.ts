import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appShellSource = readFileSync(
  new URL("../components/layout/app-shell.tsx", import.meta.url),
  "utf8",
);
const appShellOverlaysSource = readFileSync(
  new URL("../components/layout/app-shell-overlays.tsx", import.meta.url),
  "utf8",
);
const userChipSource = readFileSync(
  new URL("../components/user-chip.tsx", import.meta.url),
  "utf8",
);
const shellCss = readFileSync(
  new URL("../components/layout/app-shell.module.css", import.meta.url),
  "utf8",
);

test("desktop account menu submits the server sign-out action explicitly", () => {
  assert.match(userChipSource, /action=\{signOut\}/);
  assert.match(userChipSource, /logoutFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(userChipSource, />Đăng xuất</);
});

test("mobile topbar opens a lazy account sheet with a real sign-out form", () => {
  assert.match(appShellSource, /className=\{styles\.mobileAccountButton\}/);
  assert.match(appShellSource, /aria-label=\{`Mở tài khoản/);
  assert.match(
    appShellSource,
    /dynamic\([\s\S]*app-shell-overlays[\s\S]*MoreSheetOverlay/,
  );
  assert.match(appShellSource, /<MoreSheetOverlay[\s\S]*viewer=\{viewer\}/);
  assert.match(
    appShellOverlaysSource,
    /<form action=\{signOut\} className=\{styles\.signoutForm\}>/,
  );
  assert.match(
    appShellOverlaysSource,
    /cx\(\s*styles\.accountAction,\s*styles\.accountActionDanger,?\s*\)/,
  );
});

test("mobile account trigger is owned locally and appears at the mobile breakpoint", () => {
  assert.match(
    shellCss,
    /\.mobileAccountButton\s*\{[^}]*display:\s*none;/,
  );
  assert.match(
    shellCss,
    /@media \(max-width: 760px\)[\s\S]*?\.mobileAccountButton\s*\{[^}]*display:\s*grid;/,
  );
  assert.match(
    shellCss,
    /\.mobileAccountButton\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/,
  );
});

test("App Shell owns its current translucent topbar rather than a dead global selector", () => {
  const match = shellCss.match(/\.topbar\s*\{([^}]*)\}/);
  assert.ok(match, "expected local .topbar rule");
  assert.match(match[1], /backdrop-filter:\s*blur\(14px\)/);
  assert.match(match[1], /background:\s*color-mix\(/);
});

test("App Shell keeps current navigation and account controls above the product target", () => {
  assert.match(shellCss, /\.navLink,[\s\S]*?min-height:\s*46px/);
  assert.match(shellCss, /\.profileSlot :global\(\.profile-chip\)[\s\S]*?min-height:\s*52px/);
  assert.match(shellCss, /\.accountAction\s*\{[\s\S]*?min-height:\s*46px/);
});
