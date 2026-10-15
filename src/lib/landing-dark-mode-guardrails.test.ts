import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const legacy = readFileSync("src/app/legacy.css", "utf8");
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");
const publicTheme = readFileSync(
  "src/components/public-brand-theme.module.css",
  "utf8",
);
const routeThemeBoundary = readFileSync(
  "src/components/route-theme-boundary.tsx",
  "utf8",
);
const rejectedDirection = readFileSync(
  "docs/design/SIGNAL_LEDGER_V3.md",
  "utf8",
);

const retiredThemeGenerations = [
  "src/app/landing-dark-mode-guardrails.css",
  "src/app/ai-uiux-guardrails.css",
  "src/app/ai-uiux-refresh.css",
];

test("document theme authority loads after the Phase 10 foundation entry", () => {
  const legacyImport = 'import "./legacy.css"';
  const themeImport = 'import "./document-theme.css"';

  assert.match(rootLayout, /import "\.\/legacy\.css"/);
  assert.match(rootLayout, /import "\.\/document-theme\.css"/);
  assert.ok(
    rootLayout.indexOf(themeImport) > rootLayout.indexOf(legacyImport),
    "document-theme.css must load after the temporary foundation entry",
  );
  assert.match(legacy, /^@import "\.\/globals\.css";\s*$/mu);
  for (const file of retiredThemeGenerations)
    assert.equal(existsSync(file), false, file);
});

test("workspace dark mode keeps Soft Pop semantic product tokens", () => {
  assert.match(
    documentTheme,
    /MoneyFlow semantic document and theme authority/,
  );
  assert.doesNotMatch(documentTheme, /authority — Signal Ledger/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.match(documentTheme, /--mf-canvas:\s*#161224/);
  assert.match(documentTheme, /--mf-surface:\s*#1e1a30/);
  assert.match(documentTheme, /--mf-text:\s*#f4f2fb/);
  assert.match(documentTheme, /--mf-text-muted:\s*#cdc6de/);
  assert.match(documentTheme, /--mf-brand:\s*#b7a5ff/);
  assert.match(documentTheme, /--mf-brand-identity:\s*#b7a5ff/);
  assert.match(documentTheme, /--mf-brand-text:\s*#cbbeff/);
  assert.match(documentTheme, /--mf-income:\s*#4ade80/);
  assert.match(documentTheme, /--mf-expense:\s*#f87171/);
  assert.match(documentTheme, /--mf-warning:\s*#facc15/);
  assert.match(documentTheme, /--mf-transfer:\s*#818cf8/);
  assert.match(documentTheme, /--mf-info:\s*#60a5fa/);
  assert.match(documentTheme, /--mf-focus-ring:\s*rgb\(183 165 255 \/ 24%\)/);
  assert.doesNotMatch(documentTheme, /!important/u);
});

test("public entry routes stay light while workspace routes restore the saved theme", () => {
  assert.match(
    rootLayout,
    /import \{ RouteThemeBoundary \} from "@\/components\/route-theme-boundary"/,
  );
  assert.match(rootLayout, /<RouteThemeBoundary \/>/);
  assert.match(
    rootLayout,
    /publicLightPaths = \['\/', '\/landing', '\/login', '\/register'/,
  );
  assert.match(rootLayout, /if \(!isPublicLight\)/);
  assert.match(rootLayout, /localStorage\.getItem\('moneyflow-theme'\)/);

  assert.match(routeThemeBoundary, /PUBLIC_LIGHT_PATHS/);
  assert.match(routeThemeBoundary, /"\/landing"/);
  assert.match(routeThemeBoundary, /"\/login"/);
  assert.match(routeThemeBoundary, /"\/register"/);
  assert.match(routeThemeBoundary, /"\/privacy"/);
  assert.match(routeThemeBoundary, /pathname\.startsWith\("\/auth\/"\)/);
  assert.match(
    routeThemeBoundary,
    /isPublicLightPath\(pathname\) \? "light" : resolveWorkspaceTheme\(\)/,
  );

  assert.match(publicTheme, /--mf-canvas:\s*#f8f5ff/);
  assert.match(publicTheme, /--mf-surface:\s*#ffffff/);
  assert.match(publicTheme, /--mf-text:\s*#211a33/);
  assert.match(publicTheme, /--mf-brand-identity:\s*#6f4ef5/);
  assert.match(publicTheme, /color-scheme:\s*light/);
  assert.doesNotMatch(publicTheme, /html\[data-theme="dark"\]/);

  assert.match(rejectedDirection, /Status: rejected \/ superseded/);
  assert.match(rejectedDirection, /historical material only/);
});
