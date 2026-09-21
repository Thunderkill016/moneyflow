import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { AccountsWorkspace } from "./types.ts";
import {
  FIXED_CONTEXT,
  fixtureAccountsWorkspace,
} from "./capability-test-helpers.test.ts";
import { run } from "./accounts-list.ts";

function deps(workspace: AccountsWorkspace = fixtureAccountsWorkspace()) {
  return { loadAccountsWorkspace: async () => workspace };
}

test("accounts.list returns active accounts with explained balances", async () => {
  const output = await run(FIXED_CONTEXT, {}, deps());
  assert.equal(output.accounts.length, 2);
  const mb = output.accounts[0]!;
  assert.equal(mb.id, "acc-mb");
  assert.equal(mb.balance.amount, 15_454_000);
  assert.equal(mb.balance.currency, "VND");
  assert.equal(mb.balance.basis.computedAt, FIXED_CONTEXT.now);
  assert.equal(mb.balance.basis.capabilityVersion, "accounts.list@1");
});

test("accounts.list includes archived accounts only on request", async () => {
  const withArchived = await run(FIXED_CONTEXT, { includeArchived: true }, deps());
  assert.equal(withArchived.accounts.length, 3);
  assert.ok(withArchived.accounts.some((account) => account.isArchived));
});

test("accounts.list fails loudly instead of reporting an empty ledger", async () => {
  await assert.rejects(
    () =>
      run(FIXED_CONTEXT, {}, deps({ accounts: [], dataError: "Không thể kết nối." })),
    (error: unknown) =>
      error instanceof Error && "code" in error && error.code === "internal",
  );
});

test("accounts.list golden output stays deterministic", async () => {
  const output = await run(FIXED_CONTEXT, { includeArchived: true }, deps());
  const golden = JSON.parse(
    await readFile(new URL("./__golden__/accounts-list.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(output, golden);
});
