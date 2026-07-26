import { test } from "@playwright/test";
import { auditRoute, seedUiAuditState, type AuditRoute } from "./responsive-audit";

const TEXT_SCALE_ROUTES: AuditRoute[] = [
  { label: "quick-capture-text-200", path: "/capture/quick" },
  { label: "transactions-text-200", path: "/transactions" },
];

test.describe("200% enlarged text smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.dataset.uiAuditTextScale = "200";
        style.textContent = `
          html { font-size: 200% !important; }
          body { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        `;
        document.head.appendChild(style);
      });
    });
  });

  for (const route of TEXT_SCALE_ROUTES) {
    test(`${route.label} reflows without blocking defects`, async ({ page }, testInfo) => {
      await auditRoute(page, testInfo, route);
    });
  }
});
