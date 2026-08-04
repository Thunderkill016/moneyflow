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
const manifest = readFileSync(join(root, "src/app/manifest.ts"), "utf8");
const openGraph = readFileSync(
  join(root, "src/app/opengraph-image.tsx"),
  "utf8",
);

const upperFlow =
  "M22.80 64.20C22.80 40.40 42.10 28.00 66.40 28.00H128.20";
const lowerFlow =
  "M137.20 95.80C137.20 119.60 117.90 132.00 93.60 132.00H31.80";

function expectB32Geometry(source: string) {
  assert.match(source, new RegExp(upperFlow.replaceAll(".", "\\."), "u"));
  assert.match(source, new RegExp(lowerFlow.replaceAll(".", "\\."), "u"));
  assert.match(source, /M80 54\.11A16 16/u);
  assert.match(source, /M80 67\.06A4\.94 4\.94/u);
}

function relativeLuminance(hex: string) {
  const normalized = hex.replace("#", "");
  assert.equal(normalized.length, 6);
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test("shared component and app icon use the approved B3.2 geometry", () => {
  expectB32Geometry(component);
  expectB32Geometry(icon);
  assert.match(component, /viewBox="0 0 160 160"/u);
  assert.match(component, /strokeWidth="16\.18"/u);
  assert.match(component, /aria-hidden="true"/u);
  assert.match(component, /focusable="false"/u);
  assert.doesNotMatch(component, /M17 43V23\.5/u);
  assert.doesNotMatch(icon, /M17 43V23\.5/u);
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

test("public routes consume the fresh-blue project color authority", () => {
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
  assert.match(documentTheme, /--mf-brand-500:\s*#0ea5e9/u);
  assert.match(documentTheme, /--mf-brand-600:\s*#0284c7/u);
  assert.match(documentTheme, /--mf-brand-700:\s*#0369a1/u);
  assert.match(documentTheme, /--mf-brand-identity:\s*var\(--mf-brand-500\)/u);
  assert.match(documentTheme, /--mf-brand:\s*var\(--mf-brand-700\)/u);
  assert.match(documentTheme, /--mf-brand-hover:\s*var\(--mf-brand-800\)/u);
  assert.match(documentTheme, /--mf-brand-pressed:\s*var\(--mf-brand-900\)/u);
  assert.match(documentTheme, /--mf-cyan-500:\s*#06b6d4/u);
  assert.match(documentTheme, /--mf-indigo-500:\s*#6366f1/u);
  assert.match(documentTheme, /--mf-periwinkle-500:\s*#8b9cf6/u);
  assert.match(documentTheme, /--mf-income:\s*#16a34a/u);
  assert.match(documentTheme, /--mf-expense:\s*#dc2626/u);
  assert.match(documentTheme, /--mf-warning:\s*#eab308/u);
  assert.match(documentTheme, /--mf-transfer:\s*#4f46e5/u);
  assert.match(documentTheme, /--mf-info:\s*#2563eb/u);
  assert.doesNotMatch(documentTheme, /--mf-info:\s*var\(--mf-brand/u);
  assert.doesNotMatch(documentTheme, /#0b6b3a/iu);
  assert.doesNotMatch(documentTheme, /Signal Ledger/u);
});

test("fresh-blue action pairs preserve normal-text contrast", () => {
  assert.ok(contrastRatio("#0369A1", "#FFFFFF") >= 4.5);
  assert.ok(contrastRatio("#38BDF8", "#082F49") >= 4.5);
  assert.ok(contrastRatio("#0EA5E9", "#101828") >= 4.5);
});

test("installed and social assets use the fresh-blue identity", () => {
  expectB32Geometry(openGraph);
  assert.match(icon, /fill="#0EA5E9"/u);
  assert.match(icon, /stroke="#FFFFFF"/u);
  assert.match(manifest, /theme_color:\s*"#0EA5E9"/u);
  assert.match(manifest, /background_color:\s*"#F8FAFC"/u);
  assert.match(openGraph, /background:\s*"#0EA5E9"/u);
  assert.doesNotMatch(icon, /#0B6B3A/iu);
  assert.doesNotMatch(manifest, /#0B6B3A/iu);
  assert.doesNotMatch(openGraph, /#0B6B3A/iu);
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
