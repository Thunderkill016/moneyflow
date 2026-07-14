import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsPropsContainRaw,
  buildParserFeedbackMeta,
  sanitizeAnalyticsProps,
  trackProductEvent,
} from "./safe-analytics.ts";

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

test("analyticsPropsContainRaw detects sensitive keys", () => {
  assert.equal(
    analyticsPropsContainRaw({ raw_snippet: "x", count: 1 }),
    true,
  );
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
