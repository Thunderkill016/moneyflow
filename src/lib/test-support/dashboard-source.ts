import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const dashboardCompositionFiles = [
  "src/components/moneyflow-dashboard.tsx",
  "src/components/dashboard/dashboard-overview-sections.tsx",
  "src/components/dashboard/dashboard-planning-sections.tsx",
  "src/components/dashboard/statement.tsx",
] as const;

export function readDashboardSource(): string {
  return dashboardCompositionFiles
    .map((file) => readFileSync(join(root, file), "utf8"))
    .join("\n");
}
