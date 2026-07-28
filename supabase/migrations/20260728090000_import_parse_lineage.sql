-- Preserve statement parse lineage after candidates leave import preview.
-- Existing batches are explicitly marked legacy; source rows cannot be
-- reconstructed safely for candidates that were already committed.

alter table public.import_batches
  add column parser_version text not null default 'legacy-v1'
    constraint import_batches_parser_version_length
      check (char_length(parser_version) between 1 and 64),
  add column mapping_version text not null default 'legacy-v1'
    constraint import_batches_mapping_version_length
      check (char_length(mapping_version) between 1 and 64);

alter table public.inbox_candidates
  add column source_row_index integer
    constraint inbox_candidates_source_row_index_range
      check (
        source_row_index is null
        or source_row_index between 1 and 1000000
      );
