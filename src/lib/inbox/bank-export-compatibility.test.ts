import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  BANK_EXPORT_PROVIDERS,
  canUseBankSpecificAutoMap,
  getBankExportCompatibility,
  listBankExportCompatibility,
  sourceExternalIdFromProviderReference,
  type BankExportProvider,
} from "./bank-export-compatibility.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type EvidenceFixture = {
  provider: BankExportProvider;
  containsCustomerData: boolean;
  artifact: {
    format: "excel" | "csv" | "pdf" | "unknown";
    evidence: "confirmed" | "observed-but-unverified" | "unknown";
  };
  layout: {
    headers: string[];
    evidence: "confirmed" | "observed-but-unverified" | "unknown";
    bankSpecificAutoMapSupported: boolean;
  };
  transactionReference: {
    field: string | null;
    stability: "source-stable" | "display-only" | "export-local" | "unknown";
    evidence: "confirmed" | "observed-but-unverified" | "unknown";
  };
  syntheticRows: unknown[];
};

function readEvidenceFixture(provider: BankExportProvider): EvidenceFixture {
  const raw = readFileSync(
    join(fixturesDir, `${provider}-export-evidence.fixture.json`),
    "utf8",
  );
  return JSON.parse(raw) as EvidenceFixture;
}

test("Phase A compatibility inventory covers exactly the three selected banks", () => {
  assert.deepEqual(BANK_EXPORT_PROVIDERS, ["vietcombank", "acb", "vietinbank"]);
  assert.deepEqual(
    listBankExportCompatibility().map((item) => item.provider),
    BANK_EXPORT_PROVIDERS,
  );
});

test("VCB and ACB Excel availability is confirmed without claiming file extension or exported headers", () => {
  for (const provider of ["vietcombank", "acb"] as const) {
    const profile = getBankExportCompatibility(provider);
    assert.equal(profile.artifactFormat.value, "excel");
    assert.equal(profile.artifactFormat.evidence, "confirmed");
    assert.equal(profile.layoutHeaders.value, null);
    assert.equal(profile.layoutHeaders.evidence, "unknown");
    assert.equal(profile.bankSpecificAutoMapSupported, false);
    assert.equal(canUseBankSpecificAutoMap(provider), false);
  }
});

test("VietinBank stays unknown for target downloadable file format", () => {
  const profile = getBankExportCompatibility("vietinbank");
  assert.equal(profile.statementOrHistoryAvailable.value, true);
  assert.equal(profile.statementOrHistoryAvailable.evidence, "confirmed");
  assert.equal(profile.artifactFormat.value, "unknown");
  assert.equal(profile.artifactFormat.evidence, "unknown");
  assert.equal(canUseBankSpecificAutoMap("vietinbank"), false);
});

test("display/UI transaction references never become sourceExternalId", () => {
  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "5078-5253",
      evidence: "observed-but-unverified",
      stability: "display-only",
    }),
    undefined,
  );

  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "row-12",
      evidence: "confirmed",
      stability: "export-local",
    }),
    undefined,
  );

  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "fnv-preview-hash",
      evidence: "confirmed",
      stability: "unknown",
    }),
    undefined,
  );
});

test("only a non-empty confirmed source-stable reference is eligible for sourceExternalId", () => {
  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "  provider-stable-123  ",
      evidence: "confirmed",
      stability: "source-stable",
    }),
    "provider-stable-123",
  );
  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "   ",
      evidence: "confirmed",
      stability: "source-stable",
    }),
    undefined,
  );
  assert.equal(
    sourceExternalIdFromProviderReference({
      value: "provider-stable-123",
      evidence: "observed-but-unverified",
      stability: "source-stable",
    }),
    undefined,
  );
});

test("evidence fixtures contain no customer rows and match conservative runtime profiles", () => {
  for (const provider of BANK_EXPORT_PROVIDERS) {
    const fixture = readEvidenceFixture(provider);
    const profile = getBankExportCompatibility(provider);

    assert.equal(fixture.provider, provider);
    assert.equal(fixture.containsCustomerData, false);
    assert.deepEqual(fixture.syntheticRows, []);
    assert.deepEqual(fixture.layout.headers, []);
    assert.equal(fixture.layout.bankSpecificAutoMapSupported, false);
    assert.equal(fixture.artifact.format, profile.artifactFormat.value);
    assert.equal(fixture.artifact.evidence, profile.artifactFormat.evidence);
    assert.equal(canUseBankSpecificAutoMap(provider), false);
  }
});

test("guidance stays on generic import/review and does not claim live bank sync", () => {
  for (const profile of listBankExportCompatibility()) {
    assert.match(profile.guidance, /import|mapping|parser|review/i);
    assert.doesNotMatch(profile.guidance, /đã kết nối|live sync|đồng bộ tự động/i);
  }
});
