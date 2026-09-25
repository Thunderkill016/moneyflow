# Encrypted backup option (client-side passphrase seal)

**Status:** implementing
**Execution state:** implemented, verified locally
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent pending owner review
**Issue/PR:** PR opened on `feat/backup-encryption`
**Last updated:** 2026-09-25

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe
evidence and next allowed actions, not percentage complete.

## Outcome

`/settings/backup` gains an opt-in "Mã hóa bằng mật khẩu" step: the downloaded
archive is sealed AES-256-GCM with a PBKDF2-derived key before it leaves the
browser. The verify and restore pickers detect the sealed envelope, ask for the
passphrase once, and feed decrypted bytes through the *same* archive ingress a
plain file uses. No server surface changes; the passphrase never leaves the
client.

## Repository reconnaissance

- `/settings/backup` produces a complete JSON archive via
  `createArchiveBackupAction` → browser download of `serializeArchive` bytes;
  restore and verify read file bytes once, then cross
  `ingestArchiveBytes`/`verifyArchiveBytes` — one untrusted boundary each.
- `ARCHIVE_MAX_RESTORE_BYTES` bounds the picked file before upload because the
  server action transport caps at 4 MB.
- Demo viewers cannot create or restore (no server archive); verify is
  demo-allowed because it inspects locally and writes nothing.
- No encryption existed anywhere: `grep -n "encrypt|crypto|AES" src/lib/archive`
  was empty before this packet; the envelope is additive — plain archives and
  their validators are untouched.

## Research

- **Web Crypto `crypto.subtle`** (PBKDF2 + AES-GCM): zero-dependency, available
  in every secure-context browser, gives authenticated encryption — a wrong
  passphrase and a tampered file fail identically, which is the honest answer.
- **OWASP Password Storage Cheat Sheet**: PBKDF2-SHA-256 floor ~210k
  iterations; this uses 250k (sub-second on a phone, files are opened rarely).
- Rejected: a custom container (`.enc` binary blob) — a JSON envelope keeps the
  file self-describing and reuses the `.json` picker contract; sodium/libsodium
  — an extra dependency for primitives Web Crypto already supplies natively.

## Specification

- Envelope: `{format:"moneyflow-backup-encrypted", version:1, kdf:{name:"PBKDF2",
  hash:"SHA-256",iterations:250000,salt:b64}, cipher:{name:"AES-GCM",iv:b64},
  data:b64}` — carries everything needed to decrypt except the passphrase.
- Fresh 16-byte salt + 12-byte IV per seal; filename
  `moneyflow-ban-sao-luu-ma-hoa-<day>.json` discloses encryption.
- `decrypt_failed` is the single open-failure code — GCM cannot distinguish
  wrong passphrase from tampering and the UI must not pretend otherwise.
- UI passphrase floor: 8 characters (create side only; open side retries any).
- Verify path works in demo (local inspection only); restore/create stay
  authenticated exactly as before.

## Implementation plan

- `src/lib/archive/backup-encryption.ts`: `isEncryptedBackupBytes`,
  `encryptBackupBytes`, `decryptBackupBytes` — pure envelope crypto.
- `archive-backup.ts`: `encryptedBackupFileName` beside `backupFileName`.
- `backup-settings-page.tsx`: opt-in checkbox + passphrase field on create;
  `needsPassphrase` state on both file pickers; `acceptPlainBytes` /
  `acceptVerifyPlainBytes` keep a single ingress boundary.

## Tasks

1. TDD: round-trip, fresh salt/IV, wrong-pass, tamper, malformed-envelope,
   empty-pass tests. ✅ 7/7
2. Domain module + filename. ✅
3. Component wiring (create seal, two open paths). ✅
4. Contract tests pinning opt-in, detection-before-ingress, undifferentiated
   failure, passphrase never reaching server code. ✅
5. Browser-verify open flow in demo; static gates; PR + memory record. ◐

## Evaluation

- `node --test`: backup-encryption 7/7; archive-backup 31/31; full suite
  1919/1919.
- typecheck, eslint, architecture, css-ownership, knowledge: pass.
- Browser (demo, /settings/backup): encrypted file → passphrase prompt; wrong
  passphrase → undifferentiated error with retry kept; right passphrase →
  decrypted → archive validator reached; plain file skips the step. The create
  seal path is auth-gated, so it is covered by unit/contract tests plus code
  review — stated, not claimed as browser-verified.
- Remaining: authenticated create-seal browser pass on the preview lane.
