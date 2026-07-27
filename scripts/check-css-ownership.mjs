import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const layoutPath = path.join(appDir, "layout.tsx");
const documentOwner = "src/app/document-theme.css";
const legacyEntry = "src/app/legacy.css";

const expectedRootImports = ["./legacy.css", "./document-theme.css"];
const expectedLegacyImports = [
  "./globals.css",
  "./ui-refresh.css",
  "./benchmark-ux.css",
  "./safe-to-spend-withdrawal.css",
  "./cross-device-stabilization.css",
  "./ai-uiux-refresh.css",
  "./ai-uiux-guardrails.css",
];

// Existing document-selector debt is isolated here until each legacy route is
// migrated. Adding another file to this list requires a reviewed architecture
// change; normal feature work must not expand it.
const legacyDocumentAllowlist = new Set([
  "src/app/globals.css",
  "src/app/ui-refresh.css",
  "src/app/benchmark-ux.css",
  "src/app/safe-to-spend-withdrawal.css",
  "src/app/cross-device-stabilization.css",
  "src/app/ai-uiux-refresh.css",
  "src/app/ai-uiux-guardrails.css",
  "src/app/landing-refresh.css",
  "src/app/auth-refresh.css",
]);

const maxImportantDeclarations = 1200;
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "output",
  "coverage",
  "playwright-report",
  "test-results",
]);

function fail(message) {
  console.error(`CSS ownership violation: ${message}`);
  process.exitCode = 1;
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function equalArrays(actual, expected) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function cssImports(source) {
  return [...source.matchAll(/@import\s+["']([^"']+\.css)["']\s*;/g)].map(
    (match) => match[1],
  );
}

function rootCssImports(source) {
  return [...source.matchAll(/import\s+["'](\.\/[^"']+\.css)["']\s*;/g)].map(
    (match) => match[1],
  );
}

function selectors(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  for (const match of withoutComments.matchAll(/(?:^|})\s*([^@}{][^{]+)\{/gm)) {
    const block = match[1].trim();
    if (!block || /^(from|to|\d+%)$/.test(block)) continue;
    for (const raw of block.split(",")) {
      const selector = raw.replace(/\s+/g, " ").trim();
      if (selector) found.push(selector);
    }
  }
  return found;
}

function targetsDocument(selector) {
  return /(^|[\s>+~])(?:html|body)(?=$|[\s.#:[>+~])/.test(selector);
}

const layoutSource = read(layoutPath);
const actualRootImports = rootCssImports(layoutSource);
if (!equalArrays(actualRootImports, expectedRootImports)) {
  fail(
    `src/app/layout.tsx must import exactly ${JSON.stringify(expectedRootImports)} in order; received ${JSON.stringify(actualRootImports)}`,
  );
}

const legacyPath = path.join(root, legacyEntry);
const actualLegacyImports = cssImports(read(legacyPath));
if (!equalArrays(actualLegacyImports, expectedLegacyImports)) {
  fail(
    `${legacyEntry} is a frozen compatibility boundary. Expected ${JSON.stringify(expectedLegacyImports)}; received ${JSON.stringify(actualLegacyImports)}`,
  );
}

const ownerPath = path.join(root, documentOwner);
const ownerSource = read(ownerPath);
for (const required of [":root", "html[data-theme=\"dark\"]", "html,", "body {"]) {
  if (!ownerSource.includes(required)) {
    fail(`${documentOwner} is missing required ownership marker ${JSON.stringify(required)}`);
  }
}

const cssFiles = walk(path.join(root, "src")).filter((file) => file.endsWith(".css"));
let importantDeclarations = 0;
const unauthorizedDocumentSelectors = [];

for (const file of cssFiles) {
  const name = relative(file);
  const source = read(file);
  importantDeclarations += [...source.matchAll(/!important\b/g)].length;

  if (name === documentOwner || legacyDocumentAllowlist.has(name)) continue;
  for (const selector of selectors(source)) {
    if (targetsDocument(selector)) {
      unauthorizedDocumentSelectors.push(`${name}: ${selector}`);
    }
  }
}

if (unauthorizedDocumentSelectors.length > 0) {
  fail(
    `route/component CSS must not style html or body:\n${unauthorizedDocumentSelectors
      .map((item) => `  - ${item}`)
      .join("\n")}`,
  );
}

if (importantDeclarations > maxImportantDeclarations) {
  fail(
    `!important debt increased to ${importantDeclarations}; budget is ${maxImportantDeclarations}. Remove legacy declarations before adding new ones.`,
  );
}

const unexpectedRootGlobalFiles = actualRootImports.filter(
  (item) => !expectedRootImports.includes(item),
);
if (unexpectedRootGlobalFiles.length > 0) {
  fail(`unexpected root global CSS owner(s): ${unexpectedRootGlobalFiles.join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      rootGlobalOwners: actualRootImports.length,
      rootImports: actualRootImports,
      legacyImports: actualLegacyImports.length,
      documentOwner,
      legacyDocumentAllowlist: [...legacyDocumentAllowlist].sort(),
      importantDeclarations,
      importantBudget: maxImportantDeclarations,
      unauthorizedDocumentSelectors: unauthorizedDocumentSelectors.length,
    },
    null,
    2,
  ),
);

if (process.exitCode) process.exit(process.exitCode);
