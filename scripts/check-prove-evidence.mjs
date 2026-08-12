/**
 * P3 Prove evidence validator.
 *
 * Two jobs, both of which a human reviewer does badly by hand:
 *
 * 1. **Completeness** — every scenario present with a real result, `fail_then_pass`
 *    explained, the device row filled in, the declaration acknowledged.
 * 2. **Privacy** — no amount, description, email, account identifier or token in a
 *    file that is about to enter Git permanently.
 *
 * It is deliberately narrow. It validates *evidence files*; it does not decide
 * whether the phase passes, and it cannot look inside a screenshot — the template
 * says so rather than implying otherwise.
 *
 * The scenario list is derived from the packet, so a scenario added there without a
 * template row fails a gate instead of being silently skipped.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const PACKET_PATH = "docs/plans/active/moneyflow-trust-prove.md";
export const EVIDENCE_DIR = "docs/evidence/p3-prove";
export const TEMPLATE_NAME = "TEMPLATE.md";

export const VALID_RESULTS = Object.freeze([
  "pass",
  "fail",
  "blocked",
  "fail_then_pass",
]);
export const VALID_SEVERITIES = Object.freeze(["P0", "P1", "finding"]);

/**
 * Scenario IDs read from the packet's own table, not restated here.
 *
 * One source: if the checklist grows a PP-15, the template must grow a row for it.
 */
export function packetScenarioIds(root = process.cwd()) {
  const file = path.join(root, PACKET_PATH);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, "utf8");
  const ids = new Set();
  for (const match of content.matchAll(/^\|\s*\*\*(PP-\d{2})\*\*\s*\|/gmu)) {
    ids.add(match[1]);
  }
  return [...ids].sort();
}

/**
 * Content that must never enter Git.
 *
 * Tuned to what this evidence file legitimately contains. Bare counts are expected
 * ("rows: 14"), so a number alone cannot be the signal — a number attached to
 * currency, or thousands-separated the way đồng is written, is.
 */
const FORBIDDEN_PATTERNS = [
  {
    id: "currency_amount",
    // 12.000₫ / 12,000 VND / 500000 đồng — a money amount in any shipped notation.
    pattern: /\d[\d.,\s]*\s*(?:₫|VND|vnd|đồng|dong)\b/u,
    why: "a money amount",
  },
  {
    id: "thousands_grouped_number",
    // Grouped digits are how this product writes money and essentially never how
    // it writes a count.
    pattern: /\b\d{1,3}(?:[.,]\d{3}){1,}\b/u,
    why: "a grouped number that looks like a money amount",
  },
  { id: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/u, why: "an email address" },
  {
    id: "uuid",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/iu,
    why: "a user or row identifier",
  },
  { id: "jwt", pattern: /\beyJ[\w-]{10,}\.[\w-]{10,}/u, why: "a token" },
  {
    id: "supabase_key",
    pattern: /\b(?:sbp_|sb_secret_|service_role)\S*/u,
    why: "a provider key",
  },
  {
    id: "bearer",
    pattern: /\bBearer\s+\S{12,}/u,
    why: "an authorization header",
  },
  {
    id: "long_digit_run",
    // 12+ consecutive digits is a card or bank account shape, not a count. A
    // commit SHA is hex and handled separately.
    pattern: /\b\d{12,}\b/u,
    why: "a bank or card account number",
  },
];

/** Lines that legitimately contain hex or version-like values. */
function isAllowedTechnicalLine(line) {
  return /commit SHA|OS version|Browser version|^```/u.test(line);
}

export function scanForbiddenContent(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (isAllowedTechnicalLine(line)) continue;
    // Template placeholders are instructions, not data.
    const stripped = line.replace(/`<[^`]*>`/gu, "").replace(/`YYYY-MM-DD`/gu, "");
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(stripped)) {
        findings.push({ line: index + 1, id: rule.id, why: rule.why });
      }
    }
  }
  return findings;
}

function parseRow(line) {
  if (!line.trim().startsWith("|")) return null;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return cells.length > 0 ? cells : null;
}

export function parseResults(text) {
  const results = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cells = parseRow(line);
    if (!cells) continue;
    const id = /^(?:\*\*)?(PP-\d{2})(?:\*\*)?$/u.exec(cells[0])?.[1];
    if (!id) continue;
    // The packet's own scenario table has many columns; an evidence row has three.
    if (cells.length > 4) continue;
    results.set(id, { result: cells[1] ?? "", notes: cells[2] ?? "" });
  }
  return results;
}

export function parseDefects(text) {
  const defects = [];
  const start = text.indexOf("## Defects");
  if (start < 0) return defects;
  const section = text.slice(start, text.indexOf("## Declaration", start) + 1 || undefined);
  for (const line of section.split(/\r?\n/)) {
    const cells = parseRow(line);
    if (!cells || cells.length < 5) continue;
    if (/^-+$/u.test(cells[0]) || cells[0] === "Ref") continue;
    defects.push({ ref: cells[0], scenario: cells[1], severity: cells[2], repro: cells[3], status: cells[4] });
  }
  return defects;
}

/**
 * Validate one evidence file.
 *
 * `isTemplate` relaxes exactly two things — empty results and an unticked
 * declaration — because the template is the blank form. Everything else, including
 * the privacy scan and full scenario coverage, applies to it too: a template that
 * omits a scenario guarantees every future run omits it.
 */
export function validateEvidenceFile({ name, text, scenarioIds, isTemplate = false }) {
  const problems = [];
  const add = (problem) => problems.push({ file: name, problem });

  for (const finding of scanForbiddenContent(text)) {
    add(`line ${finding.line}: contains ${finding.why} (${finding.id})`);
  }

  const results = parseResults(text);
  for (const id of scenarioIds) {
    if (!results.has(id)) {
      add(`missing a result row for ${id}`);
      continue;
    }
    const { result, notes } = results.get(id);
    if (isTemplate) {
      if (result !== "") add(`${id} must be blank in the template`);
      continue;
    }
    if (!VALID_RESULTS.includes(result)) {
      add(`${id} result must be one of ${VALID_RESULTS.join(", ")} (found "${result}")`);
      continue;
    }
    // A retry pass is a finding until explained; an unexplained one would quietly
    // become a clean acceptance.
    if (result === "fail_then_pass" && notes.trim().length < 10) {
      add(`${id} is fail_then_pass and must carry an explanation, not a clean pass`);
    }
    if (result === "fail" && notes.trim().length < 10) {
      add(`${id} failed and must record what happened`);
    }
    if (result === "blocked" && notes.trim().length < 10) {
      add(`${id} is blocked and must record why`);
    }
  }
  for (const id of results.keys()) {
    if (!scenarioIds.includes(id)) add(`${id} is not a scenario in the packet`);
  }

  const unknownIds = [...results.keys()].filter((id) => !scenarioIds.includes(id));
  if (unknownIds.length > 0 && scenarioIds.length === 0) {
    add("the packet's scenario table could not be read; refusing to validate blindly");
  }

  for (const field of ["Platform:", "OS version:", "Browser:", "Browser version:", "Tier:"]) {
    if (!text.includes(field)) add(`missing the "${field}" device field`);
  }
  if (!/Session:\s*`?authenticated/u.test(text)) {
    add("the run must record an authenticated session, never demo");
  }

  for (const defect of parseDefects(text)) {
    if (defect.ref === "" && defect.severity === "") continue; // blank template row
    if (defect.ref.toLowerCase() === "none") continue;
    if (!VALID_SEVERITIES.includes(defect.severity)) {
      add(`defect "${defect.ref}" severity must be one of ${VALID_SEVERITIES.join(", ")}`);
    }
  }

  if (!isTemplate) {
    const declaration = text.slice(text.indexOf("## Declaration"));
    if (/^- \[ \]/mu.test(declaration)) {
      add("every declaration line must be acknowledged before this is committed");
    }
    if (/\bemulat|simulator|device farm\b/iu.test(results.get(scenarioIds[0])?.notes ?? "")) {
      add("emulated evidence cannot satisfy a required physical scenario");
    }
  }

  return problems;
}

export function runProveEvidenceCheck({ root = process.cwd() } = {}) {
  const scenarioIds = packetScenarioIds(root);
  const problems = [];
  const dir = path.join(root, EVIDENCE_DIR);

  if (scenarioIds.length === 0) {
    return {
      ok: false,
      scenarioIds,
      checked: [],
      problems: [{ file: PACKET_PATH, problem: "no PP-NN scenarios found in the packet" }],
    };
  }
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      scenarioIds,
      checked: [],
      problems: [{ file: EVIDENCE_DIR, problem: "the evidence directory is missing" }],
    };
  }

  const checked = [];
  for (const entry of fs.readdirSync(dir).sort()) {
    if (!entry.endsWith(".md")) continue;
    // The seven-day log is a different shape and is not validated here.
    if (entry.startsWith("seven-day-")) continue;
    const text = fs.readFileSync(path.join(dir, entry), "utf8");
    checked.push(entry);
    problems.push(
      ...validateEvidenceFile({
        name: `${EVIDENCE_DIR}/${entry}`,
        text,
        scenarioIds,
        isTemplate: entry === TEMPLATE_NAME,
      }),
    );
  }

  if (!checked.includes(TEMPLATE_NAME)) {
    problems.push({ file: EVIDENCE_DIR, problem: `${TEMPLATE_NAME} is missing` });
  }

  return { ok: problems.length === 0, scenarioIds, checked, problems };
}

function runCli() {
  const result = runProveEvidenceCheck();
  const runs = result.checked.filter((name) => name !== TEMPLATE_NAME);
  if (!result.ok) {
    console.error("P3 Prove evidence contract failed:\n");
    for (const problem of result.problems) {
      console.error(`- ${problem.file}: ${problem.problem}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `P3 Prove evidence contract passed (${result.scenarioIds.length} scenarios; ${runs.length} recorded run${runs.length === 1 ? "" : "s"}).`,
  );
  if (runs.length === 0) {
    // Said plainly, so a green gate is never mistaken for device evidence.
    console.log("No physical-phone run is recorded yet; the template validates only its own shape.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
