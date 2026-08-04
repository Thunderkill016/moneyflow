import assert from "node:assert/strict";
import test from "node:test";
import { describeReportRangeAdjustment } from "./report-range-notice.ts";

test("report range adjustment notice explains custom input changes", () => {
  const today = "2026-07-14";

  assert.equal(describeReportRangeAdjustment("month", undefined, today), null);
  assert.equal(
    describeReportRangeAdjustment(
      "custom",
      { from: "2026-02-31", to: "2026-03-05" },
      today,
    ),
    "invalid",
  );
  assert.equal(
    describeReportRangeAdjustment(
      "custom",
      { from: "2026-07-15", to: "2026-06-01" },
      today,
    ),
    "future",
  );
  assert.equal(
    describeReportRangeAdjustment(
      "custom",
      { from: "2026-07-15", to: "2026-06-01" },
      "2026-07-20",
    ),
    "swapped",
  );
  assert.equal(
    describeReportRangeAdjustment(
      "custom",
      { from: "2026-07-01", to: "2027-01-01" },
      today,
    ),
    "future",
  );
  assert.equal(
    describeReportRangeAdjustment(
      "custom",
      { from: "2000-01-01", to: today },
      today,
    ),
    "clamped",
  );
});
