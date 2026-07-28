import { expect, test } from "@playwright/test";

const NOTE = "Benchmark UX cafe";
const AMOUNT = 125_000;

test.describe("Global PFM UX benchmark", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        if (window.localStorage.getItem("__mf_e2e_benchmark_seeded") === "1") {
          return;
        }
        window.localStorage.clear();
        window.localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_benchmark_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("withdraws untrusted spending advice and keeps a viewport primary action", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.locator(".safe-card-hero")).toBeHidden();

    const isMobile = (page.viewportSize()?.width ?? 1_000) <= 760;
    if (isMobile) {
      const mobileNavigation = page.getByRole("navigation", {
        name: "Điều hướng di động",
      });
      await expect(
        mobileNavigation.getByRole("button", {
          name: "Ghi chi tiêu",
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("banner").getByRole("button", {
          name: "Ghi chi tiêu",
          exact: true,
        }),
      ).toBeVisible();
    }

    await page.goto("/capture/quick");
    await page.getByRole("button", { name: /Khoản chi/i, exact: true }).click();
    await page.getByLabel(/Số tiền chi/i).fill(String(AMOUNT));
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(NOTE);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    await expect
      .poll(
        () =>
          page.evaluate(
            ({ note, amount }) => {
              const raw = window.localStorage.getItem(
                "moneyflow-demo-transactions-v1",
              );
              if (!raw) return false;
              try {
                const list = JSON.parse(raw) as Array<{
                  note?: string;
                  amount?: number;
                }>;
                return list.some(
                  (item) => item.note === note && item.amount === amount,
                );
              } catch {
                return false;
              }
            },
            { note: NOTE, amount: AMOUNT },
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/transactions?category=%C4%82n%20u%E1%BB%91ng&kind=expense");
    await expect(page.getByLabel("Lọc theo danh mục")).toHaveValue("Ăn uống");
    await expect(
      page.getByRole("button", { name: "Khoản chi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    const transactionSummary = page.getByRole("region", {
      name: "Tóm tắt theo bộ lọc",
    });
    const netSummary = transactionSummary
      .getByText("Ròng", { exact: true })
      .locator("..");
    await expect(netSummary).toContainText(/−\s*125\.000/);
    await expect(page.locator(".manager-row").filter({ hasText: NOTE })).toBeVisible();
  });

  test("shows explicit budget decisions and a transaction drill-down", async ({
    page,
  }) => {
    await page.goto("/budgets");
    const card = page.locator(".budget-category-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Hạn mức", { exact: true })).toBeVisible();
    await expect(card.getByText("Đã chi", { exact: true })).toBeVisible();
    await expect(card.getByText(/Còn lại|Vượt/, { exact: true })).toBeVisible();

    const drillDown = card.getByRole("link", { name: /Xem giao dịch danh mục/i });
    await expect(drillDown).toHaveAttribute("href", /\/transactions\?category=/);
    await drillDown.click();
    await expect(page).toHaveURL(/\/transactions\?category=/);
    await expect(page.getByLabel("Lọc theo danh mục")).not.toHaveValue("all");
  });

  test("approves one Inbox candidate with a durable transaction link", async ({
    page,
  }) => {
    await page.goto("/inbox");
    await page.getByRole("button", { name: "Nạp dữ liệu mẫu" }).click();
    await page.getByRole("button", { name: "Duyệt Highlands Coffee" }).click();
    await page.getByRole("button", { name: "Duyệt vào sổ" }).click();

    await expect(
      page.getByText(/Đã duyệt .*Highlands Coffee.* vào sổ/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Duyệt Highlands Coffee" }),
    ).toHaveCount(0);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const candidateRaw = window.localStorage.getItem(
            "moneyflow-inbox-candidates-v1",
          );
          const transactionRaw = window.localStorage.getItem(
            "moneyflow-demo-transactions-v1",
          );
          if (!candidateRaw || !transactionRaw) return false;
          try {
            const candidates = JSON.parse(candidateRaw) as Array<{
              id?: string;
              status?: string;
              financialTransactionId?: string;
            }>;
            const transactions = JSON.parse(transactionRaw) as Array<{
              id?: string;
            }>;
            const approved = candidates.find(
              (item) => item.id === "cand-demo-1",
            );
            return (
              approved?.status === "approved" &&
              typeof approved.financialTransactionId === "string" &&
              transactions.filter(
                (item) => item.id === approved.financialTransactionId,
              ).length === 1
            );
          } catch {
            return false;
          }
        }),
      )
      .toBe(true);
  });
});
