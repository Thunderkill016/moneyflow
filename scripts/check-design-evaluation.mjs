import { readFile } from "node:fs/promises";
import process from "node:process";
import { validateDesignEvaluation } from "./design-evaluation.mjs";

const filePath = process.argv[2] || process.env.DESIGN_EVALUATION_FILE;

if (!filePath) {
  console.error("Usage: node scripts/check-design-evaluation.mjs <evaluation.json>");
  process.exit(2);
}

let evaluation;
try {
  evaluation = JSON.parse(await readFile(filePath, "utf8"));
} catch (error) {
  console.error(`Unable to read design evaluation: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

const errors = validateDesignEvaluation(evaluation);
if (errors.length > 0) {
  console.error("Design evaluation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Design evaluation passed.");
