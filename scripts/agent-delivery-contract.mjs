#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_PATH = "docs/templates/FEATURE_WORK_PACKET.md";
const ACTIVE_PACKET_PREFIX = "docs/plans/active/";
const ACTIVE_PACKET_DIR = path.join(ROOT, ACTIVE_PACKET_PREFIX);
const STATES_REQUIRING_FINAL_EVIDENCE = new Set([
  "ready_for_review",
  "merged",
  "deployed",
  "accepted",
]);
const PLANNED_OR_LATER = new Set([
  "planned",
  "implementing",
  "evaluating",
  "ready_for_review",
  "merged",
  "deployed",
  "accepted",
]);
const PACKET_ROLES = new Set(["execution", "supporting"]);
const ACTION_KINDS = new Set([
  "research",
  "review",
  "implement",
  "verify",
  "merge",
  "deploy",
  "provider_write",
  "production_data_write",
  "decision",
]);
const AC_ID_SOURCE = "(?:[A-Z][A-Z0-9]*-)*AC\\d+";
const TASK_ID_SOURCE = "(?:[A-Z][A-Z0-9]*-)*T\\d+";
const AC_ID_RE = new RegExp(`^${AC_ID_SOURCE}$`);
const TASK_ID_RE = new RegExp(`^${TASK_ID_SOURCE}$`);
const AC_REF_RE = new RegExp(AC_ID_SOURCE, "g");
const ACTION_VERBS =
  "address|fix|implement|merge|deploy|apply|verify|reconcile|run|update|publish|push|review|research|decide|remediate|resolve";
const COMPOUND_ACTION_RE = new RegExp(
  `\\bthen\\b|→|->|;|\\band\\s+(?:${ACTION_VERBS})\\b|(?:,|\\+)\\s*(?:${ACTION_VERBS})\\b`,
  "i",
);
const PLACEHOLDER_RE =
  /^(?:todo|tbd|pending|unknown|blocked|none|n\/?a|not applicable|missing|unavailable|not available)(?:\b|\s*[-—:])/i;

function stripTicks(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeIdentity(value) {
  return stripTicks(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function isPlaceholder(value) {
  const normalized = stripTicks(value).trim();
  return normalized.length === 0 || /^<.*>$/.test(normalized) || PLACEHOLDER_RE.test(normalized);
}

function headingSections(markdown, level, heading) {
  const lines = markdown.split("\n");
  const marker = `${"#".repeat(level)} ${heading}`;
  const stop = new RegExp(`^#{1,${level}}\\s+`);
  const sections = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== marker) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (stop.test(lines[j])) break;
      body.push(lines[j]);
    }
    sections.push(body.join("\n"));
  }

  return sections;
}

function extractSection(markdown, heading) {
  return headingSections(markdown, 2, heading);
}

function extractSubsection(markdown, heading) {
  return headingSections(markdown, 3, heading)[0] ?? null;
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

function gateContinuationLines(section) {
  return section
    .split("\n")
    .filter(
      (line) =>
        line.trim().length > 0 &&
        /^\s+/.test(line) &&
        !/^\s*-\s+[^:]+:\s*/.test(line),
    );
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
      "Gate task",
      "Action kind",
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

  for (const label of ["Risk class", "Workstream", "Packet role"]) {
    if (!new RegExp(`^\\*\\*${label}:\\*\\*`, "m").test(markdown)) {
      errors.push(`template must declare ${label} metadata`);
    }
  }
  if (!/^\| ID \| Task \| Covers \| Dependency \| Evidence \| Status \|$/m.test(markdown)) {
    errors.push("template Tasks table must include Covers and Evidence columns");
  }
  if (!/^### Independent evaluation\s*$/m.test(markdown)) {
    errors.push("template must contain an Independent evaluation subsection");
  } else {
    const independent = extractSubsection(markdown, "Independent evaluation");
    const fields = parseBullets(independent ?? "");
    for (const field of [
      "Implementer",
      "Evaluator",
      "Implementer overlap",
      "Review artifact",
      "Inputs reviewed",
      "Author summary treated as authority",
    ]) {
      if ((fields.get(field) ?? []).length !== 1) {
        errors.push(`template Independent evaluation must contain exactly one "${field}" field`);
      }
    }
  }
  if (!/^### Acceptance evidence\s*$/m.test(markdown)) {
    errors.push("template must contain an Acceptance evidence subsection");
  }
  return errors;
}

function acceptanceCriteria(markdown) {
  const section = extractSubsection(markdown, "Acceptance criteria");
  if (!section) return { ids: [], duplicates: [] };
  const matches = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^\s*-\s*\[[ xX]\]\s+([^:]+)\s*:/);
    if (!match) continue;
    const id = match[1].trim();
    if (AC_ID_RE.test(id)) matches.push(id);
  }
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
    if (cells.length !== 6 || !TASK_ID_RE.test(cells[0])) continue;
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
    if (cells.length !== 3 || !AC_ID_RE.test(cells[0])) continue;
    rows.push({ criterion: cells[0], evidence: cells[1], result: cells[2] });
  }
  return rows;
}

export function validateExecutionPacketSet(packets) {
  const errors = [];
  const byWorkstream = new Map();

  for (const { file, markdown } of packets) {
    const role = stripTicks(extractMetadata(markdown, "Packet role") ?? "");
    const workstream = stripTicks(extractMetadata(markdown, "Workstream") ?? "");
    const gateCount = extractSection(markdown, "Current decision gate").length;

    if (gateCount > 0 && role !== "execution") {
      errors.push(`${file}: only Packet role execution may expose Current decision gate`);
    }
    if (role !== "execution") continue;
    if (isPlaceholder(workstream)) {
      errors.push(`${file}: execution packet needs a resolved Workstream`);
      continue;
    }
    const files = byWorkstream.get(workstream) ?? [];
    files.push(file);
    byWorkstream.set(workstream, files);
  }

  for (const [workstream, files] of byWorkstream) {
    if (files.length > 1) {
      errors.push(
        `workstream ${workstream}: expected at most one execution packet; found ${files.join(", ")}`,
      );
    }
  }

  return errors;
}

export function validatePacket(markdown, file = "packet") {
  const errors = [];
  const state = stripTicks(extractMetadata(markdown, "Execution state") ?? "");
  const riskText = stripTicks(extractMetadata(markdown, "Risk class") ?? "");
  const workstream = stripTicks(extractMetadata(markdown, "Workstream") ?? "");
  const role = stripTicks(extractMetadata(markdown, "Packet role") ?? "");
  const risk = Number(riskText);

  if (!/^(discovery|specified|planned|implementing|evaluating|ready_for_review|merged|deployed|accepted)$/.test(state)) {
    errors.push(`${file}: missing or invalid Execution state`);
  }
  if (![0, 1, 2, 3].includes(risk)) {
    errors.push(`${file}: missing or invalid Risk class (expected 0-3)`);
  }
  if (isPlaceholder(workstream)) {
    errors.push(`${file}: missing or unresolved Workstream`);
  }
  if (!PACKET_ROLES.has(role)) {
    errors.push(`${file}: missing or invalid Packet role (expected execution|supporting)`);
  }

  const gateSections = extractSection(markdown, "Current decision gate");
  let gateFields = null;
  if (role === "execution") {
    if (gateSections.length !== 1) {
      errors.push(`${file}: execution packet expected exactly one Current decision gate; found ${gateSections.length}`);
    } else {
      const continuations = gateContinuationLines(gateSections[0]);
      if (continuations.length > 0) {
        errors.push(
          `${file}: decision gate must use single-line fields; continuation lines are not allowed`,
        );
      }
      gateFields = parseBullets(gateSections[0]);
      const required = [
        "Gate ID",
        "Gate task",
        "Action kind",
        "Next allowed action",
        "Approval token",
        "Consumes approval",
        "After action",
      ];
      for (const field of required) {
        const values = gateFields.get(field) ?? [];
        if (values.length !== 1) {
          errors.push(`${file}: decision gate must contain exactly one ${field}`);
          continue;
        }
        if (isPlaceholder(values[0])) {
          errors.push(`${file}: decision gate ${field} is unresolved`);
        }
      }

      const gateId = stripTicks((gateFields.get("Gate ID") ?? [""])[0]);
      if (gateId && !/^G\d+$/.test(gateId)) {
        errors.push(`${file}: Gate ID must use G<number>`);
      }
      const gateTask = stripTicks((gateFields.get("Gate task") ?? [""])[0]);
      if (gateTask && !TASK_ID_RE.test(gateTask)) {
        errors.push(`${file}: Gate task must reference one task ID`);
      }
      const actionKind = stripTicks((gateFields.get("Action kind") ?? [""])[0]);
      if (actionKind && !ACTION_KINDS.has(actionKind)) {
        errors.push(`${file}: Action kind is invalid`);
      }
      const action = stripTicks((gateFields.get("Next allowed action") ?? [""])[0]);
      if (action && COMPOUND_ACTION_RE.test(action)) {
        errors.push(`${file}: Next allowed action appears compound; split it into separate gates`);
      }
      const token = stripTicks((gateFields.get("Approval token") ?? [""])[0]);
      if (token && token !== "Go") {
        errors.push(`${file}: Approval token must be Go`);
      }
      const consumes = stripTicks((gateFields.get("Consumes approval") ?? [""])[0]);
      if (consumes && consumes.toLowerCase() !== "yes") {
        errors.push(`${file}: Consumes approval must be yes`);
      }
    }
  } else if (role === "supporting" && gateSections.length !== 0) {
    errors.push(`${file}: supporting packet must not expose Current decision gate`);
  }

  if (role === "supporting") {
    return errors;
  }

  const { ids: acIds, duplicates } = acceptanceCriteria(markdown);
  if (duplicates.length > 0) {
    errors.push(`${file}: duplicate acceptance criteria: ${duplicates.join(", ")}`);
  }
  if (PLANNED_OR_LATER.has(state) && acIds.length === 0) {
    errors.push(`${file}: planned-or-later packet must define stable AC IDs`);
  }

  const known = new Set(acIds);
  const covered = new Set();
  const tasks = taskRows(markdown);
  const taskIds = new Set(tasks.map((task) => task.id));
  if (PLANNED_OR_LATER.has(state) && tasks.length === 0) {
    errors.push(`${file}: planned-or-later packet must define task rows`);
  }
  for (const task of tasks) {
    if (isPlaceholder(task.evidence)) {
      errors.push(`${file}: ${task.id} must name an evidence target`);
    }
    if (/^internal:\s*\S+/i.test(task.covers)) continue;
    const refs = task.covers.match(AC_REF_RE) ?? [];
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

  if (gateFields) {
    const gateTask = stripTicks((gateFields.get("Gate task") ?? [""])[0]);
    if (gateTask && TASK_ID_RE.test(gateTask) && !taskIds.has(gateTask)) {
      errors.push(`${file}: Gate task references unknown ${gateTask}`);
    }
  }

  if (risk >= 2 && STATES_REQUIRING_FINAL_EVIDENCE.has(state)) {
    const independent = extractSubsection(markdown, "Independent evaluation");
    if (!independent) {
      errors.push(`${file}: Class ${risk} ${state} packet needs Independent evaluation`);
    } else {
      const fields = parseBullets(independent);
      const implementer = (fields.get("Implementer") ?? [""])[0];
      const evaluator = (fields.get("Evaluator") ?? [""])[0];
      const overlap = stripTicks((fields.get("Implementer overlap") ?? [""])[0]).toLowerCase();
      const artifact = (fields.get("Review artifact") ?? [""])[0];
      const inputs = (fields.get("Inputs reviewed") ?? [""])[0];
      const summaryAuthority = stripTicks(
        (fields.get("Author summary treated as authority") ?? [""])[0],
      ).toLowerCase();

      if (isPlaceholder(implementer)) errors.push(`${file}: implementer identity is unresolved`);
      if (isPlaceholder(evaluator)) errors.push(`${file}: independent evaluator is unresolved`);
      if (
        !isPlaceholder(implementer) &&
        !isPlaceholder(evaluator) &&
        normalizeIdentity(implementer) === normalizeIdentity(evaluator)
      ) {
        errors.push(`${file}: independent evaluator must differ from implementer`);
      }
      if (overlap !== "none") {
        errors.push(`${file}: Implementer overlap must be none for independent Class ${risk} evaluation`);
      }
      if (isPlaceholder(artifact)) errors.push(`${file}: independent review artifact is unresolved`);
      if (isPlaceholder(inputs)) {
        errors.push(`${file}: independent evaluation inputs are unresolved`);
      } else {
        const normalizedInputs = stripTicks(inputs).toLowerCase();
        if (!normalizedInputs.includes("diff") || !normalizedInputs.includes("evidence")) {
          errors.push(`${file}: independent evaluation inputs must include actual diff and exact evidence`);
        }
      }
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

function activePackets() {
  return readdirSync(ACTIVE_PACKET_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const file = `${ACTIVE_PACKET_PREFIX}${name}`;
      return { file, markdown: readFileSync(path.join(ROOT, file), "utf8") };
    });
}

function main() {
  const errors = [];
  const template = readFileSync(path.join(ROOT, TEMPLATE_PATH), "utf8");
  errors.push(...validateTemplateStructure(template).map((error) => `${TEMPLATE_PATH}: ${error}`));

  const packets = activePackets();
  errors.push(...validateExecutionPacketSet(packets));

  const packetFiles = changedFiles().filter(
    (file) => file.startsWith(ACTIVE_PACKET_PREFIX) && file.endsWith(".md"),
  );
  const byFile = new Map(packets.map((packet) => [packet.file, packet.markdown]));
  for (const file of packetFiles) {
    const markdown = byFile.get(file) ?? readFileSync(path.join(ROOT, file), "utf8");
    errors.push(...validatePacket(markdown, file));
  }

  if (errors.length > 0) {
    console.error("Agent delivery contract failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Agent delivery contract passed: template valid; ${packetFiles.length} changed active packet(s) checked; execution-packet uniqueness checked.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
