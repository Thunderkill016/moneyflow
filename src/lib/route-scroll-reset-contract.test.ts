import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const reset = readFileSync(
  join(root, "src/components/route-scroll-reset.tsx"),
  "utf8",
);
const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");

test("route transitions clear retained document scroll without breaking first render", () => {
  assert.match(reset, /const previousPathname = useRef\(pathname\)/u);
  assert.match(
    reset,
    /if \(previousPathname\.current === pathname\) return;/u,
  );
  assert.match(
    reset,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/u,
  );
});

test("root layout mounts the route scroll reset once", () => {
  assert.match(
    layout,
    /import \{ RouteScrollReset \} from "@\/components\/route-scroll-reset"/u,
  );
  assert.equal((layout.match(/<RouteScrollReset \/>/gu) ?? []).length, 1);
});
