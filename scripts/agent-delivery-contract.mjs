#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = "docs/templates/FEATURE_WORK_PACKET.md";
const ACTIVE_PACKET_PREFIX = "docs/plans/active/";
const STATES_REQUIRING_FINAL_EVIDENCE = new Set([
  "ready_for_review",
  "merged",
  "deployed",
  "accepted",
]);

function stripTicks(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isPlaceholder(value) {
  const normalized = stripTicks(value).trim();
  return (
    normalized.length === 0 ||
    /^<.*>$/.test(normalized) ||
    /^(todo|tbd|pending|unknown)$/i.test(normalized)
  );
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [
    ...markdown.matchAll(
      new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |\\Z)`, "gm"),
    ),
  ];
  return matches.map((match) => match[1]);
}

function extractSubsection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`^### ${escaped}\\s*$([\\s\\S]*?)(?=^### |^## |\\Z)`, "m"),
  );
  return match?.[1] ?? null;
}

function extractMetadata(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*(.+?)\\s*$`, "m"),
  );
  return match?.[1]?.trim() ?? null;
}

function parseBullets(section) {
  const fields = new Map();
  for (const line of section.split("\n")) {
    const match = line.match(/^\s*-\s+([^:]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    const values = fields.get(key) ?? [];
    values.push(match[2].trim());
    fields.set(key, values);
  }
  return fields;
}

export function validateTemplateStructure(markdown) {
  const errors = [];
  const gateSections = extractSection(markdown, "Current decision gate");
  if (gateSections.length !== 1) {
    errors.push(
      `template must contain exactly one "## Current decision gate"; found ${gateSections.length}`,
    );
  } else {
    const fields = parseBullets(gateSections[0]);
    for (const field of [
      "Gate ID",
      "Next allowed action",
      "Approval token",
      "Consumes approval",
      "After action",
    ]) {
      if ((fields.get(field) ?? []).length !== 1) {
        errors.push(`template decision gate must contain exactly one "${field}" field`);
      }
    }
  }

  if (!/^\*\*Risk class:\*\*/m.test(markdown)) {
    errors.push("template must declare Risk class metadata");
  }
  if (!/^\| ID \| Task \| Covers \| Dependency \| Evidence \| Status \|$/m.test(markdown)) {
    errors.push("template Tasks table must include Covers and Evidence columns");
  }
  if (!/^### Independent evaluation\s*$/m.test(markdown)) {
    errors.push("template must contain an Independent evaluation subsection");
  }
  if (!/^### Acceptance evidence\s*$/m.test(markdown)) {
    errors.push("template must contain an Acceptance evidence subsection");
  }
  return errors;
}

function acceptanceCriteria(markdown) {
  const section = extractSubsection(markdown, "Acceptance criteria");
  if (!section) return { ids: [], duplicates: [] };
  const matches = [
    ...section.matchAll(/^\s*-\s*\[[ xX]\]\s+(AC\d+)\s*:/gm),
  ].map((match) => match[1]);
  const seen = new Set();
  const duplicates = [];
  for (const id of matches) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return { ids: [...seen], duplicates };
}

function taskRows(markdown) {
  const sections = extractSection(markdown, "Tasks");
  if (sections.length !== 1) return [];
  const rows = [];
  for (const line of sections[0].split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 6 || !/^T\d+$/.test(cells[0])) continue;
    rows.push({
      id: cells[0],
      task: cells[1],
      covers: cells[2],
      dependency: cells[3],
      evidence: cells[4],
      status: cells[5],
    });
  }
  return rows;
}

function evidenceRows(markdown) {
  const section = extractSubsection(markdown, "Acceptance evidence");
  if (!section) return [];
  const rows = [];
  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 3 || !/^AC\d+$/.test(cells[0])) continue;
    rows.push({ criterion: cells[0], evidence: cells[1], result: cells[2] });
  }
  return rows;
}

export function validatePacket(markdown, file = "packet") {
  const errors = [];
  const state = stripTicks(extractMetadata(markdown, "Execution state") ?? "");
  const riskText = stripTicks(extractMetadata(markdown, "Risk class") ?? "");
  const risk = Number(riskText);

  if (!/^(discovery|specified|planned|implementing|evaluating|ready_for_review|merged|deployed|accepted)$/.test(state)) {
    errors.push(`${file}: missing or invalid Execution state`);
  }
  if (![0, 1, 2, 3].includes(risk)) {
    errors.push(`${file}: missing or invalid Risk class (expected 0-3)`);
  }

  const gateSections = extractSection(markdown, "Current decision gate");
  if (gateSections.length !== 1) {
    errors.push(`${file}: expected exactly one Current decision gate; found ${gateSections.length}`);
  } else {
    const fields = parseBullets(gateSections[0]);
    const required = [
      "Gate ID",
      "Next allowed action",
      "Approval token",
      "Consumes approval",
      "After action",
    ];
    for (const field of required) {
      const values = fields.get(field) ?? [];
      if (values.length !== 1) {
        errors.push(`${file}: decision gate must contain exactly one ${field}`);
        continue;
      }
      if (isPlaceholder(values[0])) {
        errors.push(`${file}: decision gate ${field} is unresolved`);
      }
    }

    const gateId = stripTicks((fields.get("Gate ID") ?? [""])[0]);
    if (gateId && !/^G\d+$/.test(gateId)) {
      errors.push(`${file}: Gate ID must use G<number>`);
    }
    const token = stripTicks((fields.get("Approval token") ?? [""])[0]);
    if (token && token !== "Go") {
      errors.push(`${file}: Approval token must be Go`);
    }
    const consumes = stripTicks((fields.get("Consumes approval") ?? [""])[0]);
    if (consumes && consumes.toLowerCase() !== "yes") {
      errors.push(`${file}: Consumes approval must be yes`);
    }
  }

  const { ids: acIds, duplicates } = acceptanceCriteria(markdown);
  if (duplicates.length > 0) {
    errors.push(`${file}: duplicate acceptance criteria: ${duplicates.join(", ")}`);
  }
  if (["planned", "implementing", "evaluating", "ready_for_review", "merged", "deployed", "accepted"].includes(state) && acIds.length === 0) {
    errors.push(`${file}: planned-or-later packet must define stable AC IDs`);
  }

  const known = new Set(acIds);
  const covered = new Set();
  const tasks = taskRows(markdown);
  if (["planned", "implementing", "evaluating", "ready_for_review", "merged", "deployed", "accepted"].includes(state) && tasks.length === 0) {
    errors.push(`${file}: planned-or-later packet must define task rows`);
  }
  for (const task of tasks) {
    if (isPlaceholder(task.evidence)) {
      errors.push(`${file}: ${task.id} must name an evidence target`);
    }
    if (/^internal:\s*\S+/i.test(task.covers)) continue;
    const refs = task.covers.match(/AC\d+/g) ?? [];
    if (refs.length === 0) {
      errors.push(`${file}: ${task.id} Covers must name AC IDs or internal: <reason>`);
      continue;
    }
    for (const ref of refs) {
      if (!known.has(ref)) {
        errors.push(`${file}: ${task.id} references unknown ${ref}`);
      } else {
        covered.add(ref);
      }
    }
  }
  for (const id of acIds) {
    if (!covered.has(id)) errors.push(`${file}: ${id} has no covering task`);
  }

  if (risk >= 2 && STATES_REQUIRING_FINAL_EVIDENCE.has(state)) {
    const independent = extractSubsection(markdown, "Independent evaluation");
    if (!independent) {
      errors.push(`${file}: Class ${risk} ${state} packet needs Independent evaluation`);
    } else {
      const fields = parseBullets(independent);
      const evaluator = (fields.get("Evaluator") ?? [""])[0];
      const inputs = (fields.get("Inputs reviewed") ?? [""])[0];
      const summaryAuthority = stripTicks(
        (fields.get("Author summary treated as authority") ?? [""])[0],
      ).toLowerCase();
      if (isPlaceholder(evaluator)) errors.push(`${file}: independent evaluator is unresolved`);
      if (isPlaceholder(inputs)) errors.push(`${file}: independent evaluation inputs are unresolved`);
      if (summaryAuthority !== "no") {
        errors.push(`${file}: author summary must not be evaluation authority`);
      }
    }
  }

  if (STATES_REQUIRING_FINAL_EVIDENCE.has(state)) {
    const rows = evidenceRows(markdown);
    const byCriterion = new Map();
    for (const row of rows) {
      const list = byCriterion.get(row.criterion) ?? [];
      list.push(row);
      byCriterion.set(row.criterion, list);
    }
    for (const id of acIds) {
      const rowsForId = byCriterion.get(id) ?? [];
      if (rowsForId.length !== 1) {
        errors.push(`${file}: ${id} needs exactly one acceptance-evidence row`);
      } else if (rowsForId[0].result.toLowerCase() !== "pass") {
        errors.push(`${file}: ${id} acceptance evidence must be pass before ${state}`);
      }
    }
  }

  return errors;
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set();
  let baseRef = "";
  const candidates = [
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "",
    "origin/main",
    "main",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (git(["rev-parse", "--verify", candidate])) {
      baseRef = candidate;
      break;
    }
  }
  if (baseRef) {
    const mergeBase = git(["merge-base", "HEAD", baseRef]);
    if (mergeBase) {
      for (const file of git(["diff", "--name-only", `${mergeBase}...HEAD`]).split("\n")) {
        if (file) files.add(file);
      }
    }
  }
  for (const args of [
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    for (const file of git(args).split("\n")) {
      if (file) files.add(file);
    }
  }
  return [...files];
}

function main() {
  const errors = [];
  const template = readFileSync(path.join(ROOT, TEMPLATE_PATH), "utf8");
  errors.push(...validateTemplateStructure(template).map((error) => `${TEMPLATE_PATH}: ${error}`));

  const packetFiles = changedFiles().filter(
    (file) => file.startsWith(ACTIVE_PACKET_PREFIX) && file.endsWith(".md"),
  );
  for (const file of packetFiles) {
    const markdown = readFileSync(path.join(ROOT, file), "utf8");
    errors.push(...validatePacket(markdown, file));
  }

  if (errors.length > 0) {
    console.error("Agent delivery contract failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Agent delivery contract passed: template valid; ${packetFiles.length} changed active packet(s) checked.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
