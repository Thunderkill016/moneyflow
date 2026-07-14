import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDueNotification,
  localCalendarDate,
  selectDueCommitments,
  shouldNotifyToday,
  type DueNotifyCommitment,
} from "./commitment-due-notify.ts";

function item(
  partial: Partial<DueNotifyCommitment> & Pick<DueNotifyCommitment, "id" | "name" | "dueDate">,
): DueNotifyCommitment {
  return {
    isPaid: false,
    isArchived: false,
    ...partial,
  };
}

test("selectDueCommitments: unpaid in window, exclude paid/archived", () => {
  const today = "2026-07-15";
  const items = [
    item({ id: "1", name: "Tiền nhà", dueDate: "2026-07-15" }),
    item({ id: "2", name: "Netflix", dueDate: "2026-07-16" }),
    item({ id: "3", name: "Điện", dueDate: "2026-07-10" }), // overdue
    item({ id: "4", name: "Paid", dueDate: "2026-07-15", isPaid: true }),
    item({ id: "5", name: "Arch", dueDate: "2026-07-15", isArchived: true }),
    item({ id: "6", name: "Later", dueDate: "2026-07-20" }),
  ];

  const due0 = selectDueCommitments(items, today, 0);
  assert.deepEqual(
    due0.map((d) => d.id),
    ["3", "1"],
  );

  const due1 = selectDueCommitments(items, today, 1);
  assert.deepEqual(
    due1.map((d) => d.id),
    ["3", "1", "2"],
  );

  const due3 = selectDueCommitments(items, today, 3);
  assert.equal(due3.some((d) => d.id === "6"), false);
  assert.equal(due3.length, 3);
});

test("buildDueNotification never includes amounts; privacy vs names", () => {
  const due = [
    item({ id: "1", name: "Tiền nhà", dueDate: "2026-07-15" }),
    item({ id: "2", name: "Netflix", dueDate: "2026-07-16" }),
  ];
  // Attach fake money fields as unknown extra — body must not echo them
  const withMoney = due.map((d) => ({ ...d, amount: 2_500_000, account: "Vietcombank 0123" }));

  const countOnly = buildDueNotification(withMoney, {
    includeNames: false,
    today: "2026-07-15",
  });
  assert.ok(countOnly);
  assert.equal(countOnly.count, 2);
  assert.match(countOnly.body, /2 khoản/);
  assert.doesNotMatch(countOnly.body, /2.?500|2500000|Vietcombank|0123|₫|đồng/i);
  assert.equal(countOnly.url, "/commitments");
  assert.equal(countOnly.tag, "moneyflow-commitment-due-2026-07-15");

  const withNames = buildDueNotification(withMoney, {
    includeNames: true,
    today: "2026-07-15",
  });
  assert.ok(withNames);
  assert.match(withNames.body, /Tiền nhà/);
  assert.match(withNames.body, /Netflix/);
  assert.doesNotMatch(withNames.body, /2.?500|2500000|Vietcombank|0123/i);
  assert.match(withNames.body, /không hiện số tiền/);
});

test("buildDueNotification returns null for empty", () => {
  assert.equal(buildDueNotification([], { includeNames: false, today: "2026-07-15" }), null);
});

test("shouldNotifyToday gates on enabled + once per day", () => {
  assert.equal(shouldNotifyToday(false, null, "2026-07-15"), false);
  assert.equal(shouldNotifyToday(true, null, "2026-07-15"), true);
  assert.equal(shouldNotifyToday(true, "2026-07-15", "2026-07-15"), false);
  assert.equal(shouldNotifyToday(true, "2026-07-14", "2026-07-15"), true);
  assert.equal(shouldNotifyToday(true, null, "bad"), false);
});

test("localCalendarDate returns YYYY-MM-DD", () => {
  const d = localCalendarDate(new Date("2026-07-15T03:00:00Z"));
  assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});

test("single due uses singular title", () => {
  const payload = buildDueNotification(
    [item({ id: "1", name: "Tiền nhà", dueDate: "2026-07-15" })],
    { includeNames: false, today: "2026-07-15" },
  );
  assert.ok(payload);
  assert.equal(payload.title, "Cam kết đến hạn");
  assert.match(payload.body, /1 khoản/);
});
