import assert from "node:assert/strict";
import test from "node:test";
import {
  archiveDemoAccount,
  DEMO_ACCOUNT_STORAGE_KEY,
  parseDemoAccounts,
  readDemoAccounts,
  saveDemoAccount,
} from "./demo-account-store.ts";
import { demoAccountRows } from "./demo/transaction-fixtures.ts";
import {
  buildAccountRegister,
  reconcileAccountBalanceSnapshot,
} from "./account-register.ts";
import { sampleTransactionsFor } from "./demo/transaction-fixtures.ts";
import type { Transaction } from "./transactions/contracts.ts";

const CASH_ID = "550e8400-e29b-41d4-a716-446655440000";
const BANK_ID = "550e8400-e29b-41d4-a716-446655440001";
function storage() {
  let raw: string | null = null;
  return {
    getItem: (key: string) => {
      assert.equal(key, DEMO_ACCOUNT_STORAGE_KEY);
      return raw;
    },
    setItem: (key: string, value: string) => {
      assert.equal(key, DEMO_ACCOUNT_STORAGE_KEY);
      raw = value;
    },
  };
}
function created() {
  const port = storage();
  assert.equal(
    saveDemoAccount(
      { name: "Study Cash", kind: "cash", initialBalance: 500_000 },
      port,
      () => CASH_ID,
    ).error,
    null,
  );
  assert.equal(
    saveDemoAccount(
      { name: "Study Bank", kind: "bank", initialBalance: 100_000 },
      port,
      () => BANK_ID,
    ).error,
    null,
  );
  return port;
}

test("seed-only browsers preserve legacy snapshots without writing a new ledger", () => {
  assert.deepEqual(readDemoAccounts(storage()).accounts, demoAccountRows);
  const returned = parseDemoAccounts(null).accounts;
  returned[0].name = "mutated read";
  assert.equal(demoAccountRows[0].name, "MB Bank");
});
test("new account identity and opening balances survive a fresh store read, not a live balance snapshot", () => {
  const port = created();
  const accounts = readDemoAccounts(port).accounts;
  assert.equal(accounts.find(({ id }) => id === CASH_ID)?.balance, 500_000);
  assert.equal(
    accounts.find(({ id }) => id === BANK_ID)?.initialBalance,
    100_000,
  );
  assert.ok(!port.getItem(DEMO_ACCOUNT_STORAGE_KEY)!.includes('"balance"'));
});
test("opening-balance edits preserve currency and identity; archive/restore persists without deleting", () => {
  const port = created();
  const edited = saveDemoAccount(
    {
      id: CASH_ID,
      name: "Renamed Cash",
      kind: "cash",
      currencyCode: "USD",
      initialBalance: 510_000,
    },
    port,
  );
  assert.equal(edited.error, null);
  assert.deepEqual(
    edited.accounts.find(({ id }) => id === CASH_ID),
    {
      id: CASH_ID,
      name: "Renamed Cash",
      kind: "cash",
      currencyCode: "VND",
      initialBalance: 510_000,
      balance: 510_000,
      isArchived: false,
      icon: null,
      color: null,
    },
  );
  assert.equal(archiveDemoAccount(CASH_ID, true, port).error, null);
  assert.equal(
    readDemoAccounts(port).accounts.find(({ id }) => id === CASH_ID)
      ?.isArchived,
    true,
  );
  assert.equal(archiveDemoAccount(CASH_ID, false, port).error, null);
  assert.equal(
    readDemoAccounts(port).accounts.find(({ id }) => id === CASH_ID)
      ?.isArchived,
    false,
  );
});
test("editing a seeded opening balance changes its anchor by exactly the explicit delta", () => {
  const port = storage();
  const seed = demoAccountRows[0];
  const result = saveDemoAccount(
    {
      id: seed.id,
      name: seed.name,
      kind: seed.kind,
      initialBalance: seed.initialBalance + 5_000,
    },
    port,
  );
  assert.equal(result.error, null);
  assert.equal(result.accounts[0].balance, seed.balance + 5_000);
});
test("invalid or duplicate persisted identities fail closed without removing raw data", () => {
  const port = created();
  const original = port.getItem(DEMO_ACCOUNT_STORAGE_KEY)!;
  for (const raw of [
    "{broken",
    JSON.stringify({ version: 9, accounts: [] }),
    JSON.stringify({
      version: 1,
      accounts: [{ ...JSON.parse(original).accounts[0], initialBalance: 0.5 }],
    }),
    JSON.stringify({
      version: 1,
      accounts: [
        JSON.parse(original).accounts[0],
        JSON.parse(original).accounts[0],
      ],
    }),
  ]) {
    port.setItem(DEMO_ACCOUNT_STORAGE_KEY, raw);
    assert.ok(readDemoAccounts(port).error);
    assert.ok(
      saveDemoAccount(
        { name: "Never overwrite", kind: "bank", initialBalance: 0 },
        port,
        () => BANK_ID,
      ).error,
    );
    assert.equal(port.getItem(DEMO_ACCOUNT_STORAGE_KEY), raw);
  }
});
test("quota/access/id generation failures never return successful persistence", () => {
  const port = created();
  const before = port.getItem(DEMO_ACCOUNT_STORAGE_KEY);
  const deniedWrite = {
    getItem: port.getItem,
    setItem: () => {
      throw new Error("quota");
    },
  };
  assert.ok(
    saveDemoAccount(
      { name: "not saved", kind: "cash", initialBalance: 1 },
      deniedWrite,
      () => crypto.randomUUID(),
    ).error,
  );
  assert.ok(archiveDemoAccount(CASH_ID, true, deniedWrite).error);
  assert.equal(port.getItem(DEMO_ACCOUNT_STORAGE_KEY), before);
  assert.ok(
    readDemoAccounts({
      getItem: () => {
        throw new Error("denied");
      },
    }).error,
  );
  assert.ok(
    saveDemoAccount(
      { name: "no ID", kind: "cash", initialBalance: 0 },
      port,
      () => {
        throw new Error("no secure context");
      },
    ).error,
  );
});
test("invalid money, unknown IDs and unsafe seeded anchors cannot overwrite valid accounts", () => {
  const port = created();
  const before = port.getItem(DEMO_ACCOUNT_STORAGE_KEY);
  for (const amount of [0.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
    assert.ok(
      saveDemoAccount(
        { id: CASH_ID, name: "Cash", kind: "cash", initialBalance: amount },
        port,
      ).error,
    );
    assert.equal(port.getItem(DEMO_ACCOUNT_STORAGE_KEY), before);
  }
  assert.ok(
    saveDemoAccount(
      { id: "unknown", name: "Cash", kind: "cash", initialBalance: 0 },
      port,
    ).error,
  );
  assert.ok(archiveDemoAccount("unknown", true, port).error);
  assert.ok(
    saveDemoAccount(
      {
        id: demoAccountRows[0].id,
        name: "Seed",
        kind: "bank",
        initialBalance: Number.MAX_SAFE_INTEGER,
      },
      port,
    ).error,
  );
});
test("last active account cannot be archived", () => {
  const port = storage();
  for (const account of demoAccountRows.slice(1))
    assert.equal(archiveDemoAccount(account.id, true, port).error, null);
  assert.ok(archiveDemoAccount(demoAccountRows[0].id, true, port).error);
});
test("the independent complete-journey amounts derive from opening balances and one ledger", () => {
  const accounts = readDemoAccounts(created()).accounts;
  const baseline = sampleTransactionsFor("2026-10-02");
  const cashExpense = {
    ...baseline[0],
    id: "cash-expense",
    kind: "expense",
    accountId: CASH_ID,
    amount: 45_000,
  } as Transaction;
  const transfer = {
    ...baseline[0],
    id: "transfer",
    kind: "transfer",
    accountId: CASH_ID,
    destinationAccountId: BANK_ID,
    amount: 50_000,
  } as Transaction;
  const bankExpense = {
    ...baseline[0],
    id: "bank-expense",
    kind: "expense",
    accountId: BANK_ID,
    amount: 45_000,
  } as Transaction;
  function balance(id: string, facts: Transaction[]) {
    return reconcileAccountBalanceSnapshot(
      accounts.find((account) => account.id === id)!.balance,
      buildAccountRegister(baseline, id),
      buildAccountRegister(facts, id),
    );
  }
  const facts = [cashExpense, transfer, bankExpense];
  assert.equal(balance(CASH_ID, facts), 405_000);
  assert.equal(balance(BANK_ID, facts), 105_000);
  const corrected = [{ ...cashExpense, amount: 40_000 }, transfer, bankExpense];
  assert.equal(balance(CASH_ID, corrected), 410_000);
  assert.equal(balance(BANK_ID, corrected), 105_000);
  assert.equal(
    balance(CASH_ID, corrected) + balance(BANK_ID, corrected),
    515_000,
  );
  assert.equal(
    corrected
      .filter((row) => row.kind === "expense")
      .reduce((sum, row) => sum + row.amount, 0),
    85_000,
  );
});

test("architecture registration permits only the explicit demo adapters, not arbitrary core fixture imports", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { spawnSync } = await import("node:child_process");
  const root = mkdtempSync(join(tmpdir(), "mf-account-boundary-"));
  const checker = fileURLToPath(
    new URL("../../scripts/check-architecture.mjs", import.meta.url),
  );
  function file(path: string, source: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
  try {
    mkdirSync(join(root, "src/components"), { recursive: true });
    for (const path of [
      "src/lib/transactions/contracts.ts",
      "src/lib/transactions/category-presentation.ts",
      "src/lib/demo/transaction-fixtures.ts",
    ])
      file(path, "export {};\n");
    for (const path of [
      "src/lib/demo-account-store.ts",
      "src/hooks/use-demo-accounts.ts",
      "src/server/accounts.ts",
    ])
      file(
        path,
        'import { demoAccountRows } from "@/lib/demo/transaction-fixtures";\n',
      );
    const allowed = spawnSync(process.execPath, [checker], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(allowed.status, 0, allowed.stderr);
    file(
      "src/lib/unapproved-core.ts",
      'import { demoAccountRows } from "@/lib/demo/transaction-fixtures";\n',
    );
    const denied = spawnSync(process.execPath, [checker], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(denied.status, 1);
    assert.match(
      denied.stderr,
      /unapproved-core\.ts: demo fixture import is not owned/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
