import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as XLSX from "xlsx";

function workbookBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["SAO KÊ TÀI KHOẢN 0123456789"],
    ["Ngày giao dịch", "Số tham chiếu", "Thay đổi", "Số tiền", "Mô tả"],
    ["10/09/2026", "CLI-SECRET-REF", "-", 7654321, "CLI PRIVATE MERCHANT"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "PRIVATE SHEET 0123456789");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

test("local evidence CLI executes without echoing statement path or row values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "moneyflow-private-evidence-"));
  const privatePath = join(directory, "PRIVATE-ACCOUNT-0123456789.xlsx");

  try {
    await writeFile(privatePath, new Uint8Array(workbookBytes()));
    const run = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "scripts/bank-export-evidence.mts", privatePath],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(run.stdout) as {
      files?: Array<{ label?: string; parse?: { candidateCount?: number } }>;
    };
    assert.equal(report.files?.[0]?.label, "file-1");
    assert.equal(report.files?.[0]?.parse?.candidateCount, 1);

    const durableOutput = `${run.stdout}\n${run.stderr}`;
    assert.doesNotMatch(durableOutput, /PRIVATE-ACCOUNT/);
    assert.doesNotMatch(durableOutput, /0123456789/);
    assert.doesNotMatch(durableOutput, /CLI-SECRET-REF/);
    assert.doesNotMatch(durableOutput, /7654321/);
    assert.doesNotMatch(durableOutput, /CLI PRIVATE MERCHANT/);
    assert.doesNotMatch(durableOutput, /PRIVATE SHEET/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
