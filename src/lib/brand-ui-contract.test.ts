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
  assert.match(documentTheme, /--mf-income/u);
  assert.match(documentTheme, /--mf-expense/u);
  assert.match(documentTheme, /--mf-transfer/u);
  assert.doesNotMatch(documentTheme, /Signal Ledger/u);
});

test("landing first viewport has direct copy and one real product screen", () => {
  assert.match(landing, /Ghi thu chi, xem tiền còn ở đâu\./u);
  assert.match(landing, /Tạo tài khoản/u);
  assert.match(landing, /Tôi đã có tài khoản/u);
  assert.match(landing, /href="\/register" className=\{styles\.primaryCta\}/u);
  assert.match(landing, /href="\/login" className=\{styles\.secondaryCta\}/u);
  assert.match(landing, /className=\{styles\.heroProduct\}/u);
  assert.doesNotMatch(landing, /aria-label="Chuỗi giao diện thật của MoneyFlow"/u);
});

test("authentication remains a focused form", () => {
  assert.match(auth, /className=\{styles\.card\}/u);
  assert.match(auth, /Tiếp tục với Google/u);
  assert.match(auth, /styles\.passwordToggle/u);
  assert.doesNotMatch(auth, /styles\.proofRail/u);
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
