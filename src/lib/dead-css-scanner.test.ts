import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scanner = fileURLToPath(
  new URL("../../scripts/check-dead-css-reachable.mjs", import.meta.url),
);

type Fixture = {
  css: string;
  source?: string;
  orphanSource?: string;
  moduleCss?: string;
  html?: string;
  testSource?: string;
};

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function runScanner(cwd: string) {
  return spawnSync(process.execPath, [scanner], {
    cwd,
    encoding: "utf8",
  });
}

function runFixture(fixture: Fixture) {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-dead-css-"));
  try {
    write(join(root, "src/app/globals.css"), fixture.css);

    if (fixture.source !== undefined) {
      write(join(root, "src/components/fixture.tsx"), fixture.source);
      write(
        join(root, "src/app/page.tsx"),
        `export * from "../components/fixture"; export default function Page() { return null; }`,
      );
    } else if (fixture.moduleCss !== undefined) {
      write(
        join(root, "src/components/fixture.tsx"),
        `import "./fixture.module.css"; export function Fixture() { return null; }`,
      );
      write(
        join(root, "src/app/page.tsx"),
        `export * from "../components/fixture"; export default function Page() { return null; }`,
      );
    }

    if (fixture.orphanSource !== undefined) {
      write(join(root, "src/components/orphan.tsx"), fixture.orphanSource);
    }
    if (fixture.moduleCss !== undefined) {
      write(join(root, "src/components/fixture.module.css"), fixture.moduleCss);
    }
    if (fixture.html !== undefined) {
      write(join(root, "src/static/fixture.html"), fixture.html);
    }
    if (fixture.testSource !== undefined) {
      write(join(root, "src/lib/fixture.test.ts"), fixture.testSource);
    }

    return runScanner(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function output(result: ReturnType<typeof runFixture>) {
  return `${result.stdout}${result.stderr}`;
}

test("counts literal and resolved className expressions", () => {
  const result = runFixture({
    css: ".literal-class {} .resolved-class {}",
    source: `
      const resolved = "resolved-class";
      export function Fixture() {
        return <><div className="literal-class" /><div className={resolved} /></>;
      }
    `,
  });

  assert.equal(result.status, 0, output(result));
});

test("keeps runtime-completed class families reachable", () => {
  const result = runFixture({
    css: ".base-class {} .attention-chip-warning {}",
    source: `
      export function Fixture({ tone }: { tone: string }) {
        return <div className={\`base-class attention-chip-\${tone}\`} />;
      }
    `,
  });

  assert.equal(result.status, 0, output(result));
});

test("does not count import paths, URLs, prose or test files", () => {
  const result = runFixture({
    css: ".future-panel {} .url-class {} .prose-class {} .test-only {}",
    source: `
      import styles from "./future-panel.module.css";
      export const docs = "https://example.com/url-class";
      export const copy = "prose-class";
      void styles;
    `,
    testSource: `export const fixture = "test-only";`,
  });

  assert.equal(result.status, 1);
  assert.match(output(result), /future-panel/);
  assert.match(output(result), /url-class/);
  assert.match(output(result), /prose-class/);
  assert.match(output(result), /test-only/);
});

test("ignores class references from orphaned product modules", () => {
  const result = runFixture({
    css: ".reachable-class {} .orphan-class {}",
    source: `export const Fixture = () => <div className="reachable-class" />;`,
    orphanSource: `export const Orphan = () => <div className="orphan-class" />;`,
  });

  assert.equal(result.status, 1);
  assert.doesNotMatch(output(result), /reachable-class/);
  assert.match(output(result), /orphan-class/);
});

test("ignores source comments while preserving URL className strings", () => {
  const result = runFixture({
    css: ".line-comment {} .block-comment {} .url-value {}",
    source: `
      // <div className="line-comment" />
      /* <div className="block-comment" /> */
      export function Fixture() {
        return <div className="url-value" data-url="https://example.com/a//b" />;
      }
    `,
  });

  assert.equal(result.status, 1);
  assert.match(output(result), /line-comment/);
  assert.match(output(result), /block-comment/);
  assert.doesNotMatch(output(result), /url-value/);
});

test("counts active :global selectors only from reachable CSS Modules", () => {
  const result = runFixture({
    css: ".layered-rule {} .commented-rule {}",
    moduleCss: `
      :global(.layered-rule) { color: inherit; }
      /* :global(.commented-rule) { color: red; } */
    `,
  });

  assert.equal(result.status, 1);
  assert.doesNotMatch(output(result), /layered-rule/);
  assert.match(output(result), /commented-rule/);
});

test("reads clsx maps and custom ClassName props", () => {
  const result = runFixture({
    css: ".base {} .conditional {} .item-class {}",
    source: `
      import clsx from "clsx";
      export function Fixture({ active }: { active: boolean }) {
        return <Widget itemClassName={clsx("base", { conditional: active }, "item-class")} />;
      }
      function Widget({ itemClassName }: { itemClassName: string }) {
        return <div className={itemClassName} />;
      }
    `,
  });

  assert.equal(result.status, 0, output(result));
});

test("extracts selectors rather than dots in declaration values", () => {
  const result = runFixture({
    css: `.font-class { src: url("./asset.woff2"); content: ".not-a-selector"; }`,
    source: `export const Fixture = () => <div className="font-class" />;`,
  });

  assert.equal(result.status, 0, output(result));
});

test("reads static HTML classes and ignores HTML comments", () => {
  const result = runFixture({
    css: ".html-live {} .html-comment {}",
    html: `<div class="html-live"></div><!-- <div class="html-comment"></div> -->`,
  });

  assert.equal(result.status, 1);
  assert.doesNotMatch(output(result), /html-live/);
  assert.match(output(result), /html-comment/);
});

test("repository has zero unreachable legacy CSS selectors", () => {
  const result = runScanner(process.cwd());
  assert.equal(result.status, 0, output(result));
});
