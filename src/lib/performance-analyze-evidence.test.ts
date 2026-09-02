import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const BASE_SHA = "0585caea055797cf3c0bfe45494946629ae5a7d0";
const NEEDLES = [
  "/dashboard",
  "moneyflow-dashboard",
  "add-transaction-dialog",
  "transfer-dialog",
  "layout/app-shell",
  "components/ui/sheet",
];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".txt"]);

function run(command: string, args: string[], cwd: string, timeout = 360_000) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    encoding: "utf8",
    timeout,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`,
    );
  }
  return `${result.stdout}\n${result.stderr}`;
}

function walkFiles(root: string, prefix = "") {
  if (!existsSync(root)) return [] as Array<{ path: string; bytes: number }>;
  const rows: Array<{ path: string; bytes: number }> = [];
  for (const name of readdirSync(root)) {
    const full = join(root, name);
    const relative = join(prefix, name);
    const stat = lstatSync(full);
    if (stat.isDirectory()) rows.push(...walkFiles(full, relative));
    else rows.push({ path: relative, bytes: stat.size });
  }
  return rows;
}

function snippetsForNeedle(root: string, files: Array<{ path: string; bytes: number }>, needle: string) {
  const matches: Array<{ file: string; bytes: number; snippet: string }> = [];
  for (const file of files) {
    if (matches.length >= 3 || file.bytes > 20 * 1024 * 1024) break;
    if (!TEXT_EXTENSIONS.has(extname(file.path))) continue;
    const full = join(root, file.path);
    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const index = content.toLowerCase().indexOf(needle.toLowerCase());
    if (index < 0) continue;
    const start = Math.max(0, index - 180);
    const end = Math.min(content.length, index + needle.length + 240);
    matches.push({
      file: file.path,
      bytes: file.bytes,
      snippet: content.slice(start, end).replace(/\s+/gu, " "),
    });
  }
  return matches;
}

function summarize(cwd: string, label: string) {
  const analyzerRoot = join(cwd, ".next", "diagnostics", "analyze");
  const files = walkFiles(analyzerRoot).sort((a, b) => b.bytes - a.bytes);
  const matches = Object.fromEntries(
    NEEDLES.map((needle) => [needle, snippetsForNeedle(analyzerRoot, files, needle)]),
  );
  const evidence = {
    label,
    analyzerRootExists: existsSync(analyzerRoot),
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    largestFiles: files.slice(0, 20),
    matches,
  };
  console.log(`ANALYZE_EVIDENCE_JSON ${JSON.stringify(evidence)}`);
  return evidence;
}

test("one-shot #527 analyzer evidence on main and current head", () => {
  const root = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), "moneyflow-analyze-base-"));
  const baseWorktree = join(tempRoot, "base");

  try {
    run("git", ["fetch", "--no-tags", "--depth=1", "origin", BASE_SHA], root, 120_000);
    run("git", ["worktree", "add", "--detach", baseWorktree, BASE_SHA], root, 120_000);
    run("npm", ["ci"], baseWorktree, 180_000);

    run("npm", ["run", "analyze", "--", "--output"], baseWorktree, 300_000);
    const base = summarize(baseWorktree, `base=${BASE_SHA}`);

    rmSync(join(root, ".next", "diagnostics"), { recursive: true, force: true });
    run("npm", ["run", "analyze", "--", "--output"], root, 300_000);
    const head = summarize(root, "head");

    assert.equal(base.analyzerRootExists, true, "baseline analyzer should emit .next/diagnostics/analyze");
    assert.equal(head.analyzerRootExists, true, "head analyzer should emit .next/diagnostics/analyze");
    assert.ok(base.fileCount > 0, "baseline analyzer should emit static analyzer files");
    assert.ok(head.fileCount > 0, "head analyzer should emit static analyzer files");

    // Deliberate one-shot failure: the unit shard uploads test-output.log only on failure.
    // This makes the analyzer evidence retrievable without changing the CI workflow.
    assert.fail("ANALYZE_CAPTURE_COMPLETE — delete this one-shot test after collecting the uploaded log");
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", baseWorktree], {
      cwd: root,
      encoding: "utf8",
    });
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
