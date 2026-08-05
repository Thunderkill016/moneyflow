import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const button = read("src/components/ui/button.tsx");
const textField = read("src/components/ui/text-field.tsx");
const selectField = read("src/components/ui/select-field.tsx");
const checkboxField = read("src/components/ui/checkbox-field.tsx");
const radioGroup = read("src/components/ui/radio-group.tsx");
const dialog = read("src/components/ui/dialog.tsx");
const sheet = read("src/components/ui/sheet.tsx");
const card = read("src/components/ui/card.tsx");
const badge = read("src/components/ui/badge.tsx");
const alert = read("src/components/ui/alert.tsx");
const toast = read("src/components/ui/toast.tsx");
const emptyState = read("src/components/ui/empty-state.tsx");
const moneyValue = read("src/components/ui/money-value.tsx");

test("action primitives preserve compatibility while owning semantic intent and targets", () => {
  assert.match(button, /type ButtonIntent = "primary" \| "secondary" \| "quiet" \| "destructive"/u);
  assert.match(button, /type ButtonTargetSize = "compat" \| "aa" \| "important"/u);
  assert.match(button, /important: "min-h-11 min-w-11"/u);
  assert.match(button, /pending\?: boolean/u);
  assert.match(button, /disabled=\{disabled \|\| pending\}/u);
  assert.match(button, /function LinkButton/u);
  assert.match(button, /function IconButton/u);
  assert.match(button, /"aria-label": string/u);
  assert.doesNotMatch(button, /aria-invalid:border-destructive/u);
});

test("form primitives own labels, descriptions, errors and native behavior", () => {
  assert.match(textField, /<label htmlFor=\{inputId\}/u);
  assert.match(textField, /correctionSuggestion/u);
  assert.match(textField, /aria-describedby=\{joinIds/u);
  assert.match(textField, /role="alert"/u);

  assert.match(selectField, /<select/u);
  assert.match(selectField, /<label htmlFor=\{selectId\}/u);
  assert.match(selectField, /targetSize === "important" \? "min-h-11" : "min-h-9"/u);

  assert.match(checkboxField, /inputRef\.current\.indeterminate = indeterminate/u);
  assert.match(checkboxField, /type="checkbox"/u);
  assert.match(checkboxField, /aria-invalid=\{error \? true : undefined\}/u);

  assert.match(radioGroup, /<fieldset/u);
  assert.match(radioGroup, /<legend/u);
  assert.match(radioGroup, /type="radio"/u);
  assert.match(radioGroup, /onValueChange\?\./u);
});

test("overlay primitives distinguish modal and non-modal behavior", () => {
  assert.match(dialog, /dialog\.showModal\(\)/u);
  assert.match(dialog, /onCancel=/u);
  assert.match(dialog, /restoreFocusRef/u);
  assert.match(dialog, /description\?: React\.ReactNode/u);
  assert.match(dialog, /aria-describedby=\{descriptionId\}/u);

  assert.match(sheet, /modal = true/u);
  assert.match(sheet, /if \(modal\)/u);
  assert.match(sheet, /<aside/u);
  assert.doesNotMatch(sheet, /aria-modal/u);
});

test("feedback primitives use semantic tones without making every message assertive", () => {
  for (const tone of ["info", "income", "warning", "expense", "transfer"]) {
    assert.match(badge, new RegExp(`${tone}:`, "u"));
  }
  assert.match(alert, /live === "assertive" \? "alert" : live === "polite" \? "status"/u);
  assert.match(toast, /aria-live="polite"/u);
  assert.match(toast, /role=\{urgent \? "alert" : undefined\}/u);
  assert.match(toast, /new Map\(messages\.map/u);
});

test("surface, empty and money primitives keep semantic ownership bounded", () => {
  assert.match(card, /data-slot="card"/u);
  assert.doesNotMatch(card, /onClick=/u);
  assert.match(emptyState, /primaryAction\?: React\.ReactNode/u);
  assert.match(emptyState, /secondaryAction\?: React\.ReactNode/u);

  assert.match(moneyValue, /formatMoneyWithKind/u);
  assert.match(moneyValue, /formatSignedMoney/u);
  assert.match(moneyValue, /tabular-nums/u);
  assert.match(moneyValue, /Number\.isFinite\(value\)/u);
  assert.match(moneyValue, /unavailableLabel = "Chưa có dữ liệu"/u);
});
