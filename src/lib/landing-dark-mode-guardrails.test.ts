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
const rejectedDirection = readFileSync(
  "docs/design/SIGNAL_LEDGER_V3.md",
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

test("dark mode keeps semantic product tokens and explicit public-page roles", () => {
  assert.match(documentTheme, /MoneyFlow semantic document and theme authority/);
  assert.doesNotMatch(documentTheme, /authority — Signal Ledger/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.match(documentTheme, /--mf-canvas:\s*#111318/);
  assert.match(documentTheme, /--mf-surface:\s*#181b22/);
  assert.match(documentTheme, /--mf-text:\s*#f4f2ed/);
  assert.match(documentTheme, /--mf-text-muted:\s*#b7bac2/);

  assert.match(landingCss, /--public-canvas:\s*#f2f6f4/);
  assert.match(landingCss, /--public-accent:\s*#176f55/);
  assert.match(landingCss, /html\[data-theme="dark"\]\.page|html\[data-theme="dark"\]\) \.page/);
  assert.match(landingCss, /--public-canvas:\s*#101512/);
  assert.match(landingCss, /--public-accent:\s*#6fd0aa/);
  assert.match(rejectedDirection, /Status: rejected \/ superseded/);
  assert.match(rejectedDirection, /historical material only/);
});
