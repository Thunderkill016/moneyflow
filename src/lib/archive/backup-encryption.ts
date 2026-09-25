/**
 * Optional passphrase encryption for downloaded backups.
 *
 * The backup file is the user's own financial history in one JSON document —
 * the exact artifact that should not sit readable in a shared downloads
 * folder or cloud drive. Encryption happens entirely client-side with Web
 * Crypto: the server action never sees the passphrase, and the restore path
 * feeds decrypted bytes into the same ingress a plain file uses.
 *
 * Format: a plain-JSON envelope so the file stays self-describing and a
 * wrong tool can still report what it is looking at.
 *
 *   { format: "moneyflow-backup-encrypted", version: 1,
 *     kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt },
 *     cipher: { name: "AES-GCM", iv },
 *     data }
 *
 * AES-GCM's auth tag means a wrong passphrase and a tampered file are
 * indistinguishable — the failure code says exactly that, never guesses.
 */

export const ENCRYPTED_BACKUP_FORMAT = "moneyflow-backup-encrypted";
export const ENCRYPTED_BACKUP_VERSION = 1;

/**
 * PBKDF2-SHA-256 at 250k iterations: above the OWASP 2023 floor (210k) while
 * staying under a second on a mid-range phone — the file is opened rarely,
 * the cost is spent every open.
 */
export const ENCRYPTED_BACKUP_KDF_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // NIST-recommended AES-GCM IV length.

export type BackupDecryptResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | {
      readonly ok: false;
      readonly code:
        | "decrypt_failed" // wrong passphrase or tampered file — GCM cannot tell which
        | "unsupported_envelope";
    };

type Envelope = {
  format: string;
  version: number;
  kdf: { name: string; hash: string; iterations: number; salt: string };
  cipher: { name: string; iv: string };
  data: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked to stay under call-stack limits on multi-MB archives.
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8_192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8_192));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function readEnvelope(bytes: Uint8Array): Envelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<Envelope>;
  if (candidate.format !== ENCRYPTED_BACKUP_FORMAT) return null;
  return candidate as Envelope;
}

/**
 * Detect an encrypted-backup file without committing to its inner structure.
 * A plain archive and an encrypted one are both JSON, so the discriminator is
 * the `format` member — a shallow parse, not a guess from bytes.
 */
export function isEncryptedBackupBytes(bytes: Uint8Array): boolean {
  return readEnvelope(bytes) !== null;
}

function isSupportedEnvelope(envelope: Envelope): boolean {
  return (
    envelope.version === ENCRYPTED_BACKUP_VERSION &&
    envelope.kdf?.name === "PBKDF2" &&
    envelope.kdf?.hash === "SHA-256" &&
    Number.isSafeInteger(envelope.kdf?.iterations) &&
    envelope.kdf.iterations >= 1 &&
    envelope.kdf.iterations <= 10_000_000 &&
    typeof envelope.kdf?.salt === "string" &&
    envelope.cipher?.name === "AES-GCM" &&
    typeof envelope.cipher?.iv === "string" &&
    typeof envelope.data === "string"
  );
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Seal plaintext backup bytes into an encrypted-envelope JSON document.
 * A fresh salt and IV per call — two backups with the same passphrase never
 * share key stream.
 */
export async function encryptBackupBytes(
  plainBytes: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  if (!passphrase.trim()) {
    throw new Error("empty_passphrase");
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, ENCRYPTED_BACKUP_KDF_ITERATIONS);
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plainBytes as BufferSource,
  );
  const envelope: Envelope = {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: ENCRYPTED_BACKUP_KDF_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: { name: "AES-GCM", iv: bytesToBase64(iv) },
    data: bytesToBase64(new Uint8Array(sealed)),
  };
  return new TextEncoder().encode(JSON.stringify(envelope));
}

/**
 * Open an encrypted-envelope backup back to plaintext archive bytes.
 * Output still crosses `ingestArchiveBytes` / `verifyArchiveBytes` before it
 * is trusted — decryption proves the passphrase, not archive validity.
 */
export async function decryptBackupBytes(
  envelopeBytes: Uint8Array,
  passphrase: string,
): Promise<BackupDecryptResult> {
  const envelope = readEnvelope(envelopeBytes);
  if (!envelope || !isSupportedEnvelope(envelope)) {
    return { ok: false, code: "unsupported_envelope" };
  }
  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const data = base64ToBytes(envelope.data);
  if (!salt || !iv || !data || iv.length !== IV_BYTES || data.length === 0) {
    return { ok: false, code: "unsupported_envelope" };
  }
  try {
    const key = await deriveKey(passphrase, salt, envelope.kdf.iterations);
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    return { ok: true, bytes: new Uint8Array(opened) };
  } catch {
    // One honest code: GCM's tag fails identically for a wrong key and a
    // modified payload — claiming which one would be a lie about the crypto.
    return { ok: false, code: "decrypt_failed" };
  }
}
