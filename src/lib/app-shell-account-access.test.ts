import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appShellSource = readFileSync(
  new URL("../components/layout/app-shell.tsx", import.meta.url),
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

test("mobile topbar opens an account sheet with a real sign-out form", () => {
  assert.match(appShellSource, /className=\{styles\.mobileAccountButton\}/);
  assert.match(appShellSource, /aria-label=\{`Mở tài khoản/);
  assert.match(appShellSource, /<MoreSheet[\s\S]*viewer=\{viewer\}/);
  assert.match(
    appShellSource,
    /<form action=\{signOut\} className=\{styles\.signoutForm\}>/,
  );
  assert.match(
    appShellSource,
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
  assert.match(shellCss, /\.topbar\s*\{/);
  assert.match(shellCss, /backdrop-filter:\s*blur\(16px\)/);
  assert.match(shellCss, /background:\s*color-mix\(/);
});

test("App Shell keeps current navigation and account controls above the product target", () => {
  assert.match(shellCss, /\.navLink,[\s\S]*?min-height:\s*46px/);
  assert.match(shellCss, /\.profileSlot :global\(\.profile-chip\)[\s\S]*?min-height:\s*52px/);
  assert.match(shellCss, /\.accountAction\s*\{[\s\S]*?min-height:\s*46px/);
});
