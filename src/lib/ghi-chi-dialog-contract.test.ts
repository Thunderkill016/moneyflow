/**
 * Ghi capture UX contracts: amount autofocus, deterministic learned defaults,
 * recent categories, save-and-add-another polish and immediate correction.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("R4: shared Dialog receives the amount focus target", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const dialog = read("src/components/ui/dialog.tsx");
  assert.match(src, /amountInputRef/);
  assert.match(src, /inputRef=\{amountInputRef\}/);
  assert.match(src, /focusAmount/);
  assert.match(src, /initialFocusRef=\{amountInputRef\}/);
  assert.match(src, /requestAnimationFrame\(\(\) => focusAmount/);
  assert.doesNotMatch(src, /<dialog\b|showModal\(\)/);
  assert.match(dialog, /initialFocusRef/);
  assert.match(dialog, /restoreFocusRef/);
  assert.match(dialog, /dialog\.showModal\(\)/);
  assert.match(dialog, /target\.focus\(\)/);
});

test("R4: quick capture learns coherent presets and keeps recent category ordering", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /orderCategoriesByRecent/);
  assert.match(src, /pushRecentCategoryId/);
  assert.match(src, /pushRecentPreset/);
  assert.match(src, /pickKnownCategoryForKind/);
  assert.match(src, /isRecentCategoryId/);
  assert.match(src, /data-slot="capture-fast-defaults"/);
  assert.match(src, /data-slot="capture-category-suggestions"/);
  assert.match(src, /\.slice\(0, 2\)/);
  assert.match(src, /data-recent/);
  assert.match(src, /Gần đây/);
  assert.match(src, /hay dùng trước/);
});

test("R5: Ghi prefers a stable ledger preset before the local fallback", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const defaults = read("src/lib/quick-add-defaults.ts");
  assert.match(src, /deriveStableLedgerPreset/);
  assert.match(src, /transactions\?: Transaction\[\]/);
  assert.match(src, /transactions = \[\]/);
  assert.match(src, /const ledgerPreset = deriveStableLedgerPreset/);
  assert.match(src, /if \(ledgerPreset\) \{/);
  assert.match(src, /const learnedPreset = validPresetForKind/);
  assert.ok(
    src.indexOf("if (ledgerPreset)") <
      src.indexOf("const learnedPreset = validPresetForKind"),
    "ledger evidence must be considered before the browser-local preset",
  );
  assert.match(defaults, /recent\.length < 3/);
  assert.match(defaults, /existing\.count >= 2/);
  assert.match(defaults, /transaction\.kind === kind/);
  assert.match(defaults, /transaction\.reviewStatus === "reviewed"/);
  assert.match(defaults, /!transaction\.splits\?\.length/);
  assert.match(defaults, /b\.occurredOn\.localeCompare\(a\.occurredOn\)/);
  assert.match(defaults, /b\.occurredAt\.localeCompare\(a\.occurredAt\)/);
});

test("R5: a typed payee offers a category suggestion but never applies it", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const defaults = read("src/lib/quick-add-defaults.ts");

  // The suggestion renders as a labelled chip inside the category row and is
  // applied exclusively through the same explicit tap as every other chip.
  assert.match(src, /derivePayeeCategorySuggestion/);
  assert.match(src, /data-payee-suggestion="true"/);
  assert.match(src, /Gợi ý/);
  assert.match(src, /chooseCategory\(payeeCategorySuggestion\.categoryId\)/);

  // Typing a payee only stores the payee — it must not touch the category.
  const payeeChange = src.match(
    /function applyPayeeChange\(value: string\) \{([\s\S]*?)\n  \}/,
  );
  assert.ok(payeeChange, "the payee change handler must exist");
  assert.doesNotMatch(payeeChange[1] ?? "", /setCategoryId|chooseCategory/);

  // Domain side: folded whole-name match over the reviewed ledger only.
  assert.match(defaults, /derivePayeeCategorySuggestion/);
  assert.match(defaults, /normalizeSearchText/);
  assert.match(defaults, /compareLedgerRecency/);
});

test("R4: save-and-add-another keeps a controlled dialog session alive", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /Lưu xong thêm tiếp/);
  assert.match(src, /Lưu & thêm tiếp/);
  assert.match(src, /keepOpen/);
  assert.match(src, /keepOpenSession/);
  assert.match(src, /effectiveOpen = open \|\| keepOpenSession/);
  assert.match(src, /data-capture-continue="true"/);
  assert.match(src, /const shouldKeepOpen = keepOpen \|\| submittedForNext/);
  assert.match(src, /if \(shouldKeepOpen\) setKeepOpenSession\(true\)/);
  assert.match(src, /if \(shouldKeepOpen\) \{/);
  assert.match(src, /open=\{effectiveOpen\}/);
  assert.match(src, /KEEP_OPEN_SUCCESS|Đã lưu · nhập khoản tiếp/);
  assert.match(src, /<Alert tone="success" live="polite"/);
  assert.match(src, /Giữ form mở/);
});

test("R5: primary Ghi hosts pass live ledger history into the shared dialog", () => {
  const dashboard = read("src/components/moneyflow-dashboard.tsx");
  const ledger = read("src/components/transactions/transactions-workspace.tsx");
  const quick = read("src/components/inbox/capture-quick-page.tsx");
  for (const src of [dashboard, ledger, quick]) {
    assert.match(src, /transactions=\{transactions\}/);
  }
});

test("R5: frequent patterns are an explicit quick-route-only experiment", () => {
  const dialog = read("src/components/add-transaction-dialog.tsx");
  const quick = read("src/components/inbox/capture-quick-page.tsx");
  const dashboard = read("src/components/moneyflow-dashboard.tsx");
  const ledger = read("src/components/transactions/transactions-workspace.tsx");
  const defaults = read("src/lib/quick-add-defaults.ts");

  assert.match(dialog, /showFrequentPatterns = false/);
  assert.match(dialog, /deriveFrequentLedgerPatterns/);
  assert.match(dialog, /data-slot="capture-frequent-patterns"/);
  assert.match(dialog, /Chỉ đổi loại, tài khoản và danh mục/);
  assert.match(quick, /showFrequentPatterns/);
  assert.match(quick, /quick_capture_save/);
  assert.match(quick, /quick_capture_correction_opened/);
  assert.match(quick, /onFrequentPatternSelectionChange/);
  assert.match(dialog, /onFrequentPatternSelectionChange\?\.\(null\)/);
  assert.doesNotMatch(dashboard, /showFrequentPatterns/);
  assert.doesNotMatch(ledger, /showFrequentPatterns/);
  assert.doesNotMatch(dashboard, /quick_capture_save/);
  assert.doesNotMatch(ledger, /quick_capture_save/);
  assert.match(defaults, /FREQUENT_PATTERN_WINDOW = 12/);
  assert.match(defaults, /FREQUENT_PATTERN_MINIMUM_SUPPORT = 2/);
  assert.match(defaults, /FREQUENT_PATTERN_LIMIT = 2/);
});

test("R5: a successful single save can open the existing edit mutation", () => {
  const dashboard = read("src/components/moneyflow-dashboard.tsx");
  const ledger = read("src/components/transactions/transactions-workspace.tsx");
  const quick = read("src/components/inbox/capture-quick-page.tsx");

  for (const src of [dashboard, ledger, quick]) {
    assert.match(src, /recentSaved/);
    assert.match(src, /label: "Sửa"/);
    assert.match(src, /EditTransactionDialog/);
    assert.match(src, /updateTransaction/);
  }

  assert.match(ledger, /pendingUndo[\s\S]*label: "Hoàn tác"[\s\S]*recentSaved/);
  assert.match(quick, /Đã lưu vào sổ/);
  assert.match(quick, /Ghi khoản khác/);
});

test("R4: default dialog copy resolves to concise thu chi titles", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  assert.match(src, /title = "Ghi chi tiêu"/);
  assert.match(src, /Ghi khoản chi/);
  assert.match(src, /Ghi khoản thu/);
  assert.doesNotMatch(src, /Chỉ nhập số tiền rồi lưu/);
  assert.doesNotMatch(src, /Không cần chọn lại nếu đúng/);
});

test("R4: local form owner supports compact corrections and secondary detail", () => {
  const src = read("src/components/add-transaction-dialog.tsx");
  const css = read("src/components/transactions/transaction-form.module.css");
  const fastCss = read("src/components/transactions/capture-fast-path.module.css");
  assert.match(src, /styles\.formStatus/);
  assert.match(src, /styles\.categoryRecent/);
  assert.match(src, /styles\.recentBadge/);
  assert.match(src, /styles\.keepOpenRow/);
  assert.match(src, />Khác</);
  assert.match(src, /\+ Ghi chú/);
  assert.match(css, /\.formStatus/);
  assert.match(css, /\.categoryRecent/);
  assert.match(css, /\.recentBadge/);
  assert.match(css, /\.keepOpenRow/);
  assert.match(fastCss, /\.categoryActions/);
  assert.match(fastCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(fastCss, /\.morePanel\s*\{[\s\S]*display: none/);
  assert.match(fastCss, /\.moreDisclosure\[open\] > \.morePanel\s*\{[\s\S]*display: grid/);
  assert.doesNotMatch(fastCss, /overflow-x:\s*auto/);
});

test("R4: constrained mobile capture compacts without removing secondary detail access", () => {
  const css = read("src/components/transactions/transaction-form.module.css");
  const fastCss = read("src/components/transactions/capture-fast-path.module.css");
  assert.match(
    css,
    /@media \(max-width: 620px\) and \(max-height: 640px\)/,
  );
  assert.match(
    fastCss,
    /@media \(max-width: 620px\) and \(max-height: 640px\)/,
  );
  assert.match(fastCss, /\.secondarySummary\.secondarySummary/);
  assert.doesNotMatch(
    fastCss,
    /\.secondaryDisclosure:not\(\[open\]\)[\s\S]*display:\s*none/,
  );
  assert.match(fastCss, /\.footerActions\.footerActions/);
  assert.doesNotMatch(fastCss, /!important/);
  assert.doesNotMatch(css, /dvh/);
});
