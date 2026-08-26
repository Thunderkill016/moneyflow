import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { Transaction } from "../transactions/contracts.ts";
import { demoAccounts, demoCategories } from "../demo/transaction-fixtures.ts";
import {
  directImportFingerprint,
  retainedDirectImportRecovery,
  formatDirectImportSummary,
  planDirectCsvImport,
  toDirectImportAcquisitionRows,
  toDirectImportPosts,
  type DirectImportMapping,
} from "./direct-csv-import.ts";
import {
  createDirectCsvMappingPreset,
  readDirectCsvMappingPreset,
  resolveDirectCsvMappingPreset,
  writeDirectCsvMappingPreset,
} from "./direct-csv-mapping-preset.ts";
import type { LedgerLike } from "./detect.ts";
import { parseCsvStatement } from "./parse-csv.ts";
import type { InboxRule } from "./rules-store.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const expenseCat = demoCategories.find((c) => c.kind === "expense")!;
const incomeCat = demoCategories.find((c) => c.kind === "income")!;
const account = demoAccounts[0]!;

const baseMapping: DirectImportMapping = {
  accountId: account.id,
  expenseCategoryId: expenseCat.id,
  incomeCategoryId: incomeCat.id,
};

function ledgerFromTx(tx: Partial<Transaction> & Pick<Transaction, "id">): LedgerLike {
  return {
    id: tx.id,
    kind: tx.kind ?? "expense",
    amount: tx.amount ?? 45_000,
    occurredOn: tx.occurredOn ?? "2026-07-12",
    note: tx.note ?? "Highlands Coffee",
    accountId: tx.accountId ?? account.id,
    account: tx.account ?? account.name,
  };
}

test("planDirectCsvImport: sample-bank → ready income/expense, skip transfer", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, {
    fileName: "sample-bank.csv",
    today: "2026-07-15",
  });
  assert.equal(parsed.ok, true);

  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );

  assert.equal(plan.totalParsed, 4);
  assert.equal(plan.transferSkipped, 1);
  assert.equal(plan.readyCount, 3);
  assert.ok(plan.ready.every((r) => r.kind === "expense" || r.kind === "income"));
  assert.ok(plan.ready.every((r) => Number.isSafeInteger(r.amount) && r.amount > 0));
  assert.ok(plan.ready.every((r) => r.rawSnippet.length > 0));
  assert.ok(plan.ready.every((r) => ["high", "medium", "low"].includes(r.confidence)));
  const income = plan.ready.find((r) => r.kind === "income");
  assert.ok(income);
  assert.equal(income.amount, 25_000_000);
  assert.equal(income.categoryId, incomeCat.id);
});

test("planDirectCsvImport: dedupe against ledger fingerprint", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, {
    fileName: "sample-bank.csv",
    today: "2026-07-15",
  });
  const highlands = parsed.rows.find((r) =>
    r.merchant.toLowerCase().includes("highlands"),
  );
  assert.ok(highlands);

  const note = highlands.merchant;
  const fp = directImportFingerprint({
    accountId: account.id,
    amount: highlands.amount,
    occurredOn: highlands.occurredOn,
    note,
  });
  assert.match(fp, /^[0-9a-f]{8}$/);

  const ledger: LedgerLike[] = [
    ledgerFromTx({
      id: "existing-1",
      kind: "expense",
      amount: highlands.amount,
      occurredOn: highlands.occurredOn,
      note,
      accountId: account.id,
    }),
  ];

  const plan = planDirectCsvImport(
    parsed.rows,
    ledger,
    baseMapping,
    demoAccounts,
    demoCategories,
  );

  assert.equal(plan.duplicateCount, 1);
  const dup = plan.rows.find((r) => r.status === "duplicate");
  assert.ok(dup);
  assert.equal(dup.duplicateOfLedgerId, "existing-1");
  assert.equal(plan.readyCount, 2);
});

test("planDirectCsvImport: within-batch duplicate", () => {
  const rows = [
    {
      kind: "expense" as const,
      amount: 10_000,
      merchant: "Cafe A",
      note: "",
      occurredOn: "2026-07-01",
      confidence: "high" as const,
      uncertainFields: [] as [],
      explanations: [] as string[],
      rawSnippet: "Cafe A | 10000",
      rowIndex: 2,
    },
    {
      kind: "expense" as const,
      amount: 10_000,
      merchant: "Cafe A",
      note: "",
      occurredOn: "2026-07-01",
      confidence: "high" as const,
      uncertainFields: [] as [],
      explanations: [] as string[],
      rawSnippet: "Cafe A | 10000",
      rowIndex: 3,
    },
  ];

  const plan = planDirectCsvImport(
    rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );
  assert.equal(plan.readyCount, 1);
  assert.equal(plan.duplicateCount, 1);
  assert.ok(plan.rows[1]?.reason?.includes("dòng 2"));
});

test("planDirectCsvImport: invalid account → all invalid", () => {
  const plan = planDirectCsvImport(
    [
      {
        kind: "expense",
        amount: 1_000,
        merchant: "X",
        note: "",
        occurredOn: "2026-07-01",
        confidence: "high",
        uncertainFields: [],
        explanations: [],
        rawSnippet: "x",
        rowIndex: 1,
      },
    ],
    [],
    { ...baseMapping, accountId: "no-such" },
    demoAccounts,
    demoCategories,
  );
  assert.equal(plan.readyCount, 0);
  assert.equal(plan.invalidSkipped, 1);
});

test("planDirectCsvImport: an explicit matching rule normalizes a ready CSV row", () => {
  const rule: InboxRule = {
    id: "rule-highlands",
    stage: "candidate",
    priority: 1,
    enabled: true,
    field: "merchant",
    contains: "highlands",
    categoryId: expenseCat.id,
    category: expenseCat.name,
    categoryKind: "expense",
    merchant: "Highlands Coffee",
    version: 4,
    createdAt: "2026-08-25T00:00:00.000Z",
    updatedAt: "2026-08-25T00:00:00.000Z",
  };
  const rows = [
    {
      kind: "expense" as const,
      amount: 45_000,
      merchant: "HIGHLANDS Q1",
      note: "",
      occurredOn: "2026-08-24",
      confidence: "high" as const,
      uncertainFields: [] as [],
      explanations: [] as string[],
      rawSnippet: "HIGHLANDS Q1 | 45000",
      rowIndex: 2,
    },
  ];

  const plan = planDirectCsvImport(
    rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
    [rule],
  );

  assert.equal(plan.ready[0]?.categoryId, expenseCat.id);
  assert.equal(plan.ready[0]?.merchant, "Highlands Coffee");
  assert.equal(plan.ready[0]?.appliedRuleId, "rule-highlands");
  assert.equal(plan.ready[0]?.appliedRuleVersion, 4);
});

test("toDirectImportAcquisitionRows preserves source evidence without inventing source ids", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, {
    fileName: "sample-bank.csv",
    today: "2026-07-15",
  });
  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );

  const rows = toDirectImportAcquisitionRows(plan.ready);
  assert.equal(rows.length, plan.readyCount);
  for (const row of rows) {
    const source = parsed.rows.find((item) => item.rowIndex === row.rowIndex);
    assert.ok(source);
    assert.equal(row.rawSnippet, source.rawSnippet);
    assert.equal(row.confidence, source.confidence);
    assert.equal(row.accountId, account.id);
    assert.ok(row.categoryId.length > 0);
    assert.equal(Object.hasOwn(row, "sourceExternalId"), false);
    assert.equal(Object.hasOwn(row, "fingerprint"), false);
  }
});

test("toDirectImportPosts builds integer CreateTransactionInput for browser-local demo", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, { today: "2026-07-15" });
  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );
  let n = 0;
  const posts = toDirectImportPosts(plan.ready, () => {
    n += 1;
    return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  });
  assert.equal(posts.length, plan.readyCount);
  for (const p of posts) {
    assert.ok(Number.isSafeInteger(p.input.amount));
    assert.ok(p.input.amount > 0);
    assert.match(p.input.occurredOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.input.kind === "expense" || p.input.kind === "income");
  }
});

test("formatDirectImportSummary VN", () => {
  const s = formatDirectImportSummary({
    rows: [],
    ready: [],
    readyCount: 3,
    duplicateCount: 1,
    transferSkipped: 1,
    invalidSkipped: 0,
    totalParsed: 5,
  });
  assert.ok(s.includes("3 sẽ ghi vào sổ"));
  assert.ok(s.includes("1 trùng"));
  assert.ok(s.includes("1 chuyển khoản"));
});

test("retainedDirectImportRecovery exposes review-only destinations only for an explicit batch id", () => {
  assert.deepEqual(retainedDirectImportRecovery(undefined), null);
  assert.deepEqual(retainedDirectImportRecovery("   "), null);
  assert.deepEqual(retainedDirectImportRecovery("batch-123"), {
    batchId: "batch-123",
    inboxHref: "/inbox",
    importsHref: "/imports",
  });
});

test("custom columnMap override on parse", () => {
  const text = "ColA,ColB,ColC\n12/07/2026,Shop,-50000\n";
  const result = parseCsvStatement(text, {
    today: "2026-07-15",
    columnMap: { date: 0, desc: 1, amount: 2, debit: null, credit: null },
  });
  assert.equal(result.ok, true);
  assert.equal(result.mapConfidence, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.amount, 50_000);
  assert.equal(result.rows[0]?.occurredOn, "2026-07-12");
});

test("a remembered Direct CSV preset matches only the same normalized ordered headers", () => {
  const map = {
    date: 0,
    amount: null,
    desc: 1,
    debit: 2,
    credit: 3,
  };
  const preset = createDirectCsvMappingPreset(
    ["  Ngày GD ", "Nội dung", "Ghi nợ", "Ghi có"],
    map,
  );

  assert.deepEqual(preset, {
    version: 1,
    headerShape: "ngày gd\u001fnội dung\u001fghi nợ\u001fghi có",
    columnMap: map,
  });
  assert.deepEqual(
    resolveDirectCsvMappingPreset(
      ["NGÀY   GD", "nội dung", "ghi nợ", "ghi có"],
      preset,
    ),
    map,
  );
  assert.equal(
    resolveDirectCsvMappingPreset(
      ["Ngày GD", "Nội dung", "Số tiền"],
      preset,
    ),
    null,
  );
});

test("a Direct CSV mapping preset rejects malformed column indexes", () => {
  assert.equal(
    createDirectCsvMappingPreset(
      ["Ngày GD", "Nội dung", "Số tiền"],
      { date: 0, amount: 3, desc: 1, debit: null, credit: null },
    ),
    null,
  );
});

test("Direct CSV preset storage writes only the verified mapping payload", () => {
  const map = { date: 0, amount: 2, desc: 1, debit: null, credit: null };
  const preset = createDirectCsvMappingPreset(
    ["Ngày GD", "Nội dung", "Số tiền"],
    map,
  );
  assert.ok(preset);

  let stored: string | null = null;
  writeDirectCsvMappingPreset(
    {
      setItem(_key: string, value: string) {
        stored = value;
      },
    },
    preset,
  );

  assert.deepEqual(JSON.parse(stored ?? "null"), preset);
  assert.deepEqual(
    readDirectCsvMappingPreset(
      stored,
      ["ngày gd", "nội dung", "số tiền"],
    ),
    map,
  );
  assert.equal(
    readDirectCsvMappingPreset(
      '{"version":1,"headerShape":"x","columnMap":{"amount":9}}',
      ["Ngày GD", "Nội dung", "Số tiền"],
    ),
    null,
  );
});
