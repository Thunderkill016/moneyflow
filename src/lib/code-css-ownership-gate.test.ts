import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import postcss from "postcss";
import {
  auditBaseline,
  classifyEmittedTokens,
  indexOwnerCandidates,
  ownerCandidatesForSelector,
  splitSelectorList,
  violationsFrom,
} from "../../scripts/lib/presentation-ownership.mjs";

/**
 * MF-04 gate contract.
 *
 * "The checker exits 0 on the current repository" proves nothing — a checker
 * that always passes does that too. These drive the decision functions with
 * fixtures and require them to fail.
 *
 * Every selector case below failed the first implementation, which flattened the
 * bundle into a set of class names and so treated `.dashboardHash .x` as global
 * ownership of `.x`.
 */

const BASELINE = "docs/research/presentation-ownership-baseline.json";

/** Same path the gate uses: parse CSS, keep selector context, classify. */
function ownershipOf(css: string, emitted: string[]) {
  const candidates: ReturnType<typeof ownerCandidatesForSelector> = [];
  postcss.parse(css).walkRules((rule) => {
    for (const selector of splitSelectorList(rule.selector)) {
      candidates.push(...ownerCandidatesForSelector(selector, { stylesheet: "fixture.css" }));
    }
  });
  return classifyEmittedTokens(new Set(emitted), indexOwnerCandidates(candidates), []);
}

/* ---------------------------------------------------- selector semantics --- */

test("A: a contextual selector does not certify the class it styles", () => {
  // The reported defect: dashboard.module.css styles .secondary-button only
  // beneath its hashed ancestor, while empty-state, reconciliation, capture and
  // route-error surfaces emit it elsewhere.
  const buckets = ownershipOf(
    ".dashboardHash .secondary-button { color: red }",
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, []);
  assert.deepEqual(buckets.contextualUnproven, ["secondary-button"]);
  assert.ok(violationsFrom(buckets).includes("secondary-button"));
});

test("B: an unconditional selector certifies the class", () => {
  const buckets = ownershipOf(".secondary-button { color: red }", ["secondary-button"]);

  assert.deepEqual(buckets.ownedUnconditional, ["secondary-button"]);
  assert.deepEqual(violationsFrom(buckets), []);
});

test("B2: pseudo-classes and elements do not make a selector contextual", () => {
  const buckets = ownershipOf(
    "button.secondary-button:hover::after { content: '' }",
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, ["secondary-button"]);
});

test("C: a document/theme condition still certifies the class", () => {
  const buckets = ownershipOf(
    'html[data-theme="dark"] .secondary-button { color: white }',
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, ["secondary-button"]);
});

test("C2: an at-rule condition still certifies the class", () => {
  const buckets = ownershipOf(
    "@media (min-width: 40rem) { .secondary-button { color: red } }",
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, ["secondary-button"]);
});

test("D: a :global() compiled under a module local does not certify globally", () => {
  // CSS Modules hash the local class, so the bundle contains
  // `.localHash .secondary-button` — a contextual owner, not a global one.
  const buckets = ownershipOf(
    ".onboarding-module__abc123__card .secondary-button { color: red }",
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, []);
  assert.deepEqual(buckets.contextualUnproven, ["secondary-button"]);
});

test("D2: a module local class never certifies a literal of the same name", () => {
  const buckets = ownershipOf(".onboarding-module__abc123__card { padding: 8px }", ["card"]);

  assert.deepEqual(buckets.ownedUnconditional, []);
  assert.ok(violationsFrom(buckets).includes("card"));
});

test("E: a real Tailwind variant utility from the bundle stays owned", () => {
  // The source scanner splits `hover:bg-muted` into `hover` and `bg-muted`;
  // the bundle escapes it as `.hover\:bg-muted`. Both halves must resolve.
  const buckets = ownershipOf(
    ".flex { display: flex }\n.hover\\:bg-muted:hover { background: grey }",
    ["flex", "hover", "bg-muted"],
  );

  assert.deepEqual(buckets.ownedUnconditional, ["flex"]);
  assert.deepEqual(buckets.ownedUtility, ["bg-muted"]);
  assert.deepEqual(buckets.variantPrefix, ["hover"]);
  assert.deepEqual(violationsFrom(buckets), []);
});

test("a second class in the same compound makes it contextual", () => {
  const buckets = ownershipOf(".secondary-button.is-active { color: red }", [
    "secondary-button",
  ]);

  assert.deepEqual(buckets.contextualUnproven, ["secondary-button"]);
});

test("one unconditional rule is enough even when contextual ones also exist", () => {
  const buckets = ownershipOf(
    ".dashboardHash .secondary-button { color: red }\n.secondary-button { color: blue }",
    ["secondary-button"],
  );

  assert.deepEqual(buckets.ownedUnconditional, ["secondary-button"]);
  assert.deepEqual(violationsFrom(buckets), []);
});

test("selector lists are split before classification", () => {
  assert.deepEqual(splitSelectorList('.a, .b:is(.c, .d), [x=","]').length, 3);

  const buckets = ownershipOf(".other .x, .x { color: red }", ["x"]);
  assert.deepEqual(buckets.ownedUnconditional, ["x"]);
});

/* ----------------------------------------------------- baseline history --- */

test("new debt plus a matching baseline entry fails as growth", () => {
  // The exact bypass reported: add a broken class and an allowance together.
  const verdict = auditBaseline({
    violations: ["old-debt", "new-broken"],
    currentBaseline: ["old-debt", "new-broken"],
    approvedBaseline: ["old-debt"],
  });

  assert.deepEqual(verdict.unexpected, [], "the allowance silences the direct check");
  assert.deepEqual(verdict.added, ["new-broken"], "history must still reject it");
});

test("a legitimate shrink passes", () => {
  const verdict = auditBaseline({
    violations: ["a"],
    currentBaseline: ["a"],
    approvedBaseline: ["a", "b"],
  });

  assert.deepEqual(verdict.unexpected, []);
  assert.deepEqual(verdict.added, []);
  assert.deepEqual(verdict.stale, []);
  assert.deepEqual(verdict.removed, ["b"]);
});

test("a stale allowance still fails", () => {
  const verdict = auditBaseline({
    violations: [],
    currentBaseline: ["a"],
    approvedBaseline: ["a"],
  });

  assert.deepEqual(verdict.stale, ["a"]);
});

test("unchanged debt passes", () => {
  const verdict = auditBaseline({
    violations: ["a"],
    currentBaseline: ["a"],
    approvedBaseline: ["a"],
  });

  assert.deepEqual(verdict.unexpected, []);
  assert.deepEqual(verdict.stale, []);
  assert.deepEqual(verdict.added, []);
});

test("a new violation with no allowance fails directly", () => {
  const verdict = auditBaseline({
    violations: ["a", "new-broken"],
    currentBaseline: ["a"],
    approvedBaseline: ["a"],
  });

  assert.deepEqual(verdict.unexpected, ["new-broken"]);
});

test("bootstrap: the first baseline may be established, but not grown", () => {
  // During adoption the approved set is this branch's introducing commit, so the
  // same growth rule already applies within the PR.
  const established = auditBaseline({
    violations: ["a", "b"],
    currentBaseline: ["a", "b"],
    approvedBaseline: ["a", "b"],
  });
  assert.deepEqual(established.added, []);
  assert.deepEqual(established.unexpected, []);

  const grown = auditBaseline({
    violations: ["a", "b", "c"],
    currentBaseline: ["a", "b", "c"],
    approvedBaseline: ["a", "b"],
  });
  assert.deepEqual(grown.added, ["c"], "growth is rejected even while bootstrapping");
});

/* ------------------------------------------------------------- artefacts --- */

test("the baseline is per-token and carries no wildcards", () => {
  const entries = JSON.parse(readFileSync(BASELINE, "utf8")).entries as {
    class: string;
    owner: string;
    reason: string;
  }[];
  assert.ok(entries.length > 0, "baseline must describe the current debt");

  for (const entry of entries) {
    assert.doesNotMatch(entry.class, /[*?]/u, `${entry.class} looks like a wildcard`);
    assert.match(entry.class, /^-?[_a-zA-Z][\w-]*$/u, `${entry.class} is not a class name`);
    assert.ok(entry.owner && entry.owner !== "unknown", `${entry.class} has no owner recorded`);
    assert.ok(entry.reason?.length > 0, `${entry.class} has no reason recorded`);
  }

  const classes = entries.map((entry) => entry.class);
  assert.equal(new Set(classes).size, classes.length, "baseline has duplicate entries");
});

test("the gate refuses to run without a production build", () => {
  const scratch = mkdtempSync(join(tmpdir(), "mf04-"));
  try {
    writeFileSync(join(scratch, "package.json"), '{"type":"module"}\n');
    let failed = false;
    let output = "";
    try {
      execFileSync(process.execPath, [join(process.cwd(), "scripts/check-code-css-ownership.mjs")], {
        cwd: scratch,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      failed = true;
      const shell = error as { stdout?: Buffer; stderr?: Buffer };
      output = `${shell.stdout ?? ""}${shell.stderr ?? ""}`;
    }
    assert.ok(failed, "the gate must exit non-zero when no production CSS exists");
    assert.match(output, /npm run build|production CSS/u);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("no bypass flag survives in the gate", () => {
  const source = readFileSync("scripts/check-code-css-ownership.mjs", "utf8");
  assert.doesNotMatch(source, /--write-baseline/u, "regenerating debt must not be possible");
  assert.doesNotMatch(source, /ALLOW_BASELINE_GROWTH/u, "no permanent growth bypass");
  assert.match(source, /--propose-baseline/u, "proposal mode should remain available");
});

test("fractional and opacity utility fragments resolve to the owner they came from", () => {
  /*
   * The source tokenizer splits on `.` and `/`, so `gap-0.5` arrives as `gap-0`
   * and `bg-black/50` as `bg-black`. Deciding those by looking for a bare
   * `.gap-0` rule made the gate flap between identical builds.
   */
  const buckets = ownershipOf(
    ".gap-0\\.5 { gap: 2px }\n.bg-black\\/50 { background: #0008 }\n.-translate-y-1\\/2 { translate: 0 -50% }",
    ["gap-0", "bg-black", "-translate-y-1"],
  );

  assert.deepEqual(buckets.ownedUtility.sort(), ["-translate-y-1", "bg-black", "gap-0"]);
  assert.deepEqual(violationsFrom(buckets), []);
});
