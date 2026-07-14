import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_HOME_HREF,
  GHI_CHI_TIEU_HREF,
  GHI_CHI_TIEU_LABEL,
  isPlanningPath,
  isPrimaryNavHref,
  MORE_NAV_LINKS,
  MORE_OTHER_LINKS,
  PLANNING_LINKS,
  PLANNING_PATHS,
  PRIMARY_NAV,
  PRIMARY_NAV_HREFS,
} from "./nav-ia.ts";

test("global CTA Ghi chi tiêu targets quick add", () => {
  assert.equal(GHI_CHI_TIEU_LABEL, "Ghi chi tiêu");
  assert.equal(GHI_CHI_TIEU_HREF, "/capture/quick");
});

test("primary nav is thu chi: Tổng quan · Giao dịch · Capture · Tài khoản", () => {
  const labels = PRIMARY_NAV.map((item) => item.label);
  assert.deepEqual(labels, [
    "Tổng quan",
    "Giao dịch",
    "Capture",
    "Tài khoản",
  ]);

  assert.deepEqual(PRIMARY_NAV_HREFS, [
    "/insights",
    "/transactions",
    "/accounts",
  ]);
  assert.equal(PRIMARY_NAV_HREFS[0], "/insights");
  assert.equal(APP_HOME_HREF, "/insights");

  const capture = PRIMARY_NAV.find((item) => item.kind === "action");
  assert.ok(capture);
  assert.equal(capture.action, "capture");

  const mobileTabs = PRIMARY_NAV.filter(
    (item) => item.kind === "action" || item.mobileTab,
  );
  assert.equal(mobileTabs.length, 4);
});

test("primary nav never includes planning or demoted inbox tools", () => {
  for (const path of PLANNING_PATHS) {
    assert.equal(
      isPrimaryNavHref(path),
      false,
      `${path} must not be a primary nav href`,
    );
    assert.equal(
      PRIMARY_NAV_HREFS.includes(path as (typeof PRIMARY_NAV_HREFS)[number]),
      false,
    );
  }

  const demoted = ["/inbox", "/timeline", "/rules", "/imports", "/reports", "/settings"];
  for (const path of demoted) {
    assert.equal(
      isPrimaryNavHref(path),
      false,
      `${path} must stay out of primary hrefs`,
    );
  }
});

test("planning links cover budgets, commitments, goals", () => {
  const hrefs = PLANNING_LINKS.map((item) => item.href).sort();
  assert.deepEqual(hrefs, ["/budgets", "/commitments", "/goals"].sort());
  assert.ok(PLANNING_LINKS.every((item) => item.label && item.icon));
});

test("isPlanningPath matches planning routes only", () => {
  assert.equal(isPlanningPath("/budgets"), true);
  assert.equal(isPlanningPath("/commitments/foo"), true);
  assert.equal(isPlanningPath("/goals"), true);
  assert.equal(isPlanningPath("/inbox"), false);
  assert.equal(isPlanningPath("/insights"), false);
  assert.equal(isPlanningPath("/transactions"), false);
});

test("More nav hosts inbox + tools; not transactions (primary)", () => {
  const hrefs = MORE_NAV_LINKS.map((item) => item.href);
  assert.ok(hrefs.includes("/inbox"), "Inbox demoted to More");
  assert.ok(hrefs.includes("/timeline"));
  assert.ok(hrefs.includes("/rules"));
  assert.ok(hrefs.includes("/imports"));
  assert.ok(hrefs.includes("/reports"));
  assert.ok(hrefs.includes("/settings"));
  assert.equal(
    hrefs.includes("/transactions"),
    false,
    "Giao dịch is primary — do not duplicate in More",
  );
  assert.equal(hrefs.includes("/insights"), false);

  for (const path of PLANNING_PATHS) {
    assert.equal(hrefs.includes(path), false);
  }

  const otherHrefs = MORE_OTHER_LINKS.map((item) => item.href);
  assert.ok(otherHrefs.includes("/inbox"));
  assert.equal(otherHrefs.includes("/settings"), false);
});
