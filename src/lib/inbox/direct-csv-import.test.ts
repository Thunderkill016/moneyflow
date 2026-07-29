import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  demoAccounts,
  demoCategories,
  type Transaction,
} from "../sample-data.ts";
import {
  directImportFingerprint,
  directImportRowIdentity,
  formatDirectImportSummary,
  planDirectCsvImport,
  selectDirectImportAttemptRows,
  toDirectImportPosts,
  type DirectImportMapping,
} from "./direct-csv-import.ts";
import type { LedgerLike } from "./detect.ts";
import { parseCsvStatement } from "./parse-csv.ts";

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
  // CK noi bo is transfer → skipped
  assert.equal(plan.transferSkipped, 1);
  assert.equal(plan.readyCount, 3);
  assert.ok(plan.ready.every((r) => r.kind === "expense" || r.kind === "income"));
  assert.ok(plan.ready.every((r) => Number.isSafeInteger(r.amount) && r.amount > 0));
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
  assert.equal(plan.readyCount, 2); // 3 money - 1 dup; transfer still skipped
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

test("toDirectImportPosts builds integer CreateTransactionInput", () => {
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

test("toDirectImportPosts reuses the idempotency key for an unchanged retry", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, { today: "2026-07-15" });
  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );
  let generated = 0;
  const first = toDirectImportPosts(plan.ready, () => {
    generated += 1;
    return `00000000-0000-4000-8000-${String(generated).padStart(12, "0")}`;
  });
  const firstGenerated = generated;
  const retry = toDirectImportPosts(
    plan.ready,
    () => {
      generated += 1;
      return `10000000-0000-4000-8000-${String(generated).padStart(12, "0")}`;
    },
    first,
  );

  assert.equal(generated, firstGenerated);
  assert.deepEqual(
    retry.map((post) => post.input.idempotencyKey),
    first.map((post) => post.input.idempotencyKey),
  );
  assert.deepEqual(
    retry.map((post) => post.identity),
    first.map((post) => post.identity),
  );
});

test("direct import retry identity changes with financial row meaning", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, { today: "2026-07-15" });
  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );
  const row = plan.ready[0]!;
  const first = toDirectImportPosts(
    [row],
    () => "00000000-0000-4000-8000-000000000001",
  );
  const changed = { ...row, note: `${row.note} corrected` };
  const retry = toDirectImportPosts(
    [changed],
    () => "00000000-0000-4000-8000-000000000002",
    first,
  );

  assert.notEqual(directImportRowIdentity(changed), first[0]?.identity);
  assert.equal(
    retry[0]?.input.idempotencyKey,
    "00000000-0000-4000-8000-000000000002",
  );
});

test("partial retry selects only unresolved row indexes when dedupe is disabled", () => {
  const text = readFileSync(join(fixturesDir, "sample-bank.csv"), "utf8");
  const parsed = parseCsvStatement(text, { today: "2026-07-15" });
  const plan = planDirectCsvImport(
    parsed.rows,
    [],
    { ...baseMapping, skipDuplicates: false },
    demoAccounts,
    demoCategories,
  );
  const first = toDirectImportPosts(
    plan.ready,
    () => "00000000-0000-4000-8000-000000000001",
  );
  const unresolved = first.slice(-1);

  const retryRows = selectDirectImportAttemptRows(
    plan.ready,
    unresolved.map((post) => post.rowIndex),
    true,
  );

  assert.equal(retryRows.length, 1);
  assert.equal(retryRows[0]?.rowIndex, unresolved[0]?.rowIndex);
});

test("direct import page retains unresolved posts and keeps partial failures retryable", () => {
  const page = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../components/inbox/direct-csv-import-page.tsx",
    ),
    "utf8",
  );

  assert.match(page, /attemptPostsRef\s*=\s*useRef/);
  assert.match(
    page,
    /toDirectImportPosts\([\s\S]*attemptPostsRef\.current[\s\S]*\)/,
  );
  assert.match(
    page,
    /attemptPostsRef\.current\s*=\s*attemptPostsRef\.current\.filter/,
  );
  assert.match(page, /selectDirectImportAttemptRows\(/);
  assert.match(page, /current\s*===\s*"partial"/);
  assert.match(page, /setPhase\("partial"\)/);
  assert.match(page, /Thử lại.*dòng/);
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

test("custom columnMap override on parse", () => {
  const text = "ColA,ColB,ColC\n12/07/2026,Shop,-50000\n";
  // Headers won't auto-map well as ColA/B/C — override map
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
