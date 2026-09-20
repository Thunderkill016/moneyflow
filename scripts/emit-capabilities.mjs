import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const outputPath = resolve("docs/agents/capabilities.json");

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}

const { describeCapabilityManifest } = await import(
  "../src/server/capabilities/manifest.ts"
);
const content = `${JSON.stringify(sortKeys(describeCapabilityManifest()), null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current;
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    console.error(`Missing generated capability manifest: ${outputPath}`);
    process.exitCode = 1;
  }
  if (current !== undefined && current !== content) {
    console.error(`Stale generated capability manifest: ${outputPath}`);
    const currentLines = current.split("\n");
    const generatedLines = content.split("\n");
    const changedLines = generatedLines.reduce(
      (count, line, index) => count + (line !== currentLines[index] ? 1 : 0),
      0,
    );
    console.error(
      `Manifest diff summary: ${changedLines} generated line(s) differ; ${currentLines.length - generatedLines.length} line(s) net length delta.`,
    );
    console.error("Run npm run capabilities:emit to refresh it.");
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) console.log("Capability manifest is up to date.");
} else {
  await writeFile(outputPath, content, "utf8");
  console.log(`Wrote ${outputPath}.`);
}
