import assert from "node:assert/strict";
import test from "node:test";

import {
  activeDatePreset,
  datePresetRange,
} from "./date-presets.ts";

test("tuần này runs Monday through today, never into the future", () => {
  // 2026-09-21 is a Monday; 2026-09-23 is a Wednesday.
  assert.deepEqual(datePresetRange("week", "2026-09-21"), {
    from: "2026-09-21",
    to: "2026-09-21",
  });
  assert.deepEqual(datePresetRange("week", "2026-09-23"), {
    from: "2026-09-21",
    to: "2026-09-23",
  });
  // Sunday belongs to the week that started the previous Monday.
  assert.deepEqual(datePresetRange("week", "2026-09-27"), {
    from: "2026-09-21",
    to: "2026-09-27",
  });
});

test("tuần này crosses a month boundary without inventing dates", () => {
  // 2026-09-01 is a Tuesday; its week starts on 2026-08-31.
  assert.deepEqual(datePresetRange("week", "2026-09-01"), {
    from: "2026-08-31",
    to: "2026-09-01",
  });
});

test("tháng này runs from the month start through today", () => {
  assert.deepEqual(datePresetRange("month", "2026-09-23"), {
    from: "2026-09-01",
    to: "2026-09-23",
  });
  assert.deepEqual(datePresetRange("month", "2026-09-01"), {
    from: "2026-09-01",
    to: "2026-09-01",
  });
});

test("tháng trước is the whole previous month, across a year boundary", () => {
  assert.deepEqual(datePresetRange("lastMonth", "2026-09-23"), {
    from: "2026-08-01",
    to: "2026-08-31",
  });
  // January looks back at December of the previous year.
  assert.deepEqual(datePresetRange("lastMonth", "2026-01-15"), {
    from: "2025-12-01",
    to: "2025-12-31",
  });
  // February leap day handled by real calendar math.
  assert.deepEqual(datePresetRange("lastMonth", "2024-03-10"), {
    from: "2024-02-01",
    to: "2024-02-29",
  });
});

test("activeDatePreset identifies a matching range and refuses others", () => {
  assert.equal(
    activeDatePreset("2026-09-21", "2026-09-23", "2026-09-23"),
    "week",
  );
  assert.equal(
    activeDatePreset("2026-09-01", "2026-09-23", "2026-09-23"),
    "month",
  );
  assert.equal(
    activeDatePreset("2026-08-01", "2026-08-31", "2026-09-23"),
    "lastMonth",
  );
  assert.equal(
    activeDatePreset("2026-09-02", "2026-09-20", "2026-09-23"),
    null,
  );
  // A stale preset stops matching once today moves on.
  assert.equal(
    activeDatePreset("2026-09-21", "2026-09-23", "2026-09-24"),
    null,
  );
});
