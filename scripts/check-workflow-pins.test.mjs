import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { findUnpinnedUses } from "./check-workflow-pins.mjs";

test("a full 40-character SHA passes", () => {
  const yaml = "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0\n";
  assert.deepEqual(findUnpinnedUses("w.yml", yaml), []);
});

test("the exact defect that killed the nightly audit is caught", () => {
  const yaml = [
    "      - name: Checkout",
    "        uses: actions/checkout@v4",
    "      - name: Setup Node",
    "        uses: actions/setup-node@v4",
  ].join("\n");
  const failures = findUnpinnedUses("ui-audit-nightly.yml", yaml);
  assert.equal(failures.length, 2);
  assert.ok(failures[0].includes("ui-audit-nightly.yml:2"));
  assert.ok(failures[1].includes("ui-audit-nightly.yml:4"));
});

test("a branch ref is caught, not only a version tag", () => {
  assert.equal(findUnpinnedUses("w.yml", "        uses: some/action@main\n").length, 1);
  assert.equal(findUnpinnedUses("w.yml", "        uses: some/action@master\n").length, 1);
});

test("a short SHA is not a pin", () => {
  // 7 characters resolve today and can collide later; the setting requires 40.
  assert.equal(findUnpinnedUses("w.yml", "        uses: a/b@11d5960\n").length, 1);
});

test("an action with no ref at all is caught", () => {
  assert.equal(findUnpinnedUses("w.yml", "        uses: actions/checkout\n").length, 1);
});

test("local and docker uses are exempt because they are not fetched by ref", () => {
  assert.deepEqual(findUnpinnedUses("w.yml", "        uses: ./.github/actions/setup\n"), []);
  assert.deepEqual(findUnpinnedUses("w.yml", "        uses: docker://alpine:3.20\n"), []);
});

test("a commented-out example is not a failure", () => {
  assert.deepEqual(findUnpinnedUses("w.yml", "        # uses: actions/checkout@v4\n"), []);
});

test("every workflow in this repository is pinned", () => {
  /*
   * The unit cases above prove the rule; this one proves the repository obeys it,
   * which is the part that was untrue for 27 days.
   */
  const dir = ".github/workflows";
  const names = readdirSync(dir).filter((name) => /\.ya?ml$/u.test(name));
  assert.ok(names.length > 0, "expected at least one workflow");
  const failures = names.flatMap((name) =>
    findUnpinnedUses(name, readFileSync(join(dir, name), "utf8")),
  );
  assert.deepEqual(failures, []);
});
