import { z } from "zod";
import {
  ACCOUNT_COLORS,
  ACCOUNT_ICON_NAMES,
  type AccountSummary,
  type SaveAccountInput,
} from "./accounts.ts";
import { SUPPORTED_CURRENCY_CODES } from "./currency.ts";
import { demoAccountRows } from "./demo/transaction-fixtures.ts";

export const DEMO_ACCOUNT_STORAGE_KEY = "moneyflow-demo-accounts-v1";
export const DEMO_ACCOUNT_CHANGE_EVENT = "moneyflow-demo-accounts-changed";
// Same limit as create_financial_account; browser demo has no separate quota.
const ACCOUNT_LIMIT = 30;
const seeds = new Map(demoAccountRows.map((account) => [account.id, account]));
const identity = z
  .string()
  .refine((id) => seeds.has(id) || z.uuid().safeParse(id).success);
const metadataSchema = z
  .object({
    id: identity,
    name: z.string().trim().min(1).max(80),
    kind: z.enum(["cash", "bank", "e_wallet", "credit_card", "savings"]),
    currencyCode: z.enum(SUPPORTED_CURRENCY_CODES),
    initialBalance: z
      .number()
      .int()
      .min(-Number.MAX_SAFE_INTEGER)
      .max(Number.MAX_SAFE_INTEGER),
    isArchived: z.boolean(),
    icon: z.enum(ACCOUNT_ICON_NAMES).nullable(),
    color: z.enum(ACCOUNT_COLORS).nullable(),
  })
  .strict();
const storeSchema = z
  .object({
    version: z.literal(1),
    accounts: z.array(metadataSchema).max(ACCOUNT_LIMIT),
  })
  .strict();
type Metadata = z.infer<typeof metadataSchema>;
type StoragePort = Pick<Storage, "getItem" | "setItem">;
export type DemoAccountState = {
  accounts: AccountSummary[];
  error: string | null;
};
const READ_ERROR =
  "Không đọc được tài khoản demo. Dữ liệu hiện có được giữ nguyên.";

function withAnchor(metadata: Metadata): AccountSummary {
  const seed = seeds.get(metadata.id);
  const balance = seed
    ? seed.balance + metadata.initialBalance - seed.initialBalance
    : metadata.initialBalance;
  if (!Number.isSafeInteger(balance)) throw new Error("unsafe_account_balance");
  if (seed && metadata.currencyCode !== seed.currencyCode)
    throw new Error("immutable_currency");
  return { ...metadata, balance };
}

export function parseDemoAccounts(raw: string | null): DemoAccountState {
  if (raw === null)
    return {
      accounts: demoAccountRows.map((account) => ({ ...account })),
      error: null,
    };
  try {
    const stored = storeSchema.parse(JSON.parse(raw));
    if (
      new Set(stored.accounts.map(({ id }) => id)).size !==
      stored.accounts.length
    ) {
      throw new Error("duplicate_account_id");
    }
    return { accounts: stored.accounts.map(withAnchor), error: null };
  } catch {
    // Corrupt data is preserved; never reset or overwrite it with seed records.
    return { accounts: [], error: READ_ERROR };
  }
}

export function readDemoAccounts(
  storage: Pick<Storage, "getItem">,
): DemoAccountState {
  try {
    return parseDemoAccounts(storage.getItem(DEMO_ACCOUNT_STORAGE_KEY));
  } catch {
    return { accounts: [], error: READ_ERROR };
  }
}

function persist(
  accounts: AccountSummary[],
  storage: StoragePort,
): DemoAccountState {
  try {
    const metadata = accounts.map(({ balance, ...account }) => {
      void balance;
      return account;
    });
    const value = storeSchema.parse({ version: 1, accounts: metadata });
    const raw = JSON.stringify(value);
    const checked = parseDemoAccounts(raw);
    if (checked.error) return checked;
    storage.setItem(DEMO_ACCOUNT_STORAGE_KEY, raw);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event(DEMO_ACCOUNT_CHANGE_EVENT));
    return checked;
  } catch {
    return {
      accounts: [],
      error:
        "Không lưu được tài khoản demo. Hãy thử lại; dữ liệu trước đó vẫn được giữ nguyên.",
    };
  }
}

export function saveDemoAccount(
  input: SaveAccountInput,
  storage: StoragePort,
  newId = () => crypto.randomUUID(),
): DemoAccountState {
  const current = readDemoAccounts(storage);
  if (current.error) return current;
  const existing = input.id
    ? current.accounts.find(({ id }) => id === input.id)
    : undefined;
  if (input.id && !existing)
    return { accounts: [], error: "Không tìm thấy tài khoản demo." };
  let id: string;
  try {
    id = existing?.id ?? newId();
  } catch {
    return {
      accounts: [],
      error: "Không tạo được mã tài khoản demo. Hãy thử lại.",
    };
  }
  const next = {
    id,
    name: input.name,
    kind: input.kind,
    currencyCode: existing?.currencyCode ?? input.currencyCode ?? "VND",
    initialBalance: input.initialBalance,
    isArchived: existing?.isArchived ?? false,
    icon: input.icon === undefined ? (existing?.icon ?? null) : input.icon,
    color: input.color === undefined ? (existing?.color ?? null) : input.color,
    balance: input.initialBalance,
  };
  return persist(
    existing
      ? current.accounts.map((account) =>
          account.id === existing.id ? next : account,
        )
      : [...current.accounts, next],
    storage,
  );
}

export function archiveDemoAccount(
  id: string,
  archived: boolean,
  storage: StoragePort,
): DemoAccountState {
  const current = readDemoAccounts(storage);
  if (current.error) return current;
  if (!current.accounts.some((account) => account.id === id))
    return { accounts: [], error: "Không tìm thấy tài khoản demo." };
  if (
    archived &&
    current.accounts.filter((account) => !account.isArchived).length === 1 &&
    current.accounts.some((account) => account.id === id && !account.isArchived)
  ) {
    return {
      accounts: [],
      error: "Cần giữ lại ít nhất một tài khoản hoạt động.",
    };
  }
  return persist(
    current.accounts.map((account) =>
      account.id === id ? { ...account, isArchived: archived } : account,
    ),
    storage,
  );
}
