import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const legacy = readFileSync("src/app/legacy.css", "utf8");
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");
const landingCss = readFileSync(
  "src/components/landing-page.module.css",
  "utf8",
);

test("document theme authority loads after the frozen legacy entry", () => {
  const legacyImport = 'import "./legacy.css"';
  const themeImport = 'import "./document-theme.css"';

  assert.match(rootLayout, /import "\.\/legacy\.css"/);
  assert.match(rootLayout, /import "\.\/document-theme\.css"/);
  assert.ok(
    rootLayout.indexOf(themeImport) > rootLayout.indexOf(legacyImport),
    "document-theme.css must load after legacy compatibility styles",
  );
  assert.match(legacy, /@import "\.\/ai-uiux-guardrails\.css"/);
});

test("dark mode is one Signal Ledger token contract shared by public surfaces", () => {
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.match(documentTheme, /--mf-canvas:\s*#111318/);
  assert.match(documentTheme, /--mf-surface:\s*#181b22/);
  assert.match(documentTheme, /--mf-text:\s*#f4f2ed/);
  assert.match(documentTheme, /--mf-text-muted:\s*#b7bac2/);
  assert.match(documentTheme, /--mf-brand:\s*#85a3ff/);
  assert.match(documentTheme, /--mf-brand-subtle:\s*#202b55/);

  assert.match(landingCss, /var\(--mf-canvas\)/);
  assert.match(landingCss, /var\(--mf-surface\)/);
  assert.match(landingCss, /var\(--mf-text\)/);
  assert.equal(landingCss.includes('[data-theme="dark"]'), false);
});
