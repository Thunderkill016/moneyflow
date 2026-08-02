import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const icon = readFileSync(join(root, "src/app/icon.svg"), "utf8");
const component = readFileSync(
  join(root, "src/components/brand/brand-lockup.tsx"),
  "utf8",
);
const landing = readFileSync(
  join(root, "src/components/landing-page.tsx"),
  "utf8",
);
const auth = readFileSync(join(root, "src/components/auth-form.tsx"), "utf8");
const publicTheme = readFileSync(
  join(root, "src/components/public-brand-theme.module.css"),
  "utf8",
);
const documentTheme = readFileSync(
  join(root, "src/app/document-theme.css"),
  "utf8",
);
const guardrails = readFileSync(
  join(root, "src/app/ai-uiux-guardrails.css"),
  "utf8",
);

function canonicalPath(source: string): string {
  const match = source.match(/d="([^"]*M17 43[^"]*)"/u);
  assert.ok(match, "expected canonical MoneyFlow M path");
  return match[1];
}

test("shared brand component uses the exact canonical app-icon path", () => {
  assert.equal(canonicalPath(component), canonicalPath(icon));
  assert.match(component, /aria-hidden="true"/u);
  assert.match(component, /focusable="false"/u);
});

test("landing and auth use the shared brand component", () => {
  assert.match(
    landing,
    /import \{ BrandLockup \} from "@\/components\/brand\/brand-lockup"/u,
  );
  assert.match(
    auth,
    /import \{ BrandLockup \} from "@\/components\/brand\/brand-lockup"/u,
  );
  assert.doesNotMatch(landing, /className=\{styles\.brandMark\}/u);
  assert.doesNotMatch(auth, /className=\{styles\.brandMark\}/u);
});

test("public routes consume the project color authority", () => {
  assert.match(
    landing,
    /import themeStyles from "\.\/public-brand-theme\.module\.css"/u,
  );
  assert.match(
    auth,
    /import themeStyles from "\.\/public-brand-theme\.module\.css"/u,
  );
  assert.match(landing, /themeStyles\.landingTheme/u);
  assert.match(auth, /themeStyles\.authTheme/u);

  assert.match(publicTheme, /--public-accent:\s*var\(--mf-brand\)/u);
  assert.match(publicTheme, /--auth-accent:\s*var\(--mf-brand\)/u);
  assert.match(publicTheme, /--public-stage:\s*var\(--mf-stage\)/u);
  assert.match(publicTheme, /--auth-stage:\s*var\(--mf-stage\)/u);

  assert.match(documentTheme, /--mf-canvas:\s*#f6f8fc/u);
  assert.match(documentTheme, /--mf-surface:\s*#ffffff/u);
  assert.match(documentTheme, /--mf-brand-600:\s*#2f55d4/u);
  assert.match(documentTheme, /--mf-income:\s*#0c7a55/u);
  assert.match(documentTheme, /--mf-expense:\s*#c83e46/u);
  assert.match(documentTheme, /--mf-transfer:\s*#7054cc/u);
  assert.doesNotMatch(documentTheme, /Signal Ledger/u);
});

test("landing first viewport has one primary action and ledger proof", () => {
  assert.match(landing, /Ghi một lần\./u);
  assert.match(landing, /Cuối tháng khỏi đoán\./u);
  assert.match(landing, /Bắt đầu ghi thu chi/u);
  assert.match(landing, /href="\/register" className=\{styles\.primaryCta\}/u);
  assert.match(
    landing,
    /href="\/login" className=\{styles\.secondaryCta\}/u,
  );
  assert.match(landing, /aria-label="Sổ giao dịch minh hoạ của MoneyFlow"/u);
  assert.doesNotMatch(landing, /import \{ Button \}/u);
  assert.doesNotMatch(landing, /lucide-react/u);
});

test("signed-in compatibility bridge is narrow and uses canonical icon asset", () => {
  assert.match(
    guardrails,
    /a\[aria-label="MoneyFlow, về Tổng quan"\] > span:first-child/u,
  );
  assert.match(guardrails, /url\("\/icon\.svg"\)/u);
  assert.doesNotMatch(guardrails, /aria-label\^=/u);
  assert.doesNotMatch(guardrails, /clip-path:\s*polygon/u);
});
