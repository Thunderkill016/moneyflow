import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
const sitemap = readFileSync(join(root, "src/app/sitemap.ts"), "utf8");
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
const landing = readFileSync(join(root, "src/app/page.tsx"), "utf8");
const ogImage = readFileSync(join(root, "src/app/opengraph-image.tsx"), "utf8");

test("robots.ts and sitemap.ts render at request time, not build time (getSiteOrigin validates real deployment env)", () => {
  assert.match(robots, /export const dynamic = "force-dynamic"/);
  assert.match(sitemap, /export const dynamic = "force-dynamic"/);
});

test("robots.ts allows only public marketing/auth routes and disallows the app", () => {
  assert.match(robots, /import \{ getSiteOrigin \} from "@\/lib\/site-url"/);
  assert.match(robots, /allow: \[[^\]]*"\/"/);
  assert.match(robots, /allow: \[[^\]]*"\/login"/);
  assert.match(robots, /allow: \[[^\]]*"\/register"/);
  assert.match(robots, /allow: \[[^\]]*"\/privacy"/);
  for (const path of ["/dashboard", "/transactions", "/accounts", "/settings", "/onboarding"]) {
    assert.match(robots, new RegExp(`disallow: \\[[^\\]]*"${path}"`, "s"));
  }
  assert.match(robots, /sitemap: `\$\{origin\}\/sitemap\.xml`/);
});

test("sitemap.ts lists exactly the public routes robots.ts allows", () => {
  assert.match(sitemap, /import \{ getSiteOrigin \} from "@\/lib\/site-url"/);
  assert.match(sitemap, /url: origin,/);
  assert.match(sitemap, /url: `\$\{origin\}\/login`/);
  assert.match(sitemap, /url: `\$\{origin\}\/register`/);
  assert.match(sitemap, /url: `\$\{origin\}\/privacy`/);
  assert.doesNotMatch(sitemap, /\/dashboard|\/transactions|\/settings/);
});

test("root layout metadata has metadataBase, Open Graph and Twitter defaults", () => {
  assert.match(layout, /import \{ normalizeSiteOrigin \} from "@\/lib\/site-url"/);
  assert.match(layout, /metadataBase: new URL\(siteOrigin\)/);
  assert.match(layout, /openGraph: \{/);
  assert.match(layout, /locale: "vi_VN"/);
  assert.match(layout, /twitter: \{/);
  assert.match(layout, /card: "summary_large_image"/);
});

test("landing page has its own metadata, canonical and JSON-LD structured data", () => {
  assert.match(landing, /export const metadata: Metadata/);
  assert.match(landing, /alternates: \{ canonical: "\/" \}/);
  assert.match(landing, /"@type": "SoftwareApplication"/);
  assert.match(landing, /application\/ld\+json/);
});

test("landing page repeats full openGraph/twitter objects (Next.js shallow-merges metadata, does not deep-merge with layout)", () => {
  const ogBlock = landing.match(/openGraph: \{[\s\S]*?\},\n\s*twitter/)?.[0] ?? "";
  assert.match(ogBlock, /type: "website"/);
  assert.match(ogBlock, /locale: "vi_VN"/);
  assert.match(ogBlock, /siteName: "MoneyFlow"/);
  const twitterBlock = landing.match(/twitter: \{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(twitterBlock, /card: "summary_large_image"/);
});

test("opengraph-image renders the canonical B3.2 mark at standard OG size", () => {
  assert.match(ogImage, /export const size = \{ width: 1200, height: 630 \}/);
  assert.match(ogImage, /viewBox="0 0 160 160"/);
  assert.match(
    ogImage,
    /M22\.80 64\.20C22\.80 40\.40 42\.10 28\.00 66\.40 28\.00H128\.20/,
  );
  assert.match(
    ogImage,
    /M137\.20 95\.80C137\.20 119\.60 117\.90 132\.00 93\.60 132\.00H31\.80/,
  );
  assert.match(ogImage, /M80 54\.11A16 16/);
  assert.doesNotMatch(ogImage, /M17 43V23\.5/);
});

test("every sitemap-listed page has its own description and canonical (no thin indexable pages)", () => {
  const login = readFileSync(join(root, "src/app/(auth)/login/page.tsx"), "utf8");
  const register = readFileSync(join(root, "src/app/(auth)/register/page.tsx"), "utf8");
  const privacy = readFileSync(join(root, "src/app/privacy/page.tsx"), "utf8");

  for (const [source, path] of [
    [login, "/login"],
    [register, "/register"],
    [privacy, "/privacy"],
  ] as const) {
    assert.match(source, /description:/, `${path} should have a meta description`);
    assert.match(
      source,
      new RegExp(`alternates: \\{ canonical: "${path}" \\}`),
      `${path} should set its own canonical`,
    );
  }
});
