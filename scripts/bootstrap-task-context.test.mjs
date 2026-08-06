import assert from "node:assert/strict";
import test from "node:test";
import {
  buildManifest,
  buildVerificationPlan,
  parseArgs,
  parseContextRoutes,
  renderMarkdown,
  selectRoute,
  validateTaskState,
} from "./bootstrap-task-context.mjs";

const ROUTER = `# Router

## Domain routes

| Task boundary | Load next | Verify against |
|---|---|---|
| Product scope/current status | \`docs/product/PRINCIPLES.md\` | merged code/tests |
| UI/mobile/accessibility | \`docs/design-system.md\`, \`docs/UX_PRINCIPLES.md\` | browser evidence |
| CI/deployment/performance | \`docs/engineering/RISK_PROPORTIONAL_DELIVERY.md\` | exact-head selected gates |

## Cold-memory retrieval
`;

test("parseArgs requires explicit task, boundary and risk class", () => {
  assert.deepEqual(
    parseArgs([
      "--task",
      "Migrate Reports workspace",
      "--boundary",
      "ui",
      "--class",
      "2",
      "--format",
      "prompt",
    ]),
    {
      task: "Migrate Reports workspace",
      boundary: "ui",
      riskClass: 2,
      packet: null,
      root: process.cwd(),
      base: "main",
      format: "prompt",
      output: null,
      allowMain: false,
      listBoundaries: false,
    },
  );
  assert.throws(
    () => parseArgs(["--task", "x", "--boundary", "ui"]),
    /--class/,
  );
  assert.throws(
    () =>
      parseArgs([
        "--task",
        "x",
        "--boundary",
        "ui",
        "--class",
        "4",
      ]),
    /0, 1, 2 or 3/,
  );
});

test("router parser and aliases select the project-owned route", () => {
  const routes = parseContextRoutes(ROUTER);
  assert.equal(routes.length, 3);
  assert.deepEqual(selectRoute(routes, "ui"), {
    boundary: "UI/mobile/accessibility",
    loadNext: "`docs/design-system.md`, `docs/UX_PRINCIPLES.md`",
    verifyAgainst: "browser evidence",
  });
  assert.throws(() => selectRoute(routes, "unknown"), /Unknown or ambiguous/);
});

test("verification plan remains risk proportional", () => {
  assert.deepEqual(buildVerificationPlan(0).required, [
    "npm run check:knowledge",
    "npm run test:ci-policy",
  ]);
  assert.ok(
    buildVerificationPlan(2).required.includes("npm run test:ui-audit:pr"),
  );
  assert.match(buildVerificationPlan(3).planning, /full work packet/);
});

test("class 3 blocks without a packet and main blocks by default", () => {
  const route = selectRoute(parseContextRoutes(ROUTER), "ci");
  const validation = validateTaskState({
    root: "/missing-root",
    options: {
      riskClass: 3,
      packet: null,
      allowMain: false,
      boundary: "ci",
    },
    route,
    git: {
      available: true,
      branch: "main",
      dirty: false,
    },
  });

  assert.ok(
    validation.errors.some((message) => message.includes("Current branch is main")),
  );
  assert.ok(
    validation.errors.some((message) =>
      message.includes("Class 3 requires --packet"),
    ),
  );
});

test("manifest and markdown expose only selected context and gates", () => {
  const route = selectRoute(parseContextRoutes(ROUTER), "ui");
  const validation = { errors: [], warnings: [], packet: null };
  const manifest = buildManifest({
    root: "/missing-root",
    options: {
      task: "Migrate Reports workspace",
      boundary: "ui",
      riskClass: 2,
    },
    route,
    git: {
      branch: "feat/reports",
      head: "abc123",
      dirty: false,
      changedFiles: ["src/app/reports/page.tsx"],
    },
    validation,
  });
  const markdown = renderMarkdown(manifest);

  assert.match(markdown, /Migrate Reports workspace/);
  assert.match(markdown, /docs\/design-system\.md/);
  assert.match(markdown, /test:ui-audit:pr/);
  assert.doesNotMatch(markdown, /CI\/deployment\/performance/);
});
