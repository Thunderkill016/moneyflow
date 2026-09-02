import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

const BASE_SHA = "0585caea055797cf3c0bfe45494946629ae5a7d0";

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

function summarize(cwd: string, label: string) {
  const diagnostics = join(cwd, ".next", "diagnostics");
  const files = walkFiles(diagnostics).sort((a, b) => b.bytes - a.bytes);
  const statsPath = join(diagnostics, "route-bundle-stats.json");
  let relevant: string[] = [];
  if (existsSync(statsPath)) {
    const pretty = JSON.stringify(JSON.parse(readFileSync(statsPath, "utf8")), null, 2).split("\n");
    const selected = new Set<number>();
    for (let index = 0; index < pretty.length; index += 1) {
      if (pretty[index]?.includes('"/"') || pretty[index]?.includes("/dashboard")) {
        for (let offset = -4; offset <= 8; offset += 1) {
          const candidate = index + offset;
          if (candidate >= 0 && candidate < pretty.length) selected.add(candidate);
        }
      }
    }
    relevant = [...selected]
      .sort((a, b) => a - b)
      .slice(0, 120)
      .map((index) => pretty[index] ?? "");
  }
  console.log(`ANALYZE_EVIDENCE ${label}`);
  console.log(`diagnostic_files=${JSON.stringify(files.slice(0, 30))}`);
  console.log(`route_stats=${JSON.stringify(relevant)}`);
  return { files, relevant, hasStats: existsSync(statsPath) };
}

test("one-shot #527 analyzer evidence on main and current head", () => {
  const root = process.cwd();
  const tempRoot = mkdtempSync(join(tmpdir(), "moneyflow-analyze-base-"));
  const baseWorktree = join(tempRoot, "base");

  try {
    run("git", ["fetch", "--no-tags", "--depth=1", "origin", BASE_SHA], root, 120_000);
    run("git", ["worktree", "add", "--detach", baseWorktree, BASE_SHA], root, 120_000);
    run("npm", ["ci"], baseWorktree, 180_000);

    run("npm", ["run", "analyze", "--", "--output"], baseWorktree);
    const base = summarize(baseWorktree, `base=${BASE_SHA}`);

    rmSync(join(root, ".next", "diagnostics"), { recursive: true, force: true });
    run("npm", ["run", "analyze", "--", "--output"], root);
    const head = summarize(root, "head");

    assert.ok(base.files.length > 0, "baseline analyzer should emit diagnostics");
    assert.ok(head.files.length > 0, "head analyzer should emit diagnostics");
    assert.equal(
      base.hasStats,
      head.hasStats,
      "baseline/head analyzer should expose the same diagnostics format",
    );
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", baseWorktree], {
      cwd: root,
      encoding: "utf8",
    });
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
