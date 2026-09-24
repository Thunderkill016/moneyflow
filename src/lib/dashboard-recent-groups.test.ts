import assert from "node:assert/strict";
import test from "node:test";

import { groupRecentTransactionsByDay } from "./dashboard-recent-groups.ts";

const TODAY = "2026-09-24";

const row = (id: string, occurredOn: string, relativeDate = "unused") => ({
  id,
  occurredOn,
  relativeDate,
});

test("groups rows by calendar day, newest day first, ledger order within group", () => {
  const groups = groupRecentTransactionsByDay(
    [
      row("a", "2026-09-24"),
      row("b", "2026-09-24"),
      row("c", "2026-09-23"),
      row("d", "2026-09-20"),
      row("e", "2026-09-20"),
    ],
    TODAY,
  );
  assert.equal(groups.length, 3);
  assert.deepEqual(
    groups.map((g) => [g.occurredOn, g.label, g.rows.length]),
    [
      ["2026-09-24", "Hôm nay", 2],
      ["2026-09-23", "Hôm qua", 1],
      ["2026-09-20", "20 thg 9", 2],
    ],
  );
  assert.deepEqual(groups[0]!.rows.map((r) => r.id), ["a", "b"]);
});

test("an optimistic status label in relativeDate never becomes a day header", () => {
  // Optimistic rows carry "Đang lưu…"/"Vừa sửa" in relativeDate; the header
  // must still be the derived date or the whole group reads as a status.
  const groups = groupRecentTransactionsByDay(
    [
      row("pending", "2026-09-24", "Đang lưu…"),
      row("saved", "2026-09-24", "Hôm nay"),
    ],
    TODAY,
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.label, "Hôm nay");
  assert.equal(groups[0]!.rows.length, 2);
});

test("interleaved days sort newest-first without merging across groups", () => {
  // A backdated optimistic row prepends: input order is not day-sorted, but
  // the grouped output still must be.
  const groups = groupRecentTransactionsByDay(
    [
      row("new-23", "2026-09-23"),
      row("new-25", "2026-09-25"),
      row("old-23", "2026-09-23"),
    ],
    "2026-09-26",
  );
  assert.deepEqual(
    groups.map((g) => [g.occurredOn, g.rows.map((r) => r.id)]),
    [
      ["2026-09-25", ["new-25"]],
      ["2026-09-23", ["new-23", "old-23"]],
    ],
  );
});

test("labels follow the passed today, not a client clock", () => {
  const groups = groupRecentTransactionsByDay(
    [row("a", "2026-02-01")],
    "2026-02-02",
  );
  assert.equal(groups[0]!.label, "Hôm qua");
});

test("empty input yields no groups", () => {
  assert.deepEqual(groupRecentTransactionsByDay([], TODAY), []);
});
