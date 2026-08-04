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
  assert.match(documentTheme, /--mf-canvas:\s*#0c111d/);
  assert.match(documentTheme, /--mf-surface:\s*#101828/);
  assert.match(documentTheme, /--mf-text:\s*#f8fafc/);
  assert.match(documentTheme, /--mf-text-muted:\s*#d0d5dd/);
  assert.match(documentTheme, /--mf-brand:\s*#60a5fa/);
  assert.match(documentTheme, /--mf-brand-identity:\s*#60a5fa/);
  assert.match(documentTheme, /--mf-brand-text:\s*#93c5fd/);
  assert.match(documentTheme, /--mf-income:\s*#4ade80/);
  assert.match(documentTheme, /--mf-income-text:\s*#86efac/);
  assert.match(documentTheme, /--mf-expense:\s*#f87171/);
  assert.match(documentTheme, /--mf-expense-text:\s*#fca5a5/);
  assert.match(documentTheme, /--mf-warning:\s*#facc15/);
  assert.match(documentTheme, /--mf-warning-text:\s*#fde047/);
  assert.match(documentTheme, /--mf-transfer:\s*#818cf8/);
  assert.match(documentTheme, /--mf-transfer-text:\s*#a5b4fc/);
  assert.match(documentTheme, /--mf-info:\s*#60a5fa/);
  assert.match(documentTheme, /--mf-focus-ring:\s*rgb\(96 165 250 \/ 24%\)/);

  assert.match(publicTheme, /--public-canvas:\s*var\(--mf-canvas\)/);
  assert.match(publicTheme, /--public-accent:\s*var\(--mf-brand\)/);
  assert.match(publicTheme, /--auth-canvas:\s*var\(--mf-canvas\)/);
  assert.match(publicTheme, /--auth-accent:\s*var\(--mf-brand\)/);
  assert.match(publicTheme, /html\[data-theme="dark"\]/);
  assert.match(
    publicTheme,
    /html\[data-theme="dark"\][\s\S]*--auth-muted:\s*var\(--mf-text\)/,
    "dark auth muted copy must use the primary text role over luminous decoration",
  );
  assert.match(
    publicTheme,
    /html\[data-theme="dark"\][\s\S]*--auth-soft:\s*var\(--mf-text-muted\)/,
  );

  assert.match(rejectedDirection, /Status: rejected \/ superseded/);
  assert.match(rejectedDirection, /historical material only/);
});
