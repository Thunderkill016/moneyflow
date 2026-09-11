# Privacy-safe bank-export evidence runbook

This runbook supports GitHub #576 / Plate THU-46. It is for **local evidence collection only** from XLS/XLSX bank exports. It does not authorize committing statement files, personal financial content, or bank-specific identity assumptions.

## Goal

Collect enough repeatable evidence to compare two overlapping exports without copying raw transaction content into GitHub, Plate, chat, CI, or repository history.

For reference-stability questions, use two exports that you independently know came from the **same bank account and same export mode**, with overlapping date windows. The command cannot prove that context for you.

## Run locally

```bash
npm run evidence:bank-export -- /local/path/window-a.xlsx /local/path/window-b.xlsx
```

One file is also supported when only structural inspection is needed:

```bash
npm run evidence:bank-export -- /local/path/statement.xlsx
```

The command reads the files locally in memory and prints JSON to stdout. It does not upload the workbook or write an evidence file automatically.

## Safe output contract

The returned JSON is designed to be safe to paste into the #576 / THU-46 evidence record. It includes only:

- structural workbook inspection already exposed by `XlsxPilotInspection`;
- parse success and aggregate candidate/warning/confidence/uncertainty counts;
- for two files, aggregate overlap / left-only / right-only candidate counts computed with MoneyFlow's current client heuristic fingerprint in memory.

It intentionally excludes:

- real filenames and paths;
- sheet names and raw rows;
- transaction amounts and descriptions;
- account identifiers;
- source references;
- per-row fingerprints or hashes.

Do **not** paste the original statement, screenshots of its transaction table, raw parser output, or manually copied transaction values into project records.

## How to interpret overlap

`same-account-client-fingerprint-v1` is only heuristic normalized-overlap evidence. A shared count can show that the current MoneyFlow reconciliation material survives two overlapping exports. It does **not** prove that a bank reference is stable, provider-guaranteed, or safe to persist as `sourceExternalId`.

A lower-than-expected overlap count is useful negative evidence: compare the files locally to determine whether date, amount, description/reference formatting, or other fingerprint material changed. Record only the conclusion and the privacy-safe aggregate report.

The identity invariant remains unchanged: only `confirmed + source-stable` evidence may become persisted `sourceExternalId`. Bank-specific auto-map remains disabled until the separate THU-46 evidence requirements are met.
