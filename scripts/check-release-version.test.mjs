import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { checkReleaseVersion } from "./check-release-version.mjs";

const good = ["# Changelog", "", "## [Chưa phát hành]", "", "## [0.1.0] — 2026-08-27", "", "- thing"].join("\n");

test("a matching version and changelog pass", () => {
  const result = checkReleaseVersion("0.1.0", good);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
  assert.equal(result.released, "0.1.0");
});

test("a version that drifts from the changelog fails", () => {
  /*
   * The exact drift this exists to stop: someone bumps `package.json` and the
   * changelog keeps describing the previous release as if it were current.
   */
  const result = checkReleaseVersion("0.2.0", good);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("0.2.0") && line.includes("0.1.0")));
});

test("a non-semver package version fails", () => {
  assert.equal(checkReleaseVersion("v0.1", good).ok, false);
});

test("a changelog with no unreleased section fails", () => {
  // Without it, new entries land under an already-tagged version and quietly
  // rewrite what that tag shipped.
  const noUnreleased = ["# Changelog", "", "## [0.1.0] — 2026-08-27"].join("\n");
  const result = checkReleaseVersion("0.1.0", noUnreleased);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("unreleased")));
});

test("a changelog with no dated release fails", () => {
  const result = checkReleaseVersion("0.1.0", "# Changelog\n\n## [Chưa phát hành]\n");
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("dated release")));
});

test("a duplicated version is reported", () => {
  const twice = [
    "# Changelog",
    "",
    "## [Chưa phát hành]",
    "",
    "## [0.1.0] — 2026-08-27",
    "",
    "## [0.1.0] — 2026-08-01",
  ].join("\n");
  const result = checkReleaseVersion("0.1.0", twice);
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((line) => line.includes("twice")));
});

test("a plain hyphen separator is accepted as well as an em dash", () => {
  const hyphen = good.replace("—", "-");
  assert.equal(checkReleaseVersion("0.1.0", hyphen).ok, true);
});

test("a prerelease version is valid semver", () => {
  const pre = good.replace("0.1.0", "0.2.0-beta.1");
  assert.equal(checkReleaseVersion("0.2.0-beta.1", pre).ok, true);
});

test("this repository satisfies the contract", () => {
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  const result = checkReleaseVersion(version, readFileSync("CHANGELOG.md", "utf8"));
  assert.deepEqual(result.failures, []);
});
