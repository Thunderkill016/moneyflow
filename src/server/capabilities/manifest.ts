import { z } from "zod";

import { definition as accountsList } from "./accounts-list.ts";
import { definition as activityCandidates } from "./activity-candidates.ts";
import { definition as budgetsStatus } from "./budgets-status.ts";
import { definition as candidatesPropose } from "./candidates-propose.ts";
import { definition as goalsStatus } from "./goals-status.ts";
import { definition as ledgerSummary } from "./ledger-summary.ts";
import { definition as reportsFinancial } from "./reports-financial.ts";
import { definition as transactionsSearch } from "./transactions-search.ts";

export const capabilityDefinitions = [
  accountsList,
  activityCandidates,
  budgetsStatus,
  candidatesPropose,
  goalsStatus,
  ledgerSummary,
  reportsFinancial,
  transactionsSearch,
] as const;

export function describeCapabilityManifest() {
  return {
    schemaVersion: 1,
    generatedFrom: "src/server/capabilities/manifest.ts",
    capabilities: capabilityDefinitions.map((capability) => ({
      id: capability.id,
      version: capability.version,
      title: capability.title,
      description: capability.description,
      authorization: capability.authorization,
      sideEffects: capability.sideEffects,
      idempotent: capability.idempotent,
      inputSchema: z.toJSONSchema(capability.input),
      outputSchema: z.toJSONSchema(capability.output),
    })),
  };
}
