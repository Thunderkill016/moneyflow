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

function board({ baseline = "abc1234", extra = "" } = {}) {
  return [
    "# Board",
    `**Current main baseline:** \`${baseline}\``,
    "| Packet | Role now | Authority boundary |",
    "|---|---|---|",
    "| `current.md` | **current agent-executable Class 3 slice** | bounded work |",
    "| `master.md` | master product program | product sequencing |",
    extra,
    "",
  ].join("\n");
}

const fakeGit = (_root, args) => {
  if (args[0] === "log") {
    return [
      "deadbeef\tfeat: later child slice (#441)",
      "facefeed\tdocs(product): install master program (#433)",
    ].join("\n");
  }
  return null;
};

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
      assert.equal(result.current.path, "docs/plans/active/current.md");
      assert.equal(
        result.authorityChain[1].path,
        "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
      );
      assert.equal(result.masterHistory[1].prNumber, 433);
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

test("the declared introducing PR must be present in first-parent git history", () => {
  withFixture(
    { board: board(), manifest: authorityManifest() },
    (root) => {
      const result = resolvePlanAuthority(root, {
        expectedBaseline: "abc1234",
        runGit: (_root, args) =>
          args[0] === "log" ? "deadbeef\tfeat: unrelated child (#441)" : null,
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
