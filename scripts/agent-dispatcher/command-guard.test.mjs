import assert from "node:assert/strict";
import test from "node:test";

import { ghBoundaryViolation, gitBoundaryViolation } from "./command-guard.mjs";

test("blocks direct main, merge, force-push, and PR-merge paths", () => {
  assert.match(gitBoundaryViolation(["checkout", "main"]) ?? "", /main/u);
  assert.match(gitBoundaryViolation(["merge", "feature/other"]) ?? "", /merge/u);
  assert.match(gitBoundaryViolation(["push", "--force", "origin", "HEAD"]) ?? "", /force/u);
  assert.match(gitBoundaryViolation(["push", "origin", "HEAD:refs/heads/main"]) ?? "", /main/u);
  assert.match(ghBoundaryViolation(["pr", "merge", "384"]) ?? "", /merge/u);
  assert.match(ghBoundaryViolation(["api", "repos/owner/repo/pulls/384/merge", "-X", "PUT"]) ?? "", /merge/u);
});

test("blocks alias and GraphQL escape hatches while allowing normal branch delivery", () => {
  assert.match(
    gitBoundaryViolation(["-c", "alias.ship=!git push origin HEAD:main", "ship"]) ?? "",
    /alias/u,
  );
  assert.match(gitBoundaryViolation(["ship"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["alias", "set", "ship", "pr merge 384"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["ship"]) ?? "", /allowlist/u);
  assert.match(ghBoundaryViolation(["api", "graphql", "-f", "query=mutation { mergePullRequest }"]) ?? "", /GraphQL/u);

  assert.equal(gitBoundaryViolation(["status"]), null);
  assert.equal(gitBoundaryViolation(["push", "origin", "HEAD:feature/safe-branch"]), null);
  assert.equal(ghBoundaryViolation(["pr", "create", "--draft"]), null);
  assert.equal(ghBoundaryViolation(["pr", "view", "384"]), null);
});
