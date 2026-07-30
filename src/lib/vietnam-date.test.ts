import assert from "node:assert/strict";
import { test } from "node:test";
import { todayInVietnam } from "./vietnam-date.ts";

// Every case injects `now`. Asserting a fixed date against the default clock
// would pass or fail depending on when the suite runs.

test("returns the Vietnam calendar day as YYYY-MM-DD", () => {
  assert.equal(
    todayInVietnam(new Date("2026-07-14T20:30:00.000Z")),
    "2026-07-15",
  );
});

test("an instant still on the previous UTC day is already today in Vietnam", () => {
  // 17:00Z is 00:00 the next day in ICT (UTC+7) — the boundary itself.
  assert.equal(
    todayInVietnam(new Date("2026-07-14T17:00:00.000Z")),
    "2026-07-15",
  );
  // One millisecond earlier is still the previous Vietnam day.
  assert.equal(
    todayInVietnam(new Date("2026-07-14T16:59:59.999Z")),
    "2026-07-14",
  );
});

test("an instant already on the next UTC day can still be yesterday in Vietnam", () => {
  // 00:30Z on the 15th is 07:30 on the 15th in ICT — same day, not the 16th.
  assert.equal(
    todayInVietnam(new Date("2026-07-15T00:30:00.000Z")),
    "2026-07-15",
  );
});

test("crosses month and year boundaries at ICT midnight, not UTC midnight", () => {
  assert.equal(
    todayInVietnam(new Date("2026-07-31T17:00:00.000Z")),
    "2026-08-01",
  );
  assert.equal(
    todayInVietnam(new Date("2026-12-31T17:00:00.000Z")),
    "2027-01-01",
  );
  assert.equal(
    todayInVietnam(new Date("2026-12-31T16:59:59.999Z")),
    "2026-12-31",
  );
});

test("pads single-digit months and days", () => {
  assert.equal(
    todayInVietnam(new Date("2026-01-05T03:00:00.000Z")),
    "2026-01-05",
  );
});
