import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const DOC_ONLY_PREFIXES = ["README.md", ".github/PULL_REQUEST_TEMPLATE.md", ".github/pull_request_template.md"];

function normalizePath(filePath) {
  return String(filePath).replace(/\\/gu, "/").replace(/^\.\//u, "").trim();
}

function isDocOnlyFile(file) {
  if (/\.md$/iu.test(file) && !file.startsWith(".github/")) return true;
  return DOC_ONLY_PREFIXES.some((exact) => file === exact);
}

const DATABASE_MATCHERS = [
  (file) => file.startsWith("supabase/"),
  (file) => file.startsWith("db/"),
  (file) => file === "scripts/check-migration-identity.mjs",
  (file) => file === "scripts/check-rls-migrations.sh",
];

const MOBILE_MATCHERS = [(file) => file.startsWith("mobile/")];

const WORKFLOW_OR_POLICY_MATCHERS = [
  (file) => file === "package.json" || file === "package-lock.json",
  (file) => file.startsWith(".github/workflows/"),
  (file) => file === "scripts/classify-ci-changes.mjs",
  (file) => file === "scripts/classify-ci-changes.test.mjs",
  (file) => file === "scripts/check-workflow-pins.mjs",
  (file) => file === "scripts/check-deploy-hygiene.mjs",
  (file) => file === "scripts/check-architecture.mjs",
  (file) => file === ".vercelignore",
];

const CODEQL_MATCHERS = [
  (file) => /\.(?:[cm]?[jt]sx?)$/u.test(file) && !file.startsWith("mobile/"),
  (file) => file === "next.config.ts",
  (file) => file === "package.json" || file === "package-lock.json",
];

export function classifyChanges(rawPaths) {
  const files = rawPaths.map(normalizePath).filter(Boolean);

  if (files.length === 0) {
    return {
      docs_only: false,
      full_verify: true,
      database: false,
      codeql: true,
      mobile: true,
      reason: "no changed file list provided — running full verification defensively",
    };
  }

  const docsOnly = files.every(isDocOnlyFile);
  const database = files.some((file) => DATABASE_MATCHERS.some((fn) => fn(file)));
  const mobile = files.some((file) => MOBILE_MATCHERS.some((fn) => fn(file)));
  const workflowOrPolicy = files.some((file) =>
    WORKFLOW_OR_POLICY_MATCHERS.some((fn) => fn(file)),
  );
  const webSource = files.some(
    (file) =>
      file.startsWith("src/") ||
      file.startsWith("public/") ||
      file === "next.config.ts" ||
      file === "tsconfig.json" ||
      file === "eslint.config.mjs" ||
      file === "postcss.config.mjs",
  );
  const codeql = files.some((file) => CODEQL_MATCHERS.some((fn) => fn(file)));

  const pureDatabaseOnly = database && !webSource && !workflowOrPolicy && !mobile;
  const fullVerify = !docsOnly && (webSource || workflowOrPolicy || !pureDatabaseOnly);

  let reason = "application changes detected";
  if (docsOnly) {
    reason = "documentation-only changes";
  } else if (pureDatabaseOnly) {
    reason = "database-only changes (skipping heavy Next.js checks)";
  } else if (workflowOrPolicy) {
    reason = "workflow or policy changes — running full verification";
  }

  return {
    docs_only: docsOnly,
    full_verify: fullVerify,
    database,
    codeql,
    mobile,
    reason,
  };
}

function readChangedFilesFromGit() {
  const base = process.env.CI_BASE_REF;
  const head = process.env.CI_HEAD_REF || "HEAD";
  if (base && !/^0+$/u.test(base)) {
    const out = execFileSync("git", ["diff", "--name-only", `${base}..${head}`], {
      encoding: "utf8",
    });
    return out.split(/\r?\n/u).filter(Boolean);
  }
  const out = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", head], {
    encoding: "utf8",
  });
  return out.split(/\r?\n/u).filter(Boolean);
}

function readChangedFilesInput() {
  if (process.env.FORCE_FULL === "true") {
    return [];
  }
  if (!process.stdin.isTTY) {
    return readFileSync(0, "utf8").split(/\r?\n/u).filter(Boolean);
  }
  return readChangedFilesFromGit();
}

function runCli() {
  const files = readChangedFilesInput();
  const result = classifyChanges(files);
  console.log(JSON.stringify({ fileCount: files.length, ...result }));

  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) {
    const lines = [
      `docs_only=${result.docs_only}`,
      `full_verify=${result.full_verify}`,
      `database=${result.database}`,
      `codeql=${result.codeql}`,
      `mobile=${result.mobile}`,
      `reason=${result.reason}`,
    ];
    appendFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
