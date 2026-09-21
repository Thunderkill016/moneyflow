// Automated driver for /capture-bench.html — machine-floor TTLT baseline.
//
// Runs the Capture V2 benchmark tasks (A1–A4 amount-first, D1–D3 description)
// against a locally served production build, driving the real UI through
// Playwright while the harness tab measures storage-event timing.
//
//   npm run build && npx next start -p 8471
//   node scripts/capture-bench-driver.mjs
//
// NOT human timing: numbers are scripted lower bounds on real UI work plus
// same-context tab latency. Use them to sanity-check the harness and to track
// regressions between builds — the evidence tier that gates Capture V2
// decisions remains human runs on representative devices.
import { chromium } from "playwright";

const ORIGIN = process.env.BENCH_ORIGIN || "http://localhost:8471";
const HARNESS = `${ORIGIN}/capture-bench.html`;

let taps = 0;
const tap = (n = 1) => { taps += n; };

async function waitHarnessIdle(harness) {
  await harness.waitForFunction(
    () => document.getElementById("live-field").style.display === "none",
    { timeout: 40000 },
  );
}

async function fillFollowup(harness, note) {
  await harness.fill("#fu-taps", String(taps));
  await harness.selectOption("#fu-corrected", "no");
  await harness.fill("#fu-note", note);
  await harness.click("#fu-next");
}

async function startTask(harness, id) {
  taps = 0;
  await harness.click(`[data-start="${id}"]`);
}

// ---------- amount-first flow ----------
// The quick-capture form is a real <dialog>; its submit buttons live in the
// dialog footer, OUTSIDE the <form> (linked via the `form` attribute) — so all
// locators scope to the dialog root, never to the form element.
function dialogRoot(page) {
  return page.locator("dialog");
}

async function pickCategory(dlg, name) {
  const chip = dlg.getByLabel(`Chọn danh mục ${name}`);
  if (await chip.count() && await chip.first().isVisible()) {
    await chip.first().click(); tap();
    return;
  }
  // Stable-defaults path (#596): a learned pattern chip like
  // "Dùng mẫu chi, Ăn uống, MB Bank" replaces the bare category chip — tapping
  // it is exactly what task A4 exists to observe.
  const pattern = dlg.locator(`button[aria-label^="Dùng mẫu"][aria-label*="${name}"]`);
  if (await pattern.count() && await pattern.first().isVisible()) {
    await pattern.first().click(); tap();
    return;
  }
  // full picker fallback
  const openPicker = dlg.getByLabel("Đổi tài khoản hoặc xem tất cả danh mục");
  if (await openPicker.count() && await openPicker.first().isVisible()) {
    await openPicker.first().click(); tap();
    const opt = dlg.getByLabel(`Chọn danh mục ${name}`);
    if (await opt.count()) { await opt.first().click(); tap(); }
  }
}

async function quickExpense(page, { amount, category, note }) {
  await page.goto(`${ORIGIN}/capture/quick`, { waitUntil: "networkidle" });
  const dlg = dialogRoot(page);
  await page.locator("#add-tx-amount").waitFor({ state: "visible" });
  await page.locator("#add-tx-amount").fill(amount); tap();
  if (category) await pickCategory(dlg, category);
  // Account stays on the learned/default value — the harness match checks
  // kind+amount only, and the account <select> is a hidden custom-control
  // backing element, not user-drivable.
  if (note) {
    const noteToggle = dlg.getByText("+ Ghi chú");
    if (await noteToggle.count() && await noteToggle.first().isVisible()) {
      await noteToggle.first().click(); tap();
    }
    const noteInput = dlg.locator("input[placeholder*='Cơm trưa']");
    if (await noteInput.first().isVisible()) { await noteInput.first().fill(note); tap(); }
  }
  await dlg.getByLabel("Lưu", { exact: true }).click(); tap();
}

async function quickIncome(page, { amount, category }) {
  await page.goto(`${ORIGIN}/capture/quick`, { waitUntil: "networkidle" });
  const dlg = dialogRoot(page);
  await page.locator("#add-tx-amount").waitFor({ state: "visible" });
  await dlg.getByLabel("Khoản thu").click(); tap();
  await page.locator("#add-tx-amount").fill(amount); tap();
  if (category) await pickCategory(dlg, category);
  await dlg.getByLabel("Lưu", { exact: true }).click(); tap();
}

async function quickTransfer(page, { amount, from, to }) {
  await page.goto(`${ORIGIN}/capture/quick`, { waitUntil: "networkidle" });
  const dlg = dialogRoot(page);
  await page.locator("#add-tx-amount").waitFor({ state: "visible" });
  await dlg
    .getByRole("group", { name: "Loại giao dịch" })
    .getByLabel("Chuyển tiền")
    .click(); tap();
  // dialog closes; page-level transfer form becomes the live control
  const amountInput = page.locator("input[placeholder='0']:visible").first();
  await amountInput.waitFor({ state: "visible" });
  await amountInput.fill(amount); tap();
  const selects = page.locator("select:visible");
  await selects.nth(0).selectOption({ label: from }); tap();
  await selects.nth(1).selectOption({ label: to }); tap();
  await page.getByRole("button", { name: "Xác nhận chuyển tiền" }).click(); tap();
}

// ---------- description (paste) flow ----------
async function pasteFlow(page, text) {
  await page.goto(`${ORIGIN}/capture/paste`, { waitUntil: "networkidle" });
  await page.locator("textarea.capture-paste-textarea").fill(text); tap();
  await page.getByRole("button", { name: "Phân tích" }).click(); tap();
  const toInbox = page.getByRole("button", { name: "Vào Inbox" });
  await toInbox.waitFor({ state: "visible", timeout: 20000 });
  await toInbox.click(); tap();
  await page.goto(`${ORIGIN}/inbox`, { waitUntil: "networkidle" });
  const approve = page.locator("button[aria-label^='Duyệt ']").first();
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await approve.click(); tap();
  const confirm = page.getByRole("button", { name: "Duyệt vào sổ" });
  await confirm.waitFor({ state: "visible", timeout: 15000 });
  await confirm.click(); tap();
}

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const harness = await ctx.newPage();
  const app = await ctx.newPage();

  await harness.goto(HARNESS, { waitUntil: "networkidle" });
  await app.goto(`${ORIGIN}/dashboard`, { waitUntil: "networkidle" });
  await app.waitForTimeout(800);

  // Demo samples live in memory until the first save persists them. Without a
  // warm-up write, the first measured save dumps every sample into localStorage
  // and the harness counts them all as "new" rows — polluting match results.
  await app.goto(`${ORIGIN}/capture/quick`, { waitUntil: "networkidle" });
  const dlg0 = dialogRoot(app);
  await app.locator("#add-tx-amount").waitFor({ state: "visible" });
  await app.locator("#add-tx-amount").fill("1000");
  await dlg0.getByLabel("Chọn danh mục Ăn uống").first().click();
  await dlg0.getByLabel("Lưu", { exact: true }).click();
  await app.waitForTimeout(700);
  console.log("warm-up stored:", await app.evaluate(
    () => JSON.parse(localStorage.getItem("moneyflow-demo-transactions-v1") || "[]").length));

  await harness.reload({ waitUntil: "networkidle" });

  await harness.fill("#f-date", new Date().toISOString().slice(0, 16));
  await harness.fill("#f-commit", "local-build");
  await harness.fill("#f-origin", ORIGIN);
  await harness.selectOption("#f-mode", "demo");
  await harness.selectOption("#f-cohort", "demo-fixtures");
  await harness.fill("#f-device", "Playwright scripted driver — machine floor, not human TTLT");
  await harness.fill("#f-network", "localhost");

  const steps = [
    ["A1", () => quickExpense(app, { amount: "45000", category: "Ăn uống", note: "cà phê sáng" })],
    ["A2", () => quickIncome(app, { amount: "15000000", category: "Lương" })],
    ["A3", () => quickTransfer(app, { amount: "500000", from: "Tiền mặt", to: "MoMo" })],
    ["A4", () => quickExpense(app, { amount: "45000", category: "Ăn uống", note: "cà phê sáng" })],
    ["D1", () => pasteFlow(app, "cafe 45k")],
    ["D2", () => pasteFlow(app, "đổ xăng 185k hôm qua")],
    ["D3", () => pasteFlow(app, "TK xxxx1234 GD -250.000VND 21/09/2026 TTTM GRAB. SDU 1.500.000VND")],
  ];

  for (const [id, fn] of steps) {
    console.log(`--- ${id} ---`);
    try {
      await startTask(harness, id);
      await fn();
      await waitHarnessIdle(harness);
      await fillFollowup(harness, "scripted");
      console.log(id, "recorded");
    } catch (e) {
      console.log(id, "FAILED:", String(e).split("\n")[0]);
      try { await harness.click("#skip-task", { timeout: 2000 }); } catch {}
      try {
        await harness.evaluate(() => document.getElementById("followup")?.classList.add("hidden"));
      } catch {}
    }
  }

  const report = await harness.evaluate(() => {
    document.getElementById("gen")?.click();
    return document.getElementById("report")?.textContent || "";
  });
  console.log("=====REPORT=====");
  console.log(report);
  await browser.close();
}

run().catch((e) => { console.error("driver error:", e); process.exit(1); });
