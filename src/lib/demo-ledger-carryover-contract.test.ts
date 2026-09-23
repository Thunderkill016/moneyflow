import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/*
 * Contract: the demo→account carryover is a consented Inbox import only.
 * It must never post ledger rows, must keep provenance tags, must guard the
 * target, and must stay idempotent. These pins catch a future refactor that
 * quietly bypasses review.
 */

const actionSource = readFileSync(
  new URL("../app/actions/inbox.ts", import.meta.url),
  "utf8",
);
const libSource = readFileSync(
  new URL("./demo-ledger-carryover.ts", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../components/inbox/inbox-page.tsx", import.meta.url),
  "utf8",
);

function actionBody(): string {
  const start = actionSource.indexOf(
    "export async function carryDemoLedgerAction",
  );
  assert.ok(start > 0, "carryDemoLedgerAction must exist in inbox actions");
  const next = actionSource.indexOf("export async function", start + 10);
  return actionSource.slice(start, next);
}

describe("demo carryover contract", () => {
  it("server action inserts candidates only — never touches the ledger", () => {
    const body = actionBody();
    assert.ok(body.includes('.from("inbox_candidates")'));
    assert.ok(!body.includes('.from("money_transactions")'));
    assert.ok(!body.includes('.from("transaction_feed").insert'));
    assert.ok(!body.includes("create_money_transaction"));
    assert.ok(!body.includes("create_account_transfer"));
  });

  it("server enforces the demo provenance prefix on every row", () => {
    const body = actionBody();
    assert.ok(body.includes("DEMO_CARRYOVER_EXTERNAL_PREFIX"));
    assert.ok(body.includes("sourceExternalId?.startsWith"));
  });

  it("server guards an empty target ledger before inserting", () => {
    const body = actionBody();
    const feedCheck = body.indexOf('.from("transaction_feed")');
    const insert = body.indexOf('.from("inbox_candidates")\n    .insert');
    assert.ok(feedCheck > 0, "must count existing ledger rows");
    assert.ok(insert > feedCheck, "count check must precede insert");
    assert.ok(body.includes("targetNotEmpty"));
  });

  it("server dedupe makes repeat calls a no-op", () => {
    const body = actionBody();
    assert.ok(body.includes("alreadyCarried"));
    assert.ok(
      body.indexOf("alreadyCarried") < body.indexOf("transaction_feed"),
    );
  });

  it("carried rows land in a labelled batch via import_batches", () => {
    const body = actionBody();
    assert.ok(body.includes('.from("import_batches")'));
    assert.ok(body.includes("importBatchId"));
  });

  it("client lib never falls back to demo fixtures", () => {
    const imports = libSource
      .split("\n")
      .filter((line) => line.startsWith("import"))
      .join("\n");
    assert.ok(!imports.includes("readStoredTransactions"));
    assert.ok(!imports.includes("readDemoTransactionBaseline"));
    assert.ok(imports.includes("TRANSACTION_STORAGE_KEY"));
    assert.ok(imports.includes("isTransaction"));
  });

  it("client lib excludes fixture id prefixes", () => {
    assert.ok(libSource.includes('"sample-"'));
    assert.ok(libSource.includes('"demo-"'));
    assert.ok(libSource.includes('"cand-demo-"'));
  });

  it("page keeps explicit consent: both accept and decline paths exist", () => {
    assert.ok(pageSource.includes("carryDemoLedgerForClient"));
    assert.ok(pageSource.includes("declineDemoCarryover"));
    assert.ok(pageSource.includes("Chuyển vào Inbox"));
    assert.ok(pageSource.includes("Để nguyên"));
  });
});
