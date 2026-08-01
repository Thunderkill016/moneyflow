import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";

const CONTRACT_NAMES = new Set([
  "AccountOption",
  "CategoryOption",
  "CreateSplitExpenseInput",
  "CreateTransactionInput",
  "CreateTransferInput",
  "Transaction",
  "TransactionKind",
  "TransactionSplitLine",
  "UpdateMoneyTransactionInput",
  "UpdateTransferInput",
]);
const PRESENTATION_NAMES = new Set(["categories", "categoryMeta"]);
const FIXTURE_NAMES = new Set(["demoAccounts", "demoCategories", "sampleTransactions"]);

function listSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (/\.(ts|tsx)$/u.test(entry)) files.push(absolute);
  }
  return files;
}

function modulePath(file: string, target: string, libRoot: string): string {
  if (!file.startsWith(`${libRoot}${sep}`)) {
    if (target.endsWith("transactions/contracts.ts")) return "@/lib/transactions/contracts";
    if (target.endsWith("transactions/category-presentation.ts")) {
      return "@/lib/transactions/category-presentation";
    }
    return "@/lib/demo/transaction-fixtures";
  }

  let output = relative(dirname(file), target).split(sep).join("/");
  if (!output.startsWith(".")) output = `./${output}`;
  return output;
}

function normalizedSpecifier(specifier: string): { baseName: string; output: string } {
  const withoutType = specifier.trim().replace(/^type\s+/u, "");
  return {
    baseName: withoutType.split(/\s+as\s+/u)[0].trim(),
    output: withoutType,
  };
}

test("generate the sample-data import migration artifact", () => {
  const repositoryRoot = process.cwd();
  const temporaryRoot = mkdtempSync(join(tmpdir(), "moneyflow-import-codemod-"));
  const temporarySrc = join(temporaryRoot, "src");
  cpSync(join(repositoryRoot, "src"), temporarySrc, { recursive: true });

  const temporaryLib = join(temporarySrc, "lib");
  const contractTarget = join(temporaryLib, "transactions", "contracts.ts");
  const presentationTarget = join(temporaryLib, "transactions", "category-presentation.ts");
  const fixtureTarget = join(temporaryLib, "demo", "transaction-fixtures.ts");
  const importPattern = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["'](?:@\/lib\/sample-data|(?:\.\.\/|\.\/)+sample-data(?:\.ts)?)["'];?/gu;
  const changed: string[] = [];

  for (const file of listSourceFiles(temporarySrc)) {
    if (
      file.endsWith("sample-data.ts") ||
      file.endsWith("zz-sample-data-import-codemod.test.ts")
    ) {
      continue;
    }

    const before = readFileSync(file, "utf8");
    const after = before.replace(importPattern, (_statement, body: string) => {
      const groups = {
        contracts: [] as string[],
        presentation: [] as string[],
        fixtures: [] as string[],
      };

      for (const raw of body.split(",")) {
        if (!raw.trim()) continue;
        const specifier = normalizedSpecifier(raw);
        if (CONTRACT_NAMES.has(specifier.baseName)) groups.contracts.push(specifier.output);
        else if (PRESENTATION_NAMES.has(specifier.baseName)) groups.presentation.push(specifier.output);
        else if (FIXTURE_NAMES.has(specifier.baseName)) groups.fixtures.push(specifier.output);
        else throw new Error(`Unknown sample-data import ${specifier.baseName} in ${file}`);
      }

      const imports: string[] = [];
      if (groups.contracts.length > 0) {
        imports.push(
          `import type { ${groups.contracts.join(", ")} } from "${modulePath(file, contractTarget, temporaryLib)}";`,
        );
      }
      if (groups.presentation.length > 0) {
        imports.push(
          `import { ${groups.presentation.join(", ")} } from "${modulePath(file, presentationTarget, temporaryLib)}";`,
        );
      }
      if (groups.fixtures.length > 0) {
        imports.push(
          `import { ${groups.fixtures.join(", ")} } from "${modulePath(file, fixtureTarget, temporaryLib)}";`,
        );
      }
      return imports.join("\n");
    });

    if (after !== before) {
      writeFileSync(file, after);
      changed.push(relative(temporaryRoot, file).split(sep).join("/"));
    }
  }

  assert.ok(changed.length > 0, "expected stale sample-data importers");
  const archive = join(temporaryRoot, "sample-data-import-migration.tar.gz");
  execFileSync("tar", ["-czf", archive, ...changed], { cwd: temporaryRoot });
  const base64 = readFileSync(archive).toString("base64");

  console.log("MONEYFLOW_CODEMOD_CHANGED_FILES=" + JSON.stringify(changed));
  console.log("MONEYFLOW_CODEMOD_ARCHIVE_BEGIN");
  console.log(base64);
  console.log("MONEYFLOW_CODEMOD_ARCHIVE_END");
  assert.fail(`codemod artifact generated for ${changed.length} files`);
});
