import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

const normalize = (value) => value.trim().replaceAll("\\", "/").replace(/^\.\//, "");

const isDocumentationOnlyPath = (file) =>
  file.endsWith(".md") ||
  file.startsWith("docs/") ||
  file.startsWith(".github/ISSUE_TEMPLATE/") ||
  file.startsWith(".github/PULL_REQUEST_TEMPLATE/") ||
  file.startsWith(".github/DISCUSSION_TEMPLATE/") ||
  /^LICENSE(?:\.|$)/.test(file);

const isJavaScriptOrTypeScript = (file) => /\.(?:[cm]?[jt]sx?)$/.test(file);

const matchesAny = (file, matchers) => matchers.some((matcher) => matcher(file));
const startsWith = (prefix) => (file) => file.startsWith(prefix);
const equals = (expected) => (file) => file === expected;
const matches = (pattern) => (file) => pattern.test(file);

const workflowOrPolicyMatchers = [
  startsWith(".github/workflows/"),
  equals("scripts/classify-ci-changes.mjs"),
  equals("scripts/classify-ci-changes.test.mjs"),
];

const databaseMatchers = [
  startsWith("supabase/"),
  equals("scripts/check-rls-migrations.sh"),
  equals(".github/workflows/ci.yml"),
  equals("scripts/classify-ci-changes.mjs"),
  equals("scripts/classify-ci-changes.test.mjs"),
];

const pureDatabaseMatchers = [
  startsWith("supabase/migrations/"),
  startsWith("supabase/tests/"),
  equals("supabase/seed.sql"),
  equals("supabase/roles.sql"),
];

const browserSmokeMatchers = [
  startsWith("src/"),
  startsWith("e2e/"),
  startsWith("public/"),
  startsWith("tests/"),
  matches(/^playwright(?:\..+)?\.config\.[cm]?[jt]s$/),
  matches(/^next\.config\.[cm]?[jt]s$/),
  matches(/^(?:middleware|proxy)\.[cm]?[jt]s$/),
  equals("package.json"),
  equals("package-lock.json"),
  equals(".github/workflows/ci.yml"),
  equals("scripts/classify-ci-changes.mjs"),
  equals("scripts/classify-ci-changes.test.mjs"),
];

const uiAuditMatchers = [
  matches(/^src\/app\/.*\.(?:tsx|css)$/),
  matches(/^src\/components\/.*\.(?:tsx|css)$/),
  startsWith("public/"),
  startsWith("e2e/audit/"),
  matches(/^src\/.*\.css$/),
  equals("playwright.audit.config.ts"),
  equals(".github/workflows/ci.yml"),
  equals("scripts/classify-ci-changes.mjs"),
  equals("scripts/classify-ci-changes.test.mjs"),
];

const codeqlMatchers = [
  isJavaScriptOrTypeScript,
  equals("package.json"),
  equals("package-lock.json"),
  equals("eslint.config.mjs"),
  equals("tsconfig.json"),
  equals("next.config.ts"),
  equals(".github/workflows/codeql.yml"),
  equals(".github/workflows/ci.yml"),
];

export function classifyChanges(inputFiles, { forceFull = false } = {}) {
  const files = [...new Set(inputFiles.map(normalize).filter(Boolean))].sort();

  if (forceFull || files.length === 0) {
    return {
      files,
      docsOnly: false,
      fullVerify: true,
      database: true,
      browserSmoke: true,
      uiAudit: true,
      codeql: true,
      reason: forceFull ? "full run requested" : "no diff available; fail safe to full run",
    };
  }

  const docsOnly = files.every(isDocumentationOnlyPath);
  const workflowOrPolicy = files.some((file) => matchesAny(file, workflowOrPolicyMatchers));
  const hasDatabaseChange = files.some((file) => matchesAny(file, databaseMatchers));
  const pureDatabaseOnly =
    hasDatabaseChange &&
    files.every(
      (file) => isDocumentationOnlyPath(file) || matchesAny(file, pureDatabaseMatchers),
    );

  if (workflowOrPolicy) {
    return {
      files,
      docsOnly: false,
      fullVerify: true,
      database: true,
      browserSmoke: true,
      uiAudit: true,
      codeql: true,
      reason: "CI workflow or classifier changed; exercise every gate",
    };
  }

  return {
    files,
    docsOnly,
    fullVerify: !docsOnly && !pureDatabaseOnly,
    database: hasDatabaseChange,
    browserSmoke: files.some((file) => matchesAny(file, browserSmokeMatchers)),
    uiAudit: files.some((file) => matchesAny(file, uiAuditMatchers)),
    codeql: files.some((file) => matchesAny(file, codeqlMatchers)),
    reason: docsOnly
      ? "documentation-only change"
      : pureDatabaseOnly
        ? "database-only change"
        : "risk-proportional checks selected from changed paths",
  };
}

function toOutputEntries(result) {
  return {
    docs_only: String(result.docsOnly),
    full_verify: String(result.fullVerify),
    database: String(result.database),
    browser_smoke: String(result.browserSmoke),
    ui_audit: String(result.uiAudit),
    codeql: String(result.codeql),
    reason: result.reason,
    changed_files: result.files.join(","),
  };
}

function writeGithubOutput(entries, destination) {
  const lines = Object.entries(entries).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(destination, `${lines.join("\n")}\n`, "utf8");
}

function runCli() {
  const forceFull = process.env.FORCE_FULL === "true";
  const input = fs.readFileSync(0, "utf8").split(/\r?\n/);
  const result = classifyChanges(input, { forceFull });
  const entries = toOutputEntries(result);

  if (process.env.GITHUB_OUTPUT) {
    writeGithubOutput(entries, process.env.GITHUB_OUTPUT);
  }

  process.stdout.write(`${JSON.stringify({ ...result, outputs: entries }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runCli();
}
