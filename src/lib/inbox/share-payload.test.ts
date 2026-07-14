import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  classifySharedFile,
  combineShareText,
  emptySharePayload,
  hasShareContent,
  isSharePayload,
  planShareImport,
  sharePayloadFromSearchParams,
  type SharePayload,
} from "./share-payload.ts";

describe("share-payload", () => {
  test("isSharePayload accepts valid shape", () => {
    const payload: SharePayload = {
      title: "t",
      text: "cafe 45k",
      url: "",
      files: [{ name: "a.csv", type: "text/csv", text: "x", size: 1 }],
    };
    assert.equal(isSharePayload(payload), true);
    assert.equal(isSharePayload(null), false);
    assert.equal(isSharePayload({ title: 1 }), false);
  });

  test("combineShareText joins title text url without duplicating url", () => {
    assert.equal(
      combineShareText({
        title: "SMS",
        text: "cafe 45k https://x.test",
        url: "https://x.test",
        files: [],
      }),
      "SMS\ncafe 45k https://x.test",
    );
    assert.equal(
      combineShareText({
        title: "",
        text: "note",
        url: "https://y.test",
        files: [],
      }),
      "note\nhttps://y.test",
    );
  });

  test("hasShareContent false for empty", () => {
    assert.equal(hasShareContent(emptySharePayload()), false);
    assert.equal(
      hasShareContent({ title: "", text: "  ", url: "", files: [] }),
      false,
    );
    assert.equal(
      hasShareContent({ title: "x", text: "", url: "", files: [] }),
      true,
    );
  });

  test("classifySharedFile routes csv xlsx pdf text", () => {
    assert.equal(classifySharedFile("a.csv", "text/csv"), "csv");
    assert.equal(classifySharedFile("a.xlsx", ""), "xlsx");
    assert.equal(classifySharedFile("a.pdf", "application/pdf"), "pdf");
    assert.equal(classifySharedFile("note.txt", "text/plain"), "text");
    assert.equal(classifySharedFile("pic.png", "image/png"), "unsupported");
  });

  test("planShareImport parses paste-like share text into integer amounts", () => {
    const plan = planShareImport({
      title: "",
      text: "cafe 45k\nGrab 120.000",
      url: "",
      files: [],
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.pasteCandidates.length, 2);
    assert.equal(plan.pasteCandidates[0]!.amount, 45_000);
    assert.equal(plan.pasteCandidates[1]!.amount, 120_000);
    assert.equal(plan.pasteCandidates[0]!.source, "paste");
    assert.ok(Number.isInteger(plan.pasteCandidates[0]!.amount));
  });

  test("planShareImport parses shared CSV file", () => {
    const csv = [
      "date,amount,description",
      "2026-07-10,-45000,Highlands",
      "2026-07-11,25000000,LUONG",
    ].join("\n");
    const plan = planShareImport({
      title: "",
      text: "",
      url: "",
      files: [
        {
          name: "bank.csv",
          type: "text/csv",
          text: csv,
          size: csv.length,
        },
      ],
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.csvPlans.length, 1);
    assert.equal(plan.candidateCount, 2);
    assert.equal(plan.csvPlans[0]!.parse.rows[0]!.amount, 45_000);
  });

  test("planShareImport rejects xlsx with Vietnamese error", () => {
    const plan = planShareImport({
      title: "",
      text: "",
      url: "",
      files: [
        {
          name: "book.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          text: "not-real",
          size: 8,
        },
      ],
    });
    assert.equal(plan.ok, false);
    assert.ok(plan.errors.some((e) => /Excel|CSV/i.test(e)));
  });

  test("planShareImport rejects pdf binary with Vietnamese error", () => {
    const plan = planShareImport({
      title: "",
      text: "",
      url: "",
      files: [
        {
          name: "sao-ke.pdf",
          type: "application/pdf",
          text: "%PDF-fake",
          size: 9,
        },
      ],
    });
    assert.equal(plan.ok, false);
    assert.ok(plan.errors.some((e) => /PDF|Upload/i.test(e)));
  });

  test("planShareImport empty payload fails clearly", () => {
    const plan = planShareImport(emptySharePayload());
    assert.equal(plan.ok, false);
    assert.ok(plan.errors.length > 0);
  });

  test("sharePayloadFromSearchParams maps query fields", () => {
    const params = new URLSearchParams("title=T&text=cafe+45k&url=https%3A%2F%2Fa.test");
    const p = sharePayloadFromSearchParams(params);
    assert.equal(p.title, "T");
    assert.equal(p.text, "cafe 45k");
    assert.equal(p.url, "https://a.test");
    assert.equal(p.files.length, 0);
  });
});
