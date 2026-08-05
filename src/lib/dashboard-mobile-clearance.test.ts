import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardComponent = readFileSync(
  "src/components/moneyflow-dashboard.tsx",
  "utf8",
);
const dashboardCss = readFileSync(
  "src/app/dashboard/calm-ledger-overview.css",
  "utf8",
);
const shellCss = readFileSync(
  "src/components/layout/app-shell.module.css",
  "utf8",
);

function mediaBlock(source: string, query: string): string {
  const start = source.indexOf(query);
  assert.ok(start >= 0, `expected ${query}`);
  return source.slice(start, start + 7000);
}

test("dashboard no longer opts into the legacy global dashboard clearance", () => {
  assert.match(
    dashboardComponent,
    /<main className="insights-dashboard">/,
  );
  assert.doesNotMatch(
    dashboardComponent,
    /className="dashboard(?:\s|\")/,
    "the legacy dashboard class re-applies removed FAB clearance through ui-refresh.css",
  );
});

test("phone dashboard spacing is owned by the route while the shell reserves the fixed nav", () => {
  const dashboardPhone = mediaBlock(
    dashboardCss,
    "@media (max-width: 760px)",
  );
  assert.match(
    dashboardPhone,
    /\.insights-dashboard\s*\{[\s\S]{0,180}?padding:\s*24px 14px 26px;/,
  );

  const shellPhone = mediaBlock(
    shellCss,
    "@media (max-width: 760px)",
  );
  assert.match(
    shellPhone,
    /\.shell\s*\{[\s\S]{0,160}?padding-bottom:\s*calc\(76px \+ env\(safe-area-inset-bottom\)\);/,
  );
  assert.match(
    shellPhone,
    /\.mobileNav\s*\{[\s\S]{0,520}?min-height:\s*calc\(68px \+ env\(safe-area-inset-bottom\)\);/,
  );
});
