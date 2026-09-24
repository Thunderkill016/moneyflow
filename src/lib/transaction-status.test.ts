import assert from "node:assert/strict";
import test from "node:test";

import {
  isTransactionStatusLabel,
  TRANSACTION_STATUS,
} from "./transaction-status.ts";
import { formatRelativeDate } from "./relative-date.ts";

test("every operation status is recognized", () => {
  assert.equal(isTransactionStatusLabel(TRANSACTION_STATUS.saving), true);
  assert.equal(isTransactionStatusLabel(TRANSACTION_STATUS.edited), true);
  assert.equal(isTransactionStatusLabel(TRANSACTION_STATUS.completed), true);
});

test("calendar labels are never statuses — including stale persisted ones", () => {
  // A row saved yesterday keeps relativeDate "Hôm nay" in demo storage; on the
  // next day that string is stale but still date-shaped, so it must not render
  // as an operation status.
  for (const label of ["Hôm nay", "Hôm qua", "20 thg 9", "3 thg 7"]) {
    assert.equal(isTransactionStatusLabel(label), false, label);
  }
});

test("status and date vocabularies stay disjoint", () => {
  // Every formatRelativeDate output must fail the status check and vice versa,
  // or a dashboard row could show a date as a state or hide a real state.
  for (const label of Object.values(TRANSACTION_STATUS)) {
    assert.notEqual(label, "Hôm nay");
    assert.notEqual(label, "Hôm qua");
    assert.doesNotMatch(label, /^\d{1,2} thg \d{1,2}$/);
  }
  for (const [date, today] of [
    ["2026-09-25", "2026-09-25"],
    ["2026-09-24", "2026-09-25"],
    ["2026-09-20", "2026-09-25"],
  ]) {
    assert.equal(
      isTransactionStatusLabel(formatRelativeDate(date, today)),
      false,
    );
  }
});
