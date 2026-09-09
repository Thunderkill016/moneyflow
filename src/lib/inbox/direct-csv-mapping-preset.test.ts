import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
  DIRECT_CSV_MAPPING_PRESET_STORAGE_KEY,
  createDirectCsvMappingPreset,
  directCsvHeaderShape,
  readDirectCsvMappingPreset,
  resolveDirectCsvMappingPreset,
  writeDirectCsvMappingPreset,
  type DirectCsvMappingSemanticContext,
} from "./direct-csv-mapping-preset.ts";

const headers = [" Ngày ", "Mô tả", "Số tiền"];
const mapping = {
  date: 0,
  amount: 2,
  desc: 1,
  debit: null,
  credit: null,
};

test("header shape is normalized but remains structural evidence only", () => {
  assert.equal(
    directCsvHeaderShape(["\uFEFF NGÀY", "  Mô   tả ", "SỐ TIỀN"]),
    directCsvHeaderShape(["ngày", "mô tả", "số tiền"]),
  );
});

test("current semantic context resolves an explicitly remembered mapping", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  assert.deepEqual(resolveDirectCsvMappingPreset(headers, preset), mapping);
  assert.equal(preset.parserVersion, CURRENT_DIRECT_CSV_MAPPING_CONTEXT.parserVersion);
  assert.equal(preset.mappingVersion, CURRENT_DIRECT_CSV_MAPPING_CONTEXT.mappingVersion);
});

test("equal headers fail closed when parser semantics change", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  const changedParser: DirectCsvMappingSemanticContext = {
    ...CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
    parserVersion: "csv_import@2.0",
  };
  assert.equal(resolveDirectCsvMappingPreset(headers, preset, changedParser), null);
});

test("equal headers fail closed when mapping contract changes", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  const changedMapping: DirectCsvMappingSemanticContext = {
    ...CURRENT_DIRECT_CSV_MAPPING_CONTEXT,
    mappingVersion: CURRENT_DIRECT_CSV_MAPPING_CONTEXT.mappingVersion + 1,
  };
  assert.equal(resolveDirectCsvMappingPreset(headers, preset, changedMapping), null);
});

test("different structural headers cannot reuse the preset", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  assert.equal(
    resolveDirectCsvMappingPreset(["Ngày", "Mô tả", "Ghi nợ", "Ghi có"], preset),
    null,
  );
});

test("legacy v1 storage is not silently promoted into v2 authority", () => {
  const legacy = JSON.stringify({
    version: 1,
    headerShape: directCsvHeaderShape(headers),
    columnMap: mapping,
  });
  assert.equal(readDirectCsvMappingPreset(legacy, headers), null);
});

test("invalid stored mapping fails closed", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  const raw = JSON.stringify({
    ...preset,
    columnMap: { ...mapping, amount: 9 },
  });
  assert.equal(readDirectCsvMappingPreset(raw, headers), null);
});

test("stored preset contains only structural mapping and version evidence", () => {
  const preset = createDirectCsvMappingPreset(headers, mapping);
  assert.ok(preset);
  let key = "";
  let raw = "";
  writeDirectCsvMappingPreset(
    {
      setItem(nextKey, nextValue) {
        key = nextKey;
        raw = nextValue;
      },
    },
    preset,
  );
  assert.equal(key, DIRECT_CSV_MAPPING_PRESET_STORAGE_KEY);
  const stored = JSON.parse(raw) as Record<string, unknown>;
  assert.deepEqual(Object.keys(stored).sort(), [
    "columnMap",
    "headerShape",
    "mappingVersion",
    "parserVersion",
    "version",
  ]);
  assert.equal("fileName" in stored, false);
  assert.equal("accountId" in stored, false);
  assert.equal("bank" in stored, false);
  assert.deepEqual(readDirectCsvMappingPreset(raw, headers), mapping);
});
