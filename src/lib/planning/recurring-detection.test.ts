import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SUGGESTIONS,
  detectRecurringPatterns,
  recurringDetectionStart,
  type RecurringDetectionRow,
} from "./recurring-detection.ts";

const TODAY = "2026-09-22";
let seq = 0;

function row(
  note: string,
  occurredOn: string,
  amount: number,
  overrides: Partial<RecurringDetectionRow> = {},
): RecurringDetectionRow {
  seq += 1;
  return {
    id: `t-${seq}`,
    kind: "expense",
    note,
    amount,
    occurredOn,
    accountId: "acc-1",
    categoryId: "cat-1",
    ...overrides,
  };
}

/** Same note + amount on the same day-of-month across consecutive months. */
function monthly(
  note: string,
  amount: number,
  days: { month: string; day: number }[],
  overrides: Partial<RecurringDetectionRow> = {},
): RecurringDetectionRow[] {
  return days.map(({ month, day }) =>
    row(note, `${month}-${String(day).padStart(2, "0")}`, amount, overrides),
  );
}

test("empty or near-empty ledgers produce no suggestions", () => {
  assert.deepEqual(detectRecurringPatterns([], [], TODAY), []);
  assert.deepEqual(
    detectRecurringPatterns(
      monthly("Internet", 250_000, [
        { month: "2026-07", day: 18 },
        { month: "2026-08", day: 18 },
      ]),
      [],
      TODAY,
    ),
    [],
    "two monthly occurrences stay below the three-month threshold",
  );
});

test("three monthly occurrences of one note suggest one commitment", () => {
  const suggestions = detectRecurringPatterns(
    monthly("Tiền điện", 650_000, [
      { month: "2026-06", day: 25 },
      { month: "2026-07", day: 25 },
      { month: "2026-08", day: 26 },
    ]),
    [],
    TODAY,
  );
  assert.equal(suggestions.length, 1);
  const suggestion = suggestions[0]!;
  assert.equal(suggestion.name, "Tiền điện");
  assert.equal(suggestion.amount, 650_000);
  assert.equal(suggestion.dueDay, 25);
  assert.equal(suggestion.lastSeen, "2026-08-26");
  assert.equal(suggestion.occurrenceCount, 3);
  assert.equal(suggestion.accountId, "acc-1");
  assert.equal(suggestion.categoryId, "cat-1");
  assert.match(suggestion.key, /^[0-9a-f]{8}$/);
});

test("amounts inside ±10% of the median still count toward the pattern", () => {
  const suggestions = detectRecurringPatterns(
    monthly("Netflix", 100_000, [
      { month: "2026-06", day: 10 },
      { month: "2026-07", day: 10 },
      { month: "2026-08", day: 10 },
    ]).map((item, index) => ({
      ...item,
      amount: [100_000, 105_000, 109_000][index]!,
    })),
    [],
    TODAY,
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]!.amount, 105_000, "typical amount is the median");
});

test("an amount outside the tolerance is dropped from the pattern", () => {
  const rows = [
    row("Gym", "2026-06-05", 100_000),
    row("Gym", "2026-07-05", 105_000),
    row("Gym", "2026-08-05", 400_000),
  ];
  assert.deepEqual(
    detectRecurringPatterns(rows, [], TODAY),
    [],
    "the 400k outlier leaves only two in-tolerance occurrences",
  );
});

test("amount tolerance boundary is inclusive", () => {
  // median 105_000 → tolerance floor(105_000 / 10) = 10_500; 94_500 sits exactly on it.
  const rows = [
    row("Gym", "2026-06-05", 94_500),
    row("Gym", "2026-07-05", 105_000),
    row("Gym", "2026-08-05", 115_500),
  ];
  assert.equal(detectRecurringPatterns(rows, [], TODAY).length, 1);
});

test("weekly cadence is not reported as a monthly commitment", () => {
  const rows = [
    "2026-06-01",
    "2026-06-08",
    "2026-06-15",
    "2026-06-22",
    "2026-07-06",
    "2026-07-13",
    "2026-07-20",
    "2026-07-27",
    "2026-08-03",
    "2026-08-10",
    "2026-08-17",
    "2026-08-24",
  ].map((date) => row("Grab đi làm", date, 42_000));
  assert.deepEqual(detectRecurringPatterns(rows, [], TODAY), []);
});

test("income and transfer rows are never suggested", () => {
  const rows = [
    ...monthly("Lương", 15_000_000, [
      { month: "2026-06", day: 5 },
      { month: "2026-07", day: 5 },
      { month: "2026-08", day: 5 },
    ], { kind: "income" }),
    ...monthly("Sang ví MoMo", 1_000_000, [
      { month: "2026-06", day: 6 },
      { month: "2026-07", day: 6 },
      { month: "2026-08", day: 6 },
    ], { kind: "transfer" }),
  ];
  assert.deepEqual(detectRecurringPatterns(rows, [], TODAY), []);
});

test("scattered day-of-month is not a monthly commitment", () => {
  const rows = monthly("Mua sắm", 300_000, [
    { month: "2026-06", day: 5 },
    { month: "2026-07", day: 12 },
    { month: "2026-08", day: 22 },
  ]);
  assert.deepEqual(detectRecurringPatterns(rows, [], TODAY), []);
});

test("day-of-month wraps around month end", () => {
  const rows = [
    row("Tiền nhà", "2026-05-29", 4_500_000),
    row("Tiền nhà", "2026-07-01", 4_500_000),
    row("Tiền nhà", "2026-08-02", 4_500_000),
  ];
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]!.dueDay, 2, "median day-of-month of {29,1,2}");
});

test("a same-cycle extra payment neither breaks nor inflates the pattern", () => {
  const rows = [
    row("Internet", "2026-06-18", 250_000),
    row("Internet", "2026-06-27", 250_000), // duplicate inside the same cycle
    row("Internet", "2026-07-18", 250_000),
    row("Internet", "2026-08-18", 250_000),
  ];
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.equal(suggestions.length, 1);
  assert.equal(
    suggestions[0]!.occurrenceCount,
    3,
    "the within-cycle duplicate is absorbed, not counted",
  );
});

test("a gap beyond one monthly cycle starts a new chain", () => {
  const rows = [
    row("Tiền điện", "2026-05-25", 650_000),
    row("Tiền điện", "2026-07-25", 650_000), // 61-day gap — a skipped month
    row("Tiền điện", "2026-08-25", 650_000),
  ];
  assert.deepEqual(
    detectRecurringPatterns(rows, [], TODAY),
    [],
    "no run of three consecutive monthly occurrences exists",
  );
});

test("patterns that stopped more than two cycles ago are not suggested", () => {
  const rows = monthly("Tạp chí", 90_000, [
    { month: "2026-01", day: 10 },
    { month: "2026-02", day: 10 },
    { month: "2026-03", day: 10 },
  ]);
  assert.deepEqual(detectRecurringPatterns(rows, [], TODAY), []);
});

test("a pattern seen within the recency window still qualifies", () => {
  const rows = monthly("Tạp chí", 90_000, [
    { month: "2026-06", day: 23 },
    { month: "2026-07", day: 23 },
    { month: "2026-08", day: 23 },
  ]);
  assert.equal(detectRecurringPatterns(rows, [], TODAY).length, 1);
});

test("an active commitment with the same normalized name suppresses the suggestion", () => {
  const rows = monthly("Tiền điện", 650_000, [
    { month: "2026-06", day: 25 },
    { month: "2026-07", day: 25 },
    { month: "2026-08", day: 25 },
  ]);
  assert.deepEqual(
    detectRecurringPatterns(
      rows,
      [{ name: "  TIỀN   ĐIỆN ", isArchived: false }],
      TODAY,
    ),
    [],
  );
  assert.equal(
    detectRecurringPatterns(
      rows,
      [{ name: "Tiền điện", isArchived: true }],
      TODAY,
    ).length,
    1,
    "archived commitments no longer cover the pattern",
  );
});

test("month markers inside the note do not split one bill into many patterns", () => {
  const rows = [
    row("Tiền điện tháng 6", "2026-06-25", 650_000),
    row("Tiền điện tháng 7", "2026-07-25", 651_000),
    row("Tiền điện tháng 8", "2026-08-25", 649_000),
  ];
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.equal(suggestions.length, 1);
  assert.equal(
    suggestions[0]!.name,
    "Tiền điện",
    "the suggested name drops the month marker for a reusable commitment name",
  );
});

test("the pattern key is stable while amounts move within tolerance", () => {
  const first = detectRecurringPatterns(
    monthly("Internet", 250_000, [
      { month: "2026-06", day: 18 },
      { month: "2026-07", day: 18 },
      { month: "2026-08", day: 18 },
    ]),
    [],
    TODAY,
  )[0]!;
  const second = detectRecurringPatterns(
    monthly("Internet", 260_000, [
      { month: "2026-06", day: 18 },
      { month: "2026-07", day: 19 },
      { month: "2026-08", day: 18 },
    ]),
    [],
    TODAY,
  )[0]!;
  assert.equal(first.key, second.key);
  const renamed = detectRecurringPatterns(
    monthly("Wifi nhà", 250_000, [
      { month: "2026-06", day: 18 },
      { month: "2026-07", day: 18 },
      { month: "2026-08", day: 18 },
    ]),
    [],
    TODAY,
  )[0]!;
  assert.notEqual(first.key, renamed.key);
});

test("suggestions order by most recent activity then count then key", () => {
  const rows = [
    ...monthly("Aolder", 100_000, [
      { month: "2026-06", day: 10 },
      { month: "2026-07", day: 10 },
      { month: "2026-08", day: 10 },
    ]),
    ...monthly("Bnewer", 100_000, [
      { month: "2026-06", day: 9 },
      { month: "2026-07", day: 9 },
      { month: "2026-08", day: 9 },
      { month: "2026-09", day: 9 },
    ]),
  ];
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.deepEqual(
    suggestions.map((item) => item.name),
    ["Bnewer", "Aolder"],
  );
});

test("the suggestion list is capped", () => {
  const rows = Array.from({ length: MAX_SUGGESTIONS + 3 }, (_, index) =>
    monthly(`Khoản ${index}`, 100_000 + index, [
      { month: "2026-06", day: 5 },
      { month: "2026-07", day: 5 },
      { month: "2026-08", day: 5 },
    ]),
  ).flat();
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.equal(suggestions.length, MAX_SUGGESTIONS);
  const keys = suggestions.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length, "keys are unique");
});

test("malformed rows are ignored instead of crashing detection", () => {
  const rows = [
    row("", "2026-08-05", 100_000),
    row("   ", "2026-08-05", 100_000),
    row("Tiền điện", "2026-13-40", 650_000),
    row("Tiền điện", "2026-08-05", 0),
    row("Tiền điện", "2026-08-05", -50),
    row("Tiền điện", "2026-08-05", 1.5),
    ...monthly("Tiền điện", 650_000, [
      { month: "2026-06", day: 25 },
      { month: "2026-07", day: 25 },
      { month: "2026-08", day: 25 },
    ]),
  ];
  const suggestions = detectRecurringPatterns(rows, [], TODAY);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]!.occurrenceCount, 3);
});

test("detection does not mutate its input and is deterministic", () => {
  const rows = [
    ...monthly("Internet", 250_000, [
      { month: "2026-08", day: 18 },
      { month: "2026-06", day: 18 },
      { month: "2026-07", day: 18 },
    ]),
    ...monthly("Tiền điện", 650_000, [
      { month: "2026-08", day: 25 },
      { month: "2026-06", day: 25 },
      { month: "2026-07", day: 25 },
    ]),
  ];
  const snapshot = JSON.stringify(rows);
  const first = detectRecurringPatterns(rows, [], TODAY);
  const second = detectRecurringPatterns(rows, [], TODAY);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(rows), snapshot);
});

test("the detection window start covers the documented lookback", () => {
  assert.equal(recurringDetectionStart("2026-09-22"), "2025-10-01");
  assert.equal(recurringDetectionStart("2026-02-15"), "2025-03-01");
});
