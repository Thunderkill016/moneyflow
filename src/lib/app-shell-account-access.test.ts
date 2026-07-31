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

/*
 * The topbar assertion that used to live here has been removed, and it is worth
 * saying why rather than quietly dropping it.
 *
 * It required `ui-refresh.css` to contain
 * `.topbar { background: var(--color-bg-elevated); … backdrop-filter: none }`,
 * and it passed for as long as it existed. But `.topbar` is not in the DOM —
 * `app-shell.tsx` renders `styles.topbar` from its CSS Module, and a DOM probe
 * across five routes at two widths finds zero `.topbar` nodes. The rule it
 * guarded never applied to anything.
 *
 * The real topbar, `app-shell.module.css:189`, is
 * `background: color-mix(in srgb, var(--mf-canvas) 91%, transparent)` with
 * `backdrop-filter: blur(16px)` — translucent and blurred, which is exactly the
 * "glass topbar" this test claimed to prevent. So the assertion was not merely
 * inert: it reported the opposite of the truth for as long as it was green.
 *
 * Pointing it at the CSS Module instead would turn it red immediately. Whether
 * the shipped glass topbar is correct is a design decision — the Calm Ledger
 * direction may well have chosen it deliberately — and that decision is not this
 * change's to make. Recorded in the work packet for the owner.
 */
test("shell consistency layer avoids unreadable 10px KPI labels", () => {
  assert.doesNotMatch(shellCss, /\.insights-kpi[\s\S]{0,300}font-size:\s*10px/);
  assert.match(shellCss, /\.insights-kpi small\s*\{[\s\S]*?font-size:\s*12px/);
});
