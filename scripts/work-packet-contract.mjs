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

function fieldValue(section, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = section.match(new RegExp(`^-\\s+${escaped}:\\s*(.*)$`, "mu"));
  return match?.[1]?.trim() ?? null;
}

function isUnresolved(value) {
  if (value === null || value.length === 0) return true;
  if (/^<.*>$/u.test(value)) return true;
  return /^(todo|tbd|unknown)$/iu.test(value);
}

export function validateWorkPacket(markdown, { allowPlaceholders = false } = {}) {
  const failures = [];

  if (!markdown.includes("## Control contract")) {
    failures.push("missing required heading: ## Control contract");
  }

  for (const [heading, fields] of Object.entries(CONTROL_CONTRACT)) {
    const section = sectionBody(markdown, heading);
    if (section === null) {
      failures.push(`missing required heading: ${heading}`);
      continue;
    }

    for (const field of fields) {
      const value = fieldValue(section, field);
      if (value === null) {
        failures.push(`${heading} is missing field: ${field}`);
      } else if (!allowPlaceholders && isUnresolved(value)) {
        failures.push(`${heading} has unresolved field: ${field}`);
      }
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

function resolveBase(root, requestedBase) {
  const candidates = [requestedBase, process.env.WORK_PACKET_BASE, "main", "origin/main"]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index);

  for (const candidate of candidates) {
    if (runGit(root, ["rev-parse", "--verify", candidate])) return candidate;
  }
  return null;
}

export function collectChangedActivePackets(root, requestedBase = null) {
  const base = resolveBase(root, requestedBase);
  if (!base) {
    return {
      files: [],
      warning:
        "Work-packet diff scope could not be resolved because neither the requested base, main nor origin/main exists.",
    };
  }

  const mergeBase = runGit(root, ["merge-base", "HEAD", base]);
  if (!mergeBase) {
    return {
      files: [],
      warning: `Work-packet diff scope could not find a merge base with ${base}.`,
    };
  }

  const output = runGit(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    `${mergeBase}...HEAD`,
    "--",
    ":(glob)docs/plans/active/*.md",
  ]);

  if (output === null) {
    return {
      files: [],
      warning: "Work-packet diff scope could not be read from Git.",
    };
  }

  return {
    files: output.split(/\r?\n/u).filter(Boolean),
    warning: null,
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
  if (changed.warning) warnings.push(changed.warning);

  for (const file of changed.files) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) continue;
    for (const failure of validateWorkPacket(readFileSync(absolute, "utf8"))) {
      failures.push(`${relative(root, absolute)}: ${failure}`);
    }
  }

  return { failures, warnings, checkedPackets: changed.files };
}

export function main(argv = process.argv.slice(2)) {
  const baseIndex = argv.indexOf("--base");
  const requestedBase = baseIndex === -1 ? null : argv[baseIndex + 1];
  if (baseIndex !== -1 && (!requestedBase || requestedBase.startsWith("--"))) {
    console.error("--base requires a Git ref");
    return 2;
  }

  const result = validateRepositoryWorkPackets(process.cwd(), requestedBase);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const failure of result.failures) console.error(`error: ${failure}`);

  if (result.failures.length === 0) {
    console.log(
      `Work-packet contract passed (${result.checkedPackets.length} changed active packet(s)).`,
    );
  }
  return result.failures.length > 0 ? 1 : 0;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) process.exitCode = main();
