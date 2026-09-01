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
    writeFileSync(join(root, "docs/plans/active/current.md"), "# Current\n");
    writeFileSync(join(root, "docs/plans/active/master.md"), "# Master\n");
    writeFileSync(join(root, "docs/plans/PRODUCT_DEVELOPMENT_PLAN.md"), "# Old\n");
    writeFileSync(
      join(root, "docs/plans/PLAN_AUTHORITY.json"),
      `${JSON.stringify(
        {
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

const historyGit = (_root, args) => {
  if (args[0] !== "log") return null;
  if (args.at(-1) === "docs/plans/active/current.md") {
    return "current123\tdocs(plan): select current slice (#528)";
  }
  if (args.at(-1) === "docs/plans/active/master.md") {
    return "facefeed\tdocs(product): install master program (#433)";
  }
  return null;
};

test("standard doctor JSON carries resolved manifest plan authority", () => {
  withAuthorityFixture((root) => {
    const report = buildAuthorityAwareDoctorReport({
      argv: ["node", "agent-doctor-entry.mjs", "--files", "docs/example.md"],
      env: {},
      root,
      authorityOptions: { runGit: historyGit },
    });

    assert.equal(report.schemaVersion, 3);
    assert.equal(report.planAuthority.ok, true);
    assert.equal(report.planAuthority.selectionReady, true);
    assert.equal(report.planAuthority.master.path, "docs/plans/active/master.md");
    assert.equal(report.planAuthority.current.path, "docs/plans/active/current.md");
    assert.ok(
      report.readyMeans.includes.includes(
        "merged manifest master/current authority resolved from Git first-parent history",
      ),
    );
  });
});

test("doctor readiness fails when current authority is unmerged", () => {
  withAuthorityFixture((root) => {
    const report = buildAuthorityAwareDoctorReport({
      argv: ["node", "agent-doctor-entry.mjs", "--files", "docs/example.md"],
      env: {},
      root,
      authorityOptions: {
        runGit: (_root, args) => {
          if (args[0] !== "log") return null;
          if (args.at(-1) === "docs/plans/active/master.md") {
            return "facefeed\tdocs(product): install master program (#433)";
          }
          return null;
        },
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
          schemaVersion: 2,
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
          current: null,
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
        runGit: () => null,
      },
    });

    assert.equal(report.planAuthority.ok, true);
    assert.equal(report.planAuthority.master.status, "candidate");
    assert.equal(report.planAuthority.selectionReady, false);
    assert.equal(report.ready, false);
  });
});
