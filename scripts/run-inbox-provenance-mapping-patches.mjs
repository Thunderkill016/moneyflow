import { readFileSync } from "node:fs";

const original = readFileSync(
  "scripts/emit-inbox-provenance-mapping-patches.mjs",
  "utf8",
);

const before = `function patchInboxMap(source) {
  source = replaceOnce(
    source,
    \`import {
  createCandidate,
  type CreateCandidateInput,
  type InboxCandidate,
} from "./candidate-store.ts";
import {
  createImportBatch,
  type CreateImportBatchInput,
  type ImportBatch,
} from "./import-batch-store.ts";\`,
    \`import { createCandidate } from "./candidate-store.ts";
import { createImportBatch } from "./import-batch-store.ts";
import {
  batchProvenanceFromRow,
  batchProvenanceInsertPatch,
  candidateProvenanceFromRow,
  candidateProvenanceInsertPatch,
  type BatchProvenanceRow,
  type CandidateProvenanceRow,
  type CreateCandidateWithProvenanceInput,
  type CreateImportBatchWithProvenanceInput,
  type PersistedInboxCandidate,
  type PersistedImportBatch,
} from "./provenance.ts";\`,
    "map_imports",
  );`;

const after = `function patchInboxMap(source) {
  source = source.replace(
    "  CreateCandidateInput,\\n  InboxCandidate,\\n",
    "",
  );
  source = source.replace(
    "  CreateImportBatchInput,\\n  ImportBatch,\\n",
    "",
  );
  source = replaceOnce(
    source,
    \`import { createImportBatch, isImportBatch } from "./import-batch-store.ts";\`,
    \`import { createImportBatch, isImportBatch } from "./import-batch-store.ts";
import {
  batchProvenanceFromRow,
  batchProvenanceInsertPatch,
  candidateProvenanceFromRow,
  candidateProvenanceInsertPatch,
  type BatchProvenanceRow,
  type CandidateProvenanceRow,
  type CreateCandidateWithProvenanceInput,
  type CreateImportBatchWithProvenanceInput,
  type PersistedInboxCandidate,
  type PersistedImportBatch,
} from "./provenance.ts";\`,
    "map_imports",
  );`;

const patched = original.replace(before, after);
if (patched === original) throw new Error("runner_patch_missing_map_imports");

await import(
  `data:text/javascript;base64,${Buffer.from(patched, "utf8").toString("base64")}`
);
