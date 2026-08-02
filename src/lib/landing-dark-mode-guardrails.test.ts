import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const legacy = readFileSync("src/app/legacy.css", "utf8");
const documentTheme = readFileSync("src/app/document-theme.css", "utf8");
const publicTheme = readFileSync(
  "src/components/public-brand-theme.module.css",
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

test("dark mode keeps semantic product tokens and public routes use the same authority", () => {
  assert.match(documentTheme, /MoneyFlow semantic document and theme authority/);
  assert.doesNotMatch(documentTheme, /authority — Signal Ledger/);
  assert.match(documentTheme, /html\[data-theme="dark"\]/);
  assert.match(documentTheme, /--mf-canvas:\s*#0d111b/);
  assert.match(documentTheme, /--mf-surface:\s*#151a24/);
  assert.match(documentTheme, /--mf-text:\s*#f7f8fa/);
  assert.match(documentTheme, /--mf-text-muted:\s*#b9c1cc/);
  assert.match(documentTheme, /--mf-brand:\s*#8ea7ff/);
  assert.match(documentTheme, /--mf-income:\s*#4dd4a0/);
  assert.match(documentTheme, /--mf-expense:\s*#ff858b/);
  assert.match(documentTheme, /--mf-transfer:\s*#b29eff/);

  assert.match(publicTheme, /--public-canvas:\s*var\(--mf-canvas\)/);
  assert.match(publicTheme, /--public-accent:\s*var\(--mf-brand\)/);
  assert.match(publicTheme, /--auth-canvas:\s*var\(--mf-canvas\)/);
  assert.match(publicTheme, /--auth-accent:\s*var\(--mf-brand\)/);
  assert.match(publicTheme, /html\[data-theme="dark"\]/);

  assert.match(rejectedDirection, /Status: rejected \/ superseded/);
  assert.match(rejectedDirection, /historical material only/);
});
