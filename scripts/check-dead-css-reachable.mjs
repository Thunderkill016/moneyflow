#!/usr/bin/env node
/**
 * Runs the legacy CSS selector scanner against only product source modules that
 * are reachable from a real Next.js/runtime entrypoint.
 *
 * The underlying scanner deliberately understands class-bearing expressions,
 * dynamic class families and CSS Module :global(...) selectors. This wrapper
 * adds the missing module-graph boundary so an orphaned component cannot keep
 * global CSS alive forever merely because both files still exist in `src/`.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const scanner = fileURLToPath(new URL("./check-dead-css.mjs", import.meta.url));
const SOURCE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".html"]);
const NEXT_ENTRY_BASENAMES = new Set([
  "page",
  "layout",
  "route",
  "loading",
  "error",
  "global-error",
  "not-found",
  "template",
  "default",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "sitemap",
  "robots",
  "manifest",
]);
const LEGACY_STYLESHEETS = [
  "src/app/globals.css",
  "src/app/ui-refresh.css",
  "src/app/benchmark-ux.css",
  "src/app/safe-to-spend-withdrawal.css",
  "src/app/cross-device-stabilization.css",
  "src/app/ai-uiux-refresh.css",
  "src/app/ai-uiux-guardrails.css",
];

function normalized(path) {
  return resolve(path).split(sep).join("/");
}

function relativePath(path) {
  return relative(root, path).split(sep).join("/");
}

function isTest(path) {
  const value = relativePath(path);
  return (
    /\.(?:test|spec)\.[jt]sx?$/.test(value) ||
    /(?:^|\/)(?:__tests__|e2e)(?:\/|$)/.test(value)
  );
}

function walk(dir, predicate) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path, predicate));
    else if (predicate(path)) files.push(path);
  }
  return files;
}

const productFiles = walk(join(root, "src"), (path) =>
  SOURCE_EXTENSIONS.has(extname(path)) && !isTest(path),
);
const productByNormalizedPath = new Map(productFiles.map((path) => [normalized(path), path]));

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
let compilerOptions = {
  allowJs: true,
  jsx: ts.JsxEmit.Preserve,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
};
let rootNames = productFiles;
if (configPath) {
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (!loaded.error) {
    const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
    compilerOptions = parsed.options;
    rootNames = parsed.fileNames;
  }
}
const program = ts.createProgram({ rootNames, options: compilerOptions });

function isRuntimeEntry(file) {
  const rel = relativePath(file);
  if (extname(file) === ".html") return true;
  if (rel.startsWith("src/pages/")) return true;
  if (/^src\/(?:middleware|proxy|instrumentation)\.[jt]sx?$/.test(rel)) return true;
  if (!rel.startsWith("src/app/")) return false;
  const name = basename(file).replace(/\.[^.]+$/, "");
  return NEXT_ENTRY_BASENAMES.has(name);
}

function moduleSpecifiers(sourceFile) {
  const specs = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specs.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specs.push(node.arguments[0].text);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specs.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specs;
}

function resolveProductImport(specifier, containingFile) {
  if (specifier.endsWith(".css")) return null;
  const resolvedModule = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  ).resolvedModule;
  if (!resolvedModule) return null;
  const resolvedPath = normalized(resolvedModule.resolvedFileName);
  return productByNormalizedPath.get(resolvedPath) ?? null;
}

function resolveCssModule(specifier, containingFile) {
  if (!specifier.endsWith(".module.css")) return null;
  if (specifier.startsWith("@/")) {
    const candidate = join(root, "src", specifier.slice(2));
    return existsSync(candidate) ? candidate : null;
  }
  if (specifier.startsWith(".")) {
    const candidate = resolve(dirname(containingFile), specifier);
    return existsSync(candidate) ? candidate : null;
  }
  return null;
}

const queue = productFiles.filter(isRuntimeEntry);
const reachable = new Set();
const reachableModules = new Set();

while (queue.length > 0) {
  const file = queue.shift();
  const key = normalized(file);
  if (reachable.has(key)) continue;
  reachable.add(key);

  if (extname(file) === ".html") continue;
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) continue;
  for (const specifier of moduleSpecifiers(sourceFile)) {
    const cssModule = resolveCssModule(specifier, file);
    if (cssModule) reachableModules.add(normalized(cssModule));
    const next = resolveProductImport(specifier, file);
    if (next && !reachable.has(normalized(next))) queue.push(next);
  }
}

function copyIntoFixture(source, fixtureRoot) {
  const rel = relativePath(source);
  const destination = join(fixtureRoot, rel);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

const fixtureRoot = mkdtempSync(join(tmpdir(), "moneyflow-dead-css-reachable-"));
try {
  if (configPath) copyFileSync(configPath, join(fixtureRoot, "tsconfig.json"));

  for (const key of reachable) {
    const source = productByNormalizedPath.get(key);
    if (source) copyIntoFixture(source, fixtureRoot);
  }
  for (const key of reachableModules) {
    if (existsSync(key)) copyIntoFixture(key, fixtureRoot);
  }
  for (const rel of LEGACY_STYLESHEETS) {
    const source = join(root, rel);
    if (existsSync(source)) copyIntoFixture(source, fixtureRoot);
  }

  console.log(
    `[check:dead-css:reachability] ${reachable.size}/${productFiles.length} product source files reachable from runtime entrypoints; ${reachableModules.size} CSS Module owner(s).`,
  );

  const result = spawnSync(process.execPath, [scanner], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
