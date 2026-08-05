import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUiMigrationDiff, parseUnifiedDiff } from "./check-ui-migration-diff.mjs";

function patch(path, addedLines, { newFile = false } = {}) {
  const body = addedLines.map((line) => `+${line}`).join("\n");
  return [
    `diff --git a/${path} b/${path}`,
    ...(newFile ? ["new file mode 100644", "--- /dev/null"] : [`--- a/${path}`]),
    `+++ b/${path}`,
    `@@ -0,0 +1,${addedLines.length} @@`,
    body,
  ].join("\n");
}

const rules = (result) => result.violations.map((item) => item.rule);

test("parseUnifiedDiff records added file, line and new-file state", () => {
  const result = parseUnifiedDiff(patch("src/app/example.css", [".x {}", ".y {}"], { newFile: true }));
  assert.deepEqual(result, [
    { file: "src/app/example.css", line: 1, content: ".x {}", isNewFile: true },
    { file: "src/app/example.css", line: 2, content: ".y {}", isNewFile: true },
  ]);
});

test("new App Router global stylesheets and imports are rejected", () => {
  const result = evaluateUiMigrationDiff({
    patch: [
      patch("src/app/reports/report.css", [".report {}"], { newFile: true }),
      patch("src/app/reports/page.tsx", ['import "./report.css";']),
    ].join("\n"),
  });
  assert.ok(rules(result).includes("no-new-route-global-css"));
  assert.ok(rules(result).includes("no-new-global-css-import"));
});

test("CSS Module imports remain allowed", () => {
  const result = evaluateUiMigrationDiff({
    patch: patch("src/app/reports/page.tsx", ['import styles from "./report.module.css";']),
  });
  assert.equal(result.violations.length, 0);
});

test("new important declarations require an explicit reason", () => {
  const rejected = evaluateUiMigrationDiff({
    patch: patch("src/components/ui/button.module.css", [".button { min-height: 44px !important; }"]),
  });
  assert.ok(rules(rejected).includes("no-new-important"));

  const allowed = evaluateUiMigrationDiff({
    patch: patch("src/components/ui/button.module.css", [
      ".button { min-height: 44px !important; } /* ui-migration: allow-important -- temporary vendor override */",
    ]),
  });
  assert.equal(allowed.violations.length, 0);
});

test("undefined token references fail while known and documented runtime tokens pass", () => {
  const rejected = evaluateUiMigrationDiff({
    patch: patch("src/components/ui/button.module.css", [".button { color: var(--mf-missing); }"]),
    definedTokens: new Set(["--mf-brand"]),
  });
  assert.ok(rules(rejected).includes("known-token-reference"));

  const allowed = evaluateUiMigrationDiff({
    patch: patch("src/components/ui/button.module.css", [
      ".button { color: var(--mf-brand); width: var(--radix-popover-trigger-width); }",
    ]),
    definedTokens: new Set(["--mf-brand"]),
  });
  assert.equal(allowed.violations.length, 0);
});

test("new /insights references fail outside the compatibility redirect", () => {
  const rejected = evaluateUiMigrationDiff({
    patch: patch("e2e/audit/responsive.audit.spec.ts", ['await page.goto("/insights");']),
  });
  assert.ok(rules(rejected).includes("canonical-dashboard-route"));

  const allowed = evaluateUiMigrationDiff({
    patch: patch("src/app/insights/page.tsx", ['redirect("/dashboard");']),
  });
  assert.equal(allowed.violations.length, 0);
});

test("new route/component registrations of known legacy classes fail", () => {
  const multiToken = evaluateUiMigrationDiff({
    patch: patch("src/components/accounts-page.tsx", [
      '<main className={`${styles.workspace} dashboard accounts-workspace`}>',
    ]),
  });
  assert.ok(rules(multiToken).includes("no-new-legacy-class-registration"));

  const singleToken = evaluateUiMigrationDiff({
    patch: patch("src/components/example.tsx", ['<main className="dashboard">']),
  });
  assert.ok(rules(singleToken).includes("no-new-legacy-class-registration"));

  const allowed = evaluateUiMigrationDiff({
    patch: patch("src/components/accounts-page.tsx", [
      '<main className={styles.workspace}>',
    ]),
  });
  assert.equal(allowed.violations.length, 0);
});

test("documentation and deletion-only patches do not create violations", () => {
  const documentation = evaluateUiMigrationDiff({
    patch: patch("docs/design/example.md", ["Use /insights only when describing history and `!important` debt."]),
  });
  assert.equal(documentation.violations.length, 0);

  const deletionOnly = evaluateUiMigrationDiff({
    patch: [
      "diff --git a/src/app/old.css b/src/app/old.css",
      "--- a/src/app/old.css",
      "+++ b/src/app/old.css",
      "@@ -1 +0,0 @@",
      "-.old { display: none !important; }",
    ].join("\n"),
  });
  assert.equal(deletionOnly.violations.length, 0);
});
