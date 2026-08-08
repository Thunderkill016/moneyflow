import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ROUTE_ALIASES,
  buildManifest,
  buildVerificationPlan,
  parseArgs,
  parseContextRoutes,
  renderMarkdown,
  resolveRepositoryPath,
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
  assert.equal(
    parseArgs([
      "--task",
      "Update docs",
      "--boundary",
      "product",
      "--class",
      "0",
    ]).riskClass,
    0,
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
  assert.throws(() => selectRoute(routes, "unknown"), /Unknown boundary/);
});

test("every alias resolves against the current repository router", () => {
  const markdown = readFileSync(
    new URL("../docs/context/README.md", import.meta.url),
    "utf8",
  );
  const routes = parseContextRoutes(markdown);

  for (const alias of Object.keys(ROUTE_ALIASES)) {
    assert.equal(selectRoute(routes, alias).boundary, ROUTE_ALIASES[alias]);
  }
});

test("verification plan remains risk proportional", () => {
  assert.deepEqual(buildVerificationPlan(0).required, [
    "npm run check:knowledge",
    "npm run test:ci-policy",
  ]);

  const boundedPlan = buildVerificationPlan(1);
  assert.equal(boundedPlan.required.includes("npm run check:deployment-env"), false);
  assert.ok(
    boundedPlan.conditional.some((entry) => entry.includes("check:deployment-env")),
  );

  const uiPlan = buildVerificationPlan(2);
  assert.ok(uiPlan.required.includes("npm run test:e2e"));
  assert.equal(uiPlan.required.includes("npm run test:ui-audit:pr"), false);
  assert.ok(
    uiPlan.conditional.some((entry) => entry.includes("test:ui-audit:pr")),
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
      base: "main",
    },
    route,
    git: {
      available: true,
      branch: "main",
      baseComparisonAvailable: true,
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

test("packet and output paths cannot escape or bypass active-plan ownership", () => {
  assert.throws(
    () => resolveRepositoryPath(process.cwd(), "../outside.md", "--output"),
    /inside the repository root/,
  );

  const route = selectRoute(parseContextRoutes(ROUTER), "ci");
  const validation = validateTaskState({
    root: process.cwd(),
    options: {
      riskClass: 3,
      packet: "README.md",
      allowMain: true,
      boundary: "ci",
      base: "main",
    },
    route,
    git: {
      available: true,
      branch: "feat/tooling",
      baseComparisonAvailable: true,
      dirty: false,
    },
  });

  assert.equal(validation.packet, null);
  assert.ok(
    validation.errors.some((message) =>
      message.includes("docs/plans/active/"),
    ),
  );
});

test("missing base comparison produces a visible warning", () => {
  const route = selectRoute(parseContextRoutes(ROUTER), "product");
  const validation = validateTaskState({
    root: process.cwd(),
    options: {
      riskClass: 0,
      packet: null,
      allowMain: false,
      boundary: "product",
      base: "main",
    },
    route,
    git: {
      available: true,
      branch: "docs/task",
      baseComparisonAvailable: false,
      dirty: false,
    },
  });

  assert.ok(
    validation.warnings.some((message) =>
      message.includes("committed changed files could not be calculated"),
    ),
  );
});

test("manifest follows the mandatory read order and selected gates", () => {
  const route = selectRoute(parseContextRoutes(ROUTER), "ui");
  const validation = { errors: [], warnings: [], packet: null };
  const manifest = buildManifest({
    options: {
      task: "Migrate Reports workspace",
      boundary: "ui",
      riskClass: 2,
    },
    route,
    git: {
      branch: "feat/reports",
      head: "abc123",
      baseRef: "main",
      baseComparisonAvailable: true,
      dirty: false,
      changedFiles: ["src/app/reports/page.tsx"],
    },
    validation,
  });
  const markdown = renderMarkdown(manifest);

  assert.match(markdown, /Migrate Reports workspace/);
  assert.match(markdown, /ARCHITECTURE\.md/);
  assert.match(markdown, /docs\/product\/PRINCIPLES\.md/);
  assert.match(markdown, /docs\/MVP_DEFINITION\.md/);
  assert.match(markdown, /docs\/design-system\.md/);
  assert.match(markdown, /test:ui-audit:pr/);
  assert.match(markdown, /layout, styling/);
  assert.match(markdown, /Base comparison:\*\* main/);

  const readme = markdown.indexOf("README.md");
  const affectedCode = markdown.indexOf("Inspect the affected code");
  const currentMemory = markdown.indexOf("CURRENT_PROJECT_MEMORY.md");
  assert.ok(readme < affectedCode && affectedCode < currentMemory);
  assert.doesNotMatch(markdown, /CI\/deployment\/performance/);
});

test("class 3 manifests include operating-model context and the packet", () => {
  const route = selectRoute(parseContextRoutes(ROUTER), "ci");
  const packet = "docs/plans/active/ci-recovery-tooling.md";
  const manifest = buildManifest({
    options: {
      task: "Recover exact-head CI",
      boundary: "ci",
      riskClass: 3,
    },
    route,
    git: {
      branch: "feat/ci-recovery",
      head: "def456",
      baseRef: "main",
      baseComparisonAvailable: true,
      dirty: false,
      changedFiles: [],
    },
    validation: { errors: [], warnings: [], packet },
  });

  assert.ok(
    manifest.context.readNow.includes(
      "docs/engineering/AI_DELIVERY_WORKFLOW.md",
    ),
  );
  assert.ok(
    manifest.context.readNow.includes(
      "docs/engineering/AGENT_OPERATING_MODEL.md",
    ),
  );
  assert.ok(manifest.context.readNow.includes(packet));
});
