import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/components/inbox/capture-page.tsx", "utf8");
const css = readFileSync(
  "src/components/inbox/capture-page.module.css",
  "utf8",
);

test("capture page styles itself through its CSS module — no bare global classes", () => {
  // The Phase-10 stylesheet replay deleted the global capture-* classes this
  // page referenced and left /capture fully unstyled. Every class the page
  // renders must now resolve through the module import.
  assert.match(page, /import styles from "\.\/capture-page\.module\.css"/);
  assert.doesNotMatch(
    page,
    /className="[^"]*(?:capture|eyebrow|panel|secondary-button|transactions-title-row|page-heading-actions|dashboard)[^"]*"/,
    "bare global class names must not come back",
  );

  for (const used of page.matchAll(/styles\.([A-Za-z]+)/g)) {
    assert.match(
      css,
      new RegExp(`\\.${used[1]}\\b`),
      `.${used[1]} is rendered but not defined in the module`,
    );
  }
});

test("capture module keeps the restored layout contract", () => {
  // The option grid, card surface and trust footer are the visual structure
  // users saw before the purge — token-based, one owner, no !important.
  for (const cls of [
    "workspace",
    "titleRow",
    "eyebrow",
    "menu",
    "menuActions",
    "option",
    "optionIcon",
    "optionText",
    "trust",
  ]) {
    assert.match(css, new RegExp(`\\.${cls}\\b`), `.${cls} must exist`);
  }
  assert.match(css, /var\(--mf-brand\b|--mf-brand-/);
  assert.match(css, /var\(--mf-border\)/);
  assert.doesNotMatch(css, /!important/);
  // A trapdoor class on the interactive link must exist or the unstyled
  // LinkButton renders invisible padding targets.
  assert.match(css, /\.option\b[^}]*text-decoration:\s*none/);
});
