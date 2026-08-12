import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  balanceAfterTransactions,
  calculateDashboardSummary,
  reconcileBalanceSnapshot,
} from "./finance.ts";
import {
  formatMoneyInput,
  isFractionAttempt,
  MONEY_FRACTION_ENTRY_MESSAGE,
  parseMoneyInput,
  parseMoneyInputToMinor,
} from "./money.ts";
import {
  buildOptimisticTransaction,
  OPTIMISTIC_TRANSACTION_ID_PREFIX,
  reduceOptimisticTransactions,
} from "./optimistic-transactions.ts";
import type { AccountOption, CategoryOption, Transaction } from "./transactions/contracts.ts";

/**
 * Regressions for the defects the owner's physical-phone P3 run found.
 *
 * Each test names the observed symptom, because the symptom is what a future
 * reader needs in order to recognise the same bug coming back in another form.
 */

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

/** Every component that reads or formats a typed money amount. */
const MONEY_ENTRY_CONSUMERS = [
  "src/components/add-transaction-dialog.tsx",
  "src/components/edit-transaction-dialog.tsx",
  "src/components/transfer-dialog.tsx",
  "src/components/account-dialog.tsx",
  "src/components/account-reconciliation-page.tsx",
  "src/components/split-expense-dialog.tsx",
  "src/components/planning/budget-dialog.tsx",
  "src/components/planning/commitment-dialog.tsx",
  "src/components/planning/goal-dialogs.tsx",
  "src/components/planning/income-template-dialog.tsx",
  "src/components/inbox/inbox-review-panel.tsx",
  "src/components/onboarding-flow.tsx",
];

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

// --- PP-03: a financial figure must never flash a wrong intermediate value ----

const accounts: AccountOption[] = [
  { id: "acc-1", name: "Ví", currencyCode: "VND" },
  { id: "acc-2", name: "Thẻ", currencyCode: "VND" },
];
const categories: CategoryOption[] = [
  { id: "cat-1", name: "Ăn uống", kind: "expense", icon: null, color: null },
  { id: "cat-2", name: "Lương", kind: "income", icon: null, color: null },
];

function confirmedRow(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "server-uuid-1",
    kind: "expense",
    categoryId: "cat-1",
    category: "Ăn uống",
    note: "trưa",
    accountId: "acc-1",
    account: "Ví",
    amount: 50_000,
    occurredOn: "2026-08-12",
    occurredAt: "2026-08-12T04:00:00.000Z",
    relativeDate: "Vừa xong",
    ...overrides,
  };
}

test("PP-03: the optimistic row carries the idempotency key that identifies its confirmation", () => {
  const built = buildOptimisticTransaction(
    {
      kind: "expense",
      accountId: "acc-1",
      categoryId: "cat-1",
      amount: 50_000,
      occurredOn: "2026-08-12",
      note: "trưa",
      idempotencyKey: "key-1",
    },
    accounts,
    categories,
  );
  assert.ok(built.ok);
  assert.equal(built.transaction.id, `${OPTIMISTIC_TRANSACTION_ID_PREFIX}key-1`);
  assert.equal(built.transaction.pendingKey, "key-1");
});

test("PP-03: a confirmed row retires its pending row instead of stacking on it", () => {
  /**
   * The observed defect: after saving an expense the balance briefly showed a
   * wrong number, then corrected itself. The server assigns a fresh id, so
   * filtering by the pending id never removed the pending row — both rows existed
   * inside the transition and every aggregate counted the amount twice.
   */
  const pending = { ...confirmedRow({ id: "pending:key-1" }), pendingKey: "key-1" };
  const confirmed = { ...confirmedRow(), pendingKey: "key-1" };

  const both = reduceOptimisticTransactions([confirmed], pending);
  assert.equal(both.length, 1, "the pending row must be dropped once confirmed");
  assert.equal(both[0].id, "server-uuid-1");
});

test("PP-03: no aggregate double-counts during the confirmation window", () => {
  const opening = 1_000_000;
  const pending = { ...confirmedRow({ id: "pending:key-1" }), pendingKey: "key-1" };
  const confirmed = { ...confirmedRow(), pendingKey: "key-1" };

  // 1. optimistic only — the user should see the new value immediately.
  const optimisticOnly = reduceOptimisticTransactions([], pending);
  const optimisticBalance = balanceAfterTransactions(opening, optimisticOnly);
  assert.equal(optimisticBalance, opening - 50_000);

  // 2. the confirmation lands while the transition is still open.
  const duringConfirmation = reduceOptimisticTransactions([confirmed], pending);
  assert.equal(
    balanceAfterTransactions(opening, duringConfirmation),
    opening - 50_000,
    "the balance must not move again when the confirmation arrives",
  );

  // 3. and the dashboard's own summary agrees at every step.
  const summaryDuring = calculateDashboardSummary(duringConfirmation, {
    isDemo: false,
    totalBalance: balanceAfterTransactions(opening, duringConfirmation),
    today: "2026-08-12",
  });
  assert.equal(summaryDuring.expense, 50_000, "expense must be counted exactly once");
  assert.equal(summaryDuring.balance, opening - 50_000);
});

test("PP-03: a genuinely different pending row is still shown", () => {
  // Supersession must key on the idempotency key, not merely on "something
  // confirmed arrived" — two distinct saves must both appear.
  const confirmed = { ...confirmedRow(), pendingKey: "key-1" };
  const otherPending = {
    ...confirmedRow({ id: "pending:key-2", amount: 20_000 }),
    pendingKey: "key-2",
  };
  const next = reduceOptimisticTransactions([confirmed], otherPending);
  assert.equal(next.length, 2);
});

test("PP-03: a pending row with no key keeps the previous id-based behaviour", () => {
  const legacy = confirmedRow({ id: "pending:legacy" });
  const next = reduceOptimisticTransactions([confirmedRow()], legacy);
  assert.equal(next.length, 2);
});

test("PP-03: the reconciled snapshot stays correct when snapshot and live agree", () => {
  // The other half of the same screen: once revalidation lands, the snapshot
  // already contains the row, so the delta must be zero rather than double.
  const confirmed = { ...confirmedRow(), pendingKey: "key-1" };
  const reconciled = reconcileBalanceSnapshot(950_000, [confirmed], [confirmed]);
  assert.equal(reconciled, 950_000);
});

test("PP-03: the hook tags its confirmation with the same key", () => {
  const hook = stripComments(read("src/hooks/use-transactions.ts"));
  assert.match(
    hook,
    /pendingKey:\s*input\.idempotencyKey/u,
    "the confirmed row must carry the key so the pending row can be retired",
  );
});

// --- PP-16: a separator must never silently change the magnitude --------------

test("PP-16: a fraction tail is rejected rather than reinterpreted", () => {
  // The observed defect: typing `12,5` produced 125 đồng — ten times the amount —
  // with no visible sign that anything had been changed.
  for (const typed of ["12,5", "12.5", "12,50", "12.50", "1.234,5"]) {
    assert.ok(isFractionAttempt(typed), `${typed} is a fraction attempt`);
    assert.ok(Number.isNaN(parseMoneyInput(typed)), `${typed} must not parse to a number`);
    assert.ok(Number.isNaN(parseMoneyInputToMinor(typed, "VND")));
  }
});

test("PP-16: grouping separators still work, because that is how đồng is written", () => {
  assert.equal(parseMoneyInput("12.500"), 12_500);
  assert.equal(parseMoneyInput("1.250.000"), 1_250_000);
  assert.equal(parseMoneyInput("1,250,000"), 1_250_000);
  assert.equal(parseMoneyInput("250000"), 250_000);
  assert.equal(parseMoneyInput("0"), 0);
  assert.equal(parseMoneyInput(""), 0);
  for (const grouped of ["12.500", "1.250.000", "250000"]) {
    assert.equal(isFractionAttempt(grouped), false, `${grouped} is grouping`);
  }
});

test("PP-16: the field shows what was typed instead of a different number", () => {
  // Never a silent rewrite: the separator stays on screen so the mismatch is
  // visible, and the value is refused at submit.
  assert.equal(formatMoneyInput("12,5"), "12,5");
  assert.equal(formatMoneyInput("12.50"), "12.50");
  // Legitimate input is still grouped as you type.
  assert.equal(formatMoneyInput("250000"), "250.000");
  assert.equal(formatMoneyInput("1250000"), "1.250.000");
});

test("PP-16: rejection reaches the one field where zero is legitimate", () => {
  /**
   * An account's opening balance may legitimately be 0, so a zero sentinel would
   * have been silently accepted there. `NaN` fails every caller's
   * `Number.isSafeInteger` guard instead.
   */
  assert.equal(Number.isSafeInteger(parseMoneyInputToMinor("12,5", "VND")), false);
  assert.equal(parseMoneyInputToMinor("0", "VND"), 0);
  assert.equal(Number.isSafeInteger(parseMoneyInputToMinor("0", "VND")), true);
});

test("PP-16: non-VND minor-unit behaviour is unchanged for supported input", () => {
  // Entry has always been whole major units for every currency; that is preserved.
  assert.equal(parseMoneyInputToMinor("200", "USD"), 20_000);
  assert.equal(parseMoneyInputToMinor("1.500", "USD"), 150_000);
  assert.equal(parseMoneyInputToMinor("200", "VND"), 200);
  assert.equal(parseMoneyInputToMinor("200", "JPY"), 200);
  // And a fraction attempt is refused for those currencies too, rather than
  // silently meaning something else.
  assert.ok(Number.isNaN(parseMoneyInputToMinor("12,5", "USD")));
});

test("PP-16: every money field requests an integer keypad", () => {
  /**
   * `inputMode="decimal"` advertised a separator key that the entry contract
   * cannot honour. That mismatch is the defect's origin, so no money field may
   * ask for one.
   */
  for (const file of MONEY_ENTRY_CONSUMERS) {
    const source = stripComments(read(file));
    assert.ok(
      !source.includes('inputMode="decimal"'),
      `${file} must not request a decimal keypad for whole-đồng entry`,
    );
  }
});

test("PP-16: no money-entry consumer strips digits behind the contract's back", () => {
  /**
   * The first version of this test named three files and missed
   * `account-reconciliation-page.tsx`, which had its own `\D` strip feeding a
   * statement balance. Worse, once the shared formatter stopped rewriting the
   * field, that bypass became *invisible* rather than merely wrong. So the guard
   * now sweeps every component that touches money entry.
   */
  const offenders: string[] = [];
  for (const file of MONEY_ENTRY_CONSUMERS) {
    const source = stripComments(read(file));
    if (/replace\(\s*\/\[?\^?\\D/u.test(source)) offenders.push(file);
  }
  assert.deepEqual(
    offenders,
    [],
    "money.ts owns the entry contract; a local digit strip reintroduces the defect",
  );
});

test("PP-16: a rejected entry explains itself where the user is looking", () => {
  // The dialogs route an error beginning with "Nhập số tiền" to the amount field.
  assert.match(MONEY_FRACTION_ENTRY_MESSAGE, /^Nhập số tiền/u);
  for (const file of [
    "src/components/add-transaction-dialog.tsx",
    "src/components/edit-transaction-dialog.tsx",
    "src/components/transfer-dialog.tsx",
    "src/components/planning/budget-dialog.tsx",
    "src/components/planning/commitment-dialog.tsx",
    "src/components/planning/income-template-dialog.tsx",
  ]) {
    const source = stripComments(read(file));
    assert.ok(
      source.includes("MONEY_FRACTION_ENTRY_MESSAGE"),
      `${file} must name the rejection instead of showing a generic error`,
    );
  }
});

// --- PP-12: the shared mobile sheet ------------------------------------------

test("PP-12: sheets are sized in the stable viewport unit", () => {
  const sheet = stripComments(read("src/components/ui/sheet.tsx"));
  const dialog = stripComments(read("src/components/ui/dialog.tsx"));
  // `dvh` resizes with mobile browser chrome; `svh` is the smallest state and
  // therefore holds still while scrolling.
  assert.ok(!sheet.includes("dvh"), "the sheet must not size itself in dvh");
  assert.ok(!dialog.includes("dvh"), "the dialog must not size itself in dvh");
  assert.match(sheet, /max-h-\[85svh\]/u);
  assert.match(dialog, /max-h-\[calc\(100svh-2rem\)\]/u);
});

test("PP-12: the scroll box is constrained by its dialog, not by the viewport", () => {
  /**
   * The observed defect: content and footer positioned badly on a real phone.
   * The inner box carried its own `100dvh` max-height, so whenever a caller made
   * the dialog shorter — a bottom sheet, or a consumer module setting its own
   * max-height — the scroll box could be taller than the dialog containing it and
   * the footer left the visible area.
   */
  const css = read("src/components/ui/dialog.module.css");
  /**
   * The cap must stay *definite*. `max-height: 100%` alone resolved to `none`
   * against the auto-height `<dialog>`, so the section grew past its dialog and a
   * footer submit button became unclickable at every viewport — caught by the
   * browser suite, not by any source-string check.
   */
  assert.match(css, /\.content \{[\s\S]*?max-height: min\(100%, calc\(100svh - 2rem\)\)/u);
  assert.match(css, /\.content \{[\s\S]*?min-height: 0/u);
  assert.match(css, /\.body \{[\s\S]*?overflow-y: auto/u);
  const dialog = stripComments(read("src/components/ui/dialog.tsx"));
  assert.match(dialog, /styles\.content/u);
  assert.match(dialog, /styles\.body/u);
});

test("PP-12: safe-area padding sits on the edges that touch the device", () => {
  const css = read("src/components/ui/dialog.module.css");
  // The scroll body clears the home indicator, and hands that job to the footer
  // when one follows it.
  assert.match(css, /\.body \{[\s\S]*?env\(safe-area-inset-bottom/u);
  assert.match(css, /\.footer \{[\s\S]*?env\(safe-area-inset-bottom/u);
  assert.match(css, /\.body:has\(\+ \.footer\) \{[\s\S]*?padding-bottom: 1rem/u);
  // A scroll gesture must stay inside the sheet rather than chaining to the page.
  assert.match(css, /overscroll-behavior: contain/u);
  // Both primitives use the same owned rules rather than restating them.
  assert.match(stripComments(read("src/components/ui/sheet.tsx")), /styles\.body/u);
});

test("PP-12: no dialog surface is sized in the dynamic viewport unit", () => {
  /**
   * The primitive alone was not enough. Four consumer modules set their own
   * `max-height` with `.dialog.dialog` — specificity (0,2,0) against the
   * primitive's (0,1,0) — so add/edit transaction, transfer, account and the
   * planning dialogs stayed on `dvh` while the primitive looked fixed. The
   * surfaces the owner actually used were among them.
   */
  const surfaces = [
    "src/components/ui/dialog.module.css",
    "src/components/transactions/transaction-form.module.css",
    "src/components/transfers/transfer-dialog.module.css",
    "src/components/accounts/account-dialog.module.css",
    "src/components/planning/planning-dialog.module.css",
  ];
  for (const file of surfaces) {
    const css = read(file).replace(/\/\*[\s\S]*?\*\//gu, "");
    assert.ok(!/dvh/u.test(css), `${file} must not size a dialog in dvh`);
  }
});

test("PP-12: exactly one rule owns shell sheet height", () => {
  /**
   * A Tailwind `max-h-[88svh]` utility and the CSS module's own `max-height`
   * carried equal specificity, so stylesheet order decided which won. That reads
   * on a phone as the sheet sizing itself unpredictably.
   */
  const shell = stripComments(read("src/components/layout/app-shell.tsx"));
  const shellClass = /const APP_SHELL_SHEET_CLASS = \[([\s\S]*?)\]\.join/u.exec(shell)?.[1] ?? "";
  assert.ok(shellClass.length > 0, "the shell sheet class list must exist");
  assert.ok(
    !/(?:max-h-|\bh-)/u.test(shellClass),
    "height belongs to .shellSheet alone; no utility may compete with it",
  );
  const css = read("src/components/layout/app-shell.module.css");
  assert.match(css, /\.shellSheet \{[\s\S]*?height: min\(86svh, 760px\)/u);
  // And the outer box must not carry bottom padding that shrinks the content
  // area without protecting the footer.
  const mobileShellSheet = /\.shellSheet \{\s*height: min\(88svh, 760px\);([\s\S]*?)\}/u.exec(css)?.[1] ?? "";
  assert.ok(
    !mobileShellSheet.includes("padding-bottom"),
    "the primitive owns bottom safe-area padding",
  );
});

test("PP-12: the shared dialog grid gives the body its only flexible scroll row", () => {
  const css = read("src/components/ui/dialog.module.css");
  assert.match(
    css,
    /\.content \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto/u,
  );
});

test("PP-12: the virtual keyboard resizes the layout so footers stay reachable", () => {
  const layout = stripComments(read("src/app/layout.tsx"));
  assert.match(layout, /interactiveWidget: "resizes-content"/u);
  assert.match(layout, /viewportFit: "cover"/u);
});

// --- PP-07: the undo toast ----------------------------------------------------

test("PP-07: a long note wraps instead of overflowing the toast", () => {
  /**
   * The delete notice embeds the transaction note, so this text can be long. An
   * `inline-flex` without `min-width: 0` refuses to shrink below its content, so
   * the toast overflowed on a phone — and the `Hoàn tác` button beneath it is the
   * recovery for a delete, on an eight-second timer.
   */
  const css = read("src/components/layout/app-shell.module.css");
  const rule = /\.toastTitle \{([\s\S]*?)\}/u.exec(css)?.[1] ?? "";
  assert.match(rule, /min-width: 0/u);
  assert.ok(!/inline-flex/u.test(rule), "inline-flex cannot shrink below its content");

  /**
   * `break-word`, never `anywhere`. The same notice can carry a formatted money
   * value, and `anywhere` permits a break inside the digits — which the
   * `financial-value-wrapped` audit rule would not catch here, because the toast
   * title is neither `.font-mono` nor `[data-money]`.
   */
  assert.match(css, /\.toastTitle > span \{[\s\S]*?overflow-wrap: break-word/u);
  assert.ok(
    !/overflow-wrap: anywhere/u.test(css),
    "a money value must not be breakable mid-digits",
  );
  const toast = stripComments(read("src/components/ui/toast.tsx"));
  assert.match(toast, /min-w-0 font-semibold/u);
  assert.ok(!/anywhere/u.test(toast));
});

test("PP-07: the toast keeps the position the shell already owns", () => {
  // The shell positions the region with --mf-shell-feedback-bottom, which already
  // clears the mobile nav and the safe area. The primitive must not invent a
  // second mechanism for the same fact.
  const shell = stripComments(read("src/components/layout/app-shell.tsx"));
  assert.match(shell, /bottom: "var\(--mf-shell-feedback-bottom\)"/u);
  const css = read("src/components/layout/app-shell.module.css");
  assert.match(css, /--mf-shell-feedback-bottom: calc\(\s*var\(--mf-shell-mobile-nav-reserve\) \+ 12px\s*\)/u);
  const toast = stripComments(read("src/components/ui/toast.tsx"));
  assert.ok(
    !toast.includes("--mf-toast-bottom-offset"),
    "one owner for toast placement",
  );
});

// --- PP-05 and PP-15 must stay as the owner found them -----------------------

test("PP-05: a transfer still requires two accounts, which is correct behaviour", () => {
  /**
   * The owner saw the transfer action disabled with one account and enabled after
   * creating a second. That is the precondition working, not a defect, and it must
   * not be "fixed" into allowing a transfer with nowhere to send money.
   */
  const workspace = stripComments(read("src/components/transactions/transactions-workspace.tsx"));
  assert.match(workspace, /accounts\.length < 2/u);
});

test("PP-15: a retried save still cannot create a second row", () => {
  // The idempotency key survives the PP-03 fix: the same key must resolve to one
  // row, whether the first attempt failed or merely appeared to.
  const pending = { ...confirmedRow({ id: "pending:key-1" }), pendingKey: "key-1" };
  const confirmed = { ...confirmedRow(), pendingKey: "key-1" };
  const afterRetry = reduceOptimisticTransactions([confirmed], pending);
  assert.equal(afterRetry.length, 1);
  assert.equal(balanceAfterTransactions(0, afterRetry), -50_000);

  const dialog = stripComments(read("src/components/add-transaction-dialog.tsx"));
  assert.match(dialog, /idempotencyKeyRef/u, "the key must survive a failed attempt");
});

test("PP-16: a trailing currency mark or unit cannot smuggle a fraction through", () => {
  /**
   * `FRACTION_TAIL` was anchored on `$`, so any trailing non-digit defeated the
   * whole fix — and this repository already treats `"45.000 ₫"` as realistic pasted
   * input.
   */
  for (const pasted of ["12,5₫", "12.5 VND", "1.234,56 ₫", "12,5 dong", "１２，５"]) {
    assert.ok(isFractionAttempt(pasted), `${pasted} must be seen as a fraction`);
    assert.ok(Number.isNaN(parseMoneyInput(pasted)), `${pasted} must be rejected`);
  }
  // Fullwidth digits must not be stripped into an empty amount either.
  assert.ok(Number.isNaN(parseMoneyInput("１２，５")));
  assert.equal(parseMoneyInput("１２３"), 123);
});

test("PP-16: a mid-typing trailing separator is not treated as a fraction", () => {
  // `12.` is on its way to `12.500`; rejecting it would fight the user's typing.
  assert.equal(isFractionAttempt("12."), false);
  assert.equal(parseMoneyInput("12."), 12);
  assert.equal(isFractionAttempt("12"), false);
});

test("PP-16: the reconciliation statement balance goes through the shared contract", () => {
  /**
   * This field kept its own `\D` strip, so `12,5` still read as 125 there. Once the
   * shared formatter stopped rewriting the input, that made the mismatch invisible
   * rather than merely wrong — in a field that drives a reconciliation difference.
   */
  const page = stripComments(read("src/components/account-reconciliation-page.tsx"));
  assert.match(page, /parseMoneyInput\(/u);
  assert.ok(
    !/replace\(\s*\/\[?\^?\\D/u.test(page),
    "the page must not strip digits behind the contract's back",
  );
});

test("PP-16: filter inputs are formatted by the filter module that parses them", () => {
  // The register's amount filters have their own digits-only parser, so formatting
  // them with the money-entry formatter made the shown value and the applied
  // filter disagree.
  const workspace = stripComments(read("src/components/transactions/transactions-workspace.tsx"));
  assert.match(workspace, /normalizeTransactionAmountInput\(event\.target\.value\)/u);
  assert.ok(
    !/setM(?:in|ax)AmountInput\(formatMoneyInput/u.test(workspace),
    "one owner formats and parses the filter text",
  );
});

test("PP-16: the rejection message does not name a currency it may not be", () => {
  // The same dialogs handle non-VND accounts, so the message cannot say "đồng".
  assert.ok(!/đồng/u.test(MONEY_FRACTION_ENTRY_MESSAGE));
});

test("the withdrawn seven-day gate is retired in the document that outranks the packet", () => {
  /**
   * `docs/product/PRINCIPLES.md` sits above a work packet in the repository's own
   * source precedence, so a packet cannot withdraw a condition stated there. Left
   * alone, the requirement would have survived as the authoritative one.
   */
  const principles = read("docs/product/PRINCIPLES.md");
  assert.ok(
    !/- the product is used for seven consecutive days/u.test(principles),
    "the live seven-consecutive-days condition must be retired",
  );
  assert.match(principles, /Withdrawn 2026-08-12/u);
  assert.match(principles, /nothing replaces it/iu);

  // Active packets cannot require it; the accepted P3 packet retains its withdrawn
  // row as historical decision evidence after archival.
  for (const file of [
    "docs/plans/active/public-beta-trust.md",
  ]) {
    const text = read(file);
    assert.ok(
      !/^- \[ \].*seven consecutive days/mu.test(text),
      `${file} must not carry an open seven-day criterion`,
    );
  }
});
