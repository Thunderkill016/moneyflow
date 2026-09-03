export type BankExportProvider = "vietcombank" | "acb" | "vietinbank";

export type BankExportEvidenceLevel =
  | "confirmed"
  | "observed-but-unverified"
  | "unknown";

export type BankExportArtifactFormat = "xlsx" | "csv" | "pdf" | "unknown";

export type BankExportReferenceStability =
  | "source-stable"
  | "display-only"
  | "export-local"
  | "unknown";

export type BankExportEvidence<T> = {
  value: T | null;
  evidence: BankExportEvidenceLevel;
  scope: string;
};

export type BankExportReferenceEvidence = {
  value: string;
  evidence: BankExportEvidenceLevel;
  stability: BankExportReferenceStability;
};

export type BankExportCompatibility = {
  provider: BankExportProvider;
  displayName: string;
  statementOrHistoryAvailable: BankExportEvidence<boolean>;
  artifactFormat: BankExportEvidence<BankExportArtifactFormat>;
  layoutHeaders: BankExportEvidence<readonly string[]>;
  dateTimezone: BankExportEvidence<string>;
  currency: BankExportEvidence<string>;
  debitCreditDirection: BankExportEvidence<string>;
  transactionStatus: BankExportEvidence<string>;
  transactionReference: BankExportEvidence<BankExportReferenceStability>;
  feeRepresentation: BankExportEvidence<string>;
  overlapDedupe: BankExportEvidence<string>;
  bankSpecificAutoMapSupported: boolean;
  guidance: string;
  sourceUrls: readonly string[];
};

export const BANK_EXPORT_PROVIDERS: readonly BankExportProvider[] = [
  "vietcombank",
  "acb",
  "vietinbank",
];

const COMPATIBILITY: Record<BankExportProvider, BankExportCompatibility> = {
  vietcombank: {
    provider: "vietcombank",
    displayName: "Vietcombank",
    statementOrHistoryAvailable: {
      value: true,
      evidence: "confirmed",
      scope: "VCB Digibank account transaction-history workflow",
    },
    artifactFormat: {
      value: "xlsx",
      evidence: "confirmed",
      scope: "VCB Digibank history guide says “Xuất excel” after search",
    },
    layoutHeaders: {
      value: null,
      evidence: "unknown",
      scope: "No current exported-file header schema was established",
    },
    dateTimezone: {
      value: "Transaction/system dates are visible in first-party UI material; export timezone semantics are unknown",
      evidence: "observed-but-unverified",
      scope: "VCB Digibank history UI, not an exported-file contract",
    },
    currency: {
      value: null,
      evidence: "unknown",
      scope: "Visible examples include VND but account/export currency semantics were not established",
    },
    debitCreditDirection: {
      value: "UI separates Tiền vào / Tiền ra",
      evidence: "observed-but-unverified",
      scope: "VCB Digibank history UI, not exported headers",
    },
    transactionStatus: {
      value: null,
      evidence: "unknown",
      scope: "No export lifecycle/status field established",
    },
    transactionReference: {
      value: "display-only",
      evidence: "observed-but-unverified",
      scope: "UI displays Số tham chiếu; stability across exports is unproven",
    },
    feeRepresentation: {
      value: null,
      evidence: "unknown",
      scope: "No exported fee-row/field contract established",
    },
    overlapDedupe: {
      value: null,
      evidence: "unknown",
      scope: "No stable-ID or overlapping-export contract established",
    },
    bankSpecificAutoMapSupported: false,
    guidance:
      "VCB Digibank có Xuất Excel lịch sử giao dịch, nhưng MoneyFlow chưa xác minh cấu trúc cột hoặc mã giao dịch ổn định. Hãy dùng luồng import chung và kiểm tra mapping/dry-run trước khi ghi sổ.",
    sourceUrls: [
      "https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsd-ib/pages/vi/tinh-nang-giao-dich-ngan-hang/tai-khoan/3-lich-su-giao-dich.html",
      "https://digibankm5.vietcombank.com.vn/get_file/ibomni/html/hdsdib/hdsd.pdf",
    ],
  },
  acb: {
    provider: "acb",
    displayName: "ACB",
    statementOrHistoryAvailable: {
      value: true,
      evidence: "confirmed",
      scope: "ACB ONE history and store-management transaction-history workflows",
    },
    artifactFormat: {
      value: "xlsx",
      evidence: "confirmed",
      scope: "ACB first-party store-management/payment-account guidance documents Excel download",
    },
    layoutHeaders: {
      value: null,
      evidence: "unknown",
      scope: "Store-management export evidence cannot be generalized to every personal-account layout",
    },
    dateTimezone: {
      value: null,
      evidence: "unknown",
      scope: "Exact exported date/time/timezone contract was not established",
    },
    currency: {
      value: null,
      evidence: "unknown",
      scope: "No universal exported currency-field contract established",
    },
    debitCreditDirection: {
      value: null,
      evidence: "unknown",
      scope: "No exact exported debit/credit/sign convention established",
    },
    transactionStatus: {
      value: "ACB ONE history UI documents đã thực hiện / chờ xử lý / đặt lịch",
      evidence: "observed-but-unverified",
      scope: "UI history states; not proven to be exported statement fields",
    },
    transactionReference: {
      value: "unknown",
      evidence: "unknown",
      scope: "No provider-stable exported transaction reference established",
    },
    feeRepresentation: {
      value: null,
      evidence: "unknown",
      scope: "No exported fee-row/field contract established",
    },
    overlapDedupe: {
      value: null,
      evidence: "unknown",
      scope: "No stable-ID or overlapping-export contract established",
    },
    bankSpecificAutoMapSupported: false,
    guidance:
      "ACB có luồng tải lịch sử/sao kê Excel trong tài liệu first-party, nhưng cấu trúc consumer export chưa được xác minh. MoneyFlow chỉ dùng parser/mapping chung và không suy diễn trạng thái hay mã giao dịch từ file chưa xác minh.",
    sourceUrls: [
      "https://acb.com.vn/giai-phap-quan-ly-cua-hang",
      "https://acb.com.vn/acbwebsite/files/ACB_HDSD_Quanlycuahang.pdf",
      "https://acb.com.vn/thu-vien/nhung-cau-hoi-thuong-gap-khi-tao-tai-khoan-ngan-hang-online",
    ],
  },
  vietinbank: {
    provider: "vietinbank",
    displayName: "VietinBank",
    statementOrHistoryAvailable: {
      value: true,
      evidence: "confirmed",
      scope: "Current VietinBank card terms/guidance describe statements/history and iPay access",
    },
    artifactFormat: {
      value: "unknown",
      evidence: "unknown",
      scope: "No target consumer-account downloadable file format was established",
    },
    layoutHeaders: {
      value: null,
      evidence: "unknown",
      scope: "No current exported-file header schema established",
    },
    dateTimezone: {
      value: "Current card material distinguishes posting-date concepts",
      evidence: "observed-but-unverified",
      scope: "Card statement/history concepts; not a target export contract",
    },
    currency: {
      value: null,
      evidence: "unknown",
      scope: "No target export currency-field contract established",
    },
    debitCreditDirection: {
      value: null,
      evidence: "unknown",
      scope: "No target export debit/credit/sign convention established",
    },
    transactionStatus: {
      value: null,
      evidence: "unknown",
      scope: "No downloadable source-lifecycle/status field established",
    },
    transactionReference: {
      value: "unknown",
      evidence: "unknown",
      scope: "No provider-stable exported transaction reference established",
    },
    feeRepresentation: {
      value: "Card statements can include fees",
      evidence: "observed-but-unverified",
      scope: "Current card statement concept; not a target consumer-account export layout",
    },
    overlapDedupe: {
      value: null,
      evidence: "unknown",
      scope: "No stable-ID or overlapping-export contract established",
    },
    bankSpecificAutoMapSupported: false,
    guidance:
      "MoneyFlow xác nhận VietinBank có lịch sử/sao kê ở các luồng first-party đã nghiên cứu, nhưng chưa xác minh định dạng file export cho tài khoản mục tiêu. Không bật auto-map theo ngân hàng; nếu có file CSV/Excel, dùng luồng import chung và review mapping.",
    sourceUrls: [
      "https://www.vietinbank.vn/assets/cfa87952-5eb4-496d-b780-5b21335ba19f",
      "https://www.vietinbank.vn/assets/9a43a89d-a5c7-4655-8e28-2871c449359b",
    ],
  },
};

export function getBankExportCompatibility(
  provider: BankExportProvider,
): BankExportCompatibility {
  return COMPATIBILITY[provider];
}

export function listBankExportCompatibility(): BankExportCompatibility[] {
  return BANK_EXPORT_PROVIDERS.map((provider) => COMPATIBILITY[provider]);
}

export function sourceExternalIdFromProviderReference(
  reference: BankExportReferenceEvidence | null | undefined,
): string | undefined {
  if (!reference) return undefined;
  const value = reference.value.trim();
  if (!value) return undefined;
  if (reference.evidence !== "confirmed") return undefined;
  if (reference.stability !== "source-stable") return undefined;
  return value;
}

export function canUseBankSpecificAutoMap(
  provider: BankExportProvider,
): boolean {
  const compatibility = getBankExportCompatibility(provider);
  return (
    compatibility.bankSpecificAutoMapSupported &&
    compatibility.artifactFormat.evidence === "confirmed" &&
    compatibility.artifactFormat.value !== null &&
    compatibility.artifactFormat.value !== "unknown" &&
    compatibility.layoutHeaders.evidence === "confirmed" &&
    Array.isArray(compatibility.layoutHeaders.value) &&
    compatibility.layoutHeaders.value.length > 0
  );
}
