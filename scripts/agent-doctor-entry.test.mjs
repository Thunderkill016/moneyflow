import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildAuthorityAwareDoctorReport } from "./agent-doctor-entry.mjs";

function withAuthorityFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-doctor-authority-"));
  try {
    mkdirSync(join(root, "docs/plans/active"), { recursive: true });
    writeFileSync(
      join(root, "docs/plans/active/README.md"),
      [
        "# Board",
        "**Current main baseline:** `abc1234`",
        "| Packet | Role now | Authority boundary |",
        "|---|---|---|",
        "| `current.md` | current agent-executable Class 3 slice | current |",
        "| `master.md` | master product program | master |",
        "",
      ].join("\n"),
    );
    writeFileSync(join(root, "docs/plans/active/current.md"), "# Current\n");
    writeFileSync(join(root, "docs/plans/active/master.md"), "# Master\n");
    writeFileSync(join(root, "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md"), "# Old\n");
    writeFileSync(
      join(root, "docs/plans/PLAN_AUTHORITY.json"),
      `${JSON.stringify(
        {
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
          },
        },
        null,
        2,
      )}\n`,
    );
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const historyGit = (_root, args) =>
  args[0] === "log"
    ? "facefeed\tdocs(product): install master program (#433)"
    : null;

test("standard doctor JSON carries resolved plan authority", () => {
  withAuthorityFixture((root) => {
    const report = buildAuthorityAwareDoctorReport({
      argv: ["node", "agent-doctor-entry.mjs", "--files", "docs/example.md"],
      env: {},
      root,
      authorityOptions: {
        expectedBaseline: "abc1234ffff",
        runGit: historyGit,
      },
    });

    assert.equal(report.schemaVersion, 3);
    assert.equal(report.planAuthority.ok, true);
    assert.equal(report.planAuthority.selectionReady, true);
    assert.equal(report.planAuthority.master.path, "docs/plans/active/master.md");
    assert.equal(report.planAuthority.current.path, "docs/plans/active/current.md");
    assert.ok(
      report.readyMeans.includes.includes(
        "merged master plan, current slice and Current Work Board freshness resolved",
      ),
    );
  });
});

test("doctor readiness fails when plan authority is stale even if machine policy is otherwise ready", () => {
  withAuthorityFixture((root) => {
    const report = buildAuthorityAwareDoctorReport({
      argv: ["node", "agent-doctor-entry.mjs", "--files", "docs/example.md"],
      env: {},
      root,
      authorityOptions: {
        expectedBaseline: "different-sha",
        runGit: historyGit,
      },
    });

    assert.equal(report.planAuthority.ok, false);
    assert.equal(report.planAuthority.selectionReady, false);
    assert.equal(report.ready, false);
  });
});

test("a valid current-PR master candidate is still blocked from doctor task selection", () => {
  withAuthorityFixture((root) => {
    writeFileSync(
      join(root, "docs/plans/PLAN_AUTHORITY.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          master: {
            path: "docs/plans/active/master.md",
            introducedByPr: 444,
            supersedes: [
              {
                path: "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md",
                supersededByPr: 444,
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
    );
    const eventPath = join(root, "event.json");
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 444 } }));

    const report = buildAuthorityAwareDoctorReport({
      argv: ["node", "agent-doctor-entry.mjs", "--files", "docs/example.md"],
      env: {
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
      },
      root,
      authorityOptions: {
        expectedBaseline: "abc1234ffff",
        runGit: historyGit,
      },
    });

    assert.equal(report.planAuthority.ok, true);
    assert.equal(report.planAuthority.master.status, "candidate");
    assert.equal(report.planAuthority.selectionReady, false);
    assert.equal(report.ready, false);
  });
});
