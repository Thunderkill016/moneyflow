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
const EXECUTION_STATES = [
  "discovery",
  "specified",
  "planned",
  "implementing",
  "evaluating",
  "ready_for_review",
  "merged",
  "deployed",
  "accepted",
];
const TRACEABILITY_STATES = new Set(EXECUTION_STATES.slice(2));
const REVIEW_EVIDENCE_STATES = new Set(EXECUTION_STATES.slice(5));

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
  if (/^<[^>\n]+>$/u.test(value)) return true;
  if (/^(?:todo|tbd|unknown)\b/iu.test(value)) return true;
  return /^(?:n\/?a|not applicable|none)$/iu.test(value);
}

function isTraceUnresolved(value) {
  if (isUnresolved(value)) return true;
  return /^(?:pending|pass\/fail)\b/iu.test(value ?? "");
}

function normalizeSignal(value) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function executionStateValues(markdown) {
  return [
    ...markdown.matchAll(/^\*\*Execution state:\*\*\s*(.*?)\s*$/gmu),
  ].map((match) => match[1].trim());
}

function splitTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function parseFirstTable(section) {
  if (section === null) return null;
  const lines = section.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("|"));
  if (headerIndex === -1) return null;

  const header = splitTableRow(lines[headerIndex]);
  const separator = splitTableRow(lines[headerIndex + 1] ?? "");
  if (!header || !separator || !isSeparatorRow(separator)) return null;

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    const cells = splitTableRow(lines[index]);
    if (!cells) break;
    if (isSeparatorRow(cells)) continue;
    rows.push(cells);
  }
  return { header, rows };
}

function headerIndex(table, name) {
  return table.header.findIndex(
    (cell) => cell.trim().toLowerCase() === name.toLowerCase(),
  );
}

function parseAcceptanceCriteria(markdown) {
  const section = sectionBody(markdown, "### Acceptance criteria");
  if (section === null) return { section: null, criteria: [], unlabelled: [] };

  const criteria = [];
  const unlabelled = [];
  for (const line of section.split(/\r?\n/u)) {
    if (!/^\s*-\s+\[[ xX]\]\s+/u.test(line)) continue;
    const match = line.match(/^\s*-\s+\[[ xX]\]\s+(AC\d+):\s*(.+?)\s*$/iu);
    if (!match) {
      unlabelled.push(line.trim());
      continue;
    }
    criteria.push({ id: match[1].toUpperCase(), text: match[2].trim() });
  }
  return { section, criteria, unlabelled };
}

function parseTaskCoverage(value) {
  const normalized = value.trim().replaceAll("`", "");
  const internal = normalized.match(/^internal:\s*(.*)$/iu);
  if (internal) {
    return {
      kind: "internal",
      reason: internal[1].trim(),
      refs: [],
      malformed: false,
    };
  }

  const refs = [...normalized.matchAll(/\bAC\d+\b/giu)].map((match) =>
    match[0].toUpperCase(),
  );
  const remainder = normalized
    .replace(/\bAC\d+\b/giu, "")
    .replace(/[\s,;/+&]+/gu, "");
  return {
    kind: "criteria",
    reason: null,
    refs,
    malformed: refs.length === 0 || remainder.length > 0,
  };
}

function validateTraceabilityTemplate(markdown) {
  const failures = [];
  const acceptance = parseAcceptanceCriteria(markdown);
  if (acceptance.section === null) {
    failures.push("missing required heading: ### Acceptance criteria");
  } else if (acceptance.criteria.length === 0) {
    failures.push(
      "canonical template must include at least one labelled acceptance criterion such as AC1",
    );
  }

  const tasks = parseFirstTable(sectionBody(markdown, "## Tasks"));
  if (!tasks) {
    failures.push("canonical template is missing the Tasks table");
  } else {
    for (const required of ["ID", "Task", "Covers", "Dependency", "Evidence", "Status"]) {
      if (headerIndex(tasks, required) === -1) {
        failures.push(`canonical Tasks table is missing column: ${required}`);
      }
    }
  }

  const evidence = parseFirstTable(sectionBody(markdown, "### Acceptance evidence"));
  if (!evidence) {
    failures.push("canonical template is missing the Acceptance evidence table");
  } else {
    for (const required of ["Criterion", "Evidence", "Result"]) {
      if (headerIndex(evidence, required) === -1) {
        failures.push(`canonical Acceptance evidence table is missing column: ${required}`);
      }
    }
  }

  return failures;
}

function validateActiveTraceability(markdown, { requireTraceability = false } = {}) {
  const failures = [];
  const stateValues = executionStateValues(markdown);
  const hasTraceabilitySurface =
    stateValues.length > 0 ||
    headingCount(markdown, "### Acceptance criteria") > 0 ||
    headingCount(markdown, "## Tasks") > 0;

  if (!requireTraceability && !hasTraceabilitySurface) return failures;

  if (stateValues.length !== 1) {
    failures.push("work packet must declare exactly one **Execution state:** value");
    return failures;
  }
  const state = stateValues[0];
  if (!EXECUTION_STATES.includes(state)) {
    failures.push(`unsupported execution state for traceability: ${state}`);
    return failures;
  }
  if (!TRACEABILITY_STATES.has(state)) return failures;

  const acceptance = parseAcceptanceCriteria(markdown);
  if (acceptance.section === null) {
    failures.push("planned-or-later packet is missing ### Acceptance criteria");
    return failures;
  }
  for (const line of acceptance.unlabelled) {
    failures.push(`acceptance criterion is missing a stable AC# identifier: ${line}`);
  }
  if (acceptance.criteria.length === 0) {
    failures.push("planned-or-later packet must define at least one AC# acceptance criterion");
  }

  const criterionCounts = new Map();
  for (const criterion of acceptance.criteria) {
    criterionCounts.set(criterion.id, (criterionCounts.get(criterion.id) ?? 0) + 1);
  }
  for (const [id, count] of criterionCounts) {
    if (count > 1) failures.push(`duplicate acceptance criterion identifier: ${id}`);
  }
  const criterionIds = new Set(acceptance.criteria.map((criterion) => criterion.id));

  const tasks = parseFirstTable(sectionBody(markdown, "## Tasks"));
  if (!tasks) {
    failures.push("planned-or-later packet is missing a valid Tasks table");
    return failures;
  }

  const requiredTaskColumns = ["ID", "Task", "Covers", "Dependency", "Evidence", "Status"];
  const taskIndices = new Map(
    requiredTaskColumns.map((name) => [name, headerIndex(tasks, name)]),
  );
  for (const [name, index] of taskIndices) {
    if (index === -1) failures.push(`Tasks table is missing column: ${name}`);
  }
  if ([...taskIndices.values()].some((index) => index === -1)) return failures;

  const coveredCriteria = new Set();
  const taskIds = new Set();
  for (const row of tasks.rows) {
    const id = row[taskIndices.get("ID")]?.trim() ?? "";
    const covers = row[taskIndices.get("Covers")]?.trim() ?? "";
    const evidence = row[taskIndices.get("Evidence")]?.trim() ?? "";
    const taskLabel = id || "<unnamed task>";

    if (isTraceUnresolved(id)) {
      failures.push("Tasks table contains a task with unresolved ID");
    } else if (taskIds.has(id)) {
      failures.push(`duplicate task identifier: ${id}`);
    } else {
      taskIds.add(id);
    }

    if (isTraceUnresolved(evidence)) {
      failures.push(`${taskLabel} has unresolved Evidence`);
    }

    const coverage = parseTaskCoverage(covers);
    if (coverage.kind === "internal") {
      if (isTraceUnresolved(coverage.reason)) {
        failures.push(`${taskLabel} internal coverage requires a non-empty reason`);
      }
      continue;
    }

    if (coverage.malformed) {
      failures.push(
        `${taskLabel} Covers must list AC# identifiers or use internal: <reason>`,
      );
      continue;
    }

    for (const ref of coverage.refs) {
      if (!criterionIds.has(ref)) {
        failures.push(`${taskLabel} references unknown acceptance criterion: ${ref}`);
      } else {
        coveredCriteria.add(ref);
      }
    }
  }

  for (const id of criterionIds) {
    if (!coveredCriteria.has(id)) {
      failures.push(`${id} has no covering task`);
    }
  }

  if (!REVIEW_EVIDENCE_STATES.has(state)) return failures;

  const evaluation = parseFirstTable(sectionBody(markdown, "### Acceptance evidence"));
  if (!evaluation) {
    failures.push(
      "ready-for-review packet is missing a valid Acceptance evidence table",
    );
    return failures;
  }

  const criterionIndex = headerIndex(evaluation, "Criterion");
  const evidenceIndex = headerIndex(evaluation, "Evidence");
  const resultIndex = headerIndex(evaluation, "Result");
  if (criterionIndex === -1) failures.push("Acceptance evidence table is missing column: Criterion");
  if (evidenceIndex === -1) failures.push("Acceptance evidence table is missing column: Evidence");
  if (resultIndex === -1) failures.push("Acceptance evidence table is missing column: Result");
  if ([criterionIndex, evidenceIndex, resultIndex].some((index) => index === -1)) {
    return failures;
  }

  const evidencedCriteria = new Set();
  for (const row of evaluation.rows) {
    const rawCriterion = row[criterionIndex]?.trim().replaceAll("`", "") ?? "";
    const match = rawCriterion.match(/^(AC\d+)$/iu);
    if (!match) {
      failures.push(
        `Acceptance evidence row must identify exactly one AC# criterion: ${rawCriterion || "<empty>"}`,
      );
      continue;
    }
    const id = match[1].toUpperCase();
    if (!criterionIds.has(id)) {
      failures.push(`Acceptance evidence references unknown criterion: ${id}`);
      continue;
    }
    if (evidencedCriteria.has(id)) {
      failures.push(`duplicate acceptance evidence row: ${id}`);
      continue;
    }
    evidencedCriteria.add(id);

    const evidenceValue = row[evidenceIndex]?.trim() ?? "";
    const resultValue = row[resultIndex]?.trim() ?? "";
    if (isTraceUnresolved(evidenceValue) || isTraceUnresolved(resultValue)) {
      failures.push(`${id} acceptance evidence must be resolved before ready_for_review`);
      continue;
    }
    if (resultValue.toLowerCase() !== "pass") {
      failures.push(`${id} acceptance evidence result must be pass before ready_for_review`);
    }
  }

  for (const id of criterionIds) {
    if (!evidencedCriteria.has(id)) {
      failures.push(`${id} is missing criterion-specific acceptance evidence`);
    }
  }

  return failures;
}

export function validateWorkPacket(
  markdown,
  { allowPlaceholders = false, requireTraceability = false } = {},
) {
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

  failures.push(
    ...(allowPlaceholders
      ? validateTraceabilityTemplate(markdown)
      : validateActiveTraceability(markdown, { requireTraceability })),
  );

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

  for (const candidate of ["origin/main", "main"]) {
    if (verifyRef(root, candidate)) return { base: candidate, error: null };
  }
  return {
    base: null,
    error: "work-packet diff scope requires a resolvable origin/main or main ref",
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
      requireTraceability: true,
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
    for (const failure of validateWorkPacket(readFileSync(absolute, "utf8"), {
      requireTraceability: true,
    })) {
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
