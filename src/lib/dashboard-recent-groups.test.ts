import assert from "node:assert/strict";
import test from "node:test";

import { groupRecentTransactionsByDay } from "./dashboard-recent-groups.ts";

const row = (id: string, occurredOn: string, relativeDate: string) => ({
  id,
  occurredOn,
  relativeDate,
});

test("groups consecutive rows by calendar day, preserving ledger order", () => {
  const groups = groupRecentTransactionsByDay([
    row("a", "2026-09-24", "Hôm nay"),
    row("b", "2026-09-24", "Hôm nay"),
    row("c", "2026-09-23", "Hôm qua"),
    row("d", "2026-09-20", "4 ngày trước"),
    row("e", "2026-09-20", "4 ngày trước"),
  ]);
  assert.equal(groups.length, 3);
  assert.deepEqual(
    groups.map((g) => [g.occurredOn, g.label, g.rows.length]),
    [
      ["2026-09-24", "Hôm nay", 2],
      ["2026-09-23", "Hôm qua", 1],
      ["2026-09-20", "4 ngày trước", 2],
    ],
  );
  assert.deepEqual(groups[0]!.rows.map((r) => r.id), ["a", "b"]);
});

test("same-day rows always share one header even when labels differ", () => {
  // Grouping keys on occurredOn, not on the display string, so a mixed-label
  // edge can never split one calendar day into two groups.
  const groups = groupRecentTransactionsByDay([
    row("a", "2026-09-24", "Hôm nay"),
    row("b", "2026-09-24", "Hôm qua"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.label, "Hôm nay");
});

test("empty input yields no groups", () => {
  assert.deepEqual(groupRecentTransactionsByDay([]), []);
});
