import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";

const tool = readFileSync(
  join(process.cwd(), "public/capture-bench.html"),
  "utf8",
);

test("capture-bench tool measures TTLT for both existing capture routes", () => {
  for (const id of [
    "A1",
    "A2",
    "A3",
    "A4",
    "D1",
    "D2",
    "D3",
    "P1",
    "P2",
    "P3",
  ]) {
    assert.match(tool, new RegExp(`id: "${id}"`), `missing task ${id}`);
  }
  assert.match(tool, /\/capture\/quick/);
  assert.match(tool, /\/capture\/paste/);
});

test("capture-bench tool can seed and clear a reviewed pattern cohort", () => {
  // The seed writes reviewed demo rows the pattern deriver accepts, tagged so
  // ledger-write detection never mistakes them for a task's save.
  assert.match(tool, /bench-seed-/);
  assert.match(tool, /reviewStatus: "reviewed"/);
  assert.match(tool, /id="seed"/);
  assert.match(tool, /id="unseed"/);
  // Seeded history must resolve against real demo account/category ids —
  // otherwise eligibility drops the rows and no chip appears.
  assert.match(tool, /demo-account-cash/);
  assert.match(tool, /demo-category-expense-/);
  // Pattern usage is reported per task, not folded into the note.
  assert.match(tool, /fu-pattern/);
  assert.match(tool, /group: "pattern"/);
  // P-tasks verify the saved row's context too — picking the wrong chip must
  // read as "khác-kỳ-vọng", not silently pass on kind+amount alone.
  assert.match(tool, /expect\.accountId/);
  assert.match(tool, /expect\.categoryId/);
});

test("capture-bench tool observes demo-mode storage keys without touching product code", () => {
  assert.match(tool, /moneyflow-demo-transactions-v1/);
  assert.match(tool, /moneyflow-inbox-candidates-v1/);
  assert.match(tool, /addEventListener\("storage"/);
  assert.match(tool, /performance\.now\(\)/);
});

test("capture-bench ledger detection ignores the materialized demo baseline", () => {
  // On a fresh profile the demo store writes the built-in sample-* fixtures in
  // the same first write as the task's real save. findNew must exclude them or
  // the matcher grades a fixture row (e.g. sample-4 income) instead.
  assert.match(tool, /sample-/);
  const findNew = tool.slice(
    tool.indexOf("function findNew"),
    tool.indexOf("function findNew") + 700,
  );
  assert.match(findNew, /startsWith\("bench-seed-"\)/);
  assert.match(findNew, /startsWith\("sample-"\)/);
});

test("capture-bench report emits the evidence fields needed for hypothesis evaluation", () => {
  for (const field of [
    "CAPTURE V2 BENCHMARK",
    "Date/time:",
    "Release candidate / commit if known:",
    "Origin:",
    "Mode:",
    "Cohort:",
    "Device/OS/browser:",
    "Network context:",
    "Median total",
  ]) {
    assert.ok(tool.includes(field), `missing report field: ${field}`);
  }
});

test("capture-bench tool is self-contained, privacy-safe and not indexable", () => {
  assert.match(tool, /name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(tool, /<script src=/);
  assert.doesNotMatch(tool, /<link/);
  assert.doesNotMatch(tool, /https?:\/\/(?!mfvn)/); // no external calls
  assert.match(tool, /fetch\("\/api\/health"\)/); // same-origin build identity only
  assert.doesNotMatch(tool, /XMLHttpRequest|sendBeacon|gtag|analytics/i);
});

test("dated capture tasks reject a correct amount posted on the wrong Vietnam day", () => {
  const start = tool.indexOf("function expectedOccurredOn");
  const end = tool.indexOf("function stopActive", start);
  assert.ok(start > 0 && end > start);
  const { expectedOccurredOn, matchExpect } = runInNewContext(
    tool.slice(start, end) + "({ expectedOccurredOn, matchExpect })",
  ) as {
    expectedOccurredOn: (task: object, now: Date) => string;
    matchExpect: (task: object, record: object, expectedOn: string) => string;
  };
  assert.match(tool, /id: "D2"[\s\S]*?occurredOn: "yesterday-vn"/);
  assert.match(tool, /id: "D3"[\s\S]*?occurredOn: "2026-09-21"/);
  assert.match(
    tool,
    /expectedOccurredOn: expectedOccurredOn\(task, new Date\(\)\)/,
  );
  assert.match(
    tool,
    /matchExpect\(active\.task, news\[news\.length - 1\], active\.expectedOccurredOn\)/,
  );

  const yesterdayTask = {
    expect: { kind: "expense", amount: 185000, occurredOn: "yesterday-vn" },
  };
  const beforeMidnight = expectedOccurredOn(
    yesterdayTask,
    new Date("2026-09-27T16:59:00Z"),
  );
  const afterMidnight = expectedOccurredOn(
    yesterdayTask,
    new Date("2026-09-27T17:01:00Z"),
  );
  assert.equal(beforeMidnight, "2026-09-26");
  assert.equal(afterMidnight, "2026-09-27");
  assert.equal(
    expectedOccurredOn(yesterdayTask, new Date("2027-01-01T00:00:00Z")),
    "2026-12-31",
  );
  assert.equal(
    expectedOccurredOn(yesterdayTask, new Date("2028-03-01T00:00:00Z")),
    "2028-02-29",
  );
  const matchingRecord = {
    kind: "expense",
    amount: 185000,
    occurredOn: afterMidnight,
  };
  assert.equal(
    matchExpect(yesterdayTask, matchingRecord, afterMidnight),
    "đúng",
  );
  assert.equal(
    matchExpect(
      yesterdayTask,
      { ...matchingRecord, occurredOn: "2026-09-28" },
      afterMidnight,
    ),
    "khác-kỳ-vọng",
  );
  assert.equal(
    matchExpect(
      yesterdayTask,
      { ...matchingRecord, occurredOn: undefined },
      afterMidnight,
    ),
    "khác-kỳ-vọng",
  );
  const fixedDateTask = {
    expect: { kind: "expense", amount: 250000, occurredOn: "2026-09-21" },
  };
  assert.equal(
    expectedOccurredOn(fixedDateTask, new Date("2026-09-28T00:00:00Z")),
    "2026-09-21",
  );
  assert.equal(
    matchExpect(
      fixedDateTask,
      {
        kind: "expense",
        amount: 250000,
        occurredOn: "2026-09-28",
      },
      "2026-09-21",
    ),
    "khác-kỳ-vọng",
  );
});

test("TTLT median excludes wrong-date and unverified saves", () => {
  const start = tool.indexOf("function trustedTotalsFor");
  const end = tool.indexOf('document.getElementById("gen")', start);
  assert.ok(start > 0 && end > start);
  const trustedTotalsFor = runInNewContext(
    tool.slice(start, end) + "trustedTotalsFor",
  ) as (group: string, tasks: object[], measured: object) => number[];
  const tasks = [
    { id: "D2", group: "description" },
    { id: "D3", group: "description" },
    { id: "D4", group: "description" },
  ];
  const measured = {
    D2: { ms: 1000, match: "khác-kỳ-vọng" },
    D3: { ms: 2000, match: "đúng" },
    D4: { ms: 3000, stopReason: "manual" },
  };
  assert.deepEqual(
    Array.from(trustedTotalsFor("description", tasks, measured)),
    [2000],
  );
  assert.match(tool, /trusted=" \+ ms\.length \+ "\/" \+ attempted/);
});
