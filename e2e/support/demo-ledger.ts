import { sampleTransactionsFor } from "../../src/lib/demo/transaction-fixtures.ts";
import { todayInVietnam } from "../../src/lib/vietnam-date.ts";

/*
 * Demo values read from the fixture rather than typed into a spec.
 *
 * Specs used to hard-code "Lương tháng 7" and "2026-07-14". Those matched a
 * fixture that stored its dates, and they went stale the moment the fixture
 * started deriving them — which is the defect the fixture change fixes. Reading
 * from the same source keeps a spec true on whatever day it runs, and makes a
 * frozen expectation impossible to reintroduce by hand.
 */

export function demoLedger() {
  return sampleTransactionsFor(todayInVietnam());
}

/** The demo salary row, whose note names the month it falls in. */
export function demoSalary() {
  const salary = demoLedger().find((row) => row.kind === "income");
  if (!salary) throw new Error("demo fixture must contain an income row");
  return salary;
}
