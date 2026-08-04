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

const STEM_PATH = "M32 50V17";
const BRANCH_PATHS = [
  "M32 24C29.8 24 28.2 23.2 26.4 22.6",
  "M32 24C34.2 24 35.8 23.2 37.6 22.6",
  "M32 34C29.2 34 27.2 33.2 25.2 32.6",
  "M32 34C34.8 34 36.8 33.2 38.8 32.6",
  "M32 44C29.8 44 28.2 43.2 26.4 42.6",
  "M32 44C34.2 44 35.8 43.2 37.6 42.6",
];

test("shared brand component uses the Lucide coin-rice construction", () => {
  assert.match(component, /import \{ Circle, Leaf \} from "lucide-react"/u);
  assert.match(component, /data-brand-shape="coin-rice"/u);
  assert.match(component, /<Leaf/u);
  assert.match(component, new RegExp(STEM_PATH, "u"));
  assert.match(icon, new RegExp(STEM_PATH, "u"));

  for (const branch of BRANCH_PATHS) {
    assert.match(component, new RegExp(branch, "u"));
    assert.match(icon, new RegExp(branch, "u"));
  }

  assert.equal((component.match(/\{ x: /gu) ?? []).length, 6);
  assert.equal((icon.match(/<ellipse /gu) ?? []).length, 6);
  assert.match(component, /strokeWidth=\{4\.6\}/u);
  assert.match(icon, /stroke-width="2\.3"/u);
  assert.match(icon, /M32 8\.5C28\.6 12 28\.7 17\.2 32 20\.5/u);
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

  assert.match(documentTheme, /--mf-canvas:\s*#f8fafc/u);
  assert.match(documentTheme, /--mf-surface:\s*#ffffff/u);
  assert.match(documentTheme, /--mf-brand-500:\s*#3b82f6/u);
  assert.match(documentTheme, /--mf-brand-600:\s*#2563eb/u);
  assert.match(documentTheme, /--mf-sky-500:\s*#0ea5e9/u);
  assert.match(documentTheme, /--mf-cyan-500:\s*#06b6d4/u);
  assert.match(documentTheme, /--mf-indigo-500:\s*#6366f1/u);
  assert.match(documentTheme, /--mf-periwinkle-500:\s*#8b9cf6/u);
  assert.match(documentTheme, /--mf-income:\s*#16a34a/u);
  assert.match(documentTheme, /--mf-expense:\s*#dc2626/u);
  assert.match(documentTheme, /--mf-warning:\s*#eab308/u);
  assert.match(documentTheme, /--mf-transfer:\s*#4f46e5/u);
  assert.match(documentTheme, /--mf-info:\s*var\(--mf-brand-600\)/u);
  assert.doesNotMatch(documentTheme, /Signal Ledger/u);
});

test("landing first viewport has a primary action and workflow proof", () => {
  assert.match(landing, /Biết tiền đang ở đâu\./u);
  assert.match(landing, /Biết vì sao nó thay đổi\./u);
  assert.match(landing, /Tạo sổ của bạn/u);
  assert.doesNotMatch(landing, /Bắt đầu miễn phí/u);
  assert.match(landing, /href="\/register" className=\{styles\.primaryCta\}/u);
  assert.match(
    landing,
    /href="#cach-hoat-dong" className=\{styles\.secondaryCta\}/u,
  );
  assert.match(landing, /aria-label="Chuỗi giao diện thật của MoneyFlow"/u);
  assert.doesNotMatch(landing, /import \{ Button \}/u);
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
