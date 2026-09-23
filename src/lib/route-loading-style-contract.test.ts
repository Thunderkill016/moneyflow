import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const css = readFileSync("src/app/route-loading.module.css", "utf8");

function loadingFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(
    (entry): string[] => {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) return loadingFiles(p);
      return entry.name === "loading.tsx" ? [p] : [];
    },
  );
}

const files = loadingFiles("src/app");

test("route loading module exists and every skeleton class it exports is real", () => {
  for (const cls of [
    "route",
    "line",
    "lineWide",
    "lineShort",
    "card",
    "cardTall",
    "block",
    "skelRow",
    "grid",
    "rows",
    "panel",
  ]) {
    assert.match(css, new RegExp(`\\.${cls}\\b`), `.${cls} missing`);
  }
  assert.doesNotMatch(css, /!important/);
});

test("loading routes import the shared module instead of dead global classes", () => {
  const dead =
    /className="[^"]*(?:route-loading|loading-line|loading-card|skeleton|-skel-)[^"]*"/;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(
      src,
      dead,
      `${file} re-emitted a dead global skeleton class — the Phase-10 purge left every one of them unstyled`,
    );

    if (/styles\./.test(src)) {
      assert.match(
        src,
        /import styles from "[./]*[\w-]+\.module\.css"/,
        `${file} uses styles.* without importing a CSS module`,
      );
      // The shared route-loading module is the default owner; routes may keep
      // their own co-located module instead (e.g. activity/loading.module.css).
      const usesShared =
        /import styles from "[./]*route-loading\.module\.css"/.test(src);
      if (usesShared) {
        for (const used of src.matchAll(/styles\.([A-Za-z]+)/g)) {
          assert.match(
            css,
            new RegExp(`\\.${used[1]}\\b`),
            `.${used[1]} rendered by ${file} is not defined in the module`,
          );
        }
      }
    }
  }
});
