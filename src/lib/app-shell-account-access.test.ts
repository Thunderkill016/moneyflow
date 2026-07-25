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
  new URL("../app/ui-refresh.css", import.meta.url),
  "utf8",
);

test("desktop account menu submits the server sign-out action explicitly", () => {
  assert.match(userChipSource, /action=\{signOut\}/);
  assert.match(userChipSource, /logoutFormRef\.current\?\.requestSubmit\(\)/);
  assert.match(userChipSource, />Đăng xuất</);
});

test("mobile topbar opens an account sheet with a real sign-out form", () => {
  assert.match(appShellSource, /className="mobile-account-button"/);
  assert.match(appShellSource, /aria-label=\{`Mở tài khoản/);
  assert.match(appShellSource, /<MoreSheet[\s\S]*viewer=\{viewer\}/);
  assert.match(appShellSource, /<form action=\{signOut\} className="more-sheet-signout-form">/);
  assert.match(appShellSource, /className="more-sheet-account-action danger"/);
});

test("mobile account trigger is hidden on desktop and visible at the mobile breakpoint", () => {
  assert.match(
    shellCss,
    /\.mobile-account-button\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    shellCss,
    /@media \(max-width: 760px\)[\s\S]*?\.mobile-account-button\s*\{[\s\S]*?display:\s*grid;/,
  );
});

test("shell consistency layer avoids unreadable 10px KPI labels and glass topbars", () => {
  assert.doesNotMatch(shellCss, /\.insights-kpi[\s\S]{0,300}font-size:\s*10px/);
  assert.match(
    shellCss,
    /\.topbar\s*\{[\s\S]*?background:\s*var\(--color-bg-elevated\)[\s\S]*?backdrop-filter:\s*none/,
  );
  assert.match(shellCss, /\.insights-kpi small\s*\{[\s\S]*?font-size:\s*12px/);
});
