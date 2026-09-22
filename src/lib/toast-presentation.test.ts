import assert from "node:assert/strict";
import test from "node:test";

import { resolveToastPresentation } from "./toast-presentation.ts";

test("an explicit tone wins over the keyword heuristic", () => {
  // "không thể" reads as an error to the heuristic; the declared tone wins.
  assert.deepEqual(
    resolveToastPresentation("Không thể lưu lúc này.", { tone: "success" }),
    { tone: "success", icon: "check" },
  );
  assert.equal(
    resolveToastPresentation("Đã lưu giao dịch.", { tone: "error" }).tone,
    "error",
  );
});

test("the keyword heuristic still applies when no tone is declared", () => {
  assert.equal(
    resolveToastPresentation("Không thể lưu giao dịch.").tone,
    "error",
  );
  assert.equal(
    resolveToastPresentation("Chưa chọn được tài khoản.").tone,
    "warning",
  );
  assert.equal(
    resolveToastPresentation("Đang đồng bộ dữ liệu.").tone,
    "info",
  );
  assert.equal(resolveToastPresentation("Đã lưu giao dịch.").tone, "success");
  assert.equal(resolveToastPresentation(undefined).tone, "success");
});

test("a neutral message containing 'chưa' keeps the declared success tone", () => {
  // Regression: "chưa" used to force warning even on a confirmation.
  assert.deepEqual(
    resolveToastPresentation(
      "Đã chọn 3 ứng viên Sẵn sàng. Chưa có giao dịch nào được ghi sổ.",
      { tone: "success" },
    ),
    { tone: "success", icon: "check" },
  );
});

test("an attached action pins the restore icon but still honors the declared tone", () => {
  // Undo offers default to info, and a declared tone (e.g. neutral) overrides.
  assert.deepEqual(resolveToastPresentation("Đã xóa giao dịch.", { hasAction: true }), {
    tone: "info",
    icon: "restore",
  });
  assert.deepEqual(
    resolveToastPresentation("Đã xóa giao dịch.", {
      hasAction: true,
      tone: "neutral",
    }),
    { tone: "neutral", icon: "restore" },
  );
});
