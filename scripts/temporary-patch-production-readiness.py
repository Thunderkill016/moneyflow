from pathlib import Path

path = Path("scripts/temporary-production-readiness.mjs")
source = path.read_text()
source = source.replace(
    'url.origin === base && url.pathname === "/insights"',
    'url.origin === base && (url.pathname === "/" || url.pathname === "/insights")',
)

start = source.index('  await page.goto(`${base}/capture/quick`')
end = source.index('  let row = page.locator(".transaction-row")', start)
replacement = r'''  const directQuickResponse = await context.request.get(`${base}/capture/quick`, {
    maxRedirects: 0,
  });
  report.quickRouteStatus = directQuickResponse.status();

  const addButton = page
    .locator("button:visible")
    .filter({ hasText: /Ghi (một khoản mới|chi tiêu)/i })
    .first();
  await addButton.waitFor({ timeout: 30_000 });
  await addButton.click();

  const addDialog = page.locator("dialog[open]").first();
  await addDialog.waitFor({ timeout: 30_000 });
  let amount = addDialog.getByLabel("Số tiền", { exact: true });
  if ((await amount.count()) === 0) {
    amount = addDialog.locator('input[inputmode="decimal"], input[inputmode="numeric"]').first();
  }
  const amountInputMode = await amount.getAttribute("inputmode");
  ensure(
    amountInputMode === "decimal" || amountInputMode === "numeric",
    `Amount input keyboard mode is ${amountInputMode}`,
  );
  ensure(await amount.evaluate((element) => element === document.activeElement), "Amount input did not receive focus");
  ensure(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Quick-add dialog has horizontal overflow on mobile viewport",
  );
  await page.screenshot({ path: "artifacts/03-quick-add-dialog.png", fullPage: true });
  await amount.fill("123456");
  await addDialog.getByRole("button", { name: "Ăn uống", exact: true }).click();
  await addDialog.getByPlaceholder(/Cơm trưa/i).fill(note);
  await addDialog.getByRole("button", { name: /^(Lưu|Lưu giao dịch)$/ }).click();
  await addDialog.waitFor({ state: "hidden", timeout: 30_000 });
  report.checks.mobileQuickAdd = true;

  const transactionsLink = page.getByRole("link", { name: "Giao dịch", exact: true }).last();
  await transactionsLink.click();
  await page.waitForURL((url) => url.origin === base && url.pathname === "/transactions", {
    timeout: 30_000,
  });
'''
source = source[:start] + replacement + source[end:]
path.write_text(source)
