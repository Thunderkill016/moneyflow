import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EVIDENCE_DIR,
  packetScenarioIds,
  parseDefects,
  parseResults,
  runProveEvidenceCheck,
  scanForbiddenContent,
  validateEvidenceFile,
  VALID_RESULTS,
} from "./check-prove-evidence.mjs";

/**
 * A validator is only worth having if it actually rejects the things it claims to.
 * Each test below is one way a P3 evidence file could be wrong in a way a human
 * reviewer would plausibly miss.
 */

const scenarioIds = packetScenarioIds();
const template = readFileSync(`${EVIDENCE_DIR}/TEMPLATE.md`, "utf8");

function evidence(rows, overrides = {}) {
  const resultRows = scenarioIds
    .map((id) => `| ${id} | ${rows[id]?.result ?? "pass"} | ${rows[id]?.notes ?? ""} |`)
    .join("\n");
  return [
    "# P3 Prove — physical-phone acceptance evidence",
    "",
    "## Run",
    "",
    "- Run date: 2026-08-20",
    `- Tier: ${overrides.tier ?? "required"}`,
    `- Platform: ${overrides.platform ?? "Android"}`,
    "- OS version: 15",
    "- Browser: Chrome",
    "- Browser version: 141",
    "- Production commit SHA under test: 277d459c6f4c2c47dc1054004ea881f0dfd90a11",
    `- Session: ${overrides.session ?? "authenticated"}`,
    "",
    "## Results",
    "",
    "| ID | Result | Notes |",
    "|---|---|---|",
    resultRows,
    "",
    "## Sanitized observations",
    "",
    `- Accounts shown in PP-02: ${overrides.accounts ?? "3"}`,
    "",
    "## Defects",
    "",
    "| Ref | Scenario | Severity | Reproduction (behavior only) | Status |",
    "|---|---|---|---|---|",
    overrides.defectRow ?? "| none | | | | |",
    "",
    "## Declaration",
    "",
    `- [${overrides.declared === false ? " " : "x"}] Observed on the physical device named above.`,
    "- [x] No result was inferred or back-filled.",
    "",
  ].join("\n");
}

function problemsFor(text, isTemplate = false) {
  return validateEvidenceFile({ name: "test.md", text, scenarioIds, isTemplate }).map(
    (entry) => entry.problem,
  );
}

// --- The shipped state ---------------------------------------------------------

test("the packet defines a bounded, non-empty scenario set", () => {
  assert.ok(scenarioIds.length >= 10, "the loop needs real coverage");
  assert.ok(scenarioIds.length <= 20, "a device run a human performs must stay bounded");
  assert.deepEqual(scenarioIds, [...scenarioIds].sort());
  assert.ok(scenarioIds.includes("PP-01"));
});

test("the shipped template and repository state pass", () => {
  const result = runProveEvidenceCheck();
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  // And no physical run is recorded yet, so nothing may imply one.
  assert.deepEqual(
    result.checked.filter((name) => name !== "TEMPLATE.md"),
    [],
    "this mission must not ship a recorded device run",
  );
});

test("the template covers every scenario the packet defines", () => {
  // A template missing a row guarantees every future run misses that scenario.
  const rows = parseResults(template);
  for (const id of scenarioIds) {
    assert.ok(rows.has(id), `the template must have a row for ${id}`);
    assert.equal(rows.get(id).result, "", `${id} must ship blank`);
  }
});

test("a valid completed run passes", () => {
  assert.deepEqual(problemsFor(evidence({})), []);
});

// --- Completeness --------------------------------------------------------------

test("a missing scenario row is rejected", () => {
  const text = evidence({}).replace(/^\| PP-05 .*$/mu, "");
  assert.ok(problemsFor(text).some((problem) => /missing a result row for PP-05/u.test(problem)));
});

test("an invented result value is rejected", () => {
  const problems = problemsFor(evidence({ "PP-03": { result: "mostly ok" } }));
  assert.ok(problems.some((problem) => /PP-03 result must be one of/u.test(problem)));
  for (const valid of VALID_RESULTS) {
    assert.ok(
      !problemsFor(evidence({ "PP-03": { result: valid, notes: "recorded in detail here" } })).some(
        (problem) => /PP-03 result must be/u.test(problem),
      ),
      `${valid} must be accepted`,
    );
  }
});

test("an empty result is rejected rather than read as a pass", () => {
  assert.ok(
    problemsFor(evidence({ "PP-11": { result: "" } })).some((problem) =>
      /PP-11 result must be one of/u.test(problem),
    ),
  );
});

test("a scenario that is not in the packet is rejected", () => {
  const text = evidence({}).replace("## Sanitized observations", "| PP-99 | pass | |\n\n## Sanitized observations");
  assert.ok(problemsFor(text).some((problem) => /PP-99 is not a scenario/u.test(problem)));
});

test("a failure, a block and a retry-pass all require an explanation", () => {
  for (const result of ["fail", "blocked", "fail_then_pass"]) {
    const bare = problemsFor(evidence({ "PP-07": { result, notes: "" } }));
    assert.ok(
      bare.some((problem) => problem.startsWith("PP-07")),
      `${result} with no note must be rejected`,
    );
    const explained = problemsFor(
      evidence({ "PP-07": { result, notes: "undo tap missed the 8 second window twice" } }),
    );
    assert.ok(
      !explained.some((problem) => problem.startsWith("PP-07")),
      `${result} with a real note must be accepted`,
    );
  }
});

test("a retry pass is never silently a clean pass", () => {
  // The specific trap: the second attempt worked, so the row looks fine.
  const problems = problemsFor(evidence({ "PP-05": { result: "fail_then_pass", notes: "ok" } }));
  assert.ok(
    problems.some((problem) => /fail_then_pass and must carry an explanation/u.test(problem)),
  );
});

test("the device fields and an authenticated session are required", () => {
  for (const field of ["Platform:", "OS version:", "Browser version:", "Tier:"]) {
    const text = evidence({}).replace(new RegExp(`^- ${field}.*$`, "mu"), "");
    assert.ok(
      problemsFor(text).some((problem) => problem.includes(field)),
      `${field} must be required`,
    );
  }
  assert.ok(
    problemsFor(evidence({}, { session: "demo" })).some((problem) =>
      /authenticated session, never demo/u.test(problem),
    ),
  );
});

test("an unacknowledged declaration blocks a completed run", () => {
  assert.ok(
    problemsFor(evidence({}, { declared: false })).some((problem) =>
      /declaration line must be acknowledged/u.test(problem),
    ),
  );
  // The blank template is exempt: it is the unfilled form.
  assert.deepEqual(problemsFor(template, true), []);
});

test("an invented defect severity is rejected", () => {
  const problems = problemsFor(
    evidence({}, { defectRow: "| D1 | PP-06 | catastrophic | tapped save twice | open |" }),
  );
  assert.ok(problems.some((problem) => /severity must be one of P0, P1, finding/u.test(problem)));
  for (const severity of ["P0", "P1", "finding"]) {
    assert.deepEqual(
      problemsFor(
        evidence({}, { defectRow: `| D1 | PP-06 | ${severity} | tapped save twice | open |` }),
      ),
      [],
      `${severity} must be accepted`,
    );
  }
});

test("defect rows parse without swallowing the results table", () => {
  const defects = parseDefects(
    evidence({}, { defectRow: "| D1 | PP-06 | P1 | tapped save twice | open |" }),
  );
  assert.equal(defects.length, 1);
  assert.equal(defects[0].severity, "P1");
});

// --- Privacy -------------------------------------------------------------------

test("money amounts in any shipped notation are rejected", () => {
  for (const amount of ["120.000₫", "50,000 VND", "35000 đồng", "1.250.000"]) {
    const findings = scanForbiddenContent(`- Notes: recorded ${amount} today`);
    assert.ok(findings.length > 0, `"${amount}" must be refused`);
  }
});

test("plain counts are not mistaken for amounts", () => {
  // The file legitimately reports counts, versions and dates.
  for (const safe of [
    "- Accounts shown in PP-02: 3",
    "- Register rows before PP-11 reload: 14",
    "- Browser version: 141",
    "- Run date: 2026-08-20",
    "- PP-12 orientations tested: portrait+landscape",
  ]) {
    assert.deepEqual(scanForbiddenContent(safe), [], `"${safe}" must be allowed`);
  }
});

test("identifiers, emails, tokens and account numbers are rejected", () => {
  const cases = {
    email: "- Signed in as owner@example.com",
    uuid: "- Row 3f1a5b2c-1111-4222-8333-444455556666 was wrong",
    jwt: "- Header eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijkl",
    supabase_key: "- Used sb_secret_abcdefghijkl",
    bearer: "- Sent Bearer abcdefghijklmnop",
    long_digit_run: "- Account 1234567890123456 shown",
  };
  for (const [id, line] of Object.entries(cases)) {
    const findings = scanForbiddenContent(line);
    assert.ok(
      findings.some((finding) => finding.id === id),
      `${id} must be detected in "${line}"`,
    );
  }
});

test("the commit SHA and version lines are allowed to carry hex and digits", () => {
  assert.deepEqual(
    scanForbiddenContent("- Production commit SHA under test: 277d459c6f4c2c47dc1054004ea881f0dfd90a11"),
    [],
  );
});

test("forbidden content is rejected in a real evidence file, not only in isolation", () => {
  const text = evidence({ "PP-03": { result: "pass", notes: "saved 250.000₫ correctly" } });
  assert.ok(problemsFor(text).some((problem) => /money amount/u.test(problem)));
});

test("the template itself is privacy-scanned", () => {
  // A template carrying a sample amount would seed every future run with one.
  assert.deepEqual(scanForbiddenContent(template), []);
});

// --- Physical versus emulated --------------------------------------------------

test("emulated evidence cannot satisfy a required scenario", () => {
  const text = evidence({
    "PP-01": { result: "pass", notes: "ran in the 390x844 emulator profile" },
  });
  assert.ok(
    problemsFor(text).some((problem) => /emulated evidence cannot satisfy/u.test(problem)),
  );
});

test("the packet and template both state that an emulator is not physical", () => {
  const packet = readFileSync("docs/plans/active/moneyflow-trust-prove.md", "utf8");
  // Emphasis markers and line wrapping sit between the words in the prose.
  assert.match(packet, /\bnot\b[\s*]+a physical-phone pass/iu);
  assert.match(template, /not\s+physical evidence/iu);
  // And the packet must not claim the run happened.
  assert.match(packet, /has \*\*not\*\* started|not been executed/u);
});
