import assert from "node:assert/strict";
import test from "node:test";
import { dashboardPeriodLabel } from "./dashboard-period";

test("dashboard period label is derived from the workspace date", () => {
  assert.equal(dashboardPeriodLabel("2026-08-06"), "Tháng 8");
  assert.equal(dashboardPeriodLabel("2027-01-31"), "Tháng 1");
});

test("dashboard period label does not invent a browser-local month", () => {
  assert.equal(dashboardPeriodLabel(""), "Kỳ hiện tại");
  assert.equal(dashboardPeriodLabel("2026-13-01"), "Kỳ hiện tại");
  assert.equal(dashboardPeriodLabel("not-a-date"), "Kỳ hiện tại");
});
