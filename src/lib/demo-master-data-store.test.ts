import assert from "node:assert/strict";
import test from "node:test";
import {
  activeDemoAccountOptions,
  activeDemoCategoryOptions,
  accountSummariesFromDemoRecords,
  DEMO_ACCOUNT_STORAGE_KEY,
  DEMO_CATEGORY_STORAGE_KEY,
  demoAccountRecords,
  demoCategorySummaries,
  demoBalanceForCurrency,
  readStoredDemoAccounts,
  readStoredDemoCategories,
  writeStoredDemoAccounts,
  writeStoredDemoCategories,
  type DemoAccountRecord,
} from "./demo-master-data-store.ts";
import { sampleTransactions } from "./sample-data.ts";

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    storage: {
      getItem(key: string) {
        return map.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        map.set(key, value);
      },
      removeItem(key: string) {
        map.delete(key);
      },
    },
  };
}

test("missing stores hydrate canonical master data and replay the sample ledger once", () => {
  const { storage } = mockStorage();
  const records = readStoredDemoAccounts(storage);
  const categories = readStoredDemoCategories(storage);
  const accounts = accountSummariesFromDemoRecords(records, sampleTransactions);

  assert.deepEqual(records, demoAccountRecords);
  assert.deepEqual(categories, demoCategorySummaries);
  assert.equal(
    accounts.find((item) => item.id === "demo-account-mb")?.balance,
    15_454_000,
  );
  assert.equal(
    accounts
      .filter((item) => item.currencyCode === "VND")
      .reduce((sum, item) => sum + item.balance, 0),
    15_735_000,
  );
});

test("account and category changes round-trip without losing transaction references", () => {
  const { storage } = mockStorage();
  const account: DemoAccountRecord = {
    id: "account-persisted",
    name: "Ví bền vững",
    kind: "cash",
    currencyCode: "VND",
    initialBalance: 123_000,
    baseBalance: 123_000,
    isArchived: false,
  };
  const category = {
    id: "category-persisted",
    name: "Kiểm thử",
    kind: "expense" as const,
    icon: "spark",
    color: "violet",
    isDefault: false,
    isArchived: false,
  };

  writeStoredDemoAccounts([...demoAccountRecords, account], storage);
  writeStoredDemoCategories([...demoCategorySummaries, category], storage);

  const accountsAfterReload = readStoredDemoAccounts(storage);
  const categoriesAfterReload = readStoredDemoCategories(storage);
  assert.deepEqual(
    accountsAfterReload.find((item) => item.id === account.id),
    account,
  );
  assert.deepEqual(
    categoriesAfterReload.find((item) => item.id === category.id),
    category,
  );
  assert.ok(activeDemoAccountOptions(accountsAfterReload).some((item) => item.id === account.id));
  assert.ok(
    activeDemoCategoryOptions(categoriesAfterReload).some(
      (item) => item.id === category.id,
    ),
  );
});

test("new opening balance and its transaction are each included exactly once", () => {
  const account: DemoAccountRecord = {
    id: "account-new",
    name: "Ví mới",
    kind: "cash",
    currencyCode: "VND",
    initialBalance: 123_000,
    baseBalance: 123_000,
    isArchived: false,
  };
  const expense = {
    ...sampleTransactions[0]!,
    id: "expense-new-account",
    accountId: account.id,
    account: account.name,
    amount: 50_000,
  };

  assert.equal(
    demoBalanceForCurrency(
      [...demoAccountRecords, account],
      [expense],
      "VND",
    ),
    1_199_000,
  );
});

test("archived master data remains stored but is excluded from new-entry options", () => {
  const archivedAccount = {
    ...demoAccountRecords[0]!,
    isArchived: true,
  };
  const archivedCategory = {
    ...demoCategorySummaries[0]!,
    isArchived: true,
  };

  assert.equal(
    activeDemoAccountOptions([archivedAccount]).some(
      (item) => item.id === archivedAccount.id,
    ),
    false,
  );
  assert.equal(
    activeDemoCategoryOptions([archivedCategory]).some(
      (item) => item.id === archivedCategory.id,
    ),
    false,
  );
});

test("malformed and unsafe stores are removed before canonical fallback", () => {
  const unsafeAccount = {
    ...demoAccountRecords[0],
    baseBalance: Number.MAX_SAFE_INTEGER + 1,
  };
  const { storage, map } = mockStorage({
    [DEMO_ACCOUNT_STORAGE_KEY]: JSON.stringify([unsafeAccount]),
    [DEMO_CATEGORY_STORAGE_KEY]: "{not-json",
  });

  assert.deepEqual(readStoredDemoAccounts(storage), demoAccountRecords);
  assert.deepEqual(readStoredDemoCategories(storage), demoCategorySummaries);
  assert.equal(map.has(DEMO_ACCOUNT_STORAGE_KEY), false);
  assert.equal(map.has(DEMO_CATEGORY_STORAGE_KEY), false);
});

test("writers reject duplicate IDs and unsafe balances", () => {
  const { storage } = mockStorage();
  assert.throws(() =>
    writeStoredDemoAccounts(
      [
        demoAccountRecords[0]!,
        { ...demoAccountRecords[0]!, name: "Trùng ID" },
      ],
      storage,
    ),
  );
  assert.throws(() =>
    writeStoredDemoAccounts(
      [
        {
          ...demoAccountRecords[0]!,
          baseBalance: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
      storage,
    ),
  );
});
