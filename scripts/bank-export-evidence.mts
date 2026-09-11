import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { buildPrivacySafeXlsxPilotEvidence } from "../src/lib/inbox/xlsx-pilot-evidence.ts";

const USAGE = `Usage: npm run evidence:bank-export -- <file-1.xls[x]> [file-2.xls[x]]

Reads one or two bank-export workbooks locally and prints a privacy-safe JSON report.
The report intentionally excludes real filenames/paths, raw rows, amounts, descriptions,
account identifiers and per-row fingerprints. With two files, overlap is heuristic only
and is meaningful only when both exports are known to represent the same account/context.`;

function fail(message: string): never {
  console.error(message);
  console.error(USAGE);
  process.exit(1);
}

function validExtension(path: string): boolean {
  const extension = extname(path).toLowerCase();
  return extension === ".xls" || extension === ".xlsx";
}

const paths = process.argv.slice(2);
if (paths.includes("--help") || paths.includes("-h")) {
  console.log(USAGE);
} else {
  if (paths.length < 1 || paths.length > 2) {
    fail("Provide exactly one or two local XLS/XLSX files.");
  }

  for (let index = 0; index < paths.length; index += 1) {
    if (!validExtension(paths[index]!)) {
      fail(`Input #${index + 1} must use .xls or .xlsx.`);
    }
  }

  const inputs = [];
  for (let index = 0; index < paths.length; index += 1) {
    try {
      const data = await readFile(paths[index]!);
      inputs.push({ data: new Uint8Array(data) });
    } catch {
      fail(`Could not read input #${index + 1}.`);
    }
  }

  const report =
    inputs.length === 1
      ? buildPrivacySafeXlsxPilotEvidence([inputs[0]!])
      : buildPrivacySafeXlsxPilotEvidence([inputs[0]!, inputs[1]!]);

  console.log(JSON.stringify(report, null, 2));
}
