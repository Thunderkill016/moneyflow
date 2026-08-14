import assert from "node:assert/strict";
import test from "node:test";

import {
  ghBoundaryViolation,
  gitBoundaryViolation,
  prCreateDeliveryViolation,
} from "./command-guard.mjs";

test("Git wrapper allows ordinary isolated-branch delivery and read paths", () => {
  assert.equal(gitBoundaryViolation(["status"]), null);
  assert.equal(gitBoundaryViolation(["diff", "--stat"]), null);
  assert.equal(gitBoundaryViolation(["add", "src/example.ts"]), null);
  assert.equal(gitBoundaryViolation(["commit", "-m", "fix: bounded change"]), null);
  assert.equal(gitBoundaryViolation(["push", "origin", "HEAD"]), null);
  assert.equal(gitBoundaryViolation(["push", "-u", "origin", "HEAD"]), null);
  assert.equal(gitBoundaryViolation(["fetch", "origin"]), null);
  assert.equal(gitBoundaryViolation(["remote", "-v"]), null);
  assert.equal(gitBoundaryViolation(["remote", "get-url", "origin"]), null);
  assert.equal(gitBoundaryViolation(["remote", "show", "origin"]), null);
  assert.equal(gitBoundaryViolation(["stash", "push"]), null);
  assert.equal(gitBoundaryViolation(["stash", "pop"]), null);
});

test("Git wrapper blocks branch control, history integration, aliases and global escape options", () => {
  assert.match(gitBoundaryViolation(["checkout", "main"]) ?? "", /main\/branch-control/u);
  assert.match(gitBoundaryViolation(["switch", "feature/other"]) ?? "", /branch-control/u);
  assert.match(gitBoundaryViolation(["branch", "-D", "feature/other"]) ?? "", /branch-control/u);
  assert.match(gitBoundaryViolation(["worktree", "add", "/tmp/other"]) ?? "", /branch-control/u);
  assert.match(gitBoundaryViolation(["merge", "feature/other"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["pull"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["rebase", "main"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["ship"]) ?? "", /allowlist/u);
  assert.match(gitBoundaryViolation(["-C", "/tmp/other", "status"]) ?? "", /global option/u);
  assert.match(gitBoundaryViolation(["-c", "alias.ship=!git push origin HEAD", "ship"]) ?? "", /global option/u);
  assert.match(gitBoundaryViolation(["--git-dir", "/tmp/repo/.git", "status"]) ?? "", /global option/u);
  assert.match(gitBoundaryViolation(["commit", "--amend", "--no-edit"]) ?? "", /amend/u);
  assert.match(gitBoundaryViolation(["commit", "--no-verify", "-m", "bypass"]) ?? "", /hooks/u);
});

test("Git push is limited to the current isolated branch on origin", () => {
  assert.match(gitBoundaryViolation(["push", "--force", "origin", "HEAD"]) ?? "", /force/u);
  assert.match(gitBoundaryViolation(["push", "--force-with-lease", "origin", "HEAD"]) ?? "", /force/u);
  assert.match(gitBoundaryViolation(["push", "upstream", "HEAD"]) ?? "", /origin HEAD/u);
  assert.match(gitBoundaryViolation(["push", "origin", "main"]) ?? "", /origin HEAD/u);
  assert.match(gitBoundaryViolation(["push", "origin", "HEAD:main"]) ?? "", /origin HEAD/u);
  assert.match(gitBoundaryViolation(["push", "origin", ":feature/delete-me"]) ?? "", /origin HEAD/u);
  assert.match(gitBoundaryViolation(["push", "--delete", "origin", "feature/other"]) ?? "", /option/u);
});

test("Git fetch and remote commands cannot rewrite local refs or remotes", () => {
  assert.match(
    gitBoundaryViolation(["fetch", "origin", "+refs/heads/feature:refs/heads/main"]) ?? "",
    /refspec destinations/u,
  );
  assert.match(gitBoundaryViolation(["fetch", "upstream"]) ?? "", /origin remote/u);
  assert.match(gitBoundaryViolation(["remote", "add", "evil", "https://example.invalid/repo"]) ?? "", /mutation/u);
  assert.match(gitBoundaryViolation(["remote", "set-url", "origin", "https://example.invalid/repo"]) ?? "", /mutation/u);
  assert.match(gitBoundaryViolation(["remote", "remove", "origin"]) ?? "", /mutation/u);
  assert.match(gitBoundaryViolation(["stash", "branch", "main"]) ?? "", /not permitted/u);
});

test("GitHub CLI command allowlist permits reads and the PR-create command family only", () => {
  assert.equal(ghBoundaryViolation(["auth", "status"]), null);
  assert.equal(ghBoundaryViolation(["issue", "list"]), null);
  assert.equal(ghBoundaryViolation(["issue", "view", "379"]), null);
  assert.equal(ghBoundaryViolation(["pr", "checks", "384"]), null);
  assert.equal(ghBoundaryViolation(["pr", "create", "--draft"]), null);
  assert.equal(ghBoundaryViolation(["pr", "diff", "384"]), null);
  assert.equal(ghBoundaryViolation(["pr", "list"]), null);
  assert.equal(ghBoundaryViolation(["pr", "status"]), null);
  assert.equal(ghBoundaryViolation(["pr", "view", "384"]), null);
  assert.equal(ghBoundaryViolation(["repo", "view"]), null);
  assert.equal(ghBoundaryViolation(["run", "list"]), null);
  assert.equal(ghBoundaryViolation(["run", "view", "123"]), null);
  assert.equal(ghBoundaryViolation(["run", "watch", "123"]), null);
});

test("PR creation delivery policy requires explicit same-repo draft head to main", () => {
  assert.equal(
    prCreateDeliveryViolation([
      "pr",
      "create",
      "--draft",
      "--head",
      "agent/dispatcher/issue-379-abcdef01",
      "--base",
      "main",
      "--title",
      "bounded",
    ]),
    null,
  );
  assert.match(prCreateDeliveryViolation(["pr", "create", "--head", "feature/x"]) ?? "", /draft/u);
  assert.match(prCreateDeliveryViolation(["pr", "create", "--draft"]) ?? "", /explicit.*--head/u);
  assert.match(prCreateDeliveryViolation(["pr", "create", "--draft", "--head", "main"]) ?? "", /non-main/u);
  assert.match(prCreateDeliveryViolation(["pr", "create", "--draft", "--head", "other:feature"]) ?? "", /same-repository/u);
  assert.match(
    prCreateDeliveryViolation(["pr", "create", "--draft", "--head", "feature/x", "--base", "develop"]) ?? "",
    /target main/u,
  );
  assert.match(
    prCreateDeliveryViolation(["pr", "create", "--draft", "--head", "feature/x", "--dry-run"]) ?? "",
    /non-interactive/u,
  );
});

test("GitHub CLI wrapper rejects token disclosure and write-capable operations outside PR creation", () => {
  assert.match(ghBoundaryViolation(["auth", "status", "--show-token"]) ?? "", /tokens/u);
  assert.match(ghBoundaryViolation(["auth", "status", "-t"]) ?? "", /tokens/u);
  assert.match(ghBoundaryViolation(["issue", "close", "379"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["issue", "edit", "379", "--title", "changed"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["pr", "merge", "384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["pr", "close", "384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["pr", "edit", "384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["pr", "ready", "384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["pr", "review", "384", "--approve"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["repo", "sync"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["repo", "delete", "owner/repo"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["run", "cancel", "123"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["run", "rerun", "123"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["run", "delete", "123"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["api", "repos/owner/repo/issues/379", "-X", "PATCH"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["api", "graphql", "-f", "query=mutation { mergePullRequest }"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["alias", "set", "ship", "pr merge 384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["secret", "set", "TOKEN"]) ?? "", /allowlist/u);
});
