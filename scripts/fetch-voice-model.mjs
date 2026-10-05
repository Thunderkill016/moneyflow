/**
 * Fetch the Vosk Vietnamese speech model at build/dev time.
 *
 * Why not commit the 33MB binary to git: it cannot be pushed through the
 * GitHub API used by this project's automation, and it bloats every clone.
 * Instead this script downloads the official .zip from alphacephei.com once
 * per build machine, converts it to the .tar.gz layout vosk-browser expects,
 * and drops it into public/models/ (git-ignored).
 *
 * Idempotent: skips the download when a valid tarball already exists.
 * Pure Node.js, zero dependencies, zero external tools.
 *
 * Usage: node scripts/fetch-voice-model.mjs
 * Wired as `prebuild` and into `dev` in package.json.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { gzipSync, inflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_VERSION = "vosk-model-small-vn-0.4";
const ZIP_URL = `https://alphacephei.com/vosk/models/${MODEL_VERSION}.zip`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "models");
const OUT_FILE = join(OUT_DIR, `${MODEL_VERSION}.tar.gz`);
// Sanity floor: the real model tarball is ~33MB. Anything far smaller is corrupt.
const MIN_TARBALL_BYTES = 20_000_000;

function fail(message) {
  console.error(`[fetch-voice-model] ${message}`);
  process.exit(1);
}

/** Minimal ZIP reader: central directory only (no data descriptors, no zip64). */
function readZipEntries(buffer) {
  // Find End of Central Directory.
  let eocd = -1;
  const tailStart = Math.max(0, buffer.length - 65558);
  for (let i = buffer.length - 22; i >= tailStart; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) fail("ZIP end-of-central-directory not found");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);

  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) fail("bad central directory entry");
    const method = buffer.readUInt16LE(p + 10);
    const compSize = buffer.readUInt32LE(p + 20);
    const uncompSize = buffer.readUInt32LE(p + 24);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.toString("utf8", p + 46, p + 46 + nameLen);
    entries.push({ name, method, compSize, uncompSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }

  // Extract file bytes from local headers.
  const files = [];
  for (const e of entries) {
    const lp = e.localOffset;
    if (buffer.readUInt32LE(lp) !== 0x04034b50) fail(`bad local header for ${e.name}`);
    const nameLen = buffer.readUInt16LE(lp + 26);
    const extraLen = buffer.readUInt16LE(lp + 28);
    const dataStart = lp + 30 + nameLen + extraLen;
    const comp = buffer.subarray(dataStart, dataStart + e.compSize);
    let data;
    if (e.method === 0) data = Buffer.from(comp);
    else if (e.method === 8) data = inflateRawSync(comp);
    else fail(`unsupported compression method ${e.method} for ${e.name}`);
    if (data.length !== e.uncompSize) fail(`size mismatch for ${e.name}`);
    files.push({ name: e.name, data, dir: e.name.endsWith("/") });
  }
  return files;
}

/** Minimal TAR writer (ustar, short names only — fine for this model). */
function writeTar(files) {
  const blocks = [];
  const pushHeader = (name, size, typeflag) => {
    const h = Buffer.alloc(512, 0);
    if (name.length > 100) fail(`tar name too long: ${name}`);
    h.write(name, 0, "utf8");
    h.write("0000777", 100, "utf8"); // mode
    h.write("0000000", 108, "utf8"); // uid
    h.write("0000000", 116, "utf8"); // gid
    h.write(size.toString(8).padStart(11, "0"), 124, "utf8");
    h.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, "0"), 136, "utf8");
    h[156] = typeflag.charCodeAt(0);
    h.write("ustar", 257, "utf8");
    // checksum: spaces in the checksum field itself
    h.fill(0x20, 148, 156);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, "0"), 148, "utf8");
    blocks.push(h);
  };
  for (const f of files) {
    if (f.dir) {
      pushHeader(f.name, 0, "5");
    } else {
      pushHeader(f.name, f.data.length, "0");
      blocks.push(f.data);
      const pad = (512 - (f.data.length % 512)) % 512;
      if (pad) blocks.push(Buffer.alloc(pad, 0));
    }
  }
  blocks.push(Buffer.alloc(1024, 0)); // two zero blocks
  return Buffer.concat(blocks);
}

async function main() {
  if (existsSync(OUT_FILE) && statSync(OUT_FILE).size >= MIN_TARBALL_BYTES) {
    console.log(`[fetch-voice-model] already present, skipping (${OUT_FILE})`);
    return;
  }
  console.log(`[fetch-voice-model] downloading ${ZIP_URL} ...`);
  const res = await fetch(ZIP_URL);
  if (!res.ok) fail(`download failed: HTTP ${res.status}`);
  const zipBuffer = Buffer.from(await res.arrayBuffer());
  console.log(`[fetch-voice-model] downloaded ${(zipBuffer.length / 1e6).toFixed(1)}MB, converting...`);
  const files = readZipEntries(zipBuffer);
  const tarball = gzipSync(writeTar(files));
  if (tarball.length < MIN_TARBALL_BYTES) {
    fail(`converted tarball suspiciously small (${tarball.length} bytes)`);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, tarball);
  console.log(
    `[fetch-voice-model] wrote ${OUT_FILE} (${(tarball.length / 1e6).toFixed(1)}MB, ${files.length} entries)`,
  );
}

main().catch((e) => fail(e.message));
