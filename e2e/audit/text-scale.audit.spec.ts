import { test } from "@playwright/test";
import {
  applyEnlargedText,
  auditRoute,
  seedUiAuditState,
  type AuditRoute,
} from "./responsive-audit";

const TEXT_SCALE_ROUTES: AuditRoute[] = [
  { label: "quick-capture-text-200", path: "/capture/quick" },
  { label: "transactions-text-200", path: "/transactions" },
];

test.describe("200% enlarged text smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const route of TEXT_SCALE_ROUTES) {
    test(`${route.label} reflows without blocking defects`, async ({ page }, testInfo) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await applyEnlargedText(page);
      await auditRoute(page, testInfo, route);
    });
  }
});
