import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  analyticsPropsContainRaw,
  buildParserFeedbackMeta,
  buildQuickCaptureCorrectionMeta,
  buildQuickCaptureSaveMeta,
  sanitizeAnalyticsProps,
  trackProductEvent,
} from "./safe-analytics.ts";

const source = readFileSync("src/lib/safe-analytics.ts", "utf8");

test("sanitizeAnalyticsProps keeps counts and drops raw keys", () => {
  const safe = sanitizeAnalyticsProps({
    row_count: 12,
    source_type: "csv",
    raw_snippet: "HIGHLANDS 45.000 VND",
    text: "paste body with money 120000 and 45000",
    parse_success: true,
  });
  assert.equal(safe.row_count, 12);
  assert.equal(safe.source_type, "csv");
  assert.equal(safe.parse_success, true);
  assert.equal("raw_snippet" in safe, false);
  assert.equal("text" in safe, false);
});

test("trackProductEvent rejects explicit raw statement fields", () => {
  const rejected = trackProductEvent("import_batch_created", {
    rawSnippet: "Date,Amount\n1,1000\n2,2000\n3,3000",
    row_count: 3,
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.reason, "raw_rejected");

  const ok = trackProductEvent("import_batch_created", {
    row_count: 3,
    source_type: "csv",
    warning_count: 0,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.props.row_count, 3);
    assert.equal(ok.props.source_type, "csv");
  }
});

test("trackProductEvent rejects invalid event names", () => {
  assert.equal(trackProductEvent("").ok, false);
  assert.equal(trackProductEvent("Bad-Event").ok, false);
  assert.equal(trackProductEvent("import_batch_created").ok, true);
});

test("the browser sink receives only the sanitized payload", () => {
  assert.match(
    source,
    /import \{ track as vercelTrack \} from "@vercel\/analytics"/,
  );
  assert.match(source, /vercelTrack\(name, safe\)/);
  assert.doesNotMatch(source, /vercelTrack\(name, props\)/);
});

test("analyticsPropsContainRaw detects sensitive keys", () => {
  assert.equal(analyticsPropsContainRaw({ raw_snippet: "x", count: 1 }), true);
  assert.equal(analyticsPropsContainRaw({ row_count: 1 }), false);
});

test("buildParserFeedbackMeta only when opt-in; never raw", () => {
  assert.equal(
    buildParserFeedbackMeta({
      improveParserOptIn: false,
      source: "csv",
      rowCount: 10,
      warningCount: 1,
    }),
    null,
  );
  const meta = buildParserFeedbackMeta({
    improveParserOptIn: true,
    source: "paste",
    rowCount: 5,
    warningCount: 2,
    mapConfidence: "medium",
  });
  assert.ok(meta);
  assert.equal(meta!.source, "paste");
  assert.equal(meta!.row_count, 5);
  assert.equal(meta!.warning_count, 2);
  assert.equal(meta!.map_confidence, "medium");
  assert.equal(analyticsPropsContainRaw(meta!), false);
});

test("quick capture save metadata describes pattern use without financial values", () => {
  assert.deepEqual(
    buildQuickCaptureSaveMeta({
      elapsedMs: 12_345.4,
      patternCount: 2,
      selectedPatternRank: 2,
      outcome: "success",
    }),
    {
      elapsed_ms: 12_345,
      pattern_count: 2,
      completion_mode: "pattern_selected",
      selected_pattern_rank: 2,
      save_outcome: "success",
    },
  );
  assert.deepEqual(
    buildQuickCaptureSaveMeta({
      elapsedMs: 50,
      patternCount: 1,
      selectedPatternRank: null,
      outcome: "failure",
    }),
    {
      elapsed_ms: 50,
      pattern_count: 1,
      completion_mode: "manual_with_patterns",
      selected_pattern_rank: null,
      save_outcome: "failure",
    },
  );
  assert.deepEqual(
    buildQuickCaptureSaveMeta({
      elapsedMs: 50,
      patternCount: 0,
      selectedPatternRank: null,
      outcome: "success",
    }),
    {
      elapsed_ms: 50,
      pattern_count: 0,
      completion_mode: "no_pattern_available",
      selected_pattern_rank: null,
      save_outcome: "success",
    },
  );
});

test("quick capture metadata rejects invalid cardinality and bounds timings", () => {
  assert.equal(
    buildQuickCaptureSaveMeta({
      elapsedMs: -1,
      patternCount: 0,
      selectedPatternRank: null,
      outcome: "success",
    }),
    null,
  );
  assert.equal(
    buildQuickCaptureSaveMeta({
      elapsedMs: 10,
      patternCount: 1,
      selectedPatternRank: 2,
      outcome: "success",
    }),
    null,
  );
  assert.equal(
    buildQuickCaptureSaveMeta({
      elapsedMs: 10,
      patternCount: 3,
      selectedPatternRank: null,
      outcome: "success",
    }),
    null,
  );
  assert.equal(
    buildQuickCaptureSaveMeta({
      elapsedMs: 31 * 60 * 1_000,
      patternCount: 0,
      selectedPatternRank: null,
      outcome: "success",
    })?.elapsed_ms,
    30 * 60 * 1_000,
  );
});

test("quick capture correction metadata uses bounded timing buckets", () => {
  assert.deepEqual(buildQuickCaptureCorrectionMeta(4_999), {
    elapsed_bucket: "within_5_seconds",
  });
  assert.deepEqual(buildQuickCaptureCorrectionMeta(5_000), {
    elapsed_bucket: "within_5_seconds",
  });
  assert.equal(buildQuickCaptureCorrectionMeta(5_001), null);
});
