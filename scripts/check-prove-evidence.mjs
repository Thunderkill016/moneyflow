/**
 * P3 Prove evidence validator.
 *
 * Two jobs, both of which a human reviewer does badly by hand:
 *
 * 1. **Completeness** — every scenario present with a real result, every failure
 *    explained *and* carried into the defect table, the device row actually filled
 *    in, the declaration acknowledged.
 * 2. **Privacy** — no amount, description-shaped number, email, identifier or token
 *    in a file that is about to enter Git permanently.
 *
 * It is deliberately narrow. It validates *evidence files*; it does not decide
 * whether the phase passes. Two limits are stated rather than implied: it cannot
 * look inside a screenshot, and it cannot recognise a payee or an institution name
 * written as ordinary prose. The owner is the last check on both.
 *
 * A valid file is not an acceptance. A file recording every scenario as failed is a
 * perfectly valid file, and the CLI says so loudly instead of printing "passed" and
 * letting a reader infer the phase is done.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// The P3 packet remains the single scenario source after acceptance; archival moves
// its lifecycle state, not the evidence schema that validates historical/optional runs.
export const PACKET_PATH = "docs/plans/completed/2026-08-12-moneyflow-trust-prove.md";
export const EVIDENCE_DIR = "docs/evidence/p3-prove";
export const TEMPLATE_NAME = "TEMPLATE.md";

export const VALID_RESULTS = Object.freeze([
  "pass",
  "fail",
  "blocked",
  "fail_then_pass",
  // Hardware that simply lacks the feature under test — a notch, say — is not a
  // defect and must not be recorded as one.
  "not_applicable",
]);
export const FAILING_RESULTS = Object.freeze(["fail", "blocked", "fail_then_pass"]);
export const VALID_SEVERITIES = Object.freeze(["P0", "P1", "finding"]);
export const VALID_TIERS = Object.freeze(["required", "optional"]);

const REQUIRED_SECTIONS = Object.freeze(["## Run", "## Results", "## Defects", "## Declaration"]);

/** Device fields that must be present *and* carry a value. */
const REQUIRED_DEVICE_FIELDS = Object.freeze([
  "Tier:",
  "Platform:",
  "OS version:",
  "Browser:",
  "Browser version:",
]);

/**
 * Scenario IDs read from the packet's own table, not restated here.
 *
 * Bold is optional: requiring `**PP-NN**` meant a scenario added without emphasis
 * would silently never be required of any evidence file — the opposite of the
 * single-source guarantee this function exists for.
 */
export function packetScenarioIds(root = process.cwd()) {
  const file = path.join(root, PACKET_PATH);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, "utf8");
  const ids = new Set();
  for (const match of content.matchAll(/^\|\s*\*{0,2}(PP-\d{2})\*{0,2}\s*\|/gmu)) {
    ids.add(match[1]);
  }
  return [...ids].sort();
}

/**
 * Fold look-alike characters before scanning.
 *
 * `120․000₫` with a U+2024 ONE DOT LEADER is the same disclosure as `120.000₫`
 * and previously walked straight past the grouped-number rule.
 */
function normalizeForScan(text) {
  return text
    .normalize("NFC")
    .replaceAll("․", ".")
    .replaceAll("·", ".")
    .replaceAll("．", ".")
    .replaceAll("ˌ", ",")
    .replaceAll("，", ",")
    .replaceAll(" ", " ");
}

/**
 * Content that must never enter Git.
 *
 * Tuned to what this file legitimately contains. Scenario counts are small — how
 * many accounts, how many rows — so a four-digit bare integer is money far more
 * often than it is a count, and that is the rule that catches the notation an owner
 * actually types (`250000`, `250k`, `1tr2`).
 */
const FORBIDDEN_PATTERNS = [
  {
    id: "currency_amount",
    // No trailing \b after the symbol: `250₫` must match, and previously did not
    // because \b required a following word character.
    pattern: /\d[\d.,\s]*\s*(?:₫|đ\b|VND|VNĐ|vnd|đồng|dong)/iu,
    why: "a money amount",
  },
  {
    id: "colloquial_amount",
    // How Vietnamese money is actually written in a note: 250k, 1tr2, 12 triệu.
    // No trailing \b: `1tr2` puts a digit after the unit, which a word boundary
    // rejects. A following letter is excluded instead, so `1trong` does not match.
    pattern: /\b\d+(?:[.,]\d+)?\s*(?:k|tr|củ|cu|triệu|trieu|nghìn|nghin|tỷ|ty)(?![\p{L}])/iu,
    why: "a colloquial money amount",
  },
  {
    id: "thousands_grouped_number",
    pattern: /\b\d{1,3}(?:[.,]\d{3}){1,}\b/u,
    why: "a grouped number that looks like a money amount",
  },
  {
    id: "bare_large_number",
    // Counts in this file are small. Four or more digits is an amount.
    pattern: /\b\d{4,}\b/u,
    why: "a number too large to be one of this file's counts",
  },
  { id: "email", pattern: /[\w.+-]+\s*(?:@|\[at\]|\(at\))\s*[\w-]+\.[\w.-]+/iu, why: "an email address" },
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
  { id: "bearer", pattern: /\bBearer\s+\S{12,}/u, why: "an authorization header" },
];

/**
 * Lines allowed to carry a long technical value — and only for the rules that
 * value would otherwise trip.
 *
 * An earlier version exempted a whole line from the *entire* scan whenever it
 * merely contained "OS version", so a note mentioning a version number could smuggle
 * an amount through. Exemptions are now per-field and per-rule.
 */
const FIELD_EXEMPTIONS = [
  {
    match: /^-?\s*Production commit SHA under test:/u,
    allow: ["bare_large_number", "uuid", "thousands_grouped_number"],
  },
  { match: /^-?\s*Run date:/u, allow: ["bare_large_number"] },
  { match: /^-?\s*OS version:/u, allow: ["bare_large_number"] },
  { match: /^-?\s*Browser version:/u, allow: ["bare_large_number"] },
  { match: /^-?\s*(?:Day|Date):/u, allow: ["bare_large_number"] },
];

function allowedRulesFor(line) {
  const allowed = new Set();
  for (const exemption of FIELD_EXEMPTIONS) {
    if (exemption.match.test(line.trim())) {
      for (const id of exemption.allow) allowed.add(id);
    }
  }
  return allowed;
}

export function scanForbiddenContent(text, { isTemplate = false } = {}) {
  const findings = [];
  // ISO dates are legitimate anywhere in these files — a per-field exemption for
  // them made every day row of the seven-day log trip the large-number rule.
  const lines = normalizeForScan(text)
    .replaceAll(/\b\d{4}-\d{2}-\d{2}\b/gu, "<date>")
    .split(/\r?\n/);
  let inFence = false;
  for (const [index, raw] of lines.entries()) {
    if (/^\s*```/u.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // Only a blank form may carry `<placeholder>` instructions; in a filled-in file
    // stripping them would let real data hide inside angle brackets.
    const line = isTemplate ? raw.replace(/`<[^`]*>`/gu, "").replace(/`YYYY-MM-DD`/gu, "") : raw;
    const allowed = allowedRulesFor(line);
    for (const rule of FORBIDDEN_PATTERNS) {
      if (allowed.has(rule.id)) continue;
      if (rule.pattern.test(line)) {
        findings.push({ line: index + 1, id: rule.id, why: rule.why });
      }
    }
  }
  return findings;
}

/** Terms that mean the observation did not happen on hardware. */
const EMULATED_TERMS =
  /\b(?:emulat\w*|simulator|simulated|device farm|browserstack|saucelabs|lambdatest|genymotion|resized|devtools|responsive mode|viewport profile|desktop browser|chrome window)\b/iu;

function sectionOf(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return null;
  const rest = text.slice(start + heading.length);
  const end = rest.search(/^## /mu);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function parseRow(line) {
  if (!line.trim().startsWith("|")) return null;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  return cells.length > 0 ? cells : null;
}

function tableRows(sectionText) {
  const rows = [];
  let inFence = false;
  for (const line of (sectionText ?? "").split(/\r?\n/)) {
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const cells = parseRow(line);
    if (!cells) continue;
    if (cells.every((cell) => /^:?-+:?$/u.test(cell) || cell === "")) continue;
    rows.push(cells);
  }
  return rows;
}

/**
 * Results are read only from the `## Results` section.
 *
 * Scanning the whole file meant a table pasted under another heading counted, and a
 * `Map` meant a later duplicate row silently overrode an earlier failing one.
 * Duplicates are now an error rather than a last-write-wins override.
 */
export function parseResults(text) {
  const results = new Map();
  const duplicates = [];
  const malformed = [];
  for (const cells of tableRows(sectionOf(text, "## Results"))) {
    const id = /^\*{0,2}(PP-\d{2})\*{0,2}$/u.exec(cells[0])?.[1];
    if (!id) continue;
    if (cells.length !== 3) {
      malformed.push({ id, columns: cells.length });
      continue;
    }
    if (results.has(id)) {
      duplicates.push(id);
      continue;
    }
    results.set(id, { result: cells[1], notes: cells[2] });
  }
  return { results, duplicates, malformed };
}

export function parseDefects(text) {
  const defects = [];
  for (const cells of tableRows(sectionOf(text, "## Defects"))) {
    if (cells[0] === "Ref") continue;
    if (cells.length < 5) continue;
    defects.push({
      ref: cells[0],
      scenario: cells[1],
      severity: cells[2],
      repro: cells[3],
      status: cells[4],
    });
  }
  return defects;
}

function fieldValue(text, field) {
  // Horizontal whitespace only: `\s*` consumed the newline and captured the *next*
  // line, so a label written with nothing after it read as filled in.
  const match = new RegExp(`^-?[ \t]*${field}[ \t]*(.*)$`, "mu").exec(text);
  return match ? match[1].replace(/[`*]/gu, "").trim() : null;
}

/**
 * Validate one physical-phone evidence file.
 *
 * `isTemplate` relaxes exactly three things — blank results, an unticked
 * declaration, and placeholder stripping — because the template is the blank form.
 * Everything else, including full scenario coverage and the privacy scan, applies to
 * it too: a template that omits a scenario guarantees every future run omits it.
 */
export function validateEvidenceFile({ name, text, scenarioIds, isTemplate = false }) {
  const problems = [];
  const add = (problem) => problems.push({ file: name, problem });

  for (const finding of scanForbiddenContent(text, { isTemplate })) {
    add(`line ${finding.line}: contains ${finding.why} (${finding.id})`);
  }

  // Sections must exist. `indexOf` returning -1 previously made a *missing*
  // declaration section pass silently, removing the only physical attestation.
  for (const heading of REQUIRED_SECTIONS) {
    if (!text.includes(heading)) add(`missing the "${heading}" section`);
  }

  const { results, duplicates, malformed } = parseResults(text);
  for (const id of duplicates) add(`${id} appears more than once; a later row must not override an earlier one`);
  for (const entry of malformed) {
    add(`${entry.id} row has ${entry.columns} columns; the results table takes exactly ID, Result, Notes`);
  }

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
    if (result !== "pass" && notes.trim().length < 10) {
      add(`${id} is "${result}" and must record what happened`);
    }
    // Emulated evidence cannot satisfy any physical scenario — checked on every
    // note, not only the first scenario's.
    if (EMULATED_TERMS.test(notes)) {
      add(`${id} describes emulated or resized-browser evidence, which cannot satisfy a physical scenario`);
    }
  }
  for (const id of results.keys()) {
    if (!scenarioIds.includes(id)) add(`${id} is not a scenario in the packet`);
  }

  for (const field of REQUIRED_DEVICE_FIELDS) {
    const value = fieldValue(text, field);
    if (value === null) {
      add(`missing the "${field}" device field`);
    } else if (value === "" && !isTemplate) {
      // Presence alone was checkable by writing the label and nothing after it.
      add(`"${field}" is present but empty`);
    }
  }
  const tier = fieldValue(text, "Tier:");
  if (tier && !VALID_TIERS.includes(tier) && !isTemplate) {
    add(`Tier must be one of ${VALID_TIERS.join(", ")} (found "${tier}")`);
  }
  if (!/Session:\s*`?authenticated/u.test(text)) {
    add("the run must record an authenticated session, never demo");
  }
  if (!isTemplate && EMULATED_TERMS.test(fieldValue(text, "Platform:") ?? "")) {
    add("Platform names an emulator; the required tier means hardware");
  }

  const defects = parseDefects(text);
  const declared = new Set();
  for (const defect of defects) {
    if (defect.ref === "" && defect.severity === "") continue; // blank template row
    if (defect.ref.toLowerCase() === "none") continue;
    if (!VALID_SEVERITIES.includes(defect.severity)) {
      add(`defect "${defect.ref}" severity must be one of ${VALID_SEVERITIES.join(", ")}`);
    }
    for (const id of defect.scenario.matchAll(/PP-\d{2}/gu)) declared.add(id[0]);
  }

  if (!isTemplate) {
    /**
     * A failure must reach the defect table.
     *
     * Otherwise a `fail_then_pass` with a ten-character note satisfied everything
     * while the packet's "counts as a finding until explained" left no finding
     * recorded anywhere.
     */
    for (const [id, entry] of results) {
      if (FAILING_RESULTS.includes(entry.result) && !declared.has(id)) {
        add(`${id} is "${entry.result}" and needs a matching row in the Defects table`);
      }
    }

    const declaration = sectionOf(text, "## Declaration");
    if (declaration !== null && /^- \[ \]/mu.test(declaration)) {
      add("every declaration line must be acknowledged before this is committed");
    }
  }

  return problems;
}

/**
 * The seven-day log validator was removed with the requirement itself.
 *
 * The owner withdrew seven-day self-use on 2026-08-12, so there is no per-day log
 * to validate and no template to keep in step. Historical seven-day records live in
 * `docs/REAL_USE_READINESS_CONTRACT.md` and are not evidence files.
 */

export function runProveEvidenceCheck({ root = process.cwd() } = {}) {
  const scenarioIds = packetScenarioIds(root);
  const problems = [];
  const dir = path.join(root, EVIDENCE_DIR);

  if (scenarioIds.length === 0) {
    return {
      ok: false,
      scenarioIds,
      checked: [],
      runs: [],
      unstarted: [],
      summary: null,
      problems: [{ file: PACKET_PATH, problem: "no PP-NN scenarios found in the packet" }],
    };
  }
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      scenarioIds,
      checked: [],
      runs: [],
      unstarted: [],
      summary: null,
      problems: [{ file: EVIDENCE_DIR, problem: "the evidence directory is missing" }],
    };
  }

  const checked = [];
  const runs = [];
  const unstarted = [];
  const summary = { pass: 0, fail: 0, blocked: 0, fail_then_pass: 0, not_applicable: 0 };
  for (const entry of fs.readdirSync(dir).sort()) {
    if (!entry.endsWith(".md")) continue;
    const text = fs.readFileSync(path.join(dir, entry), "utf8");
    const name = `${EVIDENCE_DIR}/${entry}`;
    checked.push(entry);

    const isTemplate = entry === TEMPLATE_NAME;
    /**
     * A copy that has not been filled in yet is not a broken run.
     *
     * The owner copies the template and fills it in while running, so a blank copy
     * exists on their machine before any result does. Failing the gate on it would
     * make the check fail for the person it exists to help, so a copy with no
     * results at all is validated as a blank form and reported as unstarted.
     */
    const untouched =
      !isTemplate &&
      scenarioIds.length > 0 &&
      [...parseResults(text).results.values()].every((entry_) => entry_.result === "");
    if (untouched) {
      problems.push(...validateEvidenceFile({ name, text, scenarioIds, isTemplate: true }));
      unstarted.push(entry);
      continue;
    }
    problems.push(...validateEvidenceFile({ name, text, scenarioIds, isTemplate }));
    if (isTemplate) continue;
    runs.push(entry);
    for (const { result } of parseResults(text).results.values()) {
      if (result in summary) summary[result] += 1;
    }
  }

  if (!checked.includes(TEMPLATE_NAME)) {
    problems.push({ file: EVIDENCE_DIR, problem: `${TEMPLATE_NAME} is missing` });
  }

  return { ok: problems.length === 0, scenarioIds, checked, runs, unstarted, summary, problems };
}

function runCli() {
  const result = runProveEvidenceCheck();
  if (!result.ok) {
    console.error("P3 Prove evidence contract failed:\n");
    for (const problem of result.problems) {
      console.error(`- ${problem.file}: ${problem.problem}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `P3 Prove evidence contract passed (${result.scenarioIds.length} scenarios; ${result.runs.length} recorded run${result.runs.length === 1 ? "" : "s"}).`,
  );
  if (result.unstarted.length > 0) {
    console.log(
      `unstarted copies (blank, nothing claimed): ${result.unstarted.join(", ")}`,
    );
  }
  if (result.runs.length === 0) {
    console.log(
      "No physical-phone run is recorded yet; the template validates only its own shape.",
    );
    return;
  }

  /**
   * A valid file is not an acceptance.
   *
   * Recording every scenario as failed produces a perfectly valid file, so the outcome is
   * reported separately from the file's validity — otherwise "contract passed" reads
   * as "the phase passed".
   */
  const { summary } = result;
  const unresolved = summary.fail + summary.blocked + summary.fail_then_pass;
  console.log(
    `results: ${summary.pass} pass, ${summary.fail} fail, ${summary.blocked} blocked, ${summary.fail_then_pass} fail_then_pass, ${summary.not_applicable} not_applicable`,
  );
  if (unresolved > 0) {
    console.log(
      `This file is well-formed, but ${unresolved} scenario(s) did not cleanly pass. P3 is NOT accepted while any remain unresolved; a fail_then_pass stays a finding until explained.`,
    );
  } else {
    console.log(
      "All scenarios pass. Acceptance is still the owner's decision, recorded in the packet — not something this check can grant.",
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
