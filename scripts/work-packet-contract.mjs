#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const WORK_PACKET_TEMPLATE = "docs/templates/FEATURE_WORK_PACKET.md";

export const CONTROL_CONTRACT = {
  "### State": ["Location", "Writer/owner", "Propagation"],
  "### Feedback": [
    "Expected failing signal",
    "Success signal",
    "Semantic evidence",
  ],
  "### Removal impact": ["What breaks if removed", "Rollback"],
  "### Action safety": [
    "Permissions",
    "Reversibility",
    "Escalation",
    "Failure containment",
  ],
};

const ACTIVE_PACKET_PATHSPEC = ":(glob)docs/plans/active/*.md";

function headingCount(markdown, heading) {
  return markdown
    .split(/\r?\n/u)
    .filter((line) => line.trim() === heading).length;
}

function sectionBody(markdown, heading) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;

  const level = heading.match(/^#+/u)?.[0].length ?? 0;
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(#+)\s/u);
    if (match && match[1].length <= level) break;
    body.push(line);
  }
  return body.join("\n");
}

function fieldValues(section, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [...section.matchAll(new RegExp(`^-\\s+${escaped}:\\s*(.*)$`, "gmu"))]
    .map((match) => match[1].trim());
}

function isUnresolved(value) {
  if (value === null || value.length === 0) return true;
  if (/<[^>\n]+>/u.test(value)) return true;
  if (/^(?:todo|tbd|unknown)\b/iu.test(value)) return true;
  return /^(?:n\/?a|not applicable|none)$/iu.test(value);
}

function normalizeSignal(value) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function validateWorkPacket(markdown, { allowPlaceholders = false } = {}) {
  const failures = [];
  const controlHeading = "## Control contract";
  const controlCount = headingCount(markdown, controlHeading);

  if (controlCount === 0) {
    failures.push(`missing required heading: ${controlHeading}`);
    return failures;
  }
  if (controlCount > 1) {
    failures.push(`duplicate required heading: ${controlHeading}`);
  }

  const controlSection = sectionBody(markdown, controlHeading);
  if (controlSection === null) return failures;

  const values = new Map();
  for (const [heading, fields] of Object.entries(CONTROL_CONTRACT)) {
    const count = headingCount(controlSection, heading);
    if (count === 0) {
      failures.push(`${controlHeading} is missing required heading: ${heading}`);
      continue;
    }
    if (count > 1) {
      failures.push(`${controlHeading} has duplicate heading: ${heading}`);
    }

    const section = sectionBody(controlSection, heading);
    if (section === null) continue;

    for (const field of fields) {
      const matches = fieldValues(section, field);
      const value = matches[0] ?? null;
      values.set(`${heading}:${field}`, value);
      if (matches.length === 0) {
        failures.push(`${heading} is missing field: ${field}`);
      } else {
        if (matches.length > 1) {
          failures.push(`${heading} has duplicate field: ${field}`);
        }
        if (!allowPlaceholders && isUnresolved(value)) {
          failures.push(`${heading} has unresolved field: ${field}`);
        }
      }
    }
  }

  if (!allowPlaceholders) {
    const expected = values.get("### Feedback:Expected failing signal");
    const success = values.get("### Feedback:Success signal");
    const semantic = values.get("### Feedback:Semantic evidence");

    if (
      expected &&
      success &&
      normalizeSignal(expected) === normalizeSignal(success)
    ) {
      failures.push(
        "### Feedback must distinguish the expected failing signal from the success signal",
      );
    }
    if (
      success &&
      semantic &&
      normalizeSignal(success) === normalizeSignal(semantic)
    ) {
      failures.push(
        "### Feedback must distinguish the deterministic success signal from semantic evidence",
      );
    }
  }

  return failures;
}

function runGit(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function verifyRef(root, ref) {
  return runGit(root, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${ref}^{commit}`,
  ]);
}

function resolveBase(root, requestedBase) {
  const explicitBase = requestedBase ?? process.env.WORK_PACKET_BASE ?? null;
  if (explicitBase) {
    if (verifyRef(root, explicitBase)) {
      return { base: explicitBase, error: null };
    }
    return {
      base: null,
      error: `requested work-packet base ref does not exist: ${explicitBase}`,
    };
  }

  for (const candidate of ["main", "origin/main"]) {
    if (verifyRef(root, candidate)) return { base: candidate, error: null };
  }
  return {
    base: null,
    error: "work-packet diff scope requires a resolvable main or origin/main ref",
  };
}

function changedPaths(root, args, errorMessage) {
  const output = runGit(root, args);
  if (output === null) return { files: [], error: errorMessage };
  return { files: output.split(/\r?\n/u).filter(Boolean), error: null };
}

export function collectChangedActivePackets(root, requestedBase = null) {
  const resolved = resolveBase(root, requestedBase);
  if (resolved.error) {
    return { files: [], error: resolved.error, base: null };
  }

  const mergeBase = runGit(root, ["merge-base", "HEAD", resolved.base]);
  if (!mergeBase) {
    return {
      files: [],
      error: `work-packet diff scope could not find a merge base with ${resolved.base}`,
      base: resolved.base,
    };
  }

  const sources = [
    changedPaths(
      root,
      [
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        `${mergeBase}...HEAD`,
        "--",
        ACTIVE_PACKET_PATHSPEC,
      ],
      "work-packet committed diff could not be read from Git",
    ),
    changedPaths(
      root,
      [
        "diff",
        "--cached",
        "--name-only",
        "--diff-filter=ACMR",
        "--",
        ACTIVE_PACKET_PATHSPEC,
      ],
      "work-packet staged diff could not be read from Git",
    ),
    changedPaths(
      root,
      [
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        "--",
        ACTIVE_PACKET_PATHSPEC,
      ],
      "work-packet unstaged diff could not be read from Git",
    ),
    changedPaths(
      root,
      [
        "ls-files",
        "--others",
        "--exclude-standard",
        "--",
        ACTIVE_PACKET_PATHSPEC,
      ],
      "work-packet untracked-file scope could not be read from Git",
    ),
  ];

  const failedSource = sources.find((source) => source.error);
  if (failedSource) {
    return { files: [], error: failedSource.error, base: resolved.base };
  }

  return {
    files: [...new Set(sources.flatMap((source) => source.files))].sort(),
    error: null,
    base: resolved.base,
  };
}

export function validateRepositoryWorkPackets(root, requestedBase = null) {
  const failures = [];
  const warnings = [];
  const templatePath = resolve(root, WORK_PACKET_TEMPLATE);

  if (!existsSync(templatePath)) {
    failures.push(`missing work-packet template: ${WORK_PACKET_TEMPLATE}`);
  } else {
    for (const failure of validateWorkPacket(readFileSync(templatePath, "utf8"), {
      allowPlaceholders: true,
    })) {
      failures.push(`${WORK_PACKET_TEMPLATE}: ${failure}`);
    }
  }

  const changed = collectChangedActivePackets(root, requestedBase);
  if (changed.error) {
    failures.push(`work-packet scope unavailable: ${changed.error}`);
  }

  for (const file of changed.files) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) continue;
    for (const failure of validateWorkPacket(readFileSync(absolute, "utf8"))) {
      failures.push(`${relative(root, absolute)}: ${failure}`);
    }
  }

  return {
    failures,
    warnings,
    checkedPackets: changed.files,
    base: changed.base,
  };
}

export function main(argv = process.argv.slice(2)) {
  const baseIndices = argv
    .map((value, index) => (value === "--base" ? index : -1))
    .filter((index) => index !== -1);
  if (baseIndices.length > 1) {
    console.error("--base may be provided only once");
    return 2;
  }

  const baseIndex = baseIndices[0] ?? -1;
  const requestedBase = baseIndex === -1 ? null : argv[baseIndex + 1];
  if (baseIndex !== -1 && (!requestedBase || requestedBase.startsWith("--"))) {
    console.error("--base requires a Git ref");
    return 2;
  }

  const consumedIndices = new Set();
  if (baseIndex !== -1) {
    consumedIndices.add(baseIndex);
    consumedIndices.add(baseIndex + 1);
  }
  const unknownArgs = argv.filter((value, index) => !consumedIndices.has(index));
  if (unknownArgs.length > 0) {
    console.error(`unknown argument(s): ${unknownArgs.join(", ")}`);
    return 2;
  }

  const result = validateRepositoryWorkPackets(process.cwd(), requestedBase);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const failure of result.failures) console.error(`error: ${failure}`);

  if (result.failures.length === 0) {
    console.log(
      `Work-packet contract passed (${result.checkedPackets.length} changed active packet(s), base ${result.base}).`,
    );
  }
  return result.failures.length > 0 ? 1 : 0;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) process.exitCode = main();
