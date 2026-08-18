import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

/**
 * Source-contract tests must read only files that are part of the default
 * dashboard runtime composition. Including a detached component here can make a
 * contract pass even after the UI it claims to protect is no longer rendered.
 */
const dashboardCompositionFiles = [
  "src/components/moneyflow-dashboard.tsx",
  "src/components/dashboard/dashboard-overview-sections.tsx",
  "src/components/dashboard/statement.tsx",
] as const;

export function readDashboardSource(): string {
  return dashboardCompositionFiles
    .map((file) => readFileSync(join(root, file), "utf8"))
    .join("\n");
}
