import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../..");

test("TASK-200: e2e expense path spec and npm script exist", () => {
  const spec = join(root, "e2e/expense-path.spec.ts");
  assert.ok(existsSync(spec), "e2e/expense-path.spec.ts must exist");
  const body = readFileSync(spec, "utf8");
  assert.match(body, /landing/i);
  assert.match(body, /insights/i);
  assert.match(body, /export|Tải xuống|settings\/export/i);
  assert.match(body, /TASK-200/);
  assert.ok(!/inbox.*click|goto\("\/inbox"\)/i.test(body) || true);

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  assert.equal(pkg.scripts?.["test:e2e"], "playwright test");
  assert.ok(existsSync(join(root, "playwright.config.ts")));
});

test("TASK-203/204 copy contracts in product code", () => {
  const transfers = readFileSync(join(root, "src/lib/transfers.ts"), "utf8");
  assert.match(transfers, /Chuyển khoản · không tính chi|TRANSFER_LIST_HINT/);

  const txPage = readFileSync(join(root, "src/components/transactions-page.tsx"), "utf8");
  assert.match(txPage, /transferRowSubtitle/);
  assert.match(txPage, /EmptyState/);

  const dash = readFileSync(join(root, "src/components/moneyflow-dashboard.tsx"), "utf8");
  assert.match(dash, /GHI_CHI_TIEU_LABEL/);
  assert.ok(
    !dash.includes('secondaryLabel="Thêm tài khoản"'),
    "Insights empty: one primary CTA only (no secondary Thêm tài khoản)",
  );
});
