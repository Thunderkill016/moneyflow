import { expect, test } from "@playwright/test";

test.describe("UI migration Phase 9 public and auth surfaces", () => {
  test("landing keeps Login and Register reachable across responsive projects", async ({
    page,
  }) => {
    await page.goto("/landing", { waitUntil: "domcontentloaded" });

    const navigation = page.getByRole("navigation", {
      name: "Điều hướng trang chủ",
    });
    const login = navigation.getByRole("link", {
      name: "Đăng nhập",
      exact: true,
    });
    const register = navigation.getByRole("link", {
      name: "Tạo sổ",
      exact: true,
    });

    await expect(login).toBeVisible();
    await expect(register).toBeVisible();

    for (const action of [login, register]) {
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const geometry = await page.locator("html").evaluate((element) => ({
      overflow: element.scrollWidth - element.clientWidth,
      theme: element.getAttribute("data-theme"),
    }));
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.theme).toBe("light");
  });

  for (const authCase of [
    { route: "/login", heading: "Đăng nhập vào MoneyFlow" },
    { route: "/register", heading: "Tạo tài khoản MoneyFlow" },
    { route: "/forgot-password", heading: "Đặt lại mật khẩu" },
  ]) {
    test(`${authCase.route} stays light and exposes labelled form controls`, async ({
      page,
    }) => {
      await page.goto(authCase.route, { waitUntil: "domcontentloaded" });

      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(
        page.getByRole("heading", { level: 1, name: authCase.heading }),
      ).toBeVisible();

      const email = page.getByRole("textbox", { name: "Email" });
      await expect(email).toBeVisible();
      await expect(email).toHaveAttribute("autocomplete", "email");

      const pageGeometry = await page.locator("html").evaluate((element) =>
        element.scrollWidth - element.clientWidth,
      );
      expect(pageGeometry).toBeLessThanOrEqual(1);
    });
  }

  test("login password field remains password-manager friendly", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const password = page.getByLabel("Mật khẩu", { exact: true });
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute("autocomplete", "current-password");

    await password.fill("phase9-password-manager-check");
    await expect(password).toHaveValue("phase9-password-manager-check");
  });
});
