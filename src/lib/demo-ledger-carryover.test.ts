import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_CARRYOVER_BATCH_NAME,
  DEMO_CARRYOVER_MARKER_KEY,
  hasCarriedDemoRows,
  readCarryoverMarker,
  readDemoCarryoverState,
  toCarryoverCandidateInput,
  writeCarryoverMarker,
} from "./demo-ledger-carryover.ts";
import { TRANSACTION_STORAGE_KEY } from "./transaction-store.ts";

function memStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const userExpense = {
  id: "u-1",
  kind: "expense",
  categoryId: "demo-category-food",
  category: "Ăn uống",
  note: "Cơm trưa",
  payee: "Quán A",
  accountId: "demo-account-cash",
  account: "Tiền mặt",
  amount: 50000,
  occurredOn: "2026-09-20",
  occurredAt: "2026-09-20T01:00:00.000Z",
  relativeDate: "2026-09-20",
  createdAt: "2026-09-20T01:00:00.000Z",
};

const userTransfer = {
  ...userExpense,
  id: "u-2",
  kind: "transfer",
  categoryId: "",
  category: "",
  account: "Tiền mặt",
  destinationAccountId: "demo-account-mb",
  destinationAccount: "MB Bank",
};

const userSplit = {
  ...userExpense,
  id: "u-3",
  splits: [
    { categoryId: "demo-category-food", category: "Ăn uống", amount: 30000 },
    { categoryId: "demo-category-fun", category: "Giải trí", amount: 20000 },
  ],
};

const fixtureRow = { ...userExpense, id: "sample-1" };

describe("readDemoCarryoverState", () => {
  it("returns null when storage is empty or absent", () => {
    assert.equal(readDemoCarryoverState(memStorage()), null);
    assert.equal(readDemoCarryoverState(null), null);
  });

  it("does not fall back to fixture baseline when storage is empty", () => {
    const state = readDemoCarryoverState(memStorage());
    assert.equal(state, null);
  });

  it("separates user rows, structured rows and fixtures", () => {
    const storage = memStorage({
      [TRANSACTION_STORAGE_KEY]: JSON.stringify([
        userExpense,
        userTransfer,
        userSplit,
        fixtureRow,
      ]),
    });
    const state = readDemoCarryoverState(storage);
    assert.ok(state);
    assert.equal(state.carryable.length, 1);
    assert.equal(state.carryable[0].id, "u-1");
    assert.equal(state.skippedStructured, 2);
    assert.equal(state.fixtureCount, 1);
  });

  it("returns null when only fixtures exist", () => {
    const storage = memStorage({
      [TRANSACTION_STORAGE_KEY]: JSON.stringify([fixtureRow]),
    });
    assert.equal(readDemoCarryoverState(storage), null);
  });

  it("reports structured-only state so UI can disclose the skip", () => {
    const storage = memStorage({
      [TRANSACTION_STORAGE_KEY]: JSON.stringify([userTransfer]),
    });
    const state = readDemoCarryoverState(storage);
    assert.ok(state);
    assert.equal(state.carryable.length, 0);
    assert.equal(state.skippedStructured, 1);
  });

  it("ignores malformed entries and malformed JSON", () => {
    const storage = memStorage({
      [TRANSACTION_STORAGE_KEY]: JSON.stringify([userExpense, { bogus: 1 }]),
    });
    const state = readDemoCarryoverState(storage);
    assert.equal(state?.carryable.length, 1);

    const broken = memStorage({ [TRANSACTION_STORAGE_KEY]: "{not json" });
    assert.equal(readDemoCarryoverState(broken), null);
  });
});

describe("toCarryoverCandidateInput", () => {
  it("maps fields without id mapping and tags provenance", () => {
    const input = toCarryoverCandidateInput(userExpense as never);
    assert.equal(input.kind, "expense");
    assert.equal(input.amount, 50000);
    assert.equal(input.merchant, "Quán A");
    assert.equal(input.note, "Cơm trưa");
    assert.equal(input.occurredOn, "2026-09-20");
    assert.equal(input.source, "manual");
    assert.equal(input.confidence, "high");
    assert.equal(input.category, "Ăn uống");
    assert.equal(input.account, "Tiền mặt");
    assert.equal(input.sourceExternalId, "demo-tx-u-1");
    assert.equal(input.sourceLifecycleState, "pending");
    assert.equal(input.parserVersion, "demo-ledger-v1");
    assert.equal(input.accountId, undefined);
    assert.equal(input.categoryId, undefined);
  });

  it("falls back to note for merchant and omits empty note", () => {
    const input = toCarryoverCandidateInput({
      ...userExpense,
      payee: undefined,
      note: "",
    } as never);
    assert.equal(input.merchant, "Không rõ");
    assert.equal(input.note, undefined);
  });
});

describe("marker + dedupe", () => {
  it("round-trips the marker", () => {
    const storage = memStorage();
    assert.equal(readCarryoverMarker(storage), null);
    writeCarryoverMarker("accepted", storage);
    assert.equal(storage.getItem(DEMO_CARRYOVER_MARKER_KEY), "accepted");
    assert.equal(readCarryoverMarker(storage), "accepted");
  });

  it("detects already-carried rows by external id prefix", () => {
    assert.equal(hasCarriedDemoRows([]), false);
    assert.equal(hasCarriedDemoRows([{ sourceExternalId: "x" }]), false);
    assert.equal(
      hasCarriedDemoRows([{ sourceExternalId: "demo-tx-u-1" }]),
      true,
    );
  });
});

describe("batch label", () => {
  it("uses a truthful non-file batch name", () => {
    assert.equal(DEMO_CARRYOVER_BATCH_NAME, "moneyflow-demo-ledger");
  });
});
