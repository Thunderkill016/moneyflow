import assert from "node:assert/strict";
import test from "node:test";

import {
  ghBoundaryViolation,
  gitBoundaryViolation,
  prCreateDeliveryViolation,
} from "./command-guard.mjs";

test("blocks main control, merges, rebase, force push and arbitrary Git operations", () => {
  assert.match(gitBoundaryViolation(["checkout", "main"]) ?? "", /branch-control/u);
  assert.match(gitBoundaryViolation(["merge", "feature/other"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["pull"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["rebase", "main"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["push", "--force", "origin", "HEAD"]) ?? "", /force/u);
  assert.match(gitBoundaryViolation(["config", "user.name", "x"]) ?? "", /allowlist/u);
  assert.equal(gitBoundaryViolation(["status"]), null);
  assert.equal(gitBoundaryViolation(["push", "origin", "HEAD"]), null);
});

test("GitHub CLI surface excludes merge and mutation commands", () => {
  assert.match(ghBoundaryViolation(["pr", "merge", "447"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["issue", "close", "446"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["api", "repos/owner/repo"]) ?? "", /allowlist/u);
  assert.equal(ghBoundaryViolation(["pr", "create", "--draft"]), null);
  assert.equal(ghBoundaryViolation(["pr", "checks", "447"]), null);
});

test("harness-created PRs must remain draft and target main from the current isolated branch", () => {
  assert.match(
    prCreateDeliveryViolation(["pr", "create", "--head", "feature/a"], "feature/a") ?? "",
    /remain draft/u,
  );
  assert.match(
    prCreateDeliveryViolation(
      ["pr", "create", "--draft", "--head", "feature/a", "--base", "other"],
      "feature/a",
    ) ?? "",
    /only target main/u,
  );
  assert.match(
    prCreateDeliveryViolation(
      ["pr", "create", "--draft", "--head", "feature/b", "--base", "main"],
      "feature/a",
    ) ?? "",
    /must match/u,
  );
  assert.equal(
    prCreateDeliveryViolation(
      ["pr", "create", "--draft", "--head", "feature/a", "--base", "main"],
      "feature/a",
    ),
    null,
  );
});

test("commit hooks and fetch destination refspecs cannot be bypassed", () => {
  assert.match(gitBoundaryViolation(["commit", "--no-verify", "-m", "x"]) ?? "", /hooks/u);
  assert.match(gitBoundaryViolation(["commit", "--amend"]) ?? "", /amend/u);
  assert.match(gitBoundaryViolation(["fetch", "origin", "main:refs/heads/main"]) ?? "", /refspec/u);
});
