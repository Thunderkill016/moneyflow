import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const RUNTIME_TOKEN_PREFIXES = ["--base-ui-", "--next-", "--radix-", "--tw-"];
const LEGACY_CLASS_TOKENS = new Set([
  "accounts-workspace",
  "dashboard",
  "demo-mode-banner",
  "insights-dashboard",
  "manager-row",
  "mobile-account-button",
  "mobile-fab",
  "mobile-nav",
  "panel",
  "safe-card",
  "safe-card-hero",
  "transaction-manager",
]);

const normalizePath = (value) => value.replaceAll("\\", "/").replace(/^\.\//, "");
const isProductCss = (file) => /^src\/.*\.css$/.test(file);
const isProductCode = (file) => /^src\/.*\.(?:[cm]?[jt]sx?)$/.test(file);
const isRouteOrComponentCode = (file) => /^src\/(?:app|components)\/.*\.(?:[cm]?[jt]sx?)$/.test(file);
const isRouteReferenceScope = (file) => /^(?:src|e2e|tests)\//.test(file);
const isCssModule = (file) => file.endsWith(".module.css");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasReason = (line, marker) =>
  new RegExp(`${escapeRegExp(marker)}\\s*--\\s*\\S`, "i").test(line);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "output", "coverage", "playwright-report", "test-results"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

export function parseUnifiedDiff(patch) {
  const additions = [];
  let file = null;
  let isNewFile = false;
  let newLine = null;

  for (const rawLine of patch.split(/\r?\n/)) {
    const diffHeader = rawLine.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffHeader) {
      file = normalizePath(diffHeader[2]);
      isNewFile = false;
      newLine = null;
      continue;
    }
    if (rawLine.startsWith("new file mode ")) {
      isNewFile = true;
      continue;
    }
    const targetHeader = rawLine.match(/^\+\+\+ b\/(.+)$/);
    if (targetHeader) {
      file = normalizePath(targetHeader[1]);
      continue;
    }
    const hunkHeader = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkHeader) {
      newLine = Number(hunkHeader[1]);
      continue;
    }
    if (!file || newLine === null) continue;
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      additions.push({ file, line: newLine, content: rawLine.slice(1), isNewFile });
      newLine += 1;
    } else if (rawLine.startsWith(" ")) {
      newLine += 1;
    }
  }
  return additions;
}

export function collectDefinedTokens(root = process.cwd()) {
  const tokens = new Set();
  const patterns = [
    /(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/gm,
    /@property\s+(--[A-Za-z0-9_-]+)/g,
    /["'](--[A-Za-z0-9_-]+)["']\s*:/g,
    /\.setProperty\(\s*["'](--[A-Za-z0-9_-]+)["']/g,
    /\bvariable\s*:\s*["'](--[A-Za-z0-9_-]+)["']/g,
  ];
  for (const file of walk(path.join(root, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) tokens.add(match[1]);
    }
  }
  return tokens;
}

const cssImportPath = (line) =>
  line.match(/^\s*import\s+(?:[^"']+?\s+from\s+)?["']([^"']+\.css)["']\s*;?/)?.[1] ?? null;
const localCssAtImport = (line) =>
  line.match(/^\s*@import\s+["']([^"']+\.css)["']/)?.[1] ?? null;
const referencedTokens = (line) =>
  [...line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((match) => match[1]);

function quotedLegacyTokens(line) {
  const found = [];
  for (const token of LEGACY_CLASS_TOKENS) {
    const pattern = new RegExp(`["'\\x60][^"'\\x60]*?(?:^|\\s)${escapeRegExp(token)}(?=\\s|["'\\x60])`);
    if (pattern.test(line)) found.push(token);
  }
  return found;
}

export function evaluateUiMigrationDiff({ patch, definedTokens = new Set() }) {
  const additions = parseUnifiedDiff(patch);
  const violations = [];
  const reportedNewGlobalFiles = new Set();

  for (const { file, line, content, isNewFile } of additions) {
    const location = `${file}:${line}`;

    if (isNewFile && /^src\/app\/.*\.css$/.test(file) && !isCssModule(file) && !reportedNewGlobalFiles.has(file)) {
      reportedNewGlobalFiles.add(file);
      violations.push({
        rule: "no-new-route-global-css",
        location,
        message: `new App Router stylesheet ${file} must be a CSS Module; do not add another global/override layer`,
      });
    }

    if (isProductCode(file)) {
      const importedCss = cssImportPath(content);
      if (importedCss && !importedCss.endsWith(".module.css")) {
        const allowedRootImport = file === "src/app/layout.tsx" && new Set(["./legacy.css", "./document-theme.css"]).has(importedCss);
        if (!allowedRootImport) {
          violations.push({
            rule: "no-new-global-css-import",
            location,
            message: `global CSS import ${JSON.stringify(importedCss)} is not allowed outside the frozen root owners`,
          });
        }
      }
    }

    if (isProductCss(file)) {
      const importedCss = localCssAtImport(content);
      if (importedCss) {
        violations.push({
          rule: "no-new-css-import-chain",
          location,
          message: `new CSS @import ${JSON.stringify(importedCss)} would extend the presentation cascade`,
        });
      }
      if (content.includes("!important") && !hasReason(content, "ui-migration: allow-important")) {
        violations.push({
          rule: "no-new-important",
          location,
          message: "new !important requires an inline `ui-migration: allow-important -- <reason>` exception",
        });
      }
      if (!/^\s*(?:\/\*|\*|\/\/)/.test(content)) {
        for (const token of referencedTokens(content)) {
          const runtimeToken = RUNTIME_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));
          const exception = hasReason(content, "ui-migration: allow-runtime-token");
          if (!definedTokens.has(token) && !runtimeToken && !exception) {
            violations.push({
              rule: "known-token-reference",
              location,
              message: `CSS variable ${token} is not defined in the current source tree; define it or document the runtime source inline`,
            });
          }
        }
      }
    }

    if (isRouteReferenceScope(file) && file !== "src/app/insights/page.tsx" && content.includes("/insights")) {
      violations.push({
        rule: "canonical-dashboard-route",
        location,
        message: "new /insights references are forbidden; current UI and tests must use /dashboard",
      });
    }

    if (isRouteOrComponentCode(file) && !hasReason(content, "ui-migration: allow-legacy-class")) {
      for (const token of quotedLegacyTokens(content)) {
        violations.push({
          rule: "no-new-legacy-class-registration",
          location,
          message: `legacy global class ${JSON.stringify(token)} must not be registered by new route/component code`,
        });
      }
    }
  }

  return { additions, violations };
}

export function resolveDiffRange({ eventPath = process.env.GITHUB_EVENT_PATH, env = process.env } = {}) {
  let payload = null;
  if (eventPath && fs.existsSync(eventPath)) payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  return {
    base: env.BASE_SHA || payload?.pull_request?.base?.sha || payload?.before || null,
    head: env.HEAD_SHA || payload?.pull_request?.head?.sha || payload?.after || env.GITHUB_SHA || "HEAD",
  };
}

export function readGitPatch({ base, head, root = process.cwd() }) {
  const args = base && !/^0+$/.test(base)
    ? ["diff", "--find-renames", "--unified=0", "--no-ext-diff", "--no-color", `${base}...${head}`]
    : ["show", "--format=", "--find-renames", "--unified=0", "--no-ext-diff", "--no-color", head];
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

export function runUiMigrationDiffCheck({ root = process.cwd(), base, head } = {}) {
  const range = base || head ? { base: base ?? null, head: head ?? "HEAD" } : resolveDiffRange();
  const patch = readGitPatch({ ...range, root });
  const definedTokens = collectDefinedTokens(root);
  const result = evaluateUiMigrationDiff({ patch, definedTokens });
  if (result.violations.length > 0) {
    const details = result.violations.map((item) => `- [${item.rule}] ${item.location}: ${item.message}`).join("\n");
    throw new Error(`UI migration no-new-debt contract failed:\n${details}`);
  }
  process.stdout.write(`${JSON.stringify({ base: range.base, head: range.head, addedLinesChecked: result.additions.length, definedTokens: definedTokens.size, violations: 0 }, null, 2)}\n`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    runUiMigrationDiffCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
