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
    /import \{ BrandLockup, BrandMark \} from "@\/components\/brand\/brand-lockup"/u,
  );
  assert.match(
    auth,
    /import \{ BrandLockup \} from "@\/components\/brand\/brand-lockup"/u,
  );
  assert.doesNotMatch(landing, /className=\{styles\.brandMark\}/u);
  assert.doesNotMatch(auth, /className=\{styles\.brandMark\}/u);
});

test("landing first viewport has one primary registration action", () => {
  assert.match(landing, /Biết chính xác tiền đã đi đâu\./u);
  assert.match(landing, /Bắt đầu ghi miễn phí/u);
  assert.doesNotMatch(landing, /className=\{styles\.primaryButton\}/u);
  assert.match(landing, /className=\{styles\.primaryButtonLarge\}/u);
  assert.match(landing, /className=\{styles\.secondaryButtonLarge\}/u);
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
