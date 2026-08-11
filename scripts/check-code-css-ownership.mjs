#!/usr/bin/env node
/**
 * The inverse of `check:dead-css`.
 *
 *   check:dead-css            CSS selector  → is anything rendering it?
 *   check:code-css-ownership  emitted class → who owns its presentation?
 *   check:css-ownership       cascade, global-owner rules, !important budget
 *
 * Three different claims. None implies another.
 *
 * MF-04 is the gap this closes: after Phase 4-10 retired the global presentation
 * generations, several components kept emitting their class names. The markup
 * still renders — visible, sized, accessibly named, completely unstyled — so
 * every existing gate stayed green while `/onboarding` shipped as raw HTML.
 *
 * Ownership is decided by `scripts/lib/presentation-ownership.mjs`, which keeps
 * selector context instead of flattening the bundle into a set of names. A class
 * styled only beneath a hashed ancestor is *not* owned for the surfaces that
 * emit it elsewhere.
 *
 * Shrink-only is measured against approved git history, not against the baseline
 * file in the working tree, so a branch cannot add a broken class and a matching
 * allowance together and stay green.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { collectEmittedClasses, collectSourceReferences } from "./check-dead-css.mjs";
import {
  auditBaseline,
  classifyEmittedTokens,
  indexOwnerCandidates,
  ownerCandidatesForSelector,
  splitSelectorList,
  violationsFrom,
} from "./lib/presentation-ownership.mjs";

const root = process.cwd();
const BASELINE = "docs/research/presentation-ownership-baseline.json";
const BUILD_CSS_DIR = ".next/static";

function read(relativePath) {
  try {
    return readFileSync(join(root, relativePath), "utf8");
  } catch {
    return null;
  }
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

/**
 * Production CSS only.
 *
 * `.next/dev/**` is excluded by construction: it holds chunks from stylesheets
 * that no longer exist, and scanning it once made a retired class look owned —
 * the exact false green this gate exists to prevent.
 */
function builtStylesheets() {
  const dir = join(root, BUILD_CSS_DIR);
  if (!existsSync(dir)) return null;
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".css")) files.push(path);
    }
  };
  walk(dir);
  return files;
}

/** Owner candidates from the bundle, with selector context intact. */
function ownerCandidatesFromBuild() {
  const files = builtStylesheets();
  if (files === null || files.length === 0) {
    console.error(
      `[check:code-css-ownership] no production CSS under ${BUILD_CSS_DIR}.\n` +
        `Run \`npm run build\` first — ownership is read from the real bundle, not\n` +
        `from a re-implementation of the CSS pipeline.`,
    );
    process.exit(1);
  }

  const candidates = [];
  for (const file of files) {
    const relative = file.slice(root.length + 1);
    let ast;
    try {
      ast = postcss.parse(readFileSync(file, "utf8"), { from: file });
    } catch (error) {
      console.error(`[check:code-css-ownership] could not parse ${relative}: ${error.message}`);
      process.exit(1);
    }
    ast.walkRules((rule) => {
      // At-rule conditions (media, supports, layers) never require another
      // application class, so they are recorded but do not block certification.
      const conditions = [];
      for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
        if (parent.type === "atrule") conditions.push(`@${parent.name} ${parent.params}`.trim());
      }
      for (const selector of splitSelectorList(rule.selector)) {
        candidates.push(
          ...ownerCandidatesForSelector(selector, {
            stylesheet: relative,
            conditionalContext: conditions.length > 0 ? conditions.join(" / ") : null,
          }),
        );
      }
    });
  }
  return { candidates, fileCount: files.length };
}

function parseBaseline(raw, label) {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return (parsed.entries ?? []).map((entry) => entry.class);
  } catch (error) {
    console.error(`[check:code-css-ownership] ${label} is not valid JSON: ${error.message}`);
    process.exit(1);
  }
}

/**
 * The approved baseline, read from git rather than from the working tree.
 *
 * Normal mode: the baseline as of the merge base with origin/main.
 *
 * Bootstrap: this PR introduces the baseline, so the merge base has no file. The
 * approved set is then the baseline at the commit that first added it on this
 * branch — an immutable history reference that is part of the reviewed diff. The
 * condition is structural, not a flag: once this lands, the merge base has the
 * file and normal mode applies automatically. There is no bypass to remove.
 */
function approvedBaseline() {
  const base = (git(["merge-base", "origin/main", "HEAD"]) ?? "").trim();
  if (!base) return { entries: null, mode: "unavailable", ref: null };

  const atBase = git(["show", `${base}:${BASELINE}`]);
  if (atBase !== null) {
    return { entries: parseBaseline(atBase, `${base}:${BASELINE}`), mode: "merge-base", ref: base };
  }

  const introducing = (git([
    "log",
    "--diff-filter=A",
    "--format=%H",
    `${base}..HEAD`,
    "--",
    BASELINE,
  ]) ?? "")
    .trim()
    .split("\n")
    .filter(Boolean)
    .pop();

  if (!introducing) return { entries: null, mode: "bootstrap-pending", ref: null };

  const atIntroducing = git(["show", `${introducing}:${BASELINE}`]);
  return {
    entries: parseBaseline(atIntroducing, `${introducing}:${BASELINE}`),
    mode: "bootstrap",
    ref: introducing,
  };
}

/* ------------------------------------------------------------------ run --- */

const { referenced, runtimePrefixes, files: productFiles } = collectEmittedClasses();
const { candidates, fileCount } = ownerCandidatesFromBuild();
const index = indexOwnerCandidates(candidates);
const buckets = classifyEmittedTokens(referenced, index, [...runtimePrefixes]);
const violations = violationsFrom(buckets);

const currentBaseline = parseBaseline(read(BASELINE), BASELINE) ?? [];
const approved = approvedBaseline();
const verdict = auditBaseline({
  violations,
  currentBaseline,
  approvedBaseline: approved.entries,
});

/**
 * Proposal mode. Writes a *candidate* file beside the baseline and never
 * satisfies the gate. An earlier version had a regenerate-in-place flag, which
 * let new debt become an allowance and turn CI green — that defeated
 * shrink-only, so no such flag exists here.
 */
if (process.argv.includes("--propose-baseline")) {
  const emittedBy = new Map();
  for (const file of productFiles) {
    const perFile = new Set();
    collectSourceReferences(file, perFile, new Set());
    const relative = file.startsWith(root) ? file.slice(root.length + 1) : file;
    for (const token of perFile) {
      if (!emittedBy.has(token)) emittedBy.set(token, []);
      emittedBy.get(token).push(relative);
    }
  }
  const existing = new Map(
    (JSON.parse(read(BASELINE) ?? '{"entries":[]}').entries ?? []).map((entry) => [
      entry.class,
      entry,
    ]),
  );
  const entries = violations.map((token) => {
    const owners = (emittedBy.get(token) ?? []).sort();
    const reason = buckets.contextualUnproven.includes(token)
      ? `styled only by a contextual selector, with no proven ancestor at the emission site (e.g. ${index.contextual.get(token)?.[0] ?? "?"})`
      : buckets.unknown.includes(token)
        ? "bare token, ownership not provable without reading the call site"
        : "semantic class with no unconditional owner in the production bundle";
    return {
      class: token,
      owner: existing.get(token)?.owner ?? owners[0] ?? "unknown",
      alsoEmittedBy: owners.slice(1),
      reason: existing.get(token)?.reason ?? reason,
      status: existing.get(token)?.status ?? "debt",
    };
  });
  writeFileSync(join(root, `${BASELINE}.proposed`), `${JSON.stringify({ entries }, null, 2)}\n`);
  console.log(
    `[check:code-css-ownership] wrote ${entries.length} candidate entries to ` +
      `${BASELINE}.proposed.\nThis is a proposal only: the gate still compares the ` +
      `committed baseline against approved history and fails on growth.`,
  );
}

console.log(
  JSON.stringify(
    {
      emittedTokens: referenced.size,
      builtStylesheets: fileCount,
      ownerCandidates: candidates.length,
      ownedUnconditional: buckets.ownedUnconditional.length,
      ownedUtility: buckets.ownedUtility.length,
      tailwindVariantPrefix: buckets.variantPrefix.length,
      contextualUnproven: buckets.contextualUnproven.length,
      dynamicFamily: buckets.dynamic.length,
      notPresentation: buckets.notPresentation.length,
      confirmedUnowned: buckets.confirmedUnowned.length,
      unknown: buckets.unknown.length,
      baselineCurrent: currentBaseline.length,
      baselineApproved: approved.entries === null ? null : approved.entries.length,
      baselineMode: approved.mode,
      baselineRef: approved.ref ? approved.ref.slice(0, 7) : null,
      newUnowned: verdict.unexpected.length,
      staleAllowances: verdict.stale.length,
      baselineAdded: verdict.added.length,
      baselineRemoved: verdict.removed.length,
    },
    null,
    2,
  ),
);

const problems = [];

if (approved.mode === "unavailable" || approved.mode === "bootstrap-pending") {
  problems.push(
    `  Cannot establish an approved baseline from git history (mode: ${approved.mode}).\n` +
      `  Shrink-only is meaningless without it, so this fails rather than passes.\n` +
      `  Ensure origin/main is fetched and the baseline commit is present.`,
  );
}

if (verdict.unexpected.length > 0) {
  problems.push(
    `  ${verdict.unexpected.length} class name(s) have no proven presentation owner and are not in the baseline:\n` +
      verdict.unexpected.map((token) => `    .${token}`).join("\n") +
      `\n\n  Give each one an owner: a CSS Module class reached through \`styles.x\`, an\n` +
      `  unconditional selector beside the component, or a Tailwind utility. A class\n` +
      `  styled only under someone else's ancestor does not count.`,
  );
}

if (verdict.added.length > 0) {
  problems.push(
    `  ${verdict.added.length} baseline entr(ies) were added relative to approved history\n` +
      `  (${approved.mode} ${approved.ref?.slice(0, 7) ?? "?"}):\n` +
      verdict.added.map((token) => `    .${token}`).join("\n") +
      `\n\n  The baseline may only shrink. Fix the class instead of allowing it.`,
  );
}

if (verdict.stale.length > 0) {
  problems.push(
    `  ${verdict.stale.length} baseline entr(ies) no longer describe real debt:\n` +
      verdict.stale.map((token) => `    .${token}`).join("\n") +
      `\n\n  Remove them from ${BASELINE}.`,
  );
}

if (problems.length > 0) {
  console.error(`[check:code-css-ownership] FAIL\n`);
  for (const line of problems) console.error(line);
  process.exit(1);
}

console.log(
  `[check:code-css-ownership] every emitted class has a proven owner or a reviewed ` +
    `allowance (${currentBaseline.length} remaining, ${verdict.removed.length} removed vs ${approved.mode}).`,
);
