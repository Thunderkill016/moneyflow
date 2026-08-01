import { readFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const next = source.replace(before, after);
  if (next === source) throw new Error(`codemod_missing_${label}`);
  return next;
}

function patchInboxMap(source) {
  source = replaceOnce(
    source,
    `import {
  createCandidate,
  type CreateCandidateInput,
  type InboxCandidate,
} from "./candidate-store.ts";
import {
  createImportBatch,
  type CreateImportBatchInput,
  type ImportBatch,
} from "./import-batch-store.ts";`,
    `import { createCandidate } from "./candidate-store.ts";
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
} from "./provenance.ts";`,
    "map_imports",
  );
  source = replaceOnce(
    source,
    `  import_batch_id?: string | null;
};

export type ImportBatchRow`,
    `  import_batch_id?: string | null;
} & CandidateProvenanceRow;

export type ImportBatchRow`,
    "candidate_row_provenance",
  );
  source = replaceOnce(
    source,
    /export type ImportBatchRow = \{([\s\S]*?)\n\};\n\nexport function isUuid/,
    (_match, body) =>
      `export type ImportBatchRow = {${body}\n} & BatchProvenanceRow;\n\nexport function isUuid`,
    "batch_row_provenance",
  );
  source = replaceOnce(
    source,
    `export function mapCandidateRow(row: InboxCandidateRow): InboxCandidate {`,
    `export function mapCandidateRow(row: InboxCandidateRow): PersistedInboxCandidate {`,
    "map_candidate_return",
  );
  source = replaceOnce(
    source,
    `    importBatchId: row.import_batch_id ?? null,
  };`,
    `    importBatchId: row.import_batch_id ?? null,
    ...candidateProvenanceFromRow(row),
  };`,
    "map_candidate_spread",
  );
  source = replaceOnce(
    source,
    `export function mapBatchRow(row: ImportBatchRow): ImportBatch {`,
    `export function mapBatchRow(row: ImportBatchRow): PersistedImportBatch {`,
    "map_batch_return",
  );
  source = replaceOnce(
    source,
    `    committedAt: row.committed_at ?? undefined,
  };`,
    `    committedAt: row.committed_at ?? undefined,
    ...batchProvenanceFromRow(row),
  };`,
    "map_batch_spread",
  );
  source = replaceOnce(
    source,
    `  candidate: InboxCandidate,`,
    `  candidate: PersistedInboxCandidate,`,
    "candidate_insert_type",
  );
  source = replaceOnce(
    source,
    `    import_batch_id: options.importBatchId ?? optionalUuid(candidate.importBatchId ?? undefined),
    local_id: options.localId ?? null,`,
    `    import_batch_id: options.importBatchId ?? optionalUuid(candidate.importBatchId ?? undefined),
    ...candidateProvenanceInsertPatch(candidate),
    local_id: options.localId ?? null,`,
    "candidate_insert_patch",
  );
  source = replaceOnce(
    source,
    `  batch: ImportBatch,`,
    `  batch: PersistedImportBatch,`,
    "batch_insert_type",
  );
  source = replaceOnce(
    source,
    `    column_map: batch.columnMap,
    local_id: options.localId ?? null,`,
    `    column_map: batch.columnMap,
    ...batchProvenanceInsertPatch(batch),
    local_id: options.localId ?? null,`,
    "batch_insert_patch",
  );
  source = replaceOnce(
    source,
    `export function prepareCandidateForServer(input: CreateCandidateInput): InboxCandidate {
  const localId = optionalLocalId(input.id);
  return createCandidate({`,
    `export function prepareCandidateForServer(
  input: CreateCandidateWithProvenanceInput,
): PersistedInboxCandidate {
  const localId = optionalLocalId(input.id);
  const candidate = createCandidate({`,
    "prepare_candidate_header",
  );
  source = replaceOnce(
    source,
    `    createdAt: input.createdAt,
  });
}

export function prepareBatchForServer`,
    `    createdAt: input.createdAt,
  });
  return {
    ...candidate,
    sourceRowIndex: input.sourceRowIndex,
    sourceExternalId: input.sourceExternalId,
    parserVersion: input.parserVersion,
    mappingVersion: input.mappingVersion,
  };
}

export function prepareBatchForServer`,
    "prepare_candidate_return",
  );
  source = replaceOnce(
    source,
    `export function prepareBatchForServer(input: CreateImportBatchInput): ImportBatch {
  const localId = optionalLocalId(input.id);
  return createImportBatch({`,
    `export function prepareBatchForServer(
  input: CreateImportBatchWithProvenanceInput,
): PersistedImportBatch {
  const localId = optionalLocalId(input.id);
  const batch = createImportBatch({`,
    "prepare_batch_header",
  );
  source = replaceOnce(
    source,
    `    committedAt: input.committedAt,
  });
}`,
    `    committedAt: input.committedAt,
  });
  return {
    ...batch,
    parserVersion: input.parserVersion,
    mappingVersion: input.mappingVersion,
  };
}`,
    "prepare_batch_return",
  );
  return source;
}

function patchServerInbox(source) {
  return source
    .replace(
      `"id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at";`,
      `"id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at,source_row_index,source_external_id,fingerprint_version,fingerprint,parser_version,mapping_version,match_status,match_reason,match_confidence,possible_transfer,transfer_pair_id,approved_transaction_id,approved_at";`,
    )
    .replace(
      `"id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at";`,
      `"id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at,parser_version,mapping_version";`,
    );
}

function patchInboxActions(source) {
  source = replaceOnce(
    source,
    `import { isImportBatch } from "@/lib/inbox/import-batch-store";`,
    `import { isImportBatch } from "@/lib/inbox/import-batch-store";
import type {
  CreateCandidateWithProvenanceInput,
  CreateImportBatchWithProvenanceInput,
  PersistedInboxCandidate,
} from "@/lib/inbox/provenance";`,
    "action_provenance_import",
  );
  source = patchServerInbox(source);
  source = replaceOnce(
    source,
    `  importBatchId: z.string().uuid().optional(),
  createdAt: z.string().optional(),`,
    `  importBatchId: z.string().uuid().optional(),
  sourceRowIndex: z.number().int().min(0).optional(),
  sourceExternalId: z.string().trim().min(1).max(200).optional(),
  parserVersion: z.string().trim().min(1).max(80).optional(),
  mappingVersion: z.number().int().min(1).optional(),
  createdAt: z.string().optional(),`,
    "action_candidate_schema",
  );
  source = replaceOnce(
    source,
    `  committedAt: z.string().optional(),
});`,
    `  committedAt: z.string().optional(),
  parserVersion: z.string().trim().min(1).max(80).optional(),
  mappingVersion: z.number().int().min(1).optional(),
});`,
    "action_batch_schema",
  );
  source = source.replaceAll(
    `inputs: CreateCandidateInput[],`,
    `inputs: CreateCandidateWithProvenanceInput[],`,
  );
  source = replaceOnce(
    source,
    `  const prepared: InboxCandidate[] = [];`,
    `  const prepared: PersistedInboxCandidate[] = [];`,
    "action_prepared_type",
  );
  source = source.replaceAll(
    `input: CreateImportBatchInput,`,
    `input: CreateImportBatchWithProvenanceInput,`,
  );
  return source;
}

function patchClientInbox(source) {
  source = replaceOnce(
    source,
    `import { prepareCandidateForServer, prepareBatchForServer } from "@/lib/inbox/inbox-map";`,
    `import { prepareCandidateForServer, prepareBatchForServer } from "@/lib/inbox/inbox-map";
import type {
  CreateCandidateWithProvenanceInput,
  CreateImportBatchWithProvenanceInput,
} from "@/lib/inbox/provenance";`,
    "client_provenance_import",
  );
  source = source.replaceAll(
    `inputs: CreateCandidateInput[],`,
    `inputs: CreateCandidateWithProvenanceInput[],`,
  );
  source = source.replaceAll(
    `input: CreateImportBatchInput,`,
    `input: CreateImportBatchWithProvenanceInput,`,
  );
  source = source.replace(`  type CreateCandidateInput,\n`, "");
  source = source.replace(`  type CreateImportBatchInput,\n`, "");
  return source;
}

const outputs = {
  "src/lib/inbox/inbox-map.ts": patchInboxMap(
    readFileSync("src/lib/inbox/inbox-map.ts", "utf8"),
  ),
  "src/server/inbox.ts": patchServerInbox(
    readFileSync("src/server/inbox.ts", "utf8"),
  ),
  "src/app/actions/inbox.ts": patchInboxActions(
    readFileSync("src/app/actions/inbox.ts", "utf8"),
  ),
  "src/hooks/client-inbox.ts": patchClientInbox(
    readFileSync("src/hooks/client-inbox.ts", "utf8"),
  ),
  "supabase/tests/database/import_provenance_invariants.test.sql": readFileSync(
    "supabase/tests/database/import_provenance_invariants.test.sql",
    "utf8",
  ).replace("select plan(38);", "select plan(39);"),
};

const encoded = Object.fromEntries(
  Object.entries(outputs).map(([path, content]) => [
    path,
    Buffer.from(content, "utf8").toString("base64"),
  ]),
);
console.log(`INBOX_PROVENANCE_MAPPING_BEGIN\n${JSON.stringify(encoded)}\nINBOX_PROVENANCE_MAPPING_END`);
throw new Error("inbox_provenance_mapping_artifact_ready");
