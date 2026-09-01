import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolvePlanAuthority } from "./plan-authority.mjs";

function withFixture(manifest, run) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-plan-authority-"));
  try {
    mkdirSync(join(root, "docs/plans/active"), { recursive: true });
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
    schemaVersion: 2,
    master: {
      path: "docs/plans/active/master.md",
      introducedByPr: 433,
      supersedes: [
        {
          path: "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
          supersededByPr: 433,
        },
      ],
    },
    current: {
      path: "docs/plans/active/current.md",
      introducedByPr: 528,
    },
    ...overrides,
  };
}

function mergedGit(_root, args) {
  if (args[0] !== "log") return null;
  const path = args.at(-1);
  if (path === "docs/plans/active/current.md") {
    return "current123\tperf: select current slice (#528)";
  }
  if (path === "docs/plans/active/master.md") {
    return "master123\tdocs(product): install master program (#433)";
  }
  return null;
}

test("resolves one merged master and one merged current slice from the manifest", () => {
  withFixture(authorityManifest(), (root) => {
    const result = resolvePlanAuthority(root, { runGit: mergedGit });

    assert.equal(result.ok, true, result.failures.join("\n"));
    assert.equal(result.schemaVersion, 2);
    assert.equal(result.master.status, "active");
    assert.equal(result.current.status, "active");
    assert.equal(result.current.path, "docs/plans/active/current.md");
    assert.equal(result.authorityChain[1].supersededByPr, 433);
  });
});

test("zero current slice is valid between executable slices", () => {
  withFixture(authorityManifest({ current: null }), (root) => {
    const result = resolvePlanAuthority(root, { runGit: mergedGit });

    assert.equal(result.ok, true, result.failures.join("\n"));
    assert.equal(result.current, null);
    assert.ok(result.warnings.some((warning) => warning.includes("zero-current")));
  });
});

test("a current slice is candidate inside its introducing PR until merged history proves it", () => {
  withFixture(
    authorityManifest({
      current: {
        path: "docs/plans/active/current.md",
        introducedByPr: 529,
      },
    }),
    (root) => {
      const eventPath = join(root, "event.json");
      writeFileSync(
        eventPath,
        JSON.stringify({ number: 529, pull_request: { number: 529 } }),
      );
      const result = resolvePlanAuthority(root, {
        env: { GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: eventPath },
        runGit: (_root, args) => {
          if (args[0] !== "log") return null;
          const path = args.at(-1);
          if (path === "docs/plans/active/master.md") {
            return "master123\tdocs(product): install master program (#433)";
          }
          return null;
        },
      });

      assert.equal(result.ok, true, result.failures.join("\n"));
      assert.equal(result.current.status, "candidate");
    },
  );
});

test("unmerged current authority outside its introducing PR fails closed", () => {
  withFixture(authorityManifest(), (root) => {
    const result = resolvePlanAuthority(root, {
      runGit: (_root, args) => {
        if (args[0] !== "log") return null;
        if (args.at(-1) === "docs/plans/active/master.md") {
          return "master123\tdocs(product): install master program (#433)";
        }
        return null;
      },
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.failures.some((failure) =>
        failure.includes("merged first-parent history does not contain"),
      ),
    );
  });
});

test("schema version 1 is rejected so the retired board cannot remain implicit authority", () => {
  withFixture({ ...authorityManifest(), schemaVersion: 1 }, (root) => {
    const result = resolvePlanAuthority(root, { runGit: mergedGit });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes("schemaVersion 2")));
  });
});
