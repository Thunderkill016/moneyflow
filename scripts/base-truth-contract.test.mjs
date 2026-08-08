import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectGit } from "./bootstrap-task-context.mjs";
import { collectChangedActivePackets } from "./work-packet-contract.mjs";

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeDivergedRepository() {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-base-truth-"));
  git(root, ["init"]);
  git(root, ["config", "user.email", "tests@example.test"]);
  git(root, ["config", "user.name", "MoneyFlow Tests"]);

  writeFileSync(join(root, "baseline.txt"), "baseline\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "baseline"]);
  const oldMain = git(root, ["rev-parse", "HEAD"]);
  git(root, ["branch", "-M", "main"]);

  mkdirSync(join(root, "docs/plans/active"), { recursive: true });
  writeFileSync(
    join(root, "docs/plans/active/main-owned.md"),
    "# Already merged on current main\n",
  );
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "advance merged main"]);
  const fetchedMain = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/main", fetchedMain]);

  git(root, ["checkout", "-b", "feature"]);
  writeFileSync(join(root, "feature.txt"), "feature\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "feature"]);

  git(root, ["branch", "-f", "main", oldMain]);
  return root;
}

test("default base truth prefers fetched origin/main over stale local main", () => {
  const root = makeDivergedRepository();
  try {
    const inspected = inspectGit(root);
    assert.equal(inspected.baseRef, "origin/main");
    assert.deepEqual(inspected.changedFiles, ["feature.txt"]);

    const packets = collectChangedActivePackets(root);
    assert.equal(packets.base, "origin/main");
    assert.deepEqual(packets.files, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("explicit packet base remains exact instead of silently changing refs", () => {
  const root = makeDivergedRepository();
  try {
    const packets = collectChangedActivePackets(root, "main");
    assert.equal(packets.base, "main");
    assert.deepEqual(packets.files, ["docs/plans/active/main-owned.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
