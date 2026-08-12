import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EVIDENCE_DIR,
  PACKET_PATH,
  packetScenarioIds,
  parseDefects,
  parseResults,
  runProveEvidenceCheck,
  scanForbiddenContent,
  validateEvidenceFile,
  VALID_RESULTS,
} from "./check-prove-evidence.mjs";

/**
 * A validator is only worth having if it actually rejects what it claims to. Every
 * test below is a way a P3 evidence file could be wrong that a human reviewer would
 * plausibly miss — and most of them are bypasses an adversarial review found in the
 * first version of this file, kept as tests so they cannot come back.
 */

const scenarioIds = packetScenarioIds();
const template = readFileSync(`${EVIDENCE_DIR}/TEMPLATE.md`, "utf8");
const packet = readFileSync(PACKET_PATH, "utf8");

function evidence(rows = {}, overrides = {}) {
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
    overrides.extraResultRows ?? "",
    "",
    "## Sanitized observations",
    "",
    `- Accounts shown in PP-02: ${overrides.accounts ?? "3"}`,
    overrides.extraObservation ?? "",
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
  assert.ok(scenarioIds.length <= 20, "a run a human performs must stay bounded");
  assert.deepEqual(scenarioIds, [...scenarioIds].sort());
  assert.ok(scenarioIds.includes("PP-01"));
});

test("the shipped repository state passes", () => {
  const result = runProveEvidenceCheck();
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

test("the template ships blank and covers every scenario", () => {
  /**
   * Deliberately an assertion about the *templates*, not about whether any run file
   * exists. An earlier version asserted the repository contained no recorded run,
   * which would have failed CI on the very PR that records one — forcing the owner
   * to edit a test in the same commit as their evidence.
   */
  const { results } = parseResults(template);
  for (const id of scenarioIds) {
    assert.ok(results.has(id), `the template must have a row for ${id}`);
    assert.equal(results.get(id).result, "", `${id} must ship blank`);
  }
});

test("a valid completed run passes", () => {
  assert.deepEqual(problemsFor(evidence()), []);
});

test("scenario IDs are found whether or not the packet emphasises them", () => {
  // Requiring bold meant a scenario added without it was silently never required.
  const ids = new Set(scenarioIds);
  assert.ok(ids.has("PP-17") || ids.has(scenarioIds.at(-1)));
  assert.ok(scenarioIds.length === new Set(scenarioIds).size);
});

// --- Completeness --------------------------------------------------------------

test("a missing scenario row is rejected", () => {
  const text = evidence().replace(/^\| PP-05 .*$/mu, "");
  assert.ok(problemsFor(text).some((problem) => /missing a result row for PP-05/u.test(problem)));
});

test("an invented result value is rejected and every valid one accepted", () => {
  assert.ok(
    problemsFor(evidence({ "PP-03": { result: "mostly ok" } })).some((problem) =>
      /PP-03 result must be one of/u.test(problem),
    ),
  );
  for (const valid of VALID_RESULTS) {
    const notes = valid === "pass" ? "" : "recorded in detail here";
    const defectRow =
      valid === "pass" || valid === "not_applicable"
        ? undefined
        : "| D1 | PP-03 | finding | tapped save twice | open |";
    assert.deepEqual(
      problemsFor(evidence({ "PP-03": { result: valid, notes } }, { defectRow })),
      [],
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
  const text = evidence({}, { extraResultRows: "| PP-99 | pass | |" });
  assert.ok(problemsFor(text).some((problem) => /PP-99 is not a scenario/u.test(problem)));
});

test("a duplicate scenario row cannot override an earlier failing one", () => {
  // Last-write-wins let `| PP-05 | fail | |` be cancelled by a later pass row.
  const text = evidence({ "PP-05": { result: "fail", notes: "" } }, {
    extraResultRows: "| PP-05 | pass | |",
  });
  const problems = problemsFor(text);
  assert.ok(problems.some((problem) => /PP-05 appears more than once/u.test(problem)));
});

test("a results row with an extra column is rejected, not silently trimmed", () => {
  const text = evidence().replace("| PP-01 | pass |  |", "| PP-01 | pass |  | emulator |");
  assert.ok(problemsFor(text).some((problem) => /PP-01 row has 4 columns/u.test(problem)));
});

test("results are read only from the Results section", () => {
  // A table pasted under another heading, or inside a fence, is not a result.
  const text = evidence().replace(
    "## Defects",
    "## Defects\n\n```\n| PP-01 | pass | |\n```\n",
  );
  assert.ok(!problemsFor(text).some((problem) => /PP-01 appears more than once/u.test(problem)));
});

test("every required section must exist", () => {
  for (const heading of ["## Run", "## Results", "## Defects", "## Declaration"]) {
    const text = evidence().replace(heading, "## Something Else");
    assert.ok(
      problemsFor(text).some((problem) => problem.includes(`missing the "${heading}" section`)),
      `${heading} must be required`,
    );
  }
});

test("deleting the declaration section cannot remove the physical attestation", () => {
  /**
   * The specific bug: `indexOf` returned -1, `slice(-1)` was the last character, and
   * the unticked-box scan found nothing — so removing the entire declaration
   * validated clean and stripped the only emulator attestation.
   */
  const text = evidence().split("## Declaration")[0];
  assert.ok(problemsFor(text).some((problem) => /missing the "## Declaration" section/u.test(problem)));
});

test("a failure, a block and a retry-pass each need a note and a defect row", () => {
  for (const result of ["fail", "blocked", "fail_then_pass"]) {
    const bare = problemsFor(evidence({ "PP-07": { result, notes: "" } }));
    assert.ok(bare.some((problem) => problem.startsWith("PP-07")), `${result} with no note must fail`);

    // A note alone is not enough: the finding has to be recorded as a defect.
    const noted = problemsFor(
      evidence({ "PP-07": { result, notes: "undo tap missed the window twice" } }),
    );
    assert.ok(
      noted.some((problem) => /PP-07 is "(?:fail|blocked|fail_then_pass)" and needs a matching row in the Defects table/u.test(problem)),
      `${result} with a note but no defect row must fail`,
    );

    const complete = problemsFor(
      evidence(
        { "PP-07": { result, notes: "undo tap missed the window twice" } },
        { defectRow: "| D1 | PP-07 | finding | delete then wait | open |" },
      ),
    );
    assert.deepEqual(complete, [], `${result} with a note and a defect row must pass`);
  }
});

test("a retry pass is never silently a clean pass", () => {
  const problems = problemsFor(evidence({ "PP-05": { result: "fail_then_pass", notes: "ok" } }));
  assert.ok(problems.some((problem) => problem.startsWith("PP-05")));
});

test("a file recording total failure is well-formed but never reported as an acceptance", () => {
  /**
   * A valid file is not an acceptance. A total failure must be committable — that
   * is honest evidence — while nothing may print "passed" in a way that reads as the
   * phase being done.
   */
  const rows = Object.fromEntries(
    scenarioIds.map((id) => [id, { result: "fail", notes: "did not work on this device" }]),
  );
  const defectRows = scenarioIds
    .map((id, index) => `| D${index + 1} | ${id} | P1 | see notes | open |`)
    .join("\n");
  assert.deepEqual(problemsFor(evidence(rows, { defectRow: defectRows })), []);
  // The distinction lives in the CLI summary, which counts results by kind.
  const { results } = parseResults(evidence(rows, { defectRow: defectRows }));
  assert.equal([...results.values()].filter((entry) => entry.result === "fail").length, scenarioIds.length);
});

test("device fields must be present and non-empty, and the tier must be real", () => {
  for (const field of ["Platform:", "OS version:", "Browser version:", "Tier:"]) {
    const missing = evidence().replace(new RegExp(`^- ${field}.*$`, "mu"), "");
    assert.ok(
      problemsFor(missing).some((problem) => problem.includes(field)),
      `${field} must be required`,
    );
    // Writing the label with nothing after it previously satisfied the check.
    const empty = evidence().replace(new RegExp(`^- ${field}.*$`, "mu"), `- ${field}`);
    assert.ok(
      problemsFor(empty).some((problem) => /is present but empty/u.test(problem)),
      `an empty ${field} must be rejected`,
    );
  }
  assert.ok(
    problemsFor(evidence({}, { tier: "sort-of-required" })).some((problem) =>
      /Tier must be one of required, optional/u.test(problem),
    ),
  );
  assert.deepEqual(problemsFor(evidence({}, { tier: "optional" })), []);
});

test("a demo session is rejected", () => {
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
  assert.deepEqual(problemsFor(template, true), []);
});

test("an invented defect severity is rejected", () => {
  assert.ok(
    problemsFor(
      evidence({}, { defectRow: "| D1 | PP-06 | catastrophic | tapped save twice | open |" }),
    ).some((problem) => /severity must be one of P0, P1, finding/u.test(problem)),
  );
  for (const severity of ["P0", "P1", "finding"]) {
    assert.deepEqual(
      problemsFor(evidence({}, { defectRow: `| D1 | PP-06 | ${severity} | tapped save twice | open |` })),
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

test("money amounts in every notation this product uses are rejected", () => {
  const cases = [
    "120.000₫",
    "50,000 VND",
    "35000 đồng",
    "1.250.000",
    // The `₫` rule previously required a following word character, so a bare
    // suffixed amount slipped through entirely.
    "250₫",
    "recorded 250₫ today",
    "250000 VNĐ",
    "500000đ",
    // Ungrouped amounts are what a keypad actually produces.
    "recorded 250000 for lunch",
    // Colloquial Vietnamese money is the notation an owner will really type.
    "250k",
    "1tr2",
    "12 triệu",
    "500 nghìn",
    "2 tỷ",
    // A look-alike separator is the same disclosure.
    "120․000₫",
  ];
  for (const amount of cases) {
    assert.ok(
      scanForbiddenContent(`| PP-03 | pass | note ${amount} here |`).length > 0,
      `"${amount}" must be refused`,
    );
  }
});

test("a technical field cannot be used to smuggle an amount", () => {
  /**
   * The bypass: exempting a whole line from the *entire* scan whenever it contained
   * "OS version" or "commit SHA". Exemptions are now per-field and per-rule.
   */
  const smuggled = "| PP-03 | pass | recorded 250.000₫, wrong OS version shown |";
  assert.ok(scanForbiddenContent(smuggled).some((finding) => /amount/u.test(finding.why)));
  // The real fields still validate clean.
  for (const safe of [
    "- Production commit SHA under test: 277d459c6f4c2c47dc1054004ea881f0dfd90a11",
    "- OS version: 15",
    "- Browser version: 141",
    "- Run date: 2026-08-20",
  ]) {
    assert.deepEqual(scanForbiddenContent(safe), [], `"${safe}" must be allowed`);
  }
});

test("angle-bracket placeholders hide nothing in a filled-in file", () => {
  const line = "| PP-03 | pass | amount `<250.000₫>` saved fine |";
  assert.ok(scanForbiddenContent(line).length > 0, "a filled-in file must be scanned literally");
  // Only the blank form may carry placeholder instructions.
  assert.deepEqual(scanForbiddenContent("- Platform: `<Android | iOS>`", { isTemplate: true }), []);
});

test("plain counts, versions and dates are not mistaken for amounts", () => {
  for (const safe of [
    "- Accounts shown in PP-02: 3",
    "- Register rows before PP-11 reload: 14",
    "- PP-15 rows created by the retried save: 1",
    "- PP-12 orientations tested: portrait+landscape",
    "- PP-05 income/expense totals after the transfer: unchanged",
  ]) {
    assert.deepEqual(scanForbiddenContent(safe), [], `"${safe}" must be allowed`);
  }
});

test("identifiers, emails, tokens and account numbers are rejected", () => {
  const cases = {
    email: "- Signed in as owner@example.com",
    // Obfuscation is still disclosure.
    email_obfuscated: "- Signed in as owner+p3 [at] gmail.com",
    uuid: "- Row 3f1a5b2c-1111-4222-8333-444455556666 was wrong",
    jwt: "- Header eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijkl",
    supabase_key: "- Used sb_secret_abcdefghijkl",
    bearer: "- Sent Bearer abcdefghijklmnop",
  };
  for (const [label, line] of Object.entries(cases)) {
    assert.ok(scanForbiddenContent(line).length > 0, `${label} must be detected in "${line}"`);
  }
});

test("forbidden content is rejected inside a real evidence file, not only in isolation", () => {
  const text = evidence({ "PP-03": { result: "pass", notes: "saved 250.000₫ correctly" } });
  assert.ok(problemsFor(text).some((problem) => /money amount/u.test(problem)));
});

test("the template is privacy-scanned and clean", () => {
  // A template carrying a sample amount would seed every future run with one.
  assert.deepEqual(scanForbiddenContent(template, { isTemplate: true }), []);
});

test("the template warns about what the scan cannot see", () => {
  // Payee and institution names in prose, and screenshot contents, are not
  // machine-detectable; the template must not imply otherwise.
  assert.match(template, /screenshot/iu);
  assert.match(template, /payee or institution name/iu);
});

// --- Physical versus emulated --------------------------------------------------

test("emulated evidence cannot satisfy any scenario, not merely the first", () => {
  /**
   * The guard previously inspected PP-01's notes only, so "ran in the Android
   * emulator profile" on PP-03 sailed through — as did "resized desktop Chrome
   * window" and a cloud device-farm vendor name on PP-01.
   */
  const disqualifying = [
    "ran in the Android emulator profile",
    "resized desktop Chrome window to 390x844",
    "BrowserStack cloud device",
    "used devtools responsive mode",
    "iOS simulator",
  ];
  for (const id of ["PP-01", "PP-03", scenarioIds.at(-1)]) {
    for (const notes of disqualifying) {
      const problems = problemsFor(evidence({ [id]: { result: "pass", notes } }));
      assert.ok(
        problems.some((problem) => /emulated or resized-browser evidence/u.test(problem)),
        `"${notes}" on ${id} must be refused`,
      );
    }
  }
});

test("an emulator named as the platform is refused", () => {
  assert.ok(
    problemsFor(evidence({}, { platform: "Android emulator" })).some((problem) =>
      /Platform names an emulator/u.test(problem),
    ),
  );
});

test("the accepted packet and template both keep emulation distinct from owner evidence", () => {
  assert.match(packet, /\bnot\b[\s*]+a physical-phone pass/iu);
  assert.match(template, /not\s+physical evidence/iu);
  // Acceptance is the owner's declared physical result, never an emulator or a
  // signed/filed evidence artifact invented by an agent.
  assert.match(packet, /P3 is accepted/iu);
  assert.match(packet, /owner-observed\s+evidence, not a signed or filed evidence run/iu);
});

// --- Packet consistency --------------------------------------------------------

test("the withdrawn seven-day requirement leaves no live obligation behind", () => {
  /**
   * The owner removed seven-day self-use on 2026-08-12. The decision must be
   * visible, and no duration gate may survive it under another name.
   */
  assert.match(packet, /withdrawn by the owner/iu);
  assert.match(packet, /No replacement duration gate is introduced/u);
  assert.ok(!/Day 0 prerequisites are met/u.test(packet), "Day-0 mechanics must be gone");
  assert.ok(!/### What resets the streak/u.test(packet), "streak mechanics must be gone");
  assert.match(packet, /not_applicable/u, "hardware without the feature under test");
});

test("a blank copy of the template is treated as unstarted, not as a broken run", () => {
  /**
   * The owner copies the template before running, so a blank copy exists on their
   * machine first. Failing the gate on it would break the check for the person it
   * exists to help.
   */
  const blank = template.replace("# P3 Prove", "# P3 Prove copy");
  assert.deepEqual(problemsFor(blank, true), []);
});
