import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolvePlanAuthority } from "./plan-authority.mjs";

function withFixture({ board, manifest }, run) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-plan-authority-"));
  try {
    mkdirSync(join(root, "docs/plans/active"), { recursive: true });
    writeFileSync(join(root, "docs/plans/active/README.md"), board);
    writeFileSync(join(root, "docs/plans/active/master.md"), "# Master\n");
    writeFileSync(join(root, "docs/plans/active/current.md"), "# Current\n");
    writeFileSync(join(root, "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md"), "# Old\n");
    writeFileSync(
      join(root, "docs/plans/PLAN_AUTHORITY.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function authorityManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    master: {
      path: "docs/plans/active/master.md",
      introducedByPr: 433,
      supersedes: [
        {
          path: "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
          supersededByPr: 433,
        },
      ],
      ...overrides,
    },
  };
}

function board({
  baseline = "abc1234",
  projectionPr = null,
  includeCurrent = true,
  extra = "",
} = {}) {
  return [
    "# Board",
    `**Current main baseline:** \`${baseline}\``,
    projectionPr ? `**Post-merge projection:** PR #${projectionPr}` : "",
    "| Packet | Role now | Authority boundary |",
    "|---|---|---|",
    includeCurrent
      ? "| `current.md` | **current agent-executable Class 3 slice** | bounded work |"
      : "",
    "| `master.md` | master product program | product sequencing |",
    extra,
    "",
  ].join("\n");
}

const history = [
  "deadbeef\tfeat: later child slice (#441)",
  "facefeed\tdocs(product): install master program (#433)",
].join("\n");

const fakeGit = (_root, args) => {
  if (args[0] === "log" && args[1] !== "-1") return history;
  return null;
};

function mergeGit({ head, boardCommit = head, subject }) {
  return (_root, args) => {
    if (args[0] === "rev-parse" && args[1] === "HEAD") return head;
    if (args[0] === "log" && args[1] === "-1" && args[2] === "--format=%H") {
      return boardCommit;
    }
    if (args[0] === "log" && args[1] === "-1" && args[2] === "--format=%s") {
      return subject;
    }
    if (args[0] === "log") return history;
    return null;
  };
}

test("resolves one master, one current slice, and the supersession chain", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234ffff",
        runGit: fakeGit,
      });

      assert.equal(result.ok, true, result.failures.join("\n"));
      assert.equal(result.master.path, "docs/plans/active/master.md");
      assert.equal(result.master.status, "active");
      assert.equal(result.current.path, "docs/plans/active/current.md");
      assert.equal(
        result.authorityChain[1].path,
        "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
      );
      assert.equal(result.masterHistory[1].prNumber, 433);
      assert.equal(result.baselineMode, "declared-base");
    },
  );
});

test("a stale Current Work Board fails closed instead of yielding NEXT work", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "def5678",
        runGit: fakeGit,
      });

      assert.equal(result.ok, false);
      assert.ok(result.failures.some((failure) => failure.includes("is stale")));
    },
  );
});

test("an ordinary merge that happened to edit the board is still stale", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      const mergedHead = "feed999999999999999999999999999999999999";
      const result = resolvePlanAuthority(root, {
        expectedBaseline: mergedHead,
        runGit: mergeGit({
          head: mergedHead,
          subject: "feat: finish current slice (#444)",
        }),
      });

      assert.equal(result.ok, false);
      assert.ok(result.failures.some((failure) => failure.includes("is stale")));
    },
  );
});

test("an explicitly projected post-merge reconciliation may survive its squash merge", () => {
  withFixture(
    {
      board: board({ projectionPr: 445 }),
      manifest: authorityManifest(),
    },
    (root) => {
      const mergedHead = "feed999999999999999999999999999999999999";
      const result = resolvePlanAuthority(root, {
        expectedBaseline: mergedHead,
        runGit: mergeGit({
          head: mergedHead,
          subject: "docs: reconcile lifecycle after merge (#445)",
        }),
      });

      assert.equal(result.ok, true, result.failures.join("\n"));
      assert.equal(result.baselineMode, "post-merge-projection");
      assert.equal(result.boardProjectionPr, 445);
    },
  );
});

test("a copied projection for an older PR cannot bless a later main commit", () => {
  withFixture(
    {
      board: board({ projectionPr: 445 }),
      manifest: authorityManifest(),
    },
    (root) => {
      const nextHead = "cafe111111111111111111111111111111111111";
      const previousBoardCommit = "feed999999999999999999999999999999999999";
      const result = resolvePlanAuthority(root, {
        expectedBaseline: nextHead,
        runGit: mergeGit({
          head: nextHead,
          boardCommit: previousBoardCommit,
          subject: "chore: unrelated later merge (#446)",
        }),
      });

      assert.equal(result.ok, false);
      assert.ok(result.failures.some((failure) => failure.includes("is stale")));
    },
  );
});

test("two master programs are an authority conflict", () => {
  withFixture(
    {
      board: board({
        extra: "| `other.md` | master product program | competing authority |",
      }),
      manifest: authorityManifest(),
    },
    (root) => {
      writeFileSync(join(root, "docs/plans/active/other.md"), "# Other\n");
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: fakeGit,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("exactly one master product program"),
        ),
      );
    },
  );
});

test("two current agent-executable slices are rejected", () => {
  withFixture(
    {
      board: board({
        extra:
          "| `other.md` | current agent-executable Class 1 slice | competing work |",
      }),
      manifest: authorityManifest(),
    },
    (root) => {
      writeFileSync(join(root, "docs/plans/active/other.md"), "# Other\n");
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: fakeGit,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("at most one current agent-executable slice"),
        ),
      );
    },
  );
});

test("no current agent-executable slice is allowed only as an explicit warning", () => {
  withFixture(
    {
      board: board({ includeCurrent: false }),
      manifest: authorityManifest(),
    },
    (root) => {
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: fakeGit,
      });

      assert.equal(result.ok, true, result.failures.join("\n"));
      assert.equal(result.current, null);
      assert.ok(
        result.warnings.some((warning) =>
          warning.includes("no current agent-executable slice"),
        ),
      );
    },
  );
});

test("the manifest and active registry cannot disagree about the master", () => {
  withFixture(
    {
      board: board(),
      manifest: authorityManifest({ path: "docs/plans/active/other.md" }),
    },
    (root) => {
      writeFileSync(join(root, "docs/plans/active/other.md"), "# Other\n");
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: fakeGit,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("disagrees with active registry master"),
        ),
      );
    },
  );
});

test("missing master and predecessor paths fail closed", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      rmSync(join(root, "docs/plans/active/master.md"), { force: true });
      rmSync(join(root, "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md"), {
        force: true,
      });
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: fakeGit,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) => failure.includes("missing master plan")),
      );
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("missing superseded plan"),
        ),
      );
    },
  );
});

test("the declared introducing PR must be present in first-parent git history", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: (_root, args) =>
          args[0] === "log" && args[1] !== "-1"
            ? "deadbeef\tfeat: unrelated child (#441)"
            : null,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("first-parent history does not contain that PR"),
        ),
      );
    },
  );
});

test("a deliberate current PR may propose a new master but it remains candidate until merge", () => {
  withFixture(
    {
      board: board(),
      manifest: authorityManifest({
        introducedByPr: 444,
        supersedes: [
          {
            path: "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
            supersededByPr: 444,
          },
        ],
      }),
    },
    (root) => {
      const eventPath = join(root, "event.json");
      writeFileSync(
        eventPath,
        JSON.stringify({ pull_request: { number: 444 } }),
      );
      const result = resolvePlanAuthority(root, {
        env: {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_EVENT_PATH: eventPath,
        },
        expectedBaseline: "abc1234",
        runGit: (_root, args) =>
          args[0] === "log" && args[1] !== "-1"
            ? "facefeed\tdocs: previous master history (#433)"
            : null,
      });

      assert.equal(result.ok, true, result.failures.join("\n"));
      assert.equal(result.master.status, "candidate");
      assert.equal(result.authorityChain[1].status, "superseded-if-merged");
      assert.ok(
        result.warnings.some((warning) =>
          warning.includes("becomes active only after that PR appears"),
        ),
      );
    },
  );
});

test("an unmerged master replacement cannot claim a different PR number", () => {
  withFixture(
    {
      board: board(),
      manifest: authorityManifest({
        introducedByPr: 999,
        supersedes: [
          {
            path: "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
            supersededByPr: 999,
          },
        ],
      }),
    },
    (root) => {
      const eventPath = join(root, "event.json");
      writeFileSync(
        eventPath,
        JSON.stringify({ pull_request: { number: 444 } }),
      );
      const result = resolvePlanAuthority(root, {
        env: {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_EVENT_PATH: eventPath,
        },
        expectedBaseline: "abc1234",
        runGit: (_root, args) =>
          args[0] === "log" && args[1] !== "-1"
            ? "facefeed\tdocs: previous master history (#433)"
            : null,
      });

      assert.equal(result.ok, false);
      assert.ok(
        result.failures.some((failure) =>
          failure.includes("first-parent history does not contain that PR"),
        ),
      );
    },
  );
});
