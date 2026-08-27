import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";

import {
  OWNED_HOSTS,
  PRODUCTION_ORIGIN,
  SUPPORT_EMAIL,
  supportMailtoHref,
} from "./support-contact.ts";

const SOURCE_ROOT = join(process.cwd(), "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Files whose whole job is to name the bad address in order to forbid it. */
const EXPLAINERS = new Set(["support-contact.ts", "support-contact.test.ts", "privacy-policy-copy.test.ts"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

test("the support address is the owner's own mailbox", () => {
  assert.match(SUPPORT_EMAIL, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/u);
  assert.equal(SUPPORT_EMAIL, "dinhbahoang1605@gmail.com");
});

test("moneyflow.app is not treated as a host we own", () => {
  /*
   * The whole defect: `moneyflow.app` serves a different Money Flow product run
   * by another company. Listing it here would re-authorise the original mistake.
   */
  assert.ok(!OWNED_HOSTS.includes("moneyflow.app" as never));
  assert.ok(!OWNED_HOSTS.includes("www.moneyflow.app" as never));
  assert.ok(OWNED_HOSTS.includes("mfvn.vercel.app"));
  assert.equal(PRODUCTION_ORIGIN, "https://mfvn.vercel.app");
});

test("the mailto href carries the address and encodes its parts", () => {
  const href = supportMailtoHref("Hỗ trợ Money Flow", "Mã lỗi: E1\n\nMô tả");
  assert.ok(href.startsWith(`mailto:${SUPPORT_EMAIL}?`));
  assert.ok(href.includes("subject=H%E1%BB%97%20tr%E1%BB%A3%20Money%20Flow"));
  // A raw newline in a mailto is dropped by some clients; it must be encoded.
  assert.ok(!href.includes("\n"));
  assert.ok(href.includes("%0A"));
});

test("no address on a domain this project does not own survives anywhere in src/", () => {
  /*
   * This is the guard that matters. Two unrelated components each held their own
   * copy of an address nobody here could read, and nothing noticed for months.
   * A single constant fixes today; this test is what stops it coming back.
   */
  const offenders: string[] = [];
  for (const path of sourceFiles(SOURCE_ROOT)) {
    const name = path.slice(SOURCE_ROOT.length + 1);
    if (EXPLAINERS.has(name.split("/").pop() ?? "")) continue;

    const source = readFileSync(path, "utf8");
    /*
     * The last label must be alphabetic, so provenance version strings such as
     * `csv_import@2.0` are not mistaken for addresses.
     */
    for (const match of source.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/giu)) {
      const host = match[1]!.toLowerCase();
      if (match[0] === SUPPORT_EMAIL) continue;
      // RFC 2606 reserves these names for documentation and testing precisely so
      // they can never reach a real mailbox; a fixture using one is correct.
      if (/(^|\.)(example\.(com|org|net)|test|invalid|localhost)$/u.test(host)) continue;
      offenders.push(`${name}: ${match[0]}`);
    }
    for (const match of source.matchAll(/https?:\/\/(?:www\.)?moneyflow\.app/gu)) {
      offenders.push(`${name}: ${match[0]}`);
    }
  }

  assert.deepEqual(offenders, []);
});
