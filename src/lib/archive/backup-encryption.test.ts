import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptBackupBytes,
  encryptBackupBytes,
  isEncryptedBackupBytes,
} from "./backup-encryption.ts";

const enc = new TextEncoder();
const dec = new TextDecoder();

function utf8(text: string): Uint8Array {
  return enc.encode(text);
}

test("encrypt → detect → decrypt round-trips the archive bytes exactly", async () => {
  const plain = utf8('{"archive_version":1,"hello":"tiền"}');
  const sealed = await encryptBackupBytes(plain, "mat-khau-manh-123");

  assert.equal(isEncryptedBackupBytes(sealed), true);
  // The envelope itself must carry everything needed to decrypt except the
  // passphrase — and stay plain JSON so the file type is self-describing.
  const envelope = JSON.parse(dec.decode(sealed)) as Record<string, unknown>;
  assert.equal(envelope.format, "moneyflow-backup-encrypted");
  assert.equal(envelope.version, 1);

  const opened = await decryptBackupBytes(sealed, "mat-khau-manh-123");
  assert.ok(opened.ok);
  assert.deepEqual([...opened.bytes], [...plain]);
});

test("encryption produces a fresh salt and iv every run", async () => {
  const plain = utf8("{}");
  const a = JSON.parse(dec.decode(await encryptBackupBytes(plain, "pw-12345678")));
  const b = JSON.parse(dec.decode(await encryptBackupBytes(plain, "pw-12345678")));
  assert.notEqual(a.kdf.salt, b.kdf.salt);
  assert.notEqual(a.cipher.iv, b.cipher.iv);
  assert.notEqual(a.data, b.data);
});

test("a wrong passphrase fails without revealing which part was wrong", async () => {
  const sealed = await encryptBackupBytes(utf8("secret"), "dung-12345678");
  const opened = await decryptBackupBytes(sealed, "sai-12345678");
  assert.ok(!opened.ok);
  assert.equal(opened.code, "decrypt_failed");
});

test("a tampered ciphertext fails the same way as a wrong passphrase", async () => {
  const sealed = await encryptBackupBytes(utf8("secret data"), "pw-12345678");
  const envelope = JSON.parse(dec.decode(sealed));
  const raw = atob(envelope.data).split("").map((c) => c.charCodeAt(0));
  raw[0] ^= 0xff;
  envelope.data = btoa(String.fromCharCode(...raw));
  const tampered = utf8(JSON.stringify(envelope));

  const opened = await decryptBackupBytes(tampered, "pw-12345678");
  assert.ok(!opened.ok);
  assert.equal(opened.code, "decrypt_failed");
});

test("detection refuses plain archives and arbitrary JSON", () => {
  assert.equal(isEncryptedBackupBytes(utf8('{"archive_version":1}')), false);
  assert.equal(isEncryptedBackupBytes(utf8('{"format":"other"}')), false);
  assert.equal(isEncryptedBackupBytes(utf8("not json at all")), false);
});

test("a malformed envelope fails closed instead of guessing", async () => {
  for (const broken of [
    '{"format":"moneyflow-backup-encrypted"}',
    '{"format":"moneyflow-backup-encrypted","version":2,"kdf":{},"cipher":{},"data":""}',
    '{"format":"moneyflow-backup-encrypted","version":1,"kdf":{"name":"PBKDF2","hash":"SHA-1","iterations":250000,"salt":"AA=="},"cipher":{"name":"AES-GCM","iv":"AA=="},"data":"AA=="}',
    '{"format":"moneyflow-backup-encrypted","version":1,"kdf":{"name":"scrypt","hash":"SHA-256","iterations":250000,"salt":"AA=="},"cipher":{"name":"AES-GCM","iv":"AA=="},"data":"AA=="}',
  ]) {
    const opened = await decryptBackupBytes(utf8(broken), "pw-12345678");
    assert.ok(!opened.ok, broken);
    assert.equal(opened.code, "unsupported_envelope", broken);
  }
});

test("an empty passphrase is refused before doing crypto work", async () => {
  const sealed = encryptBackupBytes(utf8("x"), "  ");
  await assert.rejects(sealed, /empty_passphrase/);
});
